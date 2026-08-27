package com.guided.orci.service;

import com.guided.orci.audit.service.AuditService;
import com.guided.orci.dto.OperationDTO;
import com.guided.orci.dto.SurgicalRecordDTO;
import com.guided.orci.engine.TimerBasedRuleEngine;
import com.guided.orci.engine.rule.scheduled.AntibioticRedoseReminderJob;
import com.guided.orci.events.EvaluationMode;
import com.guided.orci.events.EventCategoryEvent;
import com.guided.orci.models.audit.AuditEvent;
import com.guided.orci.models.audit.AuditEventType;
import com.guided.orci.models.audit.AuditTargetType;
import com.guided.orci.models.job.JobMetadata;
import com.guided.orci.models.operation.EventCategory;
import com.guided.orci.models.operation.OperationEvent;
import com.guided.orci.models.patient.Operation;
import com.guided.orci.models.patient.OperationStatus;
import com.guided.orci.models.patient.Patient;
import com.guided.orci.models.patient.ValueUnit;
import com.guided.orci.models.patient.vitals.BloodPressure;
import com.guided.orci.models.procedure.ProcedureCodeType;
import com.guided.orci.models.procedure.ProcedureType;
import com.guided.orci.models.procedure.QualifiedProcedureType;
import com.guided.orci.models.user.Practitioner;
import com.guided.orci.models.user.User;
import com.guided.orci.repository.OperationEventRepository;
import com.guided.orci.repository.OperationRepository;
import com.guided.orci.service.quartz.QuartzJobService;
import com.guided.orci.types.wrappers.CaseId;
import com.guided.orci.types.wrappers.EncounterId;
import com.guided.orci.types.wrappers.PatientId;
import com.guided.orci.utils.Calculator;
import org.quartz.SchedulerException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@Transactional(readOnly = true)
public class OperationService {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(OperationService.class);
    @Autowired
    private OperationRepository operationRepository;

    @Autowired
    private RedisService redisService;

    @Autowired
    private TenantService tenantService;


    @Autowired
    private TimerBasedRuleEngine timerBasedRuleEngine;

    @Autowired
    private ProcedureTypeService procedureTypeService;

    @Autowired
    private ProcedureRiskService procedureRiskService;

    @Autowired
    private AuditService auditService;

    @Autowired
    private QuartzJobService jobService;

    @Autowired
    private OperationEventRepository operationEventRepository;
    private RuleMemoryService ruleMemoryService;
    @Autowired
    private ScanMedsReminderService scanMedsReminderService;
    @Autowired
    private TracingService tracingService;

    public Optional<Operation> getOperationWithPatient(UUID operationId) {
        return operationRepository.findByIdWithPatient(operationId);
    }

    @Transactional(readOnly = true)
    public Optional<Operation> getOperation(PatientId patientId, CaseId caseId) {
        if (caseId == null) {
            return Optional.empty();
        }
        Optional<Operation> operation = patientId != null ? this.operationRepository.findByPmrnAndCaseId(patientId, caseId) : Optional.empty();
        if (operation.isEmpty()) {
            operation = getOperation(caseId);
        }
        return operation;
    }


    @Transactional(readOnly = true)
    public Optional<OperationDTO> getOperationDTO(PatientId patientId, CaseId caseId) {
        if (patientId == null || caseId == null) {
            // if no patient id or case id is specified, return empty
            return Optional.empty();
        }
        var op = this.operationRepository.findByPmrnAndCaseId(patientId, caseId);
        return op.map(OperationDTO::new);
    }

    public Optional<Operation> getOperation(CaseId caseId) {
        if (caseId == null) {
            return Optional.empty();
        }
        var operations = this.operationRepository.findByCaseId(caseId);
        if (operations.size() != 1) {
            if (operations.size() > 1) {
                log.warn("More than one operation found for case id: {} - returning empty", caseId);
            }
            return Optional.empty();
        }

        return Optional.of(operations.getFirst());
    }

    public List<Operation> getOperations(CaseId caseId) {
        if (caseId == null) {
            return List.of();
        }
        return this.operationRepository.findByCaseId(caseId);
    }

    public List<Operation> getOperations(Patient patient) {
        return this.operationRepository.findOperationByPatientOrderByStartTimeDesc(patient);
    }

