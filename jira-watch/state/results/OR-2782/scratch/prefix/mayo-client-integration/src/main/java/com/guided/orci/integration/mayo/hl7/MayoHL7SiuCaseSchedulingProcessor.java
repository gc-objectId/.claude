package com.guided.orci.integration.mayo.hl7;

import ca.uhn.hl7v2.HL7Exception;
import ca.uhn.hl7v2.model.Group;
import ca.uhn.hl7v2.model.Message;
import ca.uhn.hl7v2.model.Segment;
import ca.uhn.hl7v2.model.Structure;
import ca.uhn.hl7v2.util.Terser;
import com.guided.orci.events.EvaluationMode;
import com.guided.orci.integration.hl7.HL7ProcessingContext;
import com.guided.orci.integration.mayo.MayoOperationEventService;
import com.guided.orci.models.integration.HL7InboundMessage;
import com.guided.orci.models.operation.EventCategory;
import com.guided.orci.models.patient.AsaStatus;
import com.guided.orci.models.patient.CaseAcuity;
import com.guided.orci.models.patient.Gender;
import com.guided.orci.models.patient.Operation;
import com.guided.orci.models.patient.Patient;
import com.guided.orci.models.user.Practitioner;
import com.guided.orci.repository.PatientRepository;
import com.guided.orci.repository.PractitionerRepository;
import com.guided.orci.types.wrappers.CaseId;
import com.guided.orci.types.wrappers.PatientId;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

