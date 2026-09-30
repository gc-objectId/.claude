package com.guided.orci.integration.mayo.hl7;

import ca.uhn.hl7v2.HL7Exception;
import ca.uhn.hl7v2.model.Message;
import ca.uhn.hl7v2.util.Terser;
import com.guided.orci.integration.hl7.HL7ProcessingContext;
import com.guided.orci.models.integration.ClientIdMappingEvent;
import com.guided.orci.models.integration.ClientIdMappingEventType;
import com.guided.orci.models.integration.HL7InboundMessage;
import com.guided.orci.models.medication.*;
import com.guided.orci.models.patient.Gender;
import com.guided.orci.models.patient.Operation;
import com.guided.orci.models.patient.Patient;
import com.guided.orci.models.user.Practitioner;
import com.guided.orci.repository.*;
import com.guided.orci.types.Concentration;
import com.guided.orci.types.wrappers.NDC;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Component
public class MayoHL7RasMedAdminProcessor implements MayoHL7MessageProcessor {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(MayoHL7RasMedAdminProcessor.class);

    private final PatientRepository patientRepository;
    private final OperationRepository operationRepository;
    private final ClientMedicationMappingRepository clientMedicationMappingRepository;
    private final MedicationAdministrationRepository medicationAdministrationRepository;
    private final MedicationNDCMappingRepository medicationNdcMappingRepository;
    private final ClientIdMappingEventRepository clientIdMappingEventRepository;
    private final HL7ProcessingContext hl7ProcessingContext;

    public MayoHL7RasMedAdminProcessor(PatientRepository patientRepository, OperationRepository operationRepository, ClientMedicationMappingRepository clientMedicationMappingRepository, MedicationAdministrationRepository medicationAdministrationRepository, MedicationNDCMappingRepository medicationNdcMappingRepository, ClientIdMappingEventRepository clientIdMappingEventRepository, HL7ProcessingContext hl7ProcessingContext) {
        this.patientRepository = patientRepository;
        this.operationRepository = operationRepository;
        this.clientMedicationMappingRepository = clientMedicationMappingRepository;
        this.medicationAdministrationRepository = medicationAdministrationRepository;
        this.medicationNdcMappingRepository = medicationNdcMappingRepository;
        this.clientIdMappingEventRepository = clientIdMappingEventRepository;
        this.hl7ProcessingContext = hl7ProcessingContext;
    }

    private enum AdminType {BOLUS, INFUSION}

    // ClientIdMappingEvent.qualifier values: which identifier an RXA-5 code is, so the integration team
    // knows which mapping table (MedicationNDCMapping vs ClientMedicationMapping) the code belongs to.
    private static final String NDC_QUALIFIER = "NDC";
    private static final String ERX_QUALIFIER = "ERX";

    // RXA-20 completion statuses exactly as Mayo's Epic sends them. Epic uses free text here, not the HL7
    // table-0322 codes, and this interface has two quirks that make the literal spellings worth writing
    // down rather than normalizing away:
    //
    //  * The field is truncated at 12 characters, so longer statuses arrive clipped: "NewBagResear" is
    //    NewBagResearch, "Self Adminis" is Self Administered, "Started/Down" is Started/Downtime.
    //  * The same transition arrives under more than one spelling: "NewBag" and "New  Bag" (two spaces),
    //    "RateChange" and "Rate Changed".
    //
    // Matching the literal values keeps this list an accurate inventory of the feed's vocabulary, and
    // means a status Epic starts sending shows up as unhandled instead of being quietly absorbed by a
    // normalizer. Every value here was observed in Mayo production traffic.
    private static final String CANCEL_COMPLETION_STATUS = "Canceled";

    // Documents a decision NOT to give the drug. These arrive on the same RAS channel as real
    // administrations and carry a full, plausible dose, but nothing reached the patient — persisting one
    // would assert an administration that never happened and feed that dose to the dose rules.
    private static final Set<String> NON_ADMINISTRATION_STATUSES = Set.of(
            "Missed",
            "Pending");

    // Can only describe an infusion: you cannot stop, pause, resume, or re-rate a bolus. Epic reports
    // these with the bag's mass/volume units about as often as with a rate, and often with neither, so
    // the units alone cannot tell them apart from a bolus.
    //
    // "NewBag" and "Given" are deliberately absent despite also describing infusions. Epic reports an IV
    // piggyback as a NewBag/Given carrying the full mass dose and no rate, and that dose is the only
    // record of what the patient received, so those lines stay bolus-routed by their units.
    private static final Set<String> INFUSION_ONLY_STATUSES = Set.of(
            "Stopped",
            "Paused",
            "RateVerify",
            "RateChange",
            "Rate Changed", // same transition as RateChange
            "Restarted");