    public Operation saveOperation(Operation operation) {
        return this.operationRepository.save(operation);
    }

    @Transactional(readOnly = false)
    public Operation startOperation(Patient patient, CaseId caseId, Optional<EncounterId> encounterId, SurgicalRecordDTO surgeryRecord, Date startTime,
                                    List<BloodPressure> outpatientBloodPressures, List<BloodPressure> dayOfSurgeryBloodPressures, Optional<User> user, boolean timerJobEnabled,
                                    Practitioner practitioner) {
        Operation operation = operationRepository.findByCaseIdAndPatientId(caseId, patient.getId());
        if (operation == null) {
            try {
                // First, create the operation without procedure types to get a persisted ID
                operation = Operation.builder().caseId(caseId.value()).patient(patient)
                        .startTime(startTime)
                        .endTime(surgeryRecord.getOperationStopTime())
                        .admissionDate(surgeryRecord.getAdmissionDate())
                        .initialAppLaunchTime(new Date())
                        .serviceName(surgeryRecord.getServiceName())
                        .internalId(surgeryRecord.getInternalId())
                        .documentationTargetId(surgeryRecord.getDocumentationTargetId())
                        .encounterId(encounterId.map(EncounterId::value).orElse(null))
                        .operatingRoomName(surgeryRecord.getOperationRoomName())
                        .pediatricStatus(patient.getPediatricStatus(tenantService.getConfig()))
                        .classification(surgeryRecord.getClassification())
                        .evaluationMode(user.isPresent() ? EvaluationMode.INTERACTIVE : EvaluationMode.SILENT)
                        .primaryPractitioner(practitioner)
                        .build();

                Float meanMAP = Calculator.calculateMeanMAPFromOutpatient(outpatientBloodPressures);
                if (meanMAP == null) {
                    // can't rely on outpatient BPs, use today's BPs.
                    meanMAP = Calculator.calculateMeanMAPFromInpatient(dayOfSurgeryBloodPressures);
                }
                operation.setBaselineMAP(new ValueUnit(meanMAP, "mmHg"));

                // Save operation first to get ID, then determine procedure types and save mapping events
                operation = this.operationRepository.save(operation);

                // Now determine procedure types and save mapping events with proper operation reference
                var procedureTypes = determineProcedureTypesAndSaveMappingEvents(patient, operation, surgeryRecord);
                boolean isERAs = procedureTypes.stream().anyMatch(type -> type.procedureType().hasCategory(ProcedureType.EVAL_FOR_ERAS));
                operation.setErasOperation(isERAs);

                // Set operation procedure types
                for (var type : procedureTypes) {
                    operation.addProcedureType(type);
                }

                // Update operation with procedure types and ERA status
                operation = this.operationRepository.save(operation);

                auditService.audit(AuditEvent.builder().eventType(AuditEventType.OPERATION_START).targetType(AuditTargetType.PATIENT).target(patient.getPmrn()).context(Map.of("caseId", caseId)).build());
                tracingService.getMeters().getCaseLaunchCounter(operation.getEvaluationMode().toString(), false).increment();

                log.info("The operation ({} - types: {}) start time is {} (mode: {})", caseId, procedureTypes, startTime, operation.getEvaluationMode());

            } catch (Exception e) {
                log.warn("Unable to save operation with case id: {} and patient: {} (already exists?)", caseId,
                        patient.getId(), e);

                operation = operationRepository.findByCaseIdAndPatientId(caseId, patient.getId());
            }
        } else {
            log.warn("Case ID {} for Patient {} already existed and was started", caseId, patient.getId());
            boolean modified = false;
            if (operation.getEvaluationMode() == EvaluationMode.SILENT && user.isPresent()) {
                operation.setEvaluationMode(EvaluationMode.INTERACTIVE);
                modified = true;
            }
            if (StringUtils.hasText(surgeryRecord.getServiceName()) && !Objects.equals(surgeryRecord.getServiceName(), operation.getServiceName())) {
                operation.setServiceName(surgeryRecord.getServiceName());
                modified = true;
            }
            if (startTime != null && (operation.getStartTime() == null || !startTime.equals(operation.getStartTime()))) {
                // update start time if we don't have it or if it's different
                operation.setStartTime(startTime);
                modified = true;
            }
            if (startTime != null && (operation.getInitialAppLaunchTime() == null)) {
                // set the app launch time if don't have it
                operation.setInitialAppLaunchTime(new Date());
                modified = true;
            }
            if (surgeryRecord.getAdmissionDate() != null && (operation.getAdmissionDate() == null || !surgeryRecord.getAdmissionDate().equals(operation.getAdmissionDate()))) {
                // update admission date if we don't have it or if it's different
                operation.setAdmissionDate(surgeryRecord.getAdmissionDate());
                modified = true;
            }
            if (surgeryRecord.getClassification() != null && (operation.getClassification() == null || !surgeryRecord.getClassification().equals(operation.getClassification()))) {
                operation.setClassification(surgeryRecord.getClassification());
                modified = true;
            }
            // Recompute pediatric status against the now-enriched patient. A case scheduled via SIU only
            // had a DOB when created, but weight (which can flip pediatric ⇄ adult) arrives with the
            // case-start FHIR pull, so the classification must be refreshed here, not frozen at scheduling.
            var pediatricStatus = patient.getPediatricStatus(tenantService.getConfig());
            if (pediatricStatus != operation.getPediatricStatus()) {
                operation.setPediatricStatus(pediatricStatus);
                modified = true;
            }
            if (operation.getPrimaryPractitioner() == null && practitioner != null) {
                operation.setPrimaryPractitioner(practitioner);
                modified = true;
            }
            if (modified) {
                operation = this.operationRepository.save(operation);
                // The case's procedures or classification may have moved, and a cached antibiotic
                // resolution is a snapshot of them taken for whoever resolved it last.
                redisService.deleteValue(ProcedureAntibioticCandidateService.SCOPE,
                        ProcedureAntibioticCandidateService.cacheKeyForCase(operation));
            }
        }

        // Rate procedure risk here rather than at scheduling, because the conditions and medication
        // notes it reads arrive with the case-start EMR pull. Best-effort: antibiotic guidance reads
        // the risk, but a case that fails to be rated falls to the lower-risk protocol rather than to
        // none, so this must never be the reason a case fails to start. The create
        // branch above can also leave the operation null when it swallowed a non-duplicate exception.
        if (operation != null) {
            try {
                if (procedureRiskService.applyProcedureRisk(patient, operation)) {
                    operation = this.operationRepository.save(operation);
                    // Risk narrows which pathways apply, so every reader's answer was reached under a
                    // risk this case no longer carries. Drop the case's entry whole: the rating is the
                    // case's, not any one reader's.
                    redisService.deleteValue(ProcedureAntibioticCandidateService.SCOPE,
                            ProcedureAntibioticCandidateService.cacheKeyForCase(operation));
                }
            } catch (Exception e) {
                log.warn("Unable to rate procedure risk for case {}", caseId, e);
            }
        }

        if (timerJobEnabled && !OperationStatus.COMPLETE.equals(operation.getStatus())) {
            timerBasedRuleEngine.registerOperation(patient, operation);
        } else if (!timerJobEnabled) {
            log.debug("timer job is disabled");
        } else {
            log.debug("No timer rules scheduled - operation already complete patient: {}, case: {}", patient.getId(),
                    caseId);
        }
        return operation;
    }

