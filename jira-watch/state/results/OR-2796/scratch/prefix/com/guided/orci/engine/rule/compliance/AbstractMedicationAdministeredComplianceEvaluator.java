package com.guided.orci.engine.rule.compliance;

import com.guided.orci.models.medication.AbstractMedicationAdministration;
import com.guided.orci.models.rules.RuleFiredResult;
import com.guided.orci.models.rules.compliance.ComplianceResult;
import com.guided.orci.service.medication.MedicationService;
import com.guided.orci.service.rules.RuleService;

import java.util.Date;
import java.util.List;
import java.util.Optional;

public abstract class AbstractMedicationAdministeredComplianceEvaluator extends RuleComplianceEvaluator {

    public static final String TARGET_MEDICATION_CATEGORY_KEY = "TARGET_MEDICATION_CATEGORY";

    protected final MedicationService medicationService;

    protected AbstractMedicationAdministeredComplianceEvaluator(String label, RuleService ruleService, MedicationService medicationService) {
        super(label, ruleService);
        this.medicationService = medicationService;
    }

    @Override
    public ComplianceResult evaluate(RuleFiredResult result) {
        var targetMedicationCategory = getTargetMedicationCategory(result);
        if (targetMedicationCategory == null) {
            return new ComplianceResult(label, result, true);
        }

        var operation = result.getRuleExecutionContext().getOperation();
        var endDate = Optional.ofNullable(operation).map(op -> op.getEndTime()).orElse(null);
        // case still open — optimistically compliant, re-evaluated at case close
        if (endDate == null) {
            return new ComplianceResult(label, result, true);
        }

        var patient = result.getRuleExecutionContext().getPatient();
        var ruleFiredTime = result.getCreatedDate() != null ? Date.from(result.getCreatedDate()) : new Date();
        List<? extends AbstractMedicationAdministration> administrations = medicationService
                .getAdministrationsByMedicationCategoryInDateRange(patient.getPatientId(), targetMedicationCategory, ruleFiredTime, endDate);

        return new ComplianceResult(label, result, isCompliant(!administrations.isEmpty()));
    }

    protected abstract boolean isCompliant(boolean hasAdministration);

    private String getTargetMedicationCategory(RuleFiredResult result) {
        var details = result.getDetails();
        if (details == null) {
            return null;
        }
        var targetMedication = details.get(TARGET_MEDICATION_CATEGORY_KEY);
        return targetMedication instanceof String ? (String) targetMedication : null;
    }
}