    // RXA-10 (administering provider) is an XCN. Mayo Epic tags the administering clinician's id with
    // the PERID (Epic person id) marker in the assigning-authority (XCN.9) or id-type (XCN.13) slot.
    private static final String PERID = "PERID";
    private static final int MAX_RXA10_REPETITIONS = 10;

    /**
     * Administering provider parsed from RXA-10: the Epic person id and display name.
     */
    private record AdministeringProvider(String perid, String displayName) {
    }

    /**
     * NDC path: medication resolved via MedicationNDCMapping; no ClientMedicationMapping involved.
     * ERX path: medication resolved via ClientMedicationMapping.clientMedicationIdentifier.
     * Both erxId and ndc are always null-or-valid, sourced from RXA-5 regardless of resolution path.
     */
    private sealed interface MedicationResolution
            permits MedicationResolution.ByNdc, MedicationResolution.ByErx {

        Medication medication();

        String erxId();

        NDC ndc();

        // Concentrations from the source mapping (NDC or ERX). Feed MedicationAdministration's
        // getCalculatedDose() so a volume dose (e.g. mL) resolves to a normalized mass dose; empty
        // when the mapping carries none, in which case no calculated dose is stashed.
        List<Concentration> concentrations();

        record ByNdc(Medication medication, NDC ndc, String erxId, List<Concentration> concentrations)
                implements MedicationResolution {
        }

        record ByErx(Medication medication, ClientMedicationMapping clientMedicationMapping, String erxId,
                     NDC ndc) implements MedicationResolution {
            @Override
            public List<Concentration> concentrations() {
                return clientMedicationMapping.getConcentrations();
            }
        }
    }

    @Override
    public Set<String> supportedMessageTypes() {
        return Set.of("RAS^O17", "RAS^O25");
    }