/**
 * Ingests Epic SIU^S14 surgical-case-scheduling messages (SIU_SURGICAL_UDP) for Mayo, upserting an
 * {@link Operation} (surgical case) keyed on (caseId, patient).
 *
 * <p>The practitioner who generated the SIU is taken from SCH-20. SCH-20-1 is the Epic person id
 * (PERSONID, the same namespace Mayo's Practitioner FHIR search calls PERID), so it is find-or-created
 * and FHIR-enriched (role/specialty) exactly like the RAS administering provider, degrading to a
 * skeleton when Epic has no provider record. When SCH-20 carries no id we fall back to the anesthesia
 * provider (Anesthesiologist / CRNA / Resident-Anesthesia / SRNA) from the AIP personnel rows via PROVID.
 *
 * <p>That practitioner is not stored on the Operation here. It rides the OR timing events (via
 * {@link HL7ProcessingContext#handleTimingEvent}) so case-start handling attributes it as the
 * {@code Operation.primaryPractitioner} (first-wins, only on case-start events such as Anes Start /
 * In Room), and rule evaluation uses it as the evaluating practitioner.
 *
 * <p>The estimated case window ({@code CASE_START_TIME} / {@code CASE_END_TIME} OBX, the booked slot
 * rather than the live {@code PROJECTED_*} projection) is persisted onto {@code scheduledStartTime} /
 * {@code scheduledEndTime}, but only when the SIU carries a case-start event — same first-wins,
 * only-at-case-start rule as the practitioner — so the recorded estimate is the schedule as it stood
 * when the case actually began and a later reschedule never moves it.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MayoHL7SiuCaseSchedulingProcessor implements MayoHL7MessageProcessor {

    /** AIP-4 resource role codes for anesthesia personnel, in resolution priority order. */
    private static final List<String> ANESTHESIA_ROLE_CODES = List.of(
            "2.10",  // Anesthesiologist
            "2.20",  // CRNA
            "2.60",  // Resident - Anesthesia
            "2.100"  // Student Nurse Anesthetist
    );
    private static final String PROVID = "PROVID";

    // OR events that mark the start of a case; the estimated case window is captured when one arrives.
    // Must stay in sync with the events MayoOperationEventService maps to START_MONITORING — an invariant
    // test (caseStartEvents_matchesStartMonitoringMapping) fails if the two drift. Package-private for it.
    static final Set<MayoOperationEventService.MayoEventType> CASE_START_EVENTS = Set.of(
            MayoOperationEventService.MayoEventType.IN_ROOM,
            MayoOperationEventService.MayoEventType.ANESTHESIA_START);

    // Terser doesn't expose segment/repetition counts — these caps bound our loops to prevent runaway
    // iteration on pathologically large or malformed messages.
    private static final int MAX_OBX_SEGMENTS     = 100;
    private static final int MAX_AIP_SEGMENTS     = 50;
    private static final int MAX_PID_IDENTIFIERS  = 10;
    private static final int MAX_XCN_REPETITIONS  = 10;

    // OBX-3-1 identifiers Epic sends as case metadata rather than OR timing milestones. They're read
    // directly by key (CASE_START_TIME, SchedulingStatus, ...), never resolved to a MayoEventType, so
    // excluding them keeps the unrecognized-milestone tripwire from firing on every scheduling field.
    // A timing-shaped OBX that is neither metadata nor a known MayoEventType is a new Epic milestone we
    // don't yet handle, and gets logged instead of vanishing.
    private static final Set<String> METADATA_OBX_CODES = Set.of(
            "SURG_CSN", "CASE_START_TIME", "CASE_END_TIME", "CASE_CANCEL_DATE", "CASE_TYPE",
            "PROJECTED_START_TIME", "PROJECTED_END_TIME", "OR_ROOM", "SchedulingStatus",
            "SETUP_TIME", "CLEANUP_TIME", "COMBO_CASE_FLAG");

    private final PatientRepository patientRepository;
    private final PractitionerRepository practitionerRepository;
    private final HL7ProcessingContext hl7ProcessingContext;
    private final MayoOperationEventService mayoOperationEventService;

    @Override
    public Set<String> supportedMessageTypes() {
        return Set.of("SIU^S12", "SIU^S13", "SIU^S14", "SIU^S15");
    }

    @Override
    public void process(Message message, HL7InboundMessage record) {
        Terser terser = new Terser(message);
        try {
            Map<String, String> caseObservations = collectCaseObservations(terser);

            // SIU^S15 is the HL7 "cancel appointment" message type — always skip regardless of OBX content.
            if ("SIU^S15".equals(record.getMessageType()) || isCancellation(caseObservations)) {
                log.info("SIU case cancellation — skipping for v1, hl7MessageId={}", record.getId());
                return;
            }

            String caseId = blankToNull(terser.get("/SCH-2-1")); // SCH-2: filler appointment (OR case) id
            if (caseId == null) {
                log.warn("Could not extract case id from SCH-2 — hl7MessageId={}", record.getId());
                return;
            }

            // Operating room comes from AIL-3-2, the location resource id Epic populates with the full
            // room record name (e.g. "RM OR 49 ROEI 01 303"). This is the campus/building-qualified name
            // from the Epic OR master file and matches it 1:1. The OBX OR_ROOM value is only the short
            // "OR 49" display form, which can't tell apart the ROEI/ROJB rooms that share a number. A
            // missing AIL location marks a non-surgical case (outpatient SIU_GENERIC), so we skip it.
            String operatingRoomName = blankToNull(safeGet(terser, "/AIL-3-2")); // AIL-3-2: location resource name
            if (operatingRoomName == null) {
                log.info("No OR location (AIL) in SIU message — skipping non-surgical case, hl7MessageId={}", record.getId());
                return;
            }

            String pmrn = extractPmrn(terser);
            if (pmrn == null) {
                log.warn("Could not extract PMRN from PID-3 — hl7MessageId={}", record.getId());
                return;
            }

            Patient patient = patientRepository.findByPmrn(pmrn);
            if (patient == null) {
                // Serialized per patient: a patient's first two SIU messages arrive together, and an
                // unserialized insert would let the loser trip the PMRN unique constraint and drop this
                // whole message - milestone included - since it is never retried.
                patient = hl7ProcessingContext.findOrCreatePatient(new PatientId(pmrn), buildSkeletonPatient(pmrn, terser));
                log.info("Resolved patient absent from the tenant — hl7MessageId={}", record.getId());
            }

            // PV1 is optional; a missing segment makes terser.get throw, so read it null-safely.
            String serviceName = blankToNull(safeGet(terser, "/PV1-10-1")); // PV1-10: hospital service
            String encounterId = blankToNull(safeGet(terser, "/PV1-19-1")); // PV1-19: visit number / CSN
            String acuity = resolveAcuity(terser, record); // PV1-4: case acuity (Elec/Urg/Emerg)
            AsaStatus asaStatus = resolveAsaStatus(terser, record); // ZCS-5: ASA physical status
            Practitioner anesthesiaProvider = resolveAnesthesiaProvider(terser);
            List<String> procedureNames = extractProcedureNames(message); // AIS-3-2 procedure names

            // Estimated case window: CASE_START_TIME / CASE_END_TIME are the booked slot (not the live
            // PROJECTED_* projection). Captured only when this SIU carries a case-start event so the
            // persisted estimate is the schedule as of case start; applyUpdates keeps it first-wins.
            boolean caseStart = carriesCaseStartEvent(caseObservations);
            Date scheduledStartTime = caseStart ? parseObxTimestamp(caseObservations.get("CASE_START_TIME")) : null;
            Date scheduledEndTime = caseStart ? parseObxTimestamp(caseObservations.get("CASE_END_TIME")) : null;

            Operation incoming = Operation.builder()
                    .caseId(caseId)
                    .patient(patient)
                    .operatingRoomName(operatingRoomName)
                    .serviceName(serviceName)
                    .encounterId(encounterId)
                    .scheduledStartTime(scheduledStartTime)
                    .scheduledEndTime(scheduledEndTime)
                    .acuity(acuity)
                    .asaStatus(asaStatus)
                    .evaluationMode(EvaluationMode.SILENT)
                    .build();

            upsertOperation(incoming, procedureNames, record);

            // The practitioner who generated the SIU (SCH-20), falling back to the AIP anesthesia provider.
            // Not stored on the Operation here: it rides the timing events so case-start attributes it as the
            // primaryPractitioner (first-wins) and rule evaluation uses it as the evaluating practitioner.
            Practitioner practitioner = resolveGeneratingPractitioner(terser);
            if (practitioner == null) {
                practitioner = anesthesiaProvider;
            }

            // Always attempt to dispatch a timing event — dispatchTimingEvent silently
            // no-ops when no OBX carries a known event name.
            dispatchTimingEvent(caseObservations, caseId, new PatientId(pmrn), record, practitioner);

        } catch (HL7Exception e) {
            log.error("Failed to extract fields from SIU message — hl7MessageId={}", record.getId(), e);
        }
    }

    /**
     * Scans caseObservations for OBX entries whose identifier matches a known Mayo event name
     * (e.g. "In Room", "Procedure Finish"). Epic sends these as OBX segments where OBX-3-1 is the
     * event name and OBX-5-1 is the timestamp. Events with no EventCategory mapping are
     * silently skipped (e.g. informational ones like "Onboard").
     *
     * <p>A timing-shaped OBX that is neither case metadata nor a known {@link MayoOperationEventService.MayoEventType}
     * is a new Epic milestone (or an abbreviation we haven't catalogued) and is logged rather than dropped
     * silently, so a coverage gap surfaces for review instead of vanishing.
     */
    private void dispatchTimingEvent(Map<String, String> caseObservations, String caseId, PatientId patientId, HL7InboundMessage record, Practitioner practitioner) {
        Map<MayoOperationEventService.MayoEventType, List<EventCategory>> eventMap = mayoOperationEventService.getMayoEventTypeListMap();

        for (Map.Entry<String, String> entry : caseObservations.entrySet()) {
            Optional<MayoOperationEventService.MayoEventType> maybeType = MayoOperationEventService.MayoEventType.findByName(entry.getKey());
            if (maybeType.isEmpty()) {
                if (!METADATA_OBX_CODES.contains(entry.getKey())) {
                    log.warn("Unrecognized SIU timing OBX '{}' — no MayoEventType, event dropped. caseId={}, hl7MessageId={}",
                            entry.getKey(), caseId, record.getId());
                }
                continue;
            }

            List<EventCategory> categories = eventMap.getOrDefault(maybeType.get(), List.of());
            if (categories.isEmpty()) {
                log.debug("No categories mapped for event '{}', caseId={}, hl7MessageId={}", entry.getKey(), caseId, record.getId());
                continue;
            }

            Instant eventInstant = MayoHL7DateUtils.parseHl7Timestamp(entry.getValue());
            if (eventInstant == null) {
                Instant msh7 = MayoHL7DateUtils.parseHl7Timestamp(record.getRawMessageTimestamp());
                eventInstant = Objects.requireNonNullElseGet(msh7,
                        () -> Objects.requireNonNullElseGet(record.getCreatedDate(), Instant::now));
                log.warn("Timing event '{}' has no parseable timestamp (raw='{}'), using fallback. caseId={}, hl7MessageId={}",
                        entry.getKey(), entry.getValue(), caseId, record.getId());
            }
            Date eventDate = Date.from(eventInstant);

            hl7ProcessingContext.handleTimingEvent(new CaseId(caseId), patientId, Set.copyOf(categories), eventDate, record.getMessageType(), record.getId(), practitioner);
            log.info("Dispatched OR timing event '{}' categories={} caseId={} hl7MessageId={}", entry.getKey(), categories, caseId, record.getId());
        }
    }

    /**
     * Upserts the case, tolerating a concurrent insert of the same (caseId, patient). SIU BEFORE/AFTER
     * messages for one case are dispatched asynchronously and can race: both threads find no existing
     * row and insert, and the loser trips the (case_id, patient_id) unique constraint. Retrying is enough
     * because saveOperation resolves the case inside its own transaction, so the second attempt sees the
     * now-committed row and applies our values as an update, and the failed insert's rollback doesn't
     * poison it.
     */
    private void upsertOperation(Operation incoming, List<String> procedureNames, HL7InboundMessage record) {
        for (int attempt = 0; attempt < 2; attempt++) {
            try {
                hl7ProcessingContext.saveOperation(incoming, procedureNames, record.getId());
                return;
            } catch (DataIntegrityViolationException e) {
                if (attempt == 0) {
                    log.warn("Concurrent SIU insert for caseId={} — retrying as update, hl7MessageId={}",
                            incoming.getCaseId().value(), record.getId());
                    continue;
                }
                throw e;
            }
        }
    }

    /**
     * Builds a map of OBX-3-1 code → OBX-5-1 value for the OBX observations Epic appends to SIU
     * messages. These carry case-specific metadata such as OR_ROOM, SchedulingStatus, and projected
     * procedure timestamps. They are distinct from ORU observations: Epic embeds them directly in the
     * SIU segment stream rather than sending a separate ORU message.
     */
    private Map<String, String> collectCaseObservations(Terser terser) throws HL7Exception {
        Map<String, String> values = new LinkedHashMap<>();
        // Blank set id signals no more segments; HL7Exception means the segment doesn't exist.
        for (int i = 0; i < MAX_OBX_SEGMENTS; i++) {
            String setId;
            try {
                setId = terser.get("/OBX(" + i + ")-1");
            } catch (HL7Exception e) {
                break;
            }
            if (setId == null || setId.isBlank()) break;
            String code = terser.get("/OBX(" + i + ")-3-1"); // OBX-3-1: observation identifier (e.g. OR_ROOM)
            if (code == null || code.isBlank()) continue;
            values.put(code, terser.get("/OBX(" + i + ")-5-1")); // OBX-5-1: observation value
        }
        return values;
    }

    /**
     * True when this SIU carries a case-start event (In Room / Anes Start). Resolving each OBX name
     * through {@link MayoOperationEventService.MayoEventType#findByName} matches the Epic aliases
     * ("Anes Start" as well as "Anesthesia Start") the same way the timing-event dispatch does.
     */
    private boolean carriesCaseStartEvent(Map<String, String> caseObservations) {
        return caseObservations.keySet().stream()
                .map(MayoOperationEventService.MayoEventType::findByName)
                .flatMap(Optional::stream)
                .anyMatch(CASE_START_EVENTS::contains);
    }

    private boolean isCancellation(Map<String, String> caseObservations) {
        String status = caseObservations.get("SchedulingStatus");
        return status != null && (status.equalsIgnoreCase("Canceled") || status.equalsIgnoreCase("Cancelled"));
    }

    /**
     * Collects every procedure name in the message, in message order. Epic groups each procedure in its
     * own repeating RGS resource group, and a multi-procedure case sends one RGS group per procedure, so
     * extracting all procedures requires walking the whole message tree rather than a single segment path.
     * Reads AIS-3-2 (the universal service / procedure name) from every AIS segment, regardless of nesting.
     */
    private List<String> extractProcedureNames(Message message) throws HL7Exception {
        List<Segment> aisSegments = new ArrayList<>();
        collectSegments(message, "AIS", aisSegments);
        List<String> names = new ArrayList<>();
        for (Segment ais : aisSegments) {
            String name = Terser.get(ais, 3, 0, 2, 1); // AIS-3-2: universal service (procedure) name
            if (name != null && !name.isBlank()) names.add(name);
        }
        return names;
    }

    /**
     * Depth-first collects every segment named {@code segmentName} anywhere in the message.
     *
     * <p>Inbound messages parse as a flat {@link ca.uhn.hl7v2.model.GenericMessage}: HAPI folds adjacent
     * repeats of a segment into one structure's repetitions, but names a repeat separated by other segments
     * with an index suffix ({@code AIS}, {@code AIS2}, {@code AIS3}). Matching every suffixed form collects
     * all of them; the recursion additionally handles a nested group tree when one is present.
     */
    private void collectSegments(Group group, String segmentName, List<Segment> out) throws HL7Exception {
        for (String childName : group.getNames()) {
            for (Structure child : group.getAll(childName)) {
                if (child instanceof Group childGroup) {
                    collectSegments(childGroup, segmentName, out);
                } else if (child instanceof Segment segment && isRepeatOf(childName, segmentName)) {
                    out.add(segment);
                }
            }
        }
    }

    /** True when {@code childName} is {@code base} or HAPI's suffixed form of a non-adjacent repeat ({@code base}+digits). */
    private static boolean isRepeatOf(String childName, String base) {
        return childName.equals(base)
                || (childName.startsWith(base) && childName.substring(base.length()).chars().allMatch(Character::isDigit));
    }

    /**
     * Reads the case acuity from PV1-4 (Epic sends "Elec"/"Urg"/"Emerg") and normalizes it to a
     * {@link CaseAcuity} name for storage. Returns null when PV1-4 is absent or blank; a
     * non-blank value we can't map is logged so a new Epic code surfaces rather than vanishing.
     */
    private String resolveAcuity(Terser terser, HL7InboundMessage record) {
        String rawAdmissionType = blankToNull(safeGet(terser, "/PV1-4-1")); // PV1-4: admission/case type
        if (rawAdmissionType == null) {
            return null;
        }
        Optional<CaseAcuity> acuity = CaseAcuity.fromClientValue(rawAdmissionType);
        if (acuity.isEmpty()) {
            log.warn("Unmapped SIU case acuity PV1-4='{}' — hl7MessageId={}", rawAdmissionType, record.getId());
            return null;
        }
        return acuity.get().name();
    }

    /**
     * Reads the ASA physical status classification from ZCS-5, the ASA value Mayo's Epic appends to the
     * custom ZCS Z-segment (e.g. "3-Severe Systemic Disease", or a legacy bare Roman numeral "III").
     * Returns null when ZCS is absent/blank; a non-blank value we can't map is logged so a new Epic
     * encoding surfaces rather than vanishing.
     */
    private AsaStatus resolveAsaStatus(Terser terser, HL7InboundMessage record) {
        String rawAsa = blankToNull(safeGet(terser, "/ZCS-5-1")); // ZCS-5: ASA physical status
        if (rawAsa == null) {
            return null;
        }
        Optional<AsaStatus> asaStatus = AsaStatus.fromClientValue(rawAsa);
        if (asaStatus.isEmpty()) {
            log.warn("Unmapped SIU ASA physical status ZCS-5='{}' — hl7MessageId={}", rawAsa, record.getId());
            return null;
        }
        return asaStatus.get();
    }

    /**
     * Resolves the practitioner who generated the SIU from SCH-20. SCH-20-1 is the Epic person id
     * (PERSONID, the same namespace Mayo's Practitioner FHIR search treats as PERID), so it is
     * find-or-created and FHIR-enriched (role/specialty) exactly like the RAS administering provider,
     * creating a skeleton when Epic has no provider record. Resolution is best-effort: a FHIR failure
     * logs and returns null rather than failing the whole SIU.
     *
     * <p>Returns null only when SCH-20 carries no id, in which case the caller falls back to the AIP
     * anesthesia provider. Note ~two-thirds of SCH-20 values are OpTime service accounts (e.g. "MAYO OPTIME
     * PERIOP NURSE"); these are attributed too and stay skeleton practitioners (no provider record to enrich).
     */
    private Practitioner resolveGeneratingPractitioner(Terser terser) {
        String personId = blankToNull(safeGet(terser, "/SCH-20-1")); // SCH-20-1: the person who generated the SIU (PERSONID)
        if (personId == null) {
            return null;
        }
        String family = safeGet(terser, "/SCH-20-2"); // SCH-20-2: family name
        String given = safeGet(terser, "/SCH-20-3");  // SCH-20-3: given name
        try {
            return hl7ProcessingContext.resolvePractitioner(personId, buildDisplayName(given, family));
        } catch (Exception e) {
            log.warn("Failed to resolve SIU-generating practitioner PERSONID={} — attributing without a practitioner", personId, e);
            return null;
        }
    }

    /** Formats an XCN family/given pair as "given family", or null when both are blank. */
    private static String buildDisplayName(String given, String family) {
        String name = ((given == null ? "" : given) + " " + (family == null ? "" : family)).trim();
        return name.isBlank() ? null : name;
    }

    /**
     * Resolves the anesthesia provider from the AIP personnel rows. Scans for the anesthesia roles,
     * extracts the Mayo PROVID identifier (XCN repetition whose type code is "PROVID"), and looks the
     * practitioner up by clientUserId (Mayo's clientUserId is the PROVID value). Returns null when no
     * anesthesia row carries an identifier (current Epic reality) or none resolves to a Practitioner.
     */
    private Practitioner resolveAnesthesiaProvider(Terser terser) throws HL7Exception {
        Map<String, String> providByRole = new LinkedHashMap<>();
        for (int i = 0; i < MAX_AIP_SEGMENTS; i++) {
            String setId;
            try {
                setId = terser.get("/AIP(" + i + ")-1");
            } catch (HL7Exception e) {
                break;
            }
            if (setId == null || setId.isBlank()) break;

            String roleCode = terser.get("/AIP(" + i + ")-4-1"); // AIP-4-1: resource role code (e.g. 2.10)
            if (roleCode == null || !ANESTHESIA_ROLE_CODES.contains(roleCode)) continue;

            String provid = extractProvid(terser, i);
            if (provid != null) providByRole.putIfAbsent(roleCode, provid);
        }

        return ANESTHESIA_ROLE_CODES.stream()
                .map(providByRole::get)
                .filter(Objects::nonNull)
                .map(practitionerRepository::findByClientUserId)
                .flatMap(Optional::stream)
                .findFirst()
                .orElse(null);
    }

    /** Returns the PROVID-typed identifier from an AIP-3 personnel field (XCN reps), or null. */
    private String extractProvid(Terser terser, int aipIndex) throws HL7Exception {
        for (int j = 0; j < MAX_XCN_REPETITIONS; j++) {
            String id = terser.get("/AIP(" + aipIndex + ")-3(" + j + ")-1"); // XCN.1: id number
            // Use continue (not break) — HL7 permits sparse repetitions, a blank rep doesn't mean the scan is done.
            if (id == null || id.isBlank()) continue;
            String typeAuthority = terser.get("/AIP(" + aipIndex + ")-3(" + j + ")-9");  // XCN.9: assigning authority
            String typeCode = terser.get("/AIP(" + aipIndex + ")-3(" + j + ")-13");      // XCN.13: identifier type code
            if (PROVID.equalsIgnoreCase(typeAuthority) || PROVID.equalsIgnoreCase(typeCode)) return id;
        }
        return null;
    }

    private String extractPmrn(Terser terser) throws HL7Exception {
        for (int i = 0; i < MAX_PID_IDENTIFIERS; i++) {
            String id = terser.get("/PID-3(" + i + ")-1");
            if (id == null || id.isBlank()) break;
            if ("MC".equalsIgnoreCase(terser.get("/PID-3(" + i + ")-5"))) return id;
        }
        return null;
    }

    /** Builds the placeholder patient for a PMRN the tenant has never seen; the caller owns persisting it. */
    private Patient buildSkeletonPatient(String pmrn, Terser terser) throws HL7Exception {
        String lastName = terser.get("/PID-5-1");  // PID-5-1: family name
        String firstName = terser.get("/PID-5-2"); // PID-5-2: given name
        String rawDob = terser.get("/PID-7-1");     // PID-7: date of birth (yyyyMMdd)
        String rawGender = terser.get("/PID-8-1");  // PID-8: administrative sex

        LocalDate dob = MayoHL7DateUtils.parseHl7Date(rawDob);

        Patient skeleton = Patient.builder()
                .pmrn(pmrn)
                .mrn(pmrn)
                .firstName(firstName != null && !firstName.isBlank() ? firstName : null)
                .lastName(lastName != null && !lastName.isBlank() ? lastName : null)
                .dob(dob)
                .gender(rawGender != null && !rawGender.isBlank() ? Gender.convert(rawGender.toUpperCase()) : null)
                .build();

        return skeleton;
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }

    /** Parses an OBX HL7 timestamp value to a Date, or null when the value is absent or unparseable. */
    private static Date parseObxTimestamp(String raw) {
        Instant instant = MayoHL7DateUtils.parseHl7Timestamp(raw);
        return instant != null ? Date.from(instant) : null;
    }

    /** Reads an optional Terser path, returning null when the segment is absent (Terser throws otherwise). */
    private static String safeGet(Terser terser, String path) {
        try {
            return terser.get(path);
        } catch (HL7Exception e) {
            return null;
        }
    }
}