    private Set<QualifiedProcedureType> determineProcedureTypesAndSaveMappingEvents(Patient patient, Operation operation, SurgicalRecordDTO surgeryRecord) {
        // Client codes drive procedure-type attachment for this tenant. Names and CPT codes are recorded
        // with their true mapping outcome (resolved identifier or genuine miss) purely for coverage
        // tracking, so we can see which alternative identifiers we could map without changing behavior.
        var procedureTypes = procedureTypeService.getProcedureTypesByClientIds(patient, operation, surgeryRecord.getProcedureIds());
        procedureTypeService.recordProcedureTypeMappings(patient, operation, surgeryRecord.getProcedureNames(), ProcedureCodeType.NAME);
        procedureTypeService.recordProcedureTypeMappings(patient, operation, surgeryRecord.getCptCodes(), ProcedureCodeType.CPT);
        return procedureTypes;
    }

    @Transactional(readOnly = false)
    public void stopOperationTracking(CaseId caseId, Date endDate, boolean forceUpdate) {
        if (forceUpdate) {
            this.operationRepository.updateReportableEndTime(caseId, endDate);
        } else {
            this.operationRepository.updateReportableEndTimeIfNotSet(caseId, endDate);
        }

    }

    @Transactional(readOnly = false)
    public void startOperationTracking(CaseId caseId, Date date, boolean forceUpdate) {
        if (forceUpdate) {
            this.operationRepository.updateReportableStartTime(caseId, date);
        } else {
            this.operationRepository.updateReportableStartTimeIfNotSet(caseId, date);
        }
    }