    @Override
    public void process(Message message, HL7InboundMessage record) {
        Terser terser = new Terser(message);
        if (!hasRxaSegment(terser)) {
            log.debug("RAS message has no RXA segment — order-only event, nothing to administer; skipping — hl7MessageId={}", record.getId());
            return;
        }
        try {
            String completionStatus = terser.get("/RXA-20-1"); // RXA-20: Completion Status. Mayo's Epic sends text values, not HL7 codes: Given, NewBag, RateChange, Canceled.
            if (CANCEL_COMPLETION_STATUS.equalsIgnoreCase(completionStatus)) {
                handleDeletion(terser, record);
                return;
            }

            if (isNonAdministration(completionStatus)) {
                log.info("RAS line documents a non-administration (RXA-20={}) — no drug was given, skipping — hl7MessageId={}",
                        completionStatus, record.getId());
                return;
            }

            Instant adminInstant = MayoHL7DateUtils.parseHl7Timestamp(terser.get("/RXA-3-1")); // RXA-3: Date/Time Start of Administration
            if (adminInstant == null) {
                log.warn("Could not parse administration date from RXA-3 — hl7MessageId={}", record.getId());
                return;
            }
            Date adminDate = Date.from(adminInstant);

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

            // Resolve each RXA-5 identifier independently: we record what every code maps to (or doesn't),
            // not just the one the administration ends up using.
            Rxa5Codes codes = parseRxa5Codes(terser);
            Optional<MedicationNDCMapping> ndcMapping = lookupNdc(codes.ndc());
            Optional<ClientMedicationMapping> erxMapping = lookupErx(codes.erxId());

            Operation operation = findOperation(patient, adminDate, record);

            // Record one mapping event per identifier the message carries — mapped or not — so the
            // integration team can see which drugs are given and add the missing mappings. Recorded
            // regardless of whether an operation is open: unmapped drugs given outside a case window
            // (or before the operation is established) are exactly the ones we'd otherwise never see,
            // so operation is allowed to be null here.
            trackMedicationMappings(codes, ndcMapping, erxMapping, patient, operation, record);

            Optional<MedicationResolution> resolution = resolveMedication(codes, ndcMapping, erxMapping);
            if (resolution.isEmpty()) {
                log.warn("No medication found for RXA-5 identifiers — hl7MessageId={}", record.getId());
                return;
            }

            BigDecimal doseAmount = parseDoseAmount(terser.get("/RXA-6-1")); // RXA-6: Administered Amount
            String doseUnits = terser.get("/RXA-7-1");                       // RXA-7: Administered Units (e.g. "mL", "mcg/kg/min")
            String rawRoute = terser.get("/RXR-1-1");                        // RXR-1: Route of Administration
            MedicationRoute route = MayoRouteMapper.map(rawRoute);           // UNKNOWN when absent or unrecognized; rawRoute keeps what Mayo sent

            MedicationResolution med = resolution.get();
            Medication medication = med.medication();
            ClientMedicationMapping clientMapping = med instanceof MedicationResolution.ByErx e ? e.clientMedicationMapping() : null;
            NDC ndc = med.ndc();
            String erxId = med.erxId();

            // Administration name comes from the RXA-5 display text: prefer the ERX repetition, fall back
            // to the NDC repetition. (Not the resolved Medication's name.)
            String medicationName = extractAdministrationName(terser);

            String clientOrderId = blankToNull(terser.get("/ORC-2-1")); // ORC-2: Placer Order Number
            String administrationSequence = blankToNull(terser.get("/RXA-2-1")); // RXA-2: Administration Sub-ID Counter

            AdminType adminType = detectAdminType(doseUnits, completionStatus);

            // A bolus is defined by the dose it delivered, so one carrying neither an amount nor a unit is
            // uninterpretable rather than zero-dose: it cannot be displayed, summed into a cumulative total,
            // or checked against a maximum. It reaches this point only because nothing identified it as an
            // infusion. In Mayo's feed these are fluid bags — a category the interactive path refuses
            // outright — so persisting one asserts an administration the product deliberately doesn't track.
            //
            // Infusions are exempt: a stop, pause, resume, or rate re-verification legitimately carries no
            // dose, and discarding those would lose the transition. A line carrying one of the two fields is
            // also left alone, because partial data is a different defect that the dose rules abstain on
            // rather than misread. The medication is logged so a non-fluid drug arriving in this shape shows
            // up instead of being discarded silently.
            if (adminType == AdminType.BOLUS && doseAmount == null && blankToNull(doseUnits) == null) {
                log.warn("RAS bolus line has no administered amount or units (RXA-6 and RXA-7 both empty, "
                         + "RXA-20={}, medication={}) — nothing was recorded as given, skipping — hl7MessageId={}",
                        completionStatus, medication.getMedicationIdentifier(), record.getId());
                return;
            }

            // RXA-10: administering provider. Find-or-create (and FHIR-enrich) the Practitioner so the
            // administration records who gave the medication. Provider enrichment is a best-effort
            // add-on — never let it fail the clinical write, so resolution errors degrade to a null
            // practitioner and the administration is still recorded.
            AdministeringProvider provider = extractAdministeringProvider(terser);
            Practitioner documentingPractitioner = null;
            if (provider != null) {
                try {
                    documentingPractitioner = hl7ProcessingContext.resolvePractitioner(provider.perid(), provider.displayName());
                } catch (Exception e) {
                    log.warn("Failed to resolve administering provider PERID={} — recording admin without it, hl7MessageId={}",
                            provider.perid(), record.getId(), e);
                }
            }

            if (adminType == AdminType.INFUSION) {
                InfusionEvent event = buildInfusionEvent(adminDate, doseAmount, doseUnits,
                        completionStatus, mapInfusionEventType(completionStatus), administrationSequence);
                InfusionMedicationAdministration infusion = InfusionMedicationAdministration.builder()
                        .patient(patient)
                        .operation(operation)
                        .medication(medication)
                        .clientMedicationMapping(clientMapping)
                        .ndc(ndc)
                        .medicationIdentifier(medication != null ? medication.getMedicationIdentifier() : null)
                        .medicationName(medicationName)
                        .rawRoute(rawRoute)
                        .route(route)
                        .code(erxId)
                        .codeSystem(erxId != null ? "http://epic.com/meds" : null)
                        .codings(erxId != null ? List.of(MedicationCode.builder().code(erxId).codeSystem("http://epic.com/meds").build()) : List.of())
                        .sourceType(MedicationAdministrationSourceType.EMR)
                        .documentingPractitioner(documentingPractitioner)
                        .administrationSequence(administrationSequence)
                        .source(sourceOf(record))
                        .infusionEvents(new ArrayList<>(List.of(event)))
                        .build();
                // The context resolves the MedicationOrder by clientOrderId and appends this event to the
                // order's existing infusion (it can reach MedicationService / the lazy order graph in a tx).
                //
                // A line may establish the infusion record only if it reports activity — a non-zero rate.
                // That is what makes the record usable: an infusion whose events carry no rate reads
                // downstream as a drip that never ran, so a bare stop, pause, or resume must attach to an
                // infusion we already know about rather than conjure one. A rate-bearing line may establish
                // it whatever its status, which is what lets an infusion continued from another order start
                // life at its first rate re-attestation.
                if (event.hasActivity()) {
                    hl7ProcessingContext.saveInfusionAdmin(infusion, operation, clientOrderId, record.getId());
                } else {
                    hl7ProcessingContext.appendInfusionEvent(infusion, operation, clientOrderId, record.getId());
                }
            } else {
                MedicationAdministration medAdmin = MedicationAdministration.builder()
                        .patient(patient)
                        .operation(operation)
                        .medication(medication)
                        .clientMedicationMapping(clientMapping)
                        .ndc(ndc)
                        .medicationIdentifier(medication != null ? medication.getMedicationIdentifier() : null)
                        .medicationName(medicationName)
                        .administrationDate(adminDate)
                        .doseAmount(doseAmount)
                        .doseUnits(doseUnits)
                        // RXA-20 verbatim. Epic's completion status is what distinguishes a delivered dose
                        // from a transition on a running infusion, so without it a persisted row can't be
                        // interpreted after the fact.
                        .rawAction(completionStatus)
                        .source(sourceOf(record))
                        .rawRoute(rawRoute)
                        .route(route)
                        .code(erxId)
                        .codeSystem(erxId != null ? "http://epic.com/meds" : null)
                        .codings(erxId != null ? List.of(MedicationCode.builder().code(erxId).codeSystem("http://epic.com/meds").build()) : List.of())
                        .sourceType(MedicationAdministrationSourceType.EMR)
                        .documentingPractitioner(documentingPractitioner)
                        // Raw documenter identifier: the RXA-10 PERID (Epic user id) of the administering
                        // clinician. Stored independently of practitioner resolution so it survives even
                        // when the practitioner lookup fails, and independently of documentedBy (no ORCI
                        // user backs an inbound EMR administration).
                        .documentingUser(provider != null ? provider.perid() : null)
                        .administrationSequence(administrationSequence)
                        .concentrations(med.concentrations())
                        .build();
                // Stash the dose, converted from a volume to a mass when the mapping carries a single
                // usable concentration and left as administered otherwise. Empty, and so left null,
                // only for a line carrying an amount with no units, which the check above lets through.
                medAdmin.getCalculatedDose().ifPresent(dose -> {
                    medAdmin.setCalculatedDoseAmount(dose.getValue());
                    medAdmin.setCalculatedDoseUnits(dose.getUnit());
                });
                hl7ProcessingContext.saveMedAdmin(medAdmin, operation, clientOrderId, record.getId());
            }

        } catch (HL7Exception e) {
            log.error("Failed to extract fields from RAS message — hl7MessageId={}", record.getId(), e);
        }
    }

