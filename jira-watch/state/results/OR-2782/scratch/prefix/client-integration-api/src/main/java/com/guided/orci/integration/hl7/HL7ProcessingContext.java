package com.guided.orci.integration.hl7;

import com.guided.orci.models.medication.InfusionMedicationAdministration;
import com.guided.orci.models.medication.MedicationAdministration;
import com.guided.orci.models.observation.ObservationUpdate;
import com.guided.orci.models.operation.EventCategory;
import com.guided.orci.models.patient.Operation;
import com.guided.orci.models.user.Practitioner;
import com.guided.orci.types.wrappers.CaseId;
import com.guided.orci.models.patient.Patient;
import com.guided.orci.types.wrappers.PatientId;

import java.util.Date;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Callback interface for HL7 message processors to persist domain models and fire downstream events.
 * Implemented in the core application layer so that integration modules stay free of service-layer imports.
 */
public interface HL7ProcessingContext {

    /**
     * Saves a medication administration, links it back to the source HL7 inbound message,
     * registers post-commit compliance evaluation, and fires a MedicationAdministrationEvent.
     *
     * @param medAdmin            the built MedicationAdministration (patient must be set)
     * @param operation           the resolved operation, or null if not found
     * @param clientOrderId       the placer order id (ORC-2); when present, the admin is linked to a
     *                            find-or-created MedicationOrder. May be null when the message carries no order.
     * @param hl7InboundMessageId the id of the originating HL7InboundMessage record
     */
    void saveMedAdmin(MedicationAdministration medAdmin, Operation operation, String clientOrderId, UUID hl7InboundMessageId);

    /**
     * Saves an infusion medication administration from an HL7 RAS message,
     * clears the patient cache, and fires a MedicationAdministrationEvent.
     *
     * <p>When {@code clientOrderId} is present, the infusion is correlated to a find-or-created
     * MedicationOrder: if that order already has an infusion for the same medication, the incoming
     * event(s) are appended to it (rate changes, additional starts) rather than creating a new record.
     *
     * @param medAdmin            the built InfusionMedicationAdministration (patient must be set)
     * @param operation           the resolved operation, or null if not found
     * @param clientOrderId       the placer order id (ORC-2), used to correlate events to one infusion. May be null.
     * @param hl7InboundMessageId the id of the originating HL7InboundMessage record
     */
    void saveInfusionAdmin(InfusionMedicationAdministration medAdmin, Operation operation, String clientOrderId, UUID hl7InboundMessageId);

    /**
     * Appends the carried event(s) to the infusion the order already holds for the same medication, never
     * creating a record. For RAS lines that report a transition on a running infusion — stopped, paused,
     * rate re-verified — rather than a dose being delivered: they carry no administered amount, so they
     * cannot establish an administration on their own.
     *
     * <p>When the order has no infusion for the medication (or carries no order id at all), the transition
     * is logged and dropped. A stop with no start means the starting event never reached us, which is an
     * ingestion gap to surface — creating a record from it would leave an infusion whose only event ends it,
     * indistinguishable downstream from a drip that never ran.
     *
     * @param medAdmin            the built InfusionMedicationAdministration carrying the transition event
     * @param operation           the resolved operation, or null if not found
     * @param clientOrderId       the placer order id (ORC-2) used to locate the infusion; null causes a drop
     * @param hl7InboundMessageId the id of the originating HL7InboundMessage record
     */
    void appendInfusionEvent(InfusionMedicationAdministration medAdmin, Operation operation, String clientOrderId, UUID hl7InboundMessageId);

    /**
     * Soft-deletes a medication administration in response to an HL7 cancellation (RXA-20 = "D"),
     * clears the patient cache, and fires a MedicationAdministrationCancelledEvent.
     *
     * @param medAdmin            the existing MedicationAdministration to delete
     * @param hl7InboundMessageId the id of the originating HL7InboundMessage record
     */
    void deleteMedAdmin(MedicationAdministration medAdmin, UUID hl7InboundMessageId);

    /**
     * Cancels a single infusion administration event in response to an HL7 RAS cancellation whose dose
     * units indicate a continuous infusion (RXA-20 = "Canceled", RXA-7 has a time denominator such as
     * mcg/kg/min). An infusion is one record per (order, medication) holding a stream of events keyed by
     * RXA-2 sub-id (one event per sub-id after edit-upsert), so a cancel drops just the event with that
     * sub-id — cancelling a rate change must not tear down the whole running infusion. Finds the
     * InfusionMedicationAdministration by (patient PMRN, order, medication identifier), removes the event
     * whose sub-id matches, clears the patient cache, and fires a MedicationAdministrationCancelledEvent.
     * When that was the last event, the record itself is soft-deleted.
     *
     * <p>Logs a warning and no-ops when {@code clientOrderId} or {@code administrationSequence} is null —
     * infusion cancellations without both cannot be matched precisely.
     *
     * @param pmrn                   patient PMRN from PID-3
     * @param medicationIdentifier   the internal medication identifier resolved from RXA-5
     * @param administrationSequence RXA-2 administration sub-id counter of the event to cancel; null causes a warning and no-op
     * @param clientOrderId          ORC-2 placer order number; null causes a warning and no-op
     * @param hl7InboundMessageId    the id of the originating HL7InboundMessage record
     */
    void cancelInfusionAdmin(String pmrn, String medicationIdentifier,
                             String administrationSequence, String clientOrderId,
                             UUID hl7InboundMessageId);

