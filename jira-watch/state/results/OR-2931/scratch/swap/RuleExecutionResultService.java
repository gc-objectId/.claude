package com.guided.orci.service.rules;

import com.guided.orci.configuration.rules.SaveMode;
import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.events.EvaluationMode;
import com.guided.orci.models.audit.AuditEvent;
import com.guided.orci.models.audit.AuditEventType;
import com.guided.orci.models.audit.AuditTargetType;
import com.guided.orci.models.medication.TypedWeight;
import com.guided.orci.models.patient.Operation;
import com.guided.orci.models.patient.Patient;
import com.guided.orci.models.patient.ValueUnit;
import com.guided.orci.models.patient.WeightClassification;
import com.guided.orci.models.rules.RuleExecutionContext;
import com.guided.orci.models.rules.RuleFiredResult;
import com.guided.orci.models.rules.RuleNotFiredResult;
import com.guided.orci.models.rules.RuleFailureResult;
import com.guided.orci.models.user.Practitioner;
import com.guided.orci.models.user.User;
import com.guided.orci.repository.RuleExecutionContextRepository;
import com.guided.orci.repository.RuleFiredResultRepository;
import com.guided.orci.repository.RuleNotFiredResultRepository;
import com.guided.orci.repository.RuleFailureResultRepository;
import com.guided.orci.service.UserService;
import com.guided.orci.service.rules.compliance.RuleComplianceService;
import com.guided.orci.audit.service.AuditService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Predicate;
import java.util.stream.Collectors;

@Service
public class RuleExecutionResultService {


    private RuleExecutionContextRepository ruleExecutionContextRepository;

    private RuleFiredResultRepository ruleFiredResultRepository;
    private RuleNotFiredResultRepository ruleNotFiredResultRepository;
    private RuleFailureResultRepository ruleFailureResultRepository;

    private UserService userService;

    private AuditService auditService;

    private RuleComplianceService ruleComplianceService;

    @Autowired
    public RuleExecutionResultService(AuditService auditService,
                                      UserService userService,
                                      RuleExecutionContextRepository ruleExecutionContextRepository,
                                      RuleFiredResultRepository ruleFiredResultRepository,
                                      RuleNotFiredResultRepository ruleNotFiredResultRepository,
                                      RuleFailureResultRepository ruleFailureResultRepository,
                                      RuleComplianceService ruleComplianceService) {
        this.auditService = auditService;
        this.userService = userService;
        this.ruleExecutionContextRepository = ruleExecutionContextRepository;
        this.ruleFiredResultRepository = ruleFiredResultRepository;
        this.ruleNotFiredResultRepository = ruleNotFiredResultRepository;
        this.ruleFailureResultRepository = ruleFailureResultRepository;
        this.ruleComplianceService = ruleComplianceService;
    }

    public RuleExecutionContext save(UUID trackingId, Patient patient, Operation operation, User evaluatingUser, Practitioner evaluatingPractitioner, EvaluationMode evaluationMode, SaveMode saveMode, List<EvaluationResult> results, WeightClassification weightClassification, TypedWeight typedWeight, AuditEventType auditEventType, Object context) {
        if(evaluatingUser == null) {
            try {
                // attempt to get user
                evaluatingUser = userService.getCurrentUser();
            } catch (Exception e) {

            }
        }

        var ruleExecutionContext = RuleExecutionContext.builder()
                .patient(patient)
                .operation(operation)
                .user(evaluatingUser)
                .evaluatingPractitioner(evaluatingPractitioner)
                .trackingId(trackingId)
                .weightClassification(weightClassification)
                .evaluationMode(evaluationMode)
                .weightType((typedWeight != null) ? typedWeight.calculationType() : null)
                .calculatedWeight((typedWeight != null) ? ValueUnit.fromStrings(typedWeight.quantity().getValue().toString(), typedWeight.quantity().getUnit().toString()).orElse(null) : null)
                .build();
        save(ruleExecutionContext, saveMode, results, auditEventType, context);
        return ruleExecutionContext;
    }

    private void save(RuleExecutionContext ruleExecutionContext, SaveMode saveMode, List<EvaluationResult> results, AuditEventType type, Object context) {
        this.ruleExecutionContextRepository.saveAndFlush(ruleExecutionContext);

        var needsAction = results.stream()
                .filter(EvaluationResult::isNeedsAction)
                .map(result -> new RuleFiredResult(ruleExecutionContext, result))
                .collect(Collectors.toList());
        this.ruleFiredResultRepository.persistAll(needsAction);
        needsAction.forEach(ruleComplianceService::evaluateCompliance);

        if (saveMode == SaveMode.ALL) {
            // Save failures separately from abstentions
            var failures = results.stream()
                    .filter(Predicate.not(EvaluationResult::isNeedsAction))
                    .filter(result -> result.getError() != null)
                    .map(result -> new RuleFailureResult(ruleExecutionContext, result))
                    .collect(Collectors.toList());
            this.ruleFailureResultRepository.persistAll(failures);

            var notFired = results.stream()
                    .filter(Predicate.not(EvaluationResult::isNeedsAction))
                    .filter(result -> result.getError() == null)
                    .map(result -> new RuleNotFiredResult(ruleExecutionContext, result))
                    .collect(Collectors.toList());
            this.ruleNotFiredResultRepository.persistAll(notFired);
        }

        if (type != null) {
            // if type is null, this save attempt was not generated from a user action. AuditEvents should be only for user-generated actions
            auditService.audit(AuditEvent.builder().eventType(type).targetType(AuditTargetType.PATIENT).target(ruleExecutionContext.getPatient().getPmrn()).context(Map.of("context", context)).build());
        }
    }

    public void save(UUID trackingId, Patient patient, Operation operation, User evaluatingUser, Practitioner evaluatingPractitioner, EvaluationMode evaluationMode, SaveMode saveMode, List<EvaluationResult> results, AuditEventType auditEventType, Object context) {
        // saves without weight information
        save(trackingId, patient, operation, evaluatingUser, evaluatingPractitioner, evaluationMode, saveMode, results, null, null, auditEventType, context);
    }

    /**
     * Updates the evaluationMode of the fired result with the given resultId
     * @param resultId
     * @param evaluationMode
     */
    @Transactional
    public void updateEvaluationMode(UUID resultId, EvaluationMode evaluationMode) {
        ruleFiredResultRepository.updateEvaluationModeById(resultId, evaluationMode);
    }

    public Optional<RuleFiredResult> getRuleExecutionResult(UUID id) {
        return this.ruleFiredResultRepository.findById(id);
    }

    /**
     * Re-stamps all RuleExecutionContext rows from one trackingId to another.
     * Used when a GuidedOR selection evaluates rules (using the tab UUID as trackingId) but
     * documentation later finds an existing admin with a different trackingId; the eval
     * contexts need to point at the same ID as the admin so compliance lookups work.
     */
    @Transactional
    public void rekeyTrackingId(UUID fromTrackingId, UUID toTrackingId) {
        ruleExecutionContextRepository.updateTrackingId(fromTrackingId, toTrackingId);
    }
}