    private void handleDeletion(Terser terser, HL7InboundMessage record) throws HL7Exception {
        String pmrn = extractPmrn(terser);
        if (pmrn == null) {
            log.warn("RAS cancel: could not extract PMRN from PID-3 — hl7MessageId={}", record.getId());
            return;
        }

        Instant adminInstant = MayoHL7DateUtils.parseHl7Timestamp(terser.get("/RXA-3-1")); // RXA-3: Date/Time Start of Administration
        if (adminInstant == null) {
            log.warn("RAS cancel: could not parse admin date from RXA-3 — hl7MessageId={}", record.getId());
            return;
        }
        Date adminDate = Date.from(adminInstant);

        Rxa5Codes codes = parseRxa5Codes(terser);
        Optional<MedicationNDCMapping> ndcMapping = lookupNdc(codes.ndc());
        Optional<ClientMedicationMapping> erxMapping = lookupErx(codes.erxId());
        Optional<MedicationResolution> resolution = resolveMedication(codes, ndcMapping, erxMapping);

        // A cancel is a mapping attempt like any administration — track it, skeletoning the patient if
        // unseen (operation may be null), regardless of whether the code resolved.
        Patient patient = patientRepository.findByPmrn(pmrn);
        if (patient == null) {
            patient = createSkeletonPatient(pmrn, terser);
        }
        trackMedicationMappings(codes, ndcMapping, erxMapping, patient, findOperation(patient, adminDate, record), record);

        if (resolution.isEmpty()) {
            log.warn("RAS cancel: no medication found for RXA-5 identifiers — hl7MessageId={}", record.getId());
            return;
        }

        Medication medication = resolution.get().medication();
        if (medication == null || medication.getMedicationIdentifier() == null) {
            log.warn("RAS cancel: resolved medication has no identifier — hl7MessageId={}", record.getId());
            return;
        }

        String clientOrderId = blankToNull(terser.get("/ORC-2-1"));
        String administrationSequence = blankToNull(terser.get("/RXA-2-1"));
        String doseUnits = terser.get("/RXA-7-1"); // RXA-7: Administered Units — determines infusion vs bolus

        // Infusion cancellations are matched via order + medication + sequence inside the context,
        // which has full access to the order graph. Bolus cancellations use the repository directly.
        // A cancel's own RXA-20 is "Canceled", which says nothing about what is being retracted, so the
        // dose units are the only signal here.
        if (detectAdminType(doseUnits, CANCEL_COMPLETION_STATUS) == AdminType.INFUSION) {
            hl7ProcessingContext.cancelInfusionAdmin(pmrn, medication.getMedicationIdentifier(),
                    administrationSequence, clientOrderId, record.getId());
            return;
        }

        // Bolus cancellation: prefer precise lookup by (order, medication, sequence) when available.
        // Falls back to the date-rounded match for messages missing the order or sequence.
        Optional<MedicationAdministration> target = Optional.empty();
        if (clientOrderId != null && administrationSequence != null) {
            target = medicationAdministrationRepository.findByOrderAndMedicationAndSequence(
                    pmrn, medication.getMedicationIdentifier(), administrationSequence,
                    clientOrderId, MedicationAdministrationSourceType.EMR);
        }

        if (target.isEmpty()) {
            List<MedicationAdministration> candidates = medicationAdministrationRepository
                    .findByPmrnAndMedicationIdentifierAndAdminDateRoundedToMinute(
                            pmrn, medication.getMedicationIdentifier(), adminDate, MedicationAdministrationSourceType.EMR);
            if (candidates.isEmpty()) {
                log.warn("RAS cancel: no matching MedicationAdministration found — hl7MessageId={}", record.getId());
                return;
            }
            if (candidates.size() > 1) {
                log.warn("RAS cancel: {} candidates — cancelling most recent, hl7MessageId={}", candidates.size(), record.getId());
            }
            target = Optional.of(candidates.getFirst());
        }

        hl7ProcessingContext.deleteMedAdmin(target.get(), record.getId());
    }

