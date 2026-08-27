package com.guided.orci.service.hl7;

import com.github.f4b6a3.uuid.UuidCreator;
import com.guided.orci.dto.GuidanceDTO;
import com.guided.orci.dto.rule.context.ContextPatient;
import com.guided.orci.engine.ScheduledRuleEngine;
import com.guided.orci.events.EventCategoryEvent;
import com.guided.orci.events.MedicationAdministrationCancelledEvent;
import com.guided.orci.events.MedicationAdministrationEvent;
import com.guided.orci.integration.hl7.HL7ProcessingContext;
import com.guided.orci.models.medication.*;
import com.guided.orci.models.observation.Observation;
import com.guided.orci.models.observation.ObservationType;
import com.guided.orci.models.observation.ObservationUpdate;
import com.guided.orci.models.operation.EventCategory;
import com.guided.orci.models.patient.Operation;
import com.guided.orci.models.patient.Patient;
import com.guided.orci.models.procedure.ProcedureType;
import com.guided.orci.models.procedure.QualifiedProcedureType;
import com.guided.orci.models.user.Practitioner;
import com.guided.orci.multitenancy.context.TenantContextHolder;
import com.guided.orci.repository.InfusionMedicationAdministrationRepository;
import com.guided.orci.repository.MedicationRepository;
import com.guided.orci.repository.OperationRepository;
import com.guided.orci.repository.PatientRepository;
import com.guided.orci.service.*;
import com.guided.orci.service.medication.MedicationService;
import com.guided.orci.service.rules.compliance.RuleComplianceService;
import com.guided.orci.service.rules.medication.EMRAdministeredMedicationProcessor;
import com.guided.orci.types.wrappers.CaseId;
import com.guided.orci.service.PatientRefreshLock;
import com.guided.orci.types.wrappers.PatientId;
import com.guided.orci.utils.AvroUtils;
import com.guided.orci.utils.TenantUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Slf4j
public class DefaultHL7ProcessingContext implements HL7ProcessingContext {

    private final MedicationService medicationService;
    private final EventService eventService;
    private final RuleComplianceService ruleComplianceService;
    private final PatientCacheService patientCacheService;
    private final ObservationService observationService;
    private final OperationService operationService;
    private final RedisService redisService;
    private final OperationRepository operationRepository;
    private final MedicationRepository medicationRepository;
    private final PatientRepository patientRepository;
    private final ProcedureTypeService procedureTypeService;
    private final TenantService tenantService;
    private final PractitionerService practitionerService;
    private final EMRAdministeredMedicationProcessor emrAdministeredMedicationProcessor;
    private final ScheduledRuleEngine scheduledRuleEngine;
    private final Hl7OrderLock hl7OrderLock;
    private final PatientRefreshLock patientRefreshLock;
    private final InfusionMedicationAdministrationRepository infusionMedicationAdministrationRepository;