    /**
     * Applies a batch of observation updates extracted from an HL7 ORU^R01 message (each pairing a
     * parsed observation with its OBX-11 action) and clears the patient cache after commit.
     *
     * @param updates             the built ObservationUpdates (patient must be set on each observation)
     * @param hl7InboundMessageId the id of the originating HL7InboundMessage record
     */
    void saveObservations(List<ObservationUpdate> updates, UUID hl7InboundMessageId);

    /**
     * Upserts a surgical case (Operation) extracted from an HL7 SIU scheduling message,
     * resolving and attaching procedure types from the supplied procedure names (AIS-3-2),
     * then clears the patient cache after commit. Procedure-type resolution emits the same
     * mapping audit records as the normal case-launch flow, so unmapped names are
     * tracked for the integration team.
     *
     * <p>Pass the case exactly as parsed from the message. Do not look the stored case up and mutate it:
     * the implementation resolves it inside its own transaction and copies only the fields a scheduling
     * message owns. A caller-side lookup yields a detached snapshot whose clock columns
     * (start/end/reportable/procedure/induction/extubation times) are whatever they were when it was
     * read, and those columns are written by timing events through targeted JPQL that a snapshot cannot
     * see, so handing one back re-persists stale values. Leave fields the message omits null; the
     * implementation preserves the stored value rather than overwriting it, and never copies a clock
     * column at all.
     *
     * <p>Retry on {@link org.springframework.dao.DataIntegrityViolationException} to absorb a concurrent
     * insert of the same (caseId, patient): the second attempt resolves the row the other writer
     * committed and applies the same values as an update.
     *
     * @param operation           the Operation as parsed from the message (patient and caseId must be set)
     * @param procedureNames      AIS-3-2 procedure names to map to ProcedureTypes via NAME codes (may be empty)
     * @param hl7InboundMessageId the id of the originating HL7InboundMessage record
     */
    void saveOperation(Operation operation, List<String> procedureNames, UUID hl7InboundMessageId);

    /**
     * Fires OR timing-event categories for a case identified by the supplied caseId.
     * Called from SIU processors when an OBX whose identifier matches a known Mayo event
     * name (e.g. "In Room") maps to one or more known EventCategories.
     *
     * @param caseId              case the event belongs to
     * @param patientId           patient PMRN; passed from the SIU PID segment so downstream
     *                            case-start logic can call FHIR without a separate DB lookup
     * @param categories          event categories to fire
     * @param eventDate           time the milestone occurred; may be null
     * @param sourceEventType     HL7 message type that triggered this event (e.g. "SIU^S14")
     * @param hl7InboundMessageId originating HL7 message id
     * @param practitioner        the practitioner who generated this event (Mayo: SCH-20 on the SIU), or
     *                            null. Rides the event so case-start handling attributes it as the
     *                            {@code Operation.primaryPractitioner} and rule evaluation uses it as the
     *                            evaluating practitioner.
     */
    void handleTimingEvent(CaseId caseId, PatientId patientId, Set<EventCategory> categories, Date eventDate, String sourceEventType, UUID hl7InboundMessageId, Practitioner practitioner);

    /**
     * Find-or-creates the Practitioner identified by an Epic person id parsed from an HL7 message
     * (e.g. the administering provider in RAS {@code RXA-10}), enriching it from the tenant's Epic
     * FHIR API when possible and falling back to a name-only stub otherwise. Runs outside the
     * persistence transaction so the FHIR call never holds a DB transaction open.
     *
     * @param epicPersonId the Epic person id (Mayo PERID); the practitioner's find-or-create key
     * @param displayName  the provider's name from the HL7 message, used for the stub fallback
     * @return the resolved Practitioner, or null when {@code epicPersonId} is blank or resolution fails
     */
    Practitioner resolvePractitioner(String epicPersonId, String displayName);

    /**
     * Find-or-creates a patient by PMRN, serialized per patient so two messages for a patient that does
     * not exist yet cannot both insert it.
     *
     * <p>Inbound messages are handled on a thread pool across application nodes, and a patient's first
     * two messages routinely arrive together (Mayo sends one OR milestone per SIU). An unserialized
     * find-then-insert lets both threads see no row and insert: the loser trips the PMRN unique
     * constraint, and because the processor's own message was already acknowledged and is never retried,
     * everything that message carried - its timing milestone included - is lost. Serializing is what
     * turns that into a read of the winner's row.
     *
     * <p>Implementations must take the patient lock as the first database action of the enclosing
     * transaction and re-check for the row inside it; the caller's own earlier lookup is only a fast
     * path and cannot be trusted once a contender may have committed.
     *
     * @param patientId the PMRN to resolve; the find-or-create key
     * @param skeleton  the patient to insert if none exists, built by the caller from its message
     * @return the existing patient when one is found, otherwise the newly inserted {@code skeleton}
     */
    Patient findOrCreatePatient(PatientId patientId, Patient skeleton);
}