    private Patient createSkeletonPatient(String pmrn, Terser terser) throws HL7Exception {
        String lastName = terser.get("/PID-5-1");   // PID-5-1: Patient family name
        String firstName = terser.get("/PID-5-2"); // PID-5-2: Patient given name
        String rawDob = terser.get("/PID-7-1");    // PID-7: Date/Time of Birth (yyyyMMdd)
        String rawGender = terser.get("/PID-8-1"); // PID-8: Administrative Sex (M/F/O/U)

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

    // RXA-5 (administered code) is a repeating field. Epic sends the NDC (coding system "NDC" or
    // "REPNDC") in one repetition and the Epic/ERX medication id in another; some feeds instead
    // carry the ERX as the alternate identifier (component 4) of the NDC repetition. Walk a few
    // repetitions so both layouts resolve.
    private static final int MAX_RXA5_REPETITIONS = 5;

    /**
     * Resolves the medication from RXA-5. NDCs are stored without dashes, so we strip them before
     * lookup/persist. Priority: NDC (MedicationNDCMapping) → ERX (ClientMedicationMapping).
     * <p>
     * NDC is a standard identifier: a given NDC means the same drug for every client, so it's the
     * primary lookup. ERX is the client-specific Epic medication id; it's the fallback for what NDCs
     * can't express — mixtures and custom/compounded meds that have no NDC.
     * <p>
     * Both erxId and ndc (when present in the message) are carried on whichever resolution wins.
     */
    private Optional<MedicationResolution> resolveMedication(Rxa5Codes codes, Optional<MedicationNDCMapping> ndcMapping,
                                                             Optional<ClientMedicationMapping> erxMapping) {
        // 1. NDC — standard identifier, same drug for every client.
        if (ndcMapping.isPresent()) {
            MedicationNDCMapping mapping = ndcMapping.get();
            return Optional.of(new MedicationResolution.ByNdc(mapping.getMedication(), codes.ndc(), codes.erxId(),
                    mapping.getConcentrations()));
        }
        // 2. ERX fallback — for mixtures / custom meds with no NDC (or an NDC we can't map).
        if (erxMapping.isPresent()) {
            ClientMedicationMapping mapping = erxMapping.get();
            return Optional.of(new MedicationResolution.ByErx(mapping.getMedication(), mapping, codes.erxId(), codes.ndc()));
        }
        return Optional.empty();
    }

    /**
     * Looks up the internal Medication an NDC maps to; empty when the NDC is absent or unmapped.
     */
    private Optional<MedicationNDCMapping> lookupNdc(NDC ndc) {
        if (ndc == null) return Optional.empty();
        return medicationNdcMappingRepository.findByNdc(ndc);
    }

    /**
     * Looks up the ClientMedicationMapping an Epic ERX id maps to; empty when the ERX is absent or unmapped.
     */
    private Optional<ClientMedicationMapping> lookupErx(String erxId) {
        if (erxId == null) return Optional.empty();
        return clientMedicationMappingRepository.findByClientMedicationIdentifier(erxId);
    }

    /**
     * The NDC (dashes stripped) and Epic ERX id carried in RXA-5, either of which may be null.
     */
    private record Rxa5Codes(NDC ndc, String erxId) {
    }

    /**
     * Parses the NDC and ERX identifiers from the repeating RXA-5 field. See {@link #resolveMedication}
     * for the layouts Epic uses; this is the shared reader so the unmapped-tracking path sees the same
     * codes the resolution attempted.
     */
    private Rxa5Codes parseRxa5Codes(Terser terser) throws HL7Exception {
        NDC ndc = null;
        String erxId = null;
        for (int rep = 0; rep < MAX_RXA5_REPETITIONS; rep++) {
            String id = terser.get("/RXA-5(" + rep + ")-1");     // identifier for this repetition
            if (id == null || id.isBlank()) break;
            String system = terser.get("/RXA-5(" + rep + ")-3"); // coding system, e.g. "NDC"/"REPNDC"
            if (isNdcCodingSystem(system)) {
                if (ndc == null) ndc = new NDC(stripDashes(id));
                // Legacy layout: ERX carried as the alternate identifier (component 4) of the NDC repetition.
                String alternate = terser.get("/RXA-5(" + rep + ")-4");
                if (erxId == null && alternate != null && !alternate.isBlank()) erxId = alternate;
            } else if (erxId == null) {
                erxId = id;
            }
        }
        return new Rxa5Codes(ndc, erxId);
    }

    // Epic sends NDC coding systems as "NDC" or "REPNDC" (represented NDC). Exact set, not endsWith(),
    // so an unrelated future system that merely ends in "NDC" isn't misread as an NDC. Extend when we
    // confirm new variants.
    private static final Set<String> NDC_CODING_SYSTEMS = Set.of("NDC", "REPNDC");

    private static boolean isNdcCodingSystem(String system) {
        return system != null && NDC_CODING_SYSTEMS.contains(system.trim().toUpperCase());
    }

    /**
     * The administration display name from RXA-5 component 2: prefer the ERX repetition's text, fall back
     * to the NDC repetition's text. Null if neither repetition carries a name.
     */
    private static String extractAdministrationName(Terser terser) throws HL7Exception {
        String ndcName = null;
        String erxName = null;
        for (int rep = 0; rep < MAX_RXA5_REPETITIONS; rep++) {
            String id = terser.get("/RXA-5(" + rep + ")-1");
            if (id == null || id.isBlank()) break;
            String name = blankToNull(terser.get("/RXA-5(" + rep + ")-2"));
            if (isNdcCodingSystem(terser.get("/RXA-5(" + rep + ")-3"))) {
                if (ndcName == null) ndcName = name;
            } else if (erxName == null) {
                erxName = name;
            }
        }
        return erxName != null ? erxName : ndcName;
    }

    /**
     * NDCs are stored and looked up without dashes.
     */
    private static String stripDashes(String value) {
        return value.replace("-", "");
    }

    private static String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value;
    }