    @Override
    @Transactional
    public void saveMedAdmin(MedicationAdministration medAdmin, Operation operation, String clientOrderId, UUID hl7InboundMessageId) {
        // TODO: link hl7InboundMessageId → saved admin in a dedicated audit table when needed
        // Re-attach the patient, operation, and medication (they arrive detached from the processor's
        // non-transactional context). Re-attachment must happen before any lazy collection is accessed
        // during rule evaluation (e.g. Medication.medicationComponents in MedicationDTO).
        Patient patient = patientRepository.findById(medAdmin.getPatient().getId()).orElseThrow();
        medAdmin.setPatient(patient);
        if (operation != null) {
            operation = operationRepository.findById(operation.getId()).orElse(null);
        }
        medAdmin.getMedication()
                .map(Medication::getMedicationIdentifier)
                .flatMap(medicationService::findMedication)
                .ifPresent(medAdmin::setMedication);
        MedicationAdministration target = medAdmin;
        boolean wasUpdate = false;

        // Detect edit: same order + medication + administrationSequence = same administration event.
        // Epic resends the full record on edits, so we overwrite the mutable fields rather than
        // creating a duplicate.
        Optional<MedicationAdministration> existing = Optional.empty();
        if (clientOrderId != null && !clientOrderId.isBlank()) {
            MedicationOrder order = findOrCreateOrder(patient, operation, clientOrderId);

            if (medAdmin.getAdministrationSequence() != null) {
                existing = medAdmin.getMedication()
                        .flatMap(medication -> order.findBolusByMedicationAndSequence(medication, medAdmin.getAdministrationSequence()));
            }
            if (existing.isPresent()) {
                // An edit is excluded from the dose history it is scored against by tracking id, so the
                // administration has to carry one before the snapshot copies it. A row persisted by a path
                // that never evaluated it has none yet, and minting one after the snapshot would leave the
                // exclusion matching nothing.
                if (existing.get().getTrackingId() == null) {
                    existing.get().setTrackingId(UuidCreator.getTimeOrderedEpoch());
                }
            } else {
                medAdmin.setMedicationOrder(order);
            }
        }

        ContextPatient preChangePatient = operation != null ? emrAdministeredMedicationProcessor.buildPreChangeContextPatient(patient) : null;

        if (existing.isPresent()) {
            target = existing.get();
            target.updateFromEdit(medAdmin);
            wasUpdate = true;
        }

        MedicationAdministration saved = medicationService.saveMedicationAdministration(target);

        // EMR-administered CDS: evaluate + record selection and dose rules for this documented bolus, and
        // assemble any actionable guidance while the entities are still attached. An overwrite of an
        // administration we already hold is an edit: the medication was chosen once, so only the dose is
        // re-scored.
        Optional<GuidanceDTO> guidance = evaluateEmrAdministration(saved, operation, preChangePatient, clientOrderId,
                saved.getAdministrationDate(), wasUpdate);

        var event = MedicationAdministrationEvent.builder()
                .message(AvroUtils.toMessage(saved, null, operation))
                .patientId(saved.getPatient().getPatientId())
                .caseId(operation != null ? operation.getCaseId() : null)
                .eventDate(saved.getAdministrationDate())
                .wasUpdate(wasUpdate)
                .trackingId(saved.getTrackingId())
                .build();

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                ruleComplianceService.evaluateComplianceOnMedicationAdministration(saved);
                patientCacheService.clearCache(saved.getPatient().getPatientId());
                // Guarded because the guidance publish below is independent of event dispatch: a reminder
                // that fails to schedule must not also silence a clinical alert for an administration that
                // did commit. Logged so it still surfaces in Sentry.
                try {
                    eventService.handleEventInNewTransaction(event);
                } catch (Exception e) {
                    log.error("Failed to dispatch MedicationAdministrationEvent for administration {} (patient {})",
                            saved.getId(), saved.getPatient().getPatientId(), e);
                }
                // Publish only after commit so a rolled-back persist never surfaces an alert for data that didn't land.
                guidance.ifPresent(emrAdministeredMedicationProcessor::publishGuidance);
            }
        });

        log.info("Persisted HL7-sourced MedicationAdministration id={} for patient={} (wasUpdate={})",
                saved.getId(), saved.getPatient().getPatientId(), wasUpdate);
    }

    @Override
    @Transactional
    public void saveInfusionAdmin(InfusionMedicationAdministration medAdmin, Operation operation, String clientOrderId, UUID hl7InboundMessageId) {
        persistInfusion(medAdmin, operation, clientOrderId, hl7InboundMessageId, false);
    }

    @Override
    @Transactional
    public void appendInfusionEvent(InfusionMedicationAdministration medAdmin, Operation operation, String clientOrderId, UUID hl7InboundMessageId) {
        persistInfusion(medAdmin, operation, clientOrderId, hl7InboundMessageId, true);
    }

    /**
     * @param requireExisting when true the event may only attach to an infusion the order already holds;
     *                        absent one, the event is dropped rather than establishing a new record.
     */
    private void persistInfusion(InfusionMedicationAdministration medAdmin, Operation operation, String clientOrderId,
                                 UUID hl7InboundMessageId, boolean requireExisting) {
        // Serialize before touching the order's shared state so this whole read-modify-write is atomic
        // against other messages for the same order.
        hl7OrderLock.lockOrder(medAdmin.getPatient().getPmrn(), clientOrderId);

        // The incoming admin always carries exactly one event (the RAS message we just parsed).
        Date eventDate = medAdmin.getInfusionEvents().isEmpty()
                ? null
                : medAdmin.getInfusionEvents().get(0).getEventDate();

        // Re-attach the patient, operation, and medication (they arrive detached from the processor's
        // non-transactional context). Re-attachment must happen before any lazy collection is accessed
        // during rule evaluation (e.g. Medication.medicationComponents in MedicationDTO).
        Patient patient = patientRepository.findById(medAdmin.getPatient().getId()).orElseThrow();
        medAdmin.setPatient(patient);
        if (operation != null) {
            operation = operationRepository.findById(operation.getId()).orElse(null);
        }
        medAdmin.getMedication()
                .map(Medication::getMedicationIdentifier)
                .flatMap(medicationService::findMedication)
                .ifPresent(medAdmin::setMedication);
        ContextPatient preChangePatient = operation != null ? emrAdministeredMedicationProcessor.buildPreChangeContextPatient(patient) : null;

        // Correlate to the order: if it already has an infusion for this medication, merge the event into it
        // (rate changes, additional starts, edits) instead of creating a parallel record.
        InfusionMedicationAdministration target = medAdmin;
        boolean wasUpdate = false;
        boolean appendedNewEvent = false;
        if (clientOrderId != null && !clientOrderId.isBlank()) {
            // A transition must not bring an order into existence either — find, don't create.
            MedicationOrder order = requireExisting
                    ? medicationService.findMedicationOrderByPatientAndOrderId(medAdmin.getPatient(), clientOrderId).orElse(null)
                    : findOrCreateOrder(medAdmin.getPatient(), operation, clientOrderId);
            Optional<InfusionMedicationAdministration> existing = order == null
                    ? Optional.empty()
                    : medAdmin.getMedication()
                    .flatMap(medication -> order.findInfusionMedicationAdministrations(medication).stream()
                            .findFirst());
            if (requireExisting && existing.isEmpty()) {
                log.warn("HL7 infusion: order={} medication={} has no infusion for this transition to attach to — dropping it (the starting event was never received), hl7MessageId={}",
                        clientOrderId, medAdmin.getMedicationIdentifier(), hl7InboundMessageId);
                return;
            }
            if (existing.isPresent()) {
                target = existing.get();
                // Backfill the administering practitioner if the original event didn't resolve one.
                if (target.getDocumentingPractitioner() == null && medAdmin.getDocumentingPractitioner() != null) {
                    target.setDocumentingPractitioner(medAdmin.getDocumentingPractitioner());
                }
                // Upsert each incoming event by its RXA-2 sub-id. Epic re-sends an edited administration
                // (a corrected rate, or a reclassified action) under the SAME sub-id, so the latest message
                // for a sub-id replaces the prior one in place — keeping its list position stable so the
                // stream reads in documentation order on inspection (consumers still sort by eventDate at
                // time-of-use). Genuinely distinct transitions carry different sub-ids and append. A
                // sub-id-less message (no RXA-2) falls back to value-dedup so at-least-once resends stay
                // idempotent. Assign a fresh list reference (rather than editing the existing list object)
                // so Hibernate dirty-checks the JSON column and @PreUpdate recomputes the event-date bounds.
                var mergedEvents = new ArrayList<>(target.getInfusionEvents());
                for (InfusionEvent incoming : medAdmin.getInfusionEvents()) {
                    String sequence = incoming.getAdministrationSequence();
                    if (sequence != null) {
                        int existingIndex = IntStream.range(0, mergedEvents.size())
                                .filter(idx -> sequence.equals(mergedEvents.get(idx).getAdministrationSequence()))
                                .findFirst()
                                .orElse(-1);
                        if (existingIndex >= 0) {
                            mergedEvents.set(existingIndex, incoming);
                        } else {
                            mergedEvents.add(incoming);
                            appendedNewEvent = true;
                        }
                    } else if (mergedEvents.stream().noneMatch(have ->
                            Objects.equals(have.getEventDate(), incoming.getEventDate())
                            && Objects.equals(have.getEventType(), incoming.getEventType())
                            && Objects.equals(have.getRate(), incoming.getRate()))) {
                        mergedEvents.add(incoming);
                        appendedNewEvent = true;
                    }
                }
                target.setInfusionEvents(mergedEvents);
                wasUpdate = true;
            } else if (eventDate != null && infusionMedicationAdministrationRepository
                    .countDeletedModifiedAtOrAfter(order.getId(), medAdmin.getMedicationIdentifier(), eventDate.toInstant()) > 0) {
                // A deletion only supersedes the events the record already held. An event timed at or before a
                // deleted record's last modification is a redelivery of activity that has since been removed,
                // so drop it rather than recreating the record through this create branch; a genuinely later
                // administration is timed after it and still creates a new record.
                log.info("HL7 infusion: order={} medication={} has a deleted record modified at or after this event ({}) — ignoring redelivered event, hl7MessageId={}",
                        clientOrderId, medAdmin.getMedicationIdentifier(), eventDate, hl7InboundMessageId);
                return;
            } else {
                medAdmin.setMedicationOrder(order);
            }
        } else if (requireExisting) {
            log.warn("HL7 infusion: transition for medication={} carries no order id, so it cannot be correlated to a running infusion — dropping it, hl7MessageId={}",
                    medAdmin.getMedicationIdentifier(), hl7InboundMessageId);
            return;
        }

        InfusionMedicationAdministration saved = target;
        medicationService.saveMedicationAdministration(saved);

        // EMR-administered CDS: evaluate + record selection rules for this documented infusion. Dose rules are
        // skipped (they need a discrete dose amount, which an infusion doesn't carry). Dated at the infusion
        // event we just processed; guidance is assembled now while the entities are still attached. A message
        // that only restates events the record already holds is an edit — the infusion was already evaluated
        // when its first event established it, and a corrected rate is not a fresh selection to score.
        boolean editedInPlace = wasUpdate && !appendedNewEvent;
        Optional<GuidanceDTO> guidance = evaluateEmrAdministration(saved, operation, preChangePatient, clientOrderId,
                eventDate, editedInPlace);
        saved.stampEventsWithTrackingId();

        var event = MedicationAdministrationEvent.builder()
                .message(AvroUtils.toMessage(saved, null, operation))
                .patientId(saved.getPatient().getPatientId())
                .caseId(operation != null ? operation.getCaseId() : null)
                .eventDate(eventDate)
                .wasUpdate(wasUpdate)
                .trackingId(saved.getTrackingId())
                .build();

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                patientCacheService.clearCache(saved.getPatient().getPatientId());
                // Guarded because the guidance publish below is independent of event dispatch: a reminder
                // that fails to schedule must not also silence a clinical alert for an administration that
                // did commit. Logged so it still surfaces in Sentry.
                try {
                    eventService.handleEventInNewTransaction(event);
                } catch (Exception e) {
                    log.error("Failed to dispatch MedicationAdministrationEvent for infusion {} (patient {})",
                            saved.getId(), saved.getPatient().getPatientId(), e);
                }
                // Publish only after commit so a rolled-back persist never surfaces an alert for data that didn't land.
                guidance.ifPresent(emrAdministeredMedicationProcessor::publishGuidance);
            }
        });

        log.info("Persisted HL7-sourced InfusionMedicationAdministration id={} for patient={} (appendedToExisting={})",
                saved.getId(), saved.getPatient().getPatientId(), wasUpdate);
    }

    // Runs the shared EMR-administered selection/dose evaluation for a documented HL7 administration and
    // returns any actionable guidance for the caller to publish after commit. Selection runs for non-edits
    // only, dose runs for boluses; an edit re-scores the dose against a history the administration has been
    // excluded from. Returns empty when the administration falls outside an operation window or its
    // medication / event time couldn't be resolved — there is nothing meaningful to evaluate.
    private Optional<GuidanceDTO> evaluateEmrAdministration(AbstractMedicationAdministration saved, Operation operation,
                                                            ContextPatient preChangePatient, String clientOrderId,
                                                            Date administrationDate, boolean edit) {
        if (operation == null || preChangePatient == null || administrationDate == null) {
            return Optional.empty();
        }
        Medication medication = saved.getMedication().orElse(null);
        if (medication == null) {
            return Optional.empty();
        }
        // The operation and medication arrive detached from the RAS processor (each loaded in its own
        // query without its lazy graph). The shared evaluator builds Operation/Medication DTOs that
        // navigate operation.procedureTypes / medication.medicationComponents, so re-load managed
        // instances here to resolve those lazily within this transaction (OR-2665).
        operation = operationRepository.findById(operation.getId()).orElseThrow();
        medication = medicationRepository.findById(medication.getId()).orElseThrow();
        UUID trackingId = saved.getTrackingId() != null ? saved.getTrackingId() : UuidCreator.getTimeOrderedEpoch();
        if (saved.getTrackingId() == null) {
            saved.setTrackingId(trackingId);
        }
        ZoneId zoneId = TenantUtils.getTenantTimeZone(TenantContextHolder.getTenant()).toZoneId();
        var results = emrAdministeredMedicationProcessor.evaluate(EMRAdministeredMedicationProcessor.Request.builder()
                .patient(saved.getPatient())
                .operation(operation)
                .medication(medication)
                .administration(saved)
                .preChangePatient(preChangePatient)
                .edit(edit)
                .trackingId(trackingId)
                .attributedUser(saved.getDocumentedBy())
                .attributedPractitioner(saved.getDocumentingPractitioner())
                .administrationDate(administrationDate)
                .zoneId(zoneId)
                .build());
        // Build guidance while entities are attached; the caller publishes it after commit.
        return emrAdministeredMedicationProcessor.buildGuidance(saved.getPatient(), operation, medication, results);
    }

    // TODO(ras-order-race): this find-then-insert is not atomic. Two RAS messages for the same
    // clientOrderId arriving concurrently can both miss the lookup and insert duplicate MedicationOrders
    // (no unique constraint on medication_orders(patient_id, client_order_id)). Add the unique constraint
    // + catch DataIntegrityViolationException and re-fetch, mirroring MayoHL7SiuCaseSchedulingProcessor.upsertOperation.
    private MedicationOrder findOrCreateOrder(Patient patient, Operation operation, String clientOrderId) {
        return medicationService.findMedicationOrderByPatientAndOrderId(patient, clientOrderId)
                .orElseGet(() -> medicationService.saveMedicationOrder(MedicationOrder.builder()
                        .patient(patient)
                        .operation(operation)
                        .clientOrderId(clientOrderId)
                        .build()));
    }

    @Override
    @Transactional
    public void deleteMedAdmin(MedicationAdministration medAdmin, UUID hl7InboundMessageId) {
        // The RAS processor looks up the administration in a separate query and hands it to us across the
        // transaction boundary, so it arrives detached. Re-load the managed instance before retracting it
        // and before reading the fields the post-commit event carries.
        MedicationAdministration managed = medicationService.findMedicationAdministration(medAdmin.getId())
                .orElse(null);
        if (managed == null) {
            log.warn("HL7 cancel: MedicationAdministration id={} not found — nothing to cancel", medAdmin.getId());
            return;
        }

        // Build the event now, while the session is open. The post-commit callback runs after the
        // session closes, where navigating the administration's lazy associations would throw.
        Operation operation = managed.getOperation();
        var event = MedicationAdministrationCancelledEvent.builder()
                .patientId(managed.getPatient().getPatientId())
                .caseId(operation != null ? operation.getCaseId() : null)
                .medicationId(managed.getMedicationIdentifier())
                .administrationDate(managed.getAdministrationDate())
                .eventDate(new Date())
                .build();

        medicationService.removeBolusMedicationAdministration(managed);

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                patientCacheService.clearCache(event.getPatientId());
                eventService.handleEventInNewTransaction(event);
            }
        });

        log.info("HL7 cancel: soft-deleted MedicationAdministration id={} for patient={}",
                managed.getId(), event.getPatientId());
    }

    @Override
    @Transactional
    public void cancelInfusionAdmin(String pmrn,
                                    String medicationIdentifier,
                                    String administrationSequence,
                                    String clientOrderId,
                                    UUID hl7InboundMessageId) {
        if (clientOrderId == null || administrationSequence == null) {
            log.warn("HL7 infusion cancel: missing order or sequence — cannot match the event, pmrn={}, hl7MessageId={}",
                    pmrn, hl7InboundMessageId);
            return;
        }

        // Serialize before reading the order's events so the removal is atomic against other messages
        // for the same order (e.g. a redelivered event racing this cancel).
        hl7OrderLock.lockOrder(pmrn, clientOrderId);

        Patient patient = patientRepository.findByPmrn(pmrn);
        if (patient == null) {
            log.warn("HL7 infusion cancel: patient not found — pmrn={}, hl7MessageId={}", pmrn, hl7InboundMessageId);
            return;
        }

        Optional<MedicationOrder> maybeOrder = medicationService.findMedicationOrderByPatientAndOrderId(patient, clientOrderId);
        if (maybeOrder.isEmpty()) {
            log.warn("HL7 infusion cancel: order clientOrderId={} not found for pmrn={} — hl7MessageId={}",
                    clientOrderId, pmrn, hl7InboundMessageId);
            return;
        }

        // A RAS cancel names a single administration event by its RXA-2 sub-id. An infusion is one record per
        // (order, medication) holding a stream of events (one per sub-id), so find the infusion carrying that
        // sub-id and drop just that event — cancelling a rate change must not tear down a running infusion.
        MedicationOrder order = maybeOrder.get();
        Optional<InfusionMedicationAdministration> maybeTarget = order.getInfusionMedicationAdministrations().stream()
                .filter(i -> medicationIdentifier.equals(i.getMedicationIdentifier()))
                .filter(i -> i.getInfusionEvents().stream()
                        .anyMatch(e -> administrationSequence.equals(e.getAdministrationSequence())))
                .findFirst();

        if (maybeTarget.isEmpty()) {
            log.warn("HL7 infusion cancel: no infusion event for order={} med={} seq={} — hl7MessageId={}",
                    clientOrderId, medicationIdentifier, administrationSequence, hl7InboundMessageId);
            return;
        }

        InfusionMedicationAdministration target = maybeTarget.get();
        Operation operation = target.getOperation();

        // Capture scalars before commit (the entity may detach once the transaction closes) and before we
        // trim the events, so the start date reflects the infusion as documented at cancellation.
        var event = MedicationAdministrationCancelledEvent.builder()
                .patientId(target.getPatient().getPatientId())
                .caseId(operation != null ? operation.getCaseId() : null)
                .medicationId(target.getMedicationIdentifier())
                .administrationDate(target.getFirstStartDate().orElse(null))
                .eventDate(new Date())
                .build();

        // Replace the list reference (rather than mutating in place) so Hibernate dirty-checks the JSON
        // column and @PreUpdate recomputes the event-date bounds.
        var remainingEvents = target.getInfusionEvents().stream()
                .filter(e -> !administrationSequence.equals(e.getAdministrationSequence()))
                .collect(Collectors.toCollection(ArrayList::new));
        boolean nowEmpty = remainingEvents.isEmpty();
        target.setInfusionEvents(remainingEvents);

        // Removing the last event leaves nothing to administer, so soft-delete the record; otherwise
        // persist the trimmed stream and leave the infusion in place.
        if (nowEmpty) {
            medicationService.removeInfusionMedicationAdministration(target);
        } else {
            medicationService.saveMedicationAdministration(target);
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                patientCacheService.clearCache(event.getPatientId());
                eventService.handleEventInNewTransaction(event);
            }
        });

        log.info("HL7 cancel: removed infusion event seq={} from InfusionMedicationAdministration id={} (recordDeleted={}) for patient={}",
                administrationSequence, target.getId(), nowEmpty, event.getPatientId());
    }

    @Override
    @Transactional
    public void saveObservations(List<ObservationUpdate> updates, UUID hl7InboundMessageId) {
        ObservationService.AppliedObservations applied = observationService.applyObservations(updates);
        List<Observation> changed = applied.changed();

        // Cache clear covers deletions too, else a stale cache keeps serving a removed observation.
        var patientIds = Stream.concat(changed.stream(), applied.deleted().stream())
                .map(obs -> obs.getPatient().getPatientId())
                .distinct()
                .toList();

        // A new glucose result feeds the glucose-triggered rules (insulin management, the event-based rule
        // engine, and a post-hypoglycemia recheck). Each keys off the operation the glucose falls within,
        // so pair every glucose with its operation up front and drop any that land outside an operation.
        // Glucose deletes are not re-dispatched (unlike EBL): no established rule-undo path for glucose.
        record GlucoseUpdate(Observation glucose, Operation operation) {
        }
        var glucoseUpdates = changed.stream()
                .filter(obs -> obs.getType() == ObservationType.GLUCOSE)
                .flatMap(glucose -> {
                    Optional<Operation> operation = operationService.findOperationBasedOnStartTime(
                            glucose.getPatient(), glucose.getEffectiveTime());
                    if (operation.isEmpty()) {
                        log.warn("No operation for glucose observation at {} — patient {}; skipping glucose-driven rules",
                                glucose.getEffectiveTime(), glucose.getPatient().getPatientId());
                    }
                    return operation.map(op -> new GlucoseUpdate(glucose, op)).stream();
                })
                .toList();

        if (!patientIds.isEmpty() || !glucoseUpdates.isEmpty()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    // Clear the cache first so the event handlers re-read the patient with the new observation.
                    patientIds.forEach(patientCacheService::clearCache);
                    glucoseUpdates.forEach(update -> {
                        // Guard per glucose result: we are in an afterCommit callback, so a failure must not
                        // propagate up the synchronization chain (it would abort the remaining glucose results
                        // in this ORU, which are never retried since their observations already committed and
                        // dedup out on redelivery). Logged so it still surfaces in Sentry.
                        try {
                            eventService.handleEventInNewTransaction(buildGlucoseUpdatedEvent(update.glucose(), update.operation()));
                            scheduleHypoglycemiaRecheck(update.glucose(), update.operation());
                        } catch (Exception e) {
                            log.error("Failed to dispatch GLUCOSE_UPDATED for observation {} (patient {})",
                                    update.glucose().getId(), update.glucose().getPatient().getPatientId(), e);
                        }
                    });
                }
            });
        }

        // Recompute cumulative EBL on insert/correct AND delete: the redose reminder sums live EBL rows,
        // so a retracted EBL must lower the total. Fired synchronously so the change and its event commit
        // together. Keyed off the deduped changed/deleted lists, so a replayed ORU (or redelivered
        // delete) is a no-op.
        Stream.concat(changed.stream(), applied.deleted().stream())
                .filter(obs -> obs.getType() == ObservationType.EBL)
                .forEach(obs -> dispatchEblUpdated(obs, hl7InboundMessageId));

        log.info("Applied {} HL7-sourced observations: {} inserted/corrected, {} deleted from hl7MessageId={}",
                updates.size(), changed.size(), applied.deleted().size(), hl7InboundMessageId);
    }

    // The event carries the case id that insulin management and the event-based engine key off.
    private EventCategoryEvent buildGlucoseUpdatedEvent(Observation glucose, Operation operation) {
        return EventCategoryEvent.builder()
                .sourceEventType("ORU_GLUCOSE")
                .patientId(glucose.getPatient().getPatientId())
                .caseId(operation.getCaseId())
                .eventCategories(Set.of(EventCategory.GLUCOSE_UPDATED))
                .eventDate(glucose.getEffectiveTime())
                .build();
    }

    // Schedules the post-hypoglycemia glucose recheck.
    private void scheduleHypoglycemiaRecheck(Observation glucose, Operation operation) {
        Float glucoseValue = glucose.getNumericObservationValue();
        if (glucoseValue == null) {
            log.debug("Glucose observation {} has no numeric value; skipping hypoglycemia recheck scheduling", glucose.getId());
            return;
        }
        scheduledRuleEngine.schedulePostHypoglycemiaGlucoseCheckJob(
                glucose.getPatient(),
                operation,
                glucose.getEffectiveTime(),
                glucoseValue,
                glucose.getObservationUnits() != null ? glucose.getObservationUnits() : "mg/dL");
    }

    // Resolve the case the way MGH does — by the observation's effective time against the patient's
    // operations — since ORU messages carry no case id. Without a matching open operation there is
    // nothing for the redose reminder to act on, so we log and skip rather than firing a caseless event.
    private void dispatchEblUpdated(Observation observation, UUID hl7InboundMessageId) {
        Patient patient = observation.getPatient();
        Optional<Operation> operation = operationService.findOperationBasedOnStartTime(patient, observation.getEffectiveTime());
        if (operation.isEmpty()) {
            log.warn("Skipping EBL_UPDATED - no operation for patient={} at time={} from hl7MessageId={}",
                    patient.getPatientId(), observation.getEffectiveTime(), hl7InboundMessageId);
            return;
        }
        eventService.handleEvent(EventCategoryEvent.builder()
                .sourceEventType("ORU^R01")
                .caseId(operation.get().getCaseId())
                .patientId(patient.getPatientId())
                .eventCategories(Set.of(EventCategory.EBL_UPDATED))
                .eventDate(observation.getEffectiveTime())
                .build());
        log.info("Fired EBL_UPDATED for caseId={} patient={} from hl7MessageId={}",
                operation.get().getCaseId(), patient.getPatientId(), hl7InboundMessageId);
    }

    /**
     * Upserts the case a scheduling message describes, writing only the columns such a message owns.
     *
     * <p>The lookup happens here, inside the transaction, rather than in the caller. A caller-side
     * lookup yields a detached snapshot, and merging that writes back every column the snapshot holds.
     * Timing events set the operation's clock columns (reportable/procedure/induction/extubation/end
     * times) through targeted JPQL, which bypasses the persistence context, so a snapshot taken before
     * one of those commits still carries the old value and the merge silently restores it. Reading the
     * managed row here and copying only scheduling fields onto it keeps the two writers on disjoint
     * columns, which is what makes them safe to interleave — including across nodes, where an in-JVM
     * ordering guarantee does not reach.
     */
    @Override
    @Transactional
    public void saveOperation(Operation incoming, List<String> procedureNames, UUID hl7InboundMessageId) {
        // Re-fetch the patient within this transaction so Hibernate can lazy-load observations
        // (the caller's session is closed; the patient entity arrives detached).
        Patient patient = patientRepository.findById(incoming.getPatient().getId()).orElseThrow();

        Operation storedCase = operationRepository.findByCaseIdAndPatientId(incoming.getCaseId(), patient.getId());
        Operation operation = incoming;
        // Read before the merge: the case's acuity scopes which antibiotic pathways apply, so a
        // scheduling message that changes it invalidates an answer already computed from the old one.
        String priorAcuity = storedCase == null ? null : storedCase.getAcuity();
        if (storedCase != null) {
            applySchedulingFields(storedCase, incoming);
            operation = storedCase;
        }
        operation.setPediatricStatus(patient.getPediatricStatus(tenantService.getConfig()));

        // Persist first so procedure-type mapping audit records (and any new procedure-type rows)
        // reference a managed operation — mirrors OperationService.startOperation's two-save flow.
        Operation saved = operationRepository.save(operation);

        // Both inputs a cached antibiotic resolution was computed from and does not re-read: the
        // case's procedures, and its acuity.
        boolean antibioticInputsChanged =
                storedCase != null && !Objects.equals(priorAcuity, saved.getAcuity());

        if (procedureNames != null && !procedureNames.isEmpty()) {
            Set<QualifiedProcedureType> resolved =
                    procedureTypeService.getProcedureTypesByNames(saved.getPatient(), saved, procedureNames);
            // Only attach procedure types not already on the operation — re-processing the same case
            // would otherwise create a second OperationProcedureType with a duplicate id and fail the merge.
            Set<String> existing = saved.getProcedureTypes().stream()
                    .map(ProcedureType::getIdentifier)
                    .collect(Collectors.toSet());
            Operation target = saved;
            resolved.stream()
                    .filter(qpt -> !existing.contains(qpt.procedureType().getIdentifier()))
                    .forEach(target::addProcedureType);
            saved = operationRepository.save(target);
            // Scheduling messages rewrite the case's procedures.
            antibioticInputsChanged = true;
        }

        var patientId = saved.getPatient().getPatientId();
        Operation persisted = saved;
        boolean dropAntibioticResolution = antibioticInputsChanged;
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                patientCacheService.clearCache(patientId);
                if (dropAntibioticResolution) {
                    // After commit, not before: a reader that resolves between the delete and the
                    // commit would recompute from the pre-change row and cache that for the full
                    // entry lifetime, which is the staleness this delete exists to prevent.
                    redisService.deleteValue(ProcedureAntibioticCandidateService.SCOPE,
                            ProcedureAntibioticCandidateService.cacheKeyForCase(persisted));
                }
            }
        });

        log.info("Persisted HL7-sourced Operation id={} caseId={} for patient={} from hl7MessageId={}",
                saved.getId(), saved.getCaseId(), patientId, hl7InboundMessageId);
    }

    /**
     * Copies the fields a scheduling message owns onto an already-managed case, never overwriting a
     * populated value with null.
     *
     * <p>This list is deliberately exhaustive and deliberately excludes every column a timing event
     * writes. Adding a clock column here would reintroduce the lost-update it exists to prevent, since
     * the value would come from whatever the scheduling message knew rather than from the event stream
     * that owns it.
     *
     * <p>Static and package-private so the merge rules can be pinned by a plain unit test. The rules
     * (never overwrite with null, provider fills only, case window is first-wins) are the kind that
     * regress silently, and the persistence test that exercises them through the database only runs
     * under {@code -P integration-tests}, which no CI workflow uses.
     */
    static void applySchedulingFields(Operation existing, Operation incoming) {
        if (incoming.getOperatingRoomName() != null) existing.setOperatingRoomName(incoming.getOperatingRoomName());
        if (incoming.getServiceName() != null) existing.setServiceName(incoming.getServiceName());
        if (incoming.getEncounterId().value() != null) existing.setEncounterId(incoming.getEncounterId().value());
        if (incoming.getAcuity() != null) existing.setAcuity(incoming.getAcuity());
        if (incoming.getAsaStatus() != null) existing.setAsaStatus(incoming.getAsaStatus());
        // Only fill the anesthesia provider; never overwrite an existing one with a (likely) null.
        if (existing.getPrimaryPractitioner() == null && incoming.getPrimaryPractitioner() != null) {
            existing.setPrimaryPractitioner(incoming.getPrimaryPractitioner());
        }
        // Estimated case window is first-wins: set it at the first case-start SIU, then never move it.
        if (existing.getScheduledStartTime() == null && incoming.getScheduledStartTime() != null)
            existing.setScheduledStartTime(incoming.getScheduledStartTime());
        if (existing.getScheduledEndTime() == null && incoming.getScheduledEndTime() != null)
            existing.setScheduledEndTime(incoming.getScheduledEndTime());
    }

    @Override
    public void handleTimingEvent(CaseId caseId, PatientId patientId, Set<EventCategory> categories, Date eventDate, String sourceEventType, UUID hl7InboundMessageId, Practitioner practitioner) {
        eventService.handleEvent(EventCategoryEvent.builder()
                .sourceEventType(sourceEventType)
                .caseId(caseId)
                .patientId(patientId)
                .eventCategories(categories)
                .eventDate(eventDate)
                .practitioner(practitioner)
                .build());
        log.info("Fired {} timing event categories for caseId={} from hl7MessageId={}", categories, caseId, hl7InboundMessageId);
    }

    // Not @Transactional: find-or-create makes an external FHIR call and commits the practitioner in
    // its own transaction, so the returned entity is persisted and safe to attach to a later save.
    @Override
    public Practitioner resolvePractitioner(String epicPersonId, String displayName) {
        if (epicPersonId == null || epicPersonId.isBlank()) {
            return null;
        }
        return practitionerService.findOrCreateByEpicUserIdAndName(epicPersonId, displayName);
    }

    @Override
    @Transactional
    public Patient findOrCreatePatient(PatientId patientId, Patient skeleton) {
        // First database action in this transaction, so the lock spans the re-check and the insert. The
        // caller's earlier lookup is only a fast path: a contender may have committed since, which is
        // exactly why the authoritative read happens here, under the lock.
        patientRefreshLock.lockPatient(patientId);
        Patient existing = patientRepository.findByPmrn(patientId);
        if (existing != null) {
            return existing;
        }
        return patientRepository.save(skeleton);
    }
}
