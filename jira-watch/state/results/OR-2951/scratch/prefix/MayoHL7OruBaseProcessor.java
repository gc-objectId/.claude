package com.guided.orci.integration.mayo.hl7;

import ca.uhn.hl7v2.HL7Exception;
import ca.uhn.hl7v2.model.Message;
import ca.uhn.hl7v2.util.Terser;
import com.guided.orci.integration.hl7.HL7ProcessingContext;
import com.guided.orci.models.integration.HL7InboundMessage;
import com.guided.orci.models.integration.SourceMetadata;
import com.guided.orci.models.integration.SourceType;
import com.guided.orci.models.observation.Observation;
import com.guided.orci.models.observation.ObservationAction;
import com.guided.orci.models.observation.ObservationType;
import com.guided.orci.models.observation.ObservationUpdate;
import com.guided.orci.models.patient.Gender;
import com.guided.orci.models.patient.Patient;
import com.guided.orci.repository.PatientRepository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

abstract class MayoHL7OruBaseProcessor {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(MayoHL7OruBaseProcessor.class);

    private static final String LOINC_SYSTEM_URI = "http://loinc.org";
    private static final String LOINC_HL7_IDENTIFIER = "LN";

    protected final PatientRepository patientRepository;
    protected final HL7ProcessingContext hl7ProcessingContext;

    protected MayoHL7OruBaseProcessor(PatientRepository patientRepository,
                                       HL7ProcessingContext hl7ProcessingContext) {
        this.patientRepository = patientRepository;
        this.hl7ProcessingContext = hl7ProcessingContext;
    }

    public void process(Message message, HL7InboundMessage record) {
        Terser terser = new Terser(message);
        try {
            String pmrn = extractPmrn(terser);
            if (pmrn == null) {
                log.warn("Could not extract PMRN from PID-3 — hl7MessageId={}", record.getId());
                return;
            }

            Patient patient = patientRepository.findByPmrn(pmrn);
            if (patient == null) {
                patient = createSkeletonPatient(pmrn, terser);
                log.info("Created skeleton patient — hl7MessageId={}", record.getId());
            }

            String sourceId = record.getId().toString();
            Instant collectionInstant = MayoHL7DateUtils.parseHl7Timestamp(terser.get("/OBR-7-1"));
            Date collectionTime = collectionInstant != null ? Date.from(collectionInstant) : null;

            List<ObservationUpdate> updates = buildObservations(terser, patient, sourceId, collectionTime);

            if (updates.isEmpty()) {
                log.info("No observations parsed from ORU^R01 — hl7MessageId={}", record.getId());
                return;
            }

            hl7ProcessingContext.saveObservations(updates, record.getId());

        } catch (HL7Exception e) {
            log.error("Failed to extract fields from ORU^R01 — hl7MessageId={}", record.getId(), e);
        }
    }

    /**
     * Maps a coded observation to a typed ObservationType. Return null to store the observation
     * without a type (e.g. flowsheet data using local Epic MA451 codes). The display name is
     * provided so subclasses can cross-check a code-based mapping against the row's name (e.g. to
     * flag a transfusion row whose code we do not yet recognise).
     */
    protected abstract ObservationType resolveObservationType(String codeSystem, String code, String name);

    /**
     * Override to skip observations whose code carries no clinical value for this source
     * (e.g. flowsheet rows we deliberately ignore). Default: ingest everything.
     */
    protected boolean shouldIngest(Observation obs) {
        return true;
    }