    /**
     * Provenance for an administration: the inbound-message row holding the RAS text it was parsed from.
     * The row id rather than MSH-10, because replays are expected on this feed so the message control id is
     * not unique here. Provenance must never be the reason a clinical write fails, hence the null guard.
     */
    private static String sourceOf(HL7InboundMessage record) {
        return record.getId() != null ? record.getId().toString() : null;
    }

    // TODO: also detect infusion via route code (e.g. IVPB, DRIP) once we have
    //       confirmed what Mayo sends in RXR-1 for continuous infusions.
    /**
     * Bolus vs infusion. A rate (a dose unit with a time denominator) is the primary signal, and it is the
     * only one available for a status Epic uses both ways: "Given" and "NewBag" describe boluses and
     * infusions alike, so for those the units decide.
     * <p>
     * A status that can only describe an infusion is the secondary signal. Those lines report a bag that is
     * already hanging and carry its mass/volume units as readily as a rate — or no units at all — so
     * without this a "Stopped" on a 2 g piggyback reads as a 0 g bolus.
     * <p>
     * Whether such a line may also <em>establish</em> the infusion is a separate question, answered by
     * {@link InfusionEvent#hasActivity()} at the call site rather than by the status.
     */
    private AdminType detectAdminType(String doseUnits, String completionStatus) {
        if (doseUnits != null && hasTimeDenominator(doseUnits)) {
            return AdminType.INFUSION;
        }
        if (isInfusionOnlyStatus(completionStatus)) {
            return AdminType.INFUSION;
        }
        return AdminType.BOLUS;
    }