    @Transactional(readOnly = false)
    public void markProcedureStart(CaseId caseId, Date date) {
        this.operationRepository.updateProcedureStartTime(caseId, date);
    }

    @Transactional(readOnly = false)
    public void markProcedureEnd(CaseId caseId, Date date) {
        this.operationRepository.updateProcedureEndTime(caseId, date);
    }

    @Transactional(readOnly = false)
    public void markInductionStartTime(CaseId caseId, Date date) {
        this.operationRepository.updateInductionStartTime(caseId, date);
    }

    @Transactional(readOnly = false)
    public void markExtubationTime(CaseId caseId, Date date) {
        this.operationRepository.updateExtubationTime(caseId, date);
    }

    @Transactional(readOnly = false)
    public void stopOperation(CaseId caseId, Date date) {
        this.operationRepository.updateEndTime(caseId, date, Instant.now());
        scanMedsReminderService.cleanUp(caseId);
        jobService.deleteAllJobs(caseId);
        log.info("Operation {} stopped @ {}", caseId, date);
    }

    @Transactional(readOnly = false)
    public void cancelAntibioticRedoseReminders(CaseId caseId) {
        Operation operation = getOperation(caseId).orElse(null);
        if (operation == null) {
            return;
        }
        List<JobMetadata> jobs = jobService.findAssociatedJobsByJobGroup(operation.getPatient(), operation, AntibioticRedoseReminderJob.JOB_GROUP);
        AtomicInteger count = new AtomicInteger();
        jobs.forEach(job ->
        {
            try {
                jobService.deleteJob(job.getJobKey(), QuartzJobService.SchedulerType.LowFrequency);
                count.getAndIncrement();
            } catch (SchedulerException e) {
                log.warn("Unable to cancel reminder job: {}", job.getJobKey(), e);
            }
        });
        if (count.get() > 0) {
            log.info("Cancelled {} antibiotic redose reminders", count.get());
        }

    }

    public Optional<Operation> findOperationBasedOnStartTime(Patient patient, Date date) {
        List<Operation> ops = operationRepository.findOperationBasedOnStartTime(patient, date);
        if (ops.isEmpty()) {
            return Optional.empty();
        }
        if (ops.size() > 1) {
            log.warn("Multiple open operations found for patient: {} -- choosing the last updated: {}", patient.getId(), ops.getFirst().getId());
        }
        var operationMatch = ops.getFirst();
        if(operationMatch.getEndTime() != null){
            log.warn("ODDITY: operation match for patient {} and date {} has end time set: {} - operation: {}", patient.getId(), date, operationMatch.getEndTime(), operationMatch.getId());
        }
        return Optional.of(operationMatch);
    }


    @Transactional(readOnly = false)
    public void saveOperationEvents(EventCategoryEvent event) {
        var operation = getOperation(event.getCaseId());
        if (operation.isEmpty()) {
            log.warn("Unable to save operation events for unknown case: {}", event.getCaseId());
            return;
        }
        var operationEvents = event.toOperationEvent(operation.get());
        this.operationEventRepository.saveAll(operationEvents);
    }

    @Transactional(readOnly = true)
    public List<OperationEvent> getOperationEvents(Operation operation, Collection<EventCategory> eventCategories) {
        if (eventCategories == null || eventCategories.isEmpty()) {
            return this.operationEventRepository.findByOperation(operation);
        }
        return this.operationEventRepository.findByOperationAndEventCategoryIn(operation, eventCategories);
    }
}
