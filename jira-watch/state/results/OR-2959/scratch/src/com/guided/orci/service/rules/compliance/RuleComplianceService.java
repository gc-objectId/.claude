package com.guided.orci.service.rules.compliance;


import com.guided.orci.engine.rule.RuleCategory;
import com.guided.orci.engine.rule.compliance.RuleComplianceEvaluator;
import com.guided.orci.models.medication.MedicationAdministration;
import com.guided.orci.models.patient.Operation;
import com.guided.orci.models.rules.RuleFiredResult;
import com.guided.orci.models.rules.compliance.ComplianceResult;
import com.guided.orci.repository.ComplianceResultRepository;
import com.guided.orci.repository.RuleFiredResultRepository;
import com.guided.orci.service.rules.RuleService;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Stream;

@Service
public class RuleComplianceService {
    private static final Logger log = LoggerFactory.getLogger(RuleComplianceService.class);

    private RuleFiredResultRepository ruleFiredResultRepository;
    private ComplianceResultRepository complianceResultRepository;
    private ApplicationContext applicationContext;
    private RuleService ruleService;
    private Collection<RuleComplianceEvaluator> complianceEvaluators = new ArrayList<>();

    public RuleComplianceService(RuleFiredResultRepository ruleFiredResultRepository, ComplianceResultRepository complianceResultRepository, ApplicationContext applicationContext, RuleService ruleService) {
        this.ruleFiredResultRepository = ruleFiredResultRepository;
        this.applicationContext = applicationContext;
        this.complianceResultRepository = complianceResultRepository;
        this.ruleService = ruleService;
    }

    @PostConstruct
    public void setup() {
        this.complianceEvaluators = applicationContext.getBeansOfType(RuleComplianceEvaluator.class).values();
    }

    @Transactional(readOnly = false, propagation = Propagation.REQUIRES_NEW)
    public void evaluateComplianceOnMedicationAdministration(MedicationAdministration medAdmin) {
        var results = ruleFiredResultRepository.findAllByRuleExecutionContext_TrackingId(medAdmin.getTrackingId());

        // Guarded per firing: the firings behind one administration are independent verdicts, so one
        // that cannot be evaluated must not cost the others their compliance record.
        for (RuleFiredResult result : results) {
            try {
                evaluateCompliance(result);
            } catch (Exception e) {
                log.error("Unable to evaluate compliance for rule fired result: {} on med admin: {}",
                        result.getId(), medAdmin.getId(), e);
            }
        }
    }

    @Transactional(readOnly = false, propagation = Propagation.REQUIRES_NEW)
    public void evaluateComplianceForFiring(UUID id) {
        var firedResult = ruleFiredResultRepository.findById(id);
        if (firedResult.isEmpty()) {
            throw new IllegalArgumentException("No rule fired result found for id: " + id);
        }

        try {
            evaluateCompliance(firedResult.get());
        } catch (Exception e) {
            log.error("Unable to evaluate compliance for rule fired result: {}", id, e);
        }

    }

    @Transactional(readOnly = false)
    public void evaluateCompliance(RuleFiredResult result) {
        for (RuleComplianceEvaluator evaluator : complianceEvaluators) {
            if (evaluator.supportsEvaluation(result)) {
                var complianceResult = evaluator.evaluate(result);
                createOrUpdate(complianceResult);
            }
        }
    }

    /**
     * Saves a compliance results. If compliance result already exists for a rule fired result, it will be updated. Otherwise, a new compliance result will be created.
     * @param complianceResult
     */
    @Transactional(readOnly = false)
    public void createOrUpdate(ComplianceResult complianceResult) {
        Optional<ComplianceResult> existingComplianceResult = this.complianceResultRepository.findByRuleFiredResultAndLabel(complianceResult.getRuleFiredResult(), complianceResult.getLabel());
        if (existingComplianceResult.isPresent()) {
            ComplianceResult existing = existingComplianceResult.get();
            existing.setCompliant(complianceResult.isCompliant());
            this.complianceResultRepository.save(existing);
        } else {
            this.complianceResultRepository.save(complianceResult);
        }

    }

    @Transactional(readOnly = false)
    public void processComplianceResults(boolean missingOnly, Instant since) {
        Stream<RuleFiredResult> ruleFiredResultStream;
        if(missingOnly) {
            ruleFiredResultStream =  this.ruleFiredResultRepository.streamAllWithoutComplianceResult(since);
        } else {
            ruleFiredResultStream = this.ruleFiredResultRepository.streamAll(since);
        }
        // Guarded per firing so a result that cannot be evaluated does not abandon the rest of the
        // tenant's backlog. The guard covers failures raised before any database work, which is where
        // an unevaluable firing fails. Every firing shares this transaction, so a persistence-layer
        // failure still marks it rollback-only and discards the run regardless of this catch.
        ruleFiredResultStream.forEach(result -> {
            try {
                evaluateCompliance(result);
            } catch (Exception e) {
                log.error("Unable to evaluate compliance for rule fired result: {}", result.getId(), e);
            }
        });
    }

    @Transactional(readOnly = false, propagation = Propagation.REQUIRES_NEW)
    public void evaluateComplianceForCaseOnStop(Operation operation) {
        log.info("Evaluating compliance for case stop: operation={}", operation.getCaseId());
        processRuleFiringsForOperation(operation, ruleService.getRulesWithRuleCategory(RuleCategory.COMPLIANCE_MEDICATION_ADMINISTERED));
        processRuleFiringsForOperation(operation, ruleService.getRulesWithRuleCategory(RuleCategory.COMPLIANCE_MEDICATION_NOT_ADMINISTERED));
        processRuleFiringsForOperation(operation, ruleService.getRulesWithRuleCategory(RuleCategory.COMPLIANCE_ANTIBIOTIC_REDOSE));
        processRuleFiringsForOperation(operation, ruleService.getRulesWithRuleCategory(RuleCategory.COMPLIANCE_ERAS_ANTIEMETICS));
        processRuleFiringsForOperation(operation, ruleService.getRulesWithRuleCategory(RuleCategory.COMPLIANCE_GLUCOSE_CHECK));
    }


    private void processRuleFiringsForOperation(Operation operation, Set<String> ruleIds) {
        if (ruleIds.isEmpty()) return;
        List<RuleFiredResult> results = ruleFiredResultRepository.findAllByOperationIdAndRuleIdentifierIn(
                operation.getId(), ruleIds);
        log.info("Found {} rule firings to evaluate at case stop for operation: {}", results.size(), operation.getCaseId());
        for (RuleFiredResult result : results) {
            try {
                evaluateCompliance(result);
            } catch (Exception e) {
                log.error("Unable to evaluate compliance for rule fired result: {} on operation: {}",
                        result.getId(), operation.getCaseId(), e);
            }
        }
    }
}