    // Null-guarded because Set.of() rejects a null lookup, and RXA-20 is absent on some messages.
    private static boolean isInfusionOnlyStatus(String completionStatus) {
        return completionStatus != null && INFUSION_ONLY_STATUSES.contains(completionStatus.trim());
    }

    private static boolean isNonAdministration(String completionStatus) {
        return completionStatus != null && NON_ADMINISTRATION_STATUSES.contains(completionStatus.trim());
    }

    private static boolean hasTimeDenominator(String units) {
        String lower = units.toLowerCase();
        return lower.contains("/hr") || lower.contains("/hour")
               || lower.contains("/min") || lower.contains("/h");
    }

    /**
     * Maps the RXA-20 action string to an infusion event type. Mayo's Epic sends text values
     * (not HL7 table-0322 codes): "NewBag" and "Given" start the infusion, "Restarted" resumes a
     * previously stopped bag and "Continued OR" carries a drip started before the case into it (both
     * START), "RateChange" adjusts the rate on a running bag, "RateVerify" re-attests the current rate
     * without changing it, "Stopped" ends the bag and "Paused" suspends it until a "Restarted".
     * Unknown actions are ignored.
     * <p>
     * An action that lands on IGNORED leaves the infusion with no usable event, which reads downstream as
     * a drip that never ran — so an unmapped action is not a harmless no-op, and new values Epic starts
     * sending belong here.
     * <p>
     * Bolus-vs-infusion routing is decided separately in {@link #detectAdminType}.
     */
    private static InfusionEventType mapInfusionEventType(String rawAction) {
        if (rawAction == null) return InfusionEventType.START;
        return switch (rawAction.trim()) {
            case "RateChange", "Rate Changed" -> InfusionEventType.RATE_CHANGE;
            case "RateVerify" -> InfusionEventType.RATE_DOSE_VERIFY;
            case "Stopped", "Paused" -> InfusionEventType.STOP;
            // "New  Bag" and "NewBagResear" are the same transition as "NewBag"; see the status inventory.
            case "NewBag", "New  Bag", "NewBagResear",
                 "Given", "Restarted", "Continued OR" -> InfusionEventType.START;
            default -> {
                // An action that lands on IGNORED leaves the infusion with no usable event, which reads
                // downstream as a drip that never ran. Log it so a status Epic adds gets handled rather
                // than silently discarded.
                log.warn("Unmapped Mayo RAS infusion action (RXA-20): {}", rawAction);
                yield InfusionEventType.IGNORED;
            }
        };
    }

    private static InfusionEvent buildInfusionEvent(Date eventDate, BigDecimal doseAmount, String doseUnits,
                                                    String rawAction, InfusionEventType eventType,
                                                    String administrationSequence) {
        InfusionEvent.InfusionEventBuilder builder = InfusionEvent.builder()
                .eventDate(eventDate)
                .eventType(eventType)
                .administrationSequence(administrationSequence)
                .rawAction(rawAction);

        if (doseAmount != null && doseUnits != null && !doseUnits.isBlank()) {
            Rate.parseRate(doseAmount, doseUnits).onOk(builder::rate);
        }

        return builder.build();
    }

    private static boolean hasRxaSegment(Terser terser) {
        try {
            terser.get("/RXA-1-1");
            return true;
        } catch (HL7Exception e) {
            return false;
        }
    }

    /**
     * Reads the administering provider from RXA-10 (XCN, repeating). Mayo Epic sends the Epic person
     * id (PERID) as the identifier: XCN.1 is the id, XCN.2/XCN.3 the family/given name, and XCN.9 /
     * XCN.13 carry the "PERID" assigning-authority / identifier-type marker. Returns null when no
     * repetition carries a PERID-typed id.
     */
    private AdministeringProvider extractAdministeringProvider(Terser terser) throws HL7Exception {
        for (int rep = 0; rep < MAX_RXA10_REPETITIONS; rep++) {
            String id = terser.get("/RXA-10(" + rep + ")-1"); // XCN.1: id number
            // Use continue (not break) — HL7 permits sparse repetitions, a blank rep doesn't end the scan.
            if (id == null || id.isBlank()) continue;
            String assigningAuthority = terser.get("/RXA-10(" + rep + ")-9"); // XCN.9: assigning authority
            String identifierType = terser.get("/RXA-10(" + rep + ")-13");    // XCN.13: identifier type code
            if (PERID.equalsIgnoreCase(assigningAuthority) || PERID.equalsIgnoreCase(identifierType)) {
                String family = terser.get("/RXA-10(" + rep + ")-2"); // XCN.2: family name
                String given = terser.get("/RXA-10(" + rep + ")-3");  // XCN.3: given name
                return new AdministeringProvider(id, buildDisplayName(given, family));
            }
        }
        return null;
    }