    private List<ObservationUpdate> buildObservations(Terser terser, Patient patient, String sourceId,
                                                      Date fallbackTime) throws HL7Exception {
        record ObxRow(
                String primaryCode,
                String primaryName,
                String primarySystem,
                String loincCode,
                String loincName,
                boolean isLoinc,
                String value,
                String units,
                String obxTime,
                String performingLab,
                String resultStatus
        ) {}

        record ObxKey(String subId, String effectiveCode) {}

        Map<ObxKey, List<ObxRow>> grouped = new LinkedHashMap<>();

        for (int i = 0; i < 200; i++) {
            String setId;
            try {
                setId = terser.get("/OBX(" + i + ")-1");
            } catch (HL7Exception e) {
                break;
            }
            if (setId == null || setId.isEmpty()) break;

            String primaryCode   = nullToEmpty(terser.get("/OBX(" + i + ")-3-1"));
            String primaryName   = nullToEmpty(terser.get("/OBX(" + i + ")-3-2"));
            String primarySystem = nullToEmpty(terser.get("/OBX(" + i + ")-3-3"));
            String altCode       = nullToEmpty(terser.get("/OBX(" + i + ")-3-4"));
            String altName       = nullToEmpty(terser.get("/OBX(" + i + ")-3-5"));
            String altSystem     = nullToEmpty(terser.get("/OBX(" + i + ")-3-6"));
            String subId         = nullToEmpty(terser.get("/OBX(" + i + ")-4-1"));
            String value         = nullToEmpty(terser.get("/OBX(" + i + ")-5-1"));
            String units         = nullToEmpty(terser.get("/OBX(" + i + ")-6-1"));
            String obxTime       = nullToEmpty(terser.get("/OBX(" + i + ")-14-1"));
            String performingLab = nullToEmpty(terser.get("/OBX(" + i + ")-23-1"));
            String resultStatus  = nullToEmpty(terser.get("/OBX(" + i + ")-11-1"));

            boolean altIsLoinc     = LOINC_HL7_IDENTIFIER.equalsIgnoreCase(altSystem) && !altCode.isEmpty();
            boolean primaryIsLoinc = LOINC_HL7_IDENTIFIER.equalsIgnoreCase(primarySystem) && !primaryCode.isEmpty();
            String loincCode = altIsLoinc ? altCode : (primaryIsLoinc ? primaryCode : "");
            String loincName = altIsLoinc ? altName : (primaryIsLoinc ? primaryName : "");
            boolean isLoinc  = !loincCode.isEmpty();

            String effectiveCode = !loincCode.isEmpty() ? loincCode
                    : !primaryCode.isEmpty() ? primaryCode
                    : primaryName;

            ObxKey key = new ObxKey(subId, effectiveCode);
            grouped.computeIfAbsent(key, k -> new ArrayList<>())
                    .add(new ObxRow(primaryCode, primaryName, primarySystem, loincCode, loincName, isLoinc, value, units, obxTime, performingLab, resultStatus));
        }

        return grouped.values().stream()
                .map(rows -> {
                    // One logical observation per (subId, effectiveCode) group. Epic splits a long text
                    // result across several OBX rows under the same key, so we concatenate their OBX-5
                    // values below and read every other attribute (code, units, effective time, OBX-11
                    // status) from the first row of the group — those are identical across the rows.
                    ObxRow first = rows.getFirst();

                    String concatenatedValue = rows.stream()
                            .map(ObxRow::value)
                            .filter(v -> !v.isEmpty())
                            .collect(Collectors.joining("\n"));

                    boolean useLoinc = first.isLoinc() && !first.loincCode().isEmpty();
                    String code = useLoinc ? first.loincCode() : first.primaryCode();
                    String codeSystem = useLoinc ? LOINC_SYSTEM_URI
                            : first.primarySystem().isEmpty() ? null : first.primarySystem();
                    String name = !first.loincName().isEmpty() ? first.loincName() : first.primaryName();

                    Instant effectiveInstant = MayoHL7DateUtils.parseHl7Timestamp(first.obxTime());
                    Date effectiveTime = effectiveInstant != null ? Date.from(effectiveInstant) : fallbackTime;

                    ObservationType type = resolveObservationType(codeSystem, code, name);

                    String performingLab = rows.stream()
                            .map(ObxRow::performingLab)
                            .filter(l -> !l.isEmpty())
                            .findFirst()
                            .orElse(null);

                    Observation observation = Observation.builder()
                            .code(code.isEmpty() ? null : code)
                            .codeSystem(codeSystem)
                            .observationName(name.isEmpty() ? null : name)
                            .observationValue(concatenatedValue.isEmpty() ? null : concatenatedValue)
                            .observationUnits(first.units().isEmpty() ? null : first.units())
                            .effectiveTime(effectiveTime)
                            .type(type)
                            .patient(patient)
                            .sourceMetadata(new SourceMetadata(
                                    sourceId,
                                    SourceType.HL7,
                                    performingLab,
                                    null))
                            .build();
                    return new ObservationUpdate(observation, actionFor(first.resultStatus()));
                })
                .filter(update -> shouldIngest(update.observation()))
                .filter(update -> update.observation().getEffectiveTime() != null)
                .toList();
    }

    private String extractPmrn(Terser terser) throws HL7Exception {
        for (int i = 0; i < 10; i++) {
            String id = terser.get("/PID-3(" + i + ")-1");
            if (id == null || id.isBlank()) break;
            if ("MC".equalsIgnoreCase(terser.get("/PID-3(" + i + ")-5"))) return id;
        }
        return null;
    }

    private Patient createSkeletonPatient(String pmrn, Terser terser) throws HL7Exception {
        String lastName  = terser.get("/PID-5-1");
        String firstName = terser.get("/PID-5-2");
        String rawDob    = terser.get("/PID-7-1");
        String rawGender = terser.get("/PID-8-1");

        LocalDate dob = MayoHL7DateUtils.parseHl7Date(rawDob);

        Patient skeleton = Patient.builder()
                .pmrn(pmrn)
                .mrn(pmrn)
                .firstName(firstName != null && !firstName.isBlank() ? firstName : null)
                .lastName(lastName != null && !lastName.isBlank() ? lastName : null)
                .dob(dob)
                .gender(rawGender != null && !rawGender.isBlank() ? Gender.convert(rawGender.toUpperCase()) : null)
                .build();

        return patientRepository.save(skeleton);
    }

    /**
     * Maps OBX-11 (result status) to a persistence action: C corrects, D deletes, F stores. Every
     * other status is skipped on purpose. Only a verified result may reach the rules, and the ORU
     * stream sends one: Mayo re-sends a preliminary result (P) as F once it is verified, so skipping
     * P costs nothing. Statuses that carry no result at all (e.g. W "wrong", X "cannot obtain") would
     * feed a non-value to rules. Skipping is routine and high volume, so it logs at debug.
     *
     * <p>The FHIR path deliberately differs and keeps preliminary results, because a point-in-time
     * fetch has to take the preliminary value or have none at all.
     */
    private static ObservationAction actionFor(String obx11ResultStatus) {
        if ("C".equalsIgnoreCase(obx11ResultStatus)) return ObservationAction.CORRECT;
        if ("D".equalsIgnoreCase(obx11ResultStatus)) return ObservationAction.DELETE;
        if ("F".equalsIgnoreCase(obx11ResultStatus)) return ObservationAction.INGEST;
        log.debug("Skipping OBX-11 result status '{}' — only F/C/D are persisted", obx11ResultStatus);
        return ObservationAction.IGNORE;
    }

    static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }
}