    /**
     * "given family" for the practitioner stub; FHIR enrichment overrides it when the PERID resolves.
     */
    private static String buildDisplayName(String given, String family) {
        String g = blankToNull(given);
        String f = blankToNull(family);
        if (g != null && f != null) return g + " " + f;
        return g != null ? g : f;
    }

    private String extractPmrn(Terser terser) throws HL7Exception {
        // Terser doesn't expose a repetition count, so we bound the scan; blank value means no more reps.
        for (int i = 0; i < 10; i++) {
            String id = terser.get("/PID-3(" + i + ")-1");
            if (id == null || id.isBlank()) break;
            if ("MC".equalsIgnoreCase(terser.get("/PID-3(" + i + ")-5"))) return id;
        }
        return null;
    }

    /**
     * Records one {@link ClientIdMappingEvent} per RXA-5 identifier the message carries (NDC and/or ERX),
     * mapped or not, so the integration team can see which drugs are given during a case, rank them by
     * frequency, and add any missing mappings. Each event holds the external code we were sent, a
     * qualifier for which table it belongs to (NDC vs ERX), and the internal medication identifier that
     * code resolved to — or null when we couldn't map it. A message that carries both a mappable and an
     * unmappable identifier therefore produces two rows: one with an internal value, one without.
     * <p>
     * Tracking is independent of whether the administration itself is persisted and of whether an
     * operation is open ({@code operation} may be null); an unresolved code given outside a case window
     * is still recorded here even though we can't run rules on the drug.
     */
    private void trackMedicationMappings(Rxa5Codes codes, Optional<MedicationNDCMapping> ndcMapping,
                                         Optional<ClientMedicationMapping> erxMapping,
                                         Patient patient, Operation operation, HL7InboundMessage record) {
        List<ClientIdMappingEvent> events = new ArrayList<>();
        if (codes.ndc() != null) {
            String internal = ndcMapping
                    .map(MedicationNDCMapping::getMedication)
                    .map(Medication::getMedicationIdentifier)
                    .orElse(null);
            events.add(buildMappingEvent(codes.ndc().value(), NDC_QUALIFIER, internal, patient, operation));
        }
        if (codes.erxId() != null) {
            String internal = erxMapping
                    .map(ClientMedicationMapping::getMedication)
                    .map(Medication::getMedicationIdentifier)
                    .orElse(null);
            events.add(buildMappingEvent(codes.erxId(), ERX_QUALIFIER, internal, patient, operation));
        }
        if (events.isEmpty()) return; // message carried no RXA-5 identifier

        clientIdMappingEventRepository.saveAll(events);
        log.info("Tracked {} RXA-5 medication mapping(s) for patient={} operation={} — hl7MessageId={}",
                events.size(), patient.getId(), operation != null ? operation.getId() : null, record.getId());
    }

    private static ClientIdMappingEvent buildMappingEvent(String externalCode, String qualifier, String internalValue,
                                                          Patient patient, Operation operation) {
        return ClientIdMappingEvent.builder()
                .type(ClientIdMappingEventType.Medication)
                .externalValue(externalCode)
                .internalValue(internalValue)
                .qualifier(qualifier)
                .patient(patient)
                .operation(operation)
                .build();
    }

    /**
     * The operation whose window covers this administration, or null when none does. Callers persist the
     * administration either way.
     * <p>
     * Most administrations on this hospital-wide feed belong to no OR case, so a miss is expected. One that
     * does belong to a case can miss too, because the window is read as it stands at ingest and moves after
     * it. Those are claimed at case stop by attachUnlinkedAdministrations in orci's
     * MedicationAdministrationService — but only bolus rows whose time falls inside the settled window. That
     * sweep is a bulk update on MedicationAdministration alone, so the infusions this method also feeds keep
     * a null operation permanently.
     */
    private Operation findOperation(Patient patient, Date adminDate, HL7InboundMessage record) {
        List<Operation> ops = operationRepository.findOperationBasedOnStartTime(patient, adminDate);
        if (ops.isEmpty()) {
            log.debug("Administration matched no operation window — hl7MessageId={}", record.getId());
            return null;
        }
        if (ops.size() > 1) {
            log.warn("{} operations match — using most recent, hl7MessageId={}", ops.size(), record.getId());
        }
        return ops.getFirst();
    }

    private static BigDecimal parseDoseAmount(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return new BigDecimal(value.trim());
        } catch (NumberFormatException e) {
            log.warn("Could not parse dose amount: {}", value);
            return null;
        }
    }

}
