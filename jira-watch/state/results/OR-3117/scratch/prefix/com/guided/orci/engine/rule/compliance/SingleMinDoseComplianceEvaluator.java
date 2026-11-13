package com.guided.orci.engine.rule.compliance;

import com.guided.orci.engine.rule.RuleCategory;
import com.guided.orci.engine.rule.medication.selection.MedicationIndicationDoseOptionsRule;
import com.guided.orci.models.medication.MedicationIndicationConfig;
import com.guided.orci.models.rules.RuleFiredResult;
import com.guided.orci.models.rules.compliance.ComplianceResult;
import com.guided.orci.service.MedicationAdministrationService;
import com.guided.orci.service.rules.RuleService;
import com.guided.orci.service.rules.medication.MedicationIndicationConfigService;
import com.guided.orci.types.Dose;
import com.guided.orci.types.PediatricStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class SingleMinDoseComplianceEvaluator extends RuleComplianceEvaluator {
    public static final String ID = "single-min-dose";
    private final MedicationAdministrationService medicationAdministrationService;
    private final MedicationIndicationConfigService medicationIndicationConfigService;

    @Autowired
    public SingleMinDoseComplianceEvaluator(RuleService ruleService, MedicationAdministrationService medicationAdministrationService, MedicationIndicationConfigService medicationIndicationConfigService) {
        super(ID, ruleService);
        this.medicationAdministrationService = medicationAdministrationService;
        this.medicationIndicationConfigService = medicationIndicationConfigService;
    }

    @Override
    public ComplianceResult evaluate(RuleFiredResult result) {
        return handleIndications(result);
    }

    private ComplianceResult handleIndications(RuleFiredResult result) {
        var medAdminOpt = medicationAdministrationService.getAdministrationByTrackingId(result.getRuleExecutionContext().getTrackingId());
        if (medAdminOpt.isEmpty() ||
            medAdminOpt.get().getDose().isEmpty() || medAdminOpt.get().getIndication() == null || medAdminOpt.get().getRoute() == null) {
            return new ComplianceResult(label, result, true);
        }
        var medAdmin = medAdminOpt.get();
        var indictionConfig = medicationIndicationConfigService.findMatchingConfiguration(
                new MedicationIndicationConfig.Context(medAdmin.getMedicationIdentifier(),
                        result.getRuleExecutionContext().getPatient().getDob(),
                        result.getRuleExecutionContext().getPatient().getActualWeight(),
                        result.getRuleExecutionContext().getOperation().getPediatricStatusOrDefault(PediatricStatus.ADULT),
                        medAdmin.getRoute(),
                        medAdmin.getIndication()));
        var isCompliant = indictionConfig
                .flatMap(config -> config.getCalculatedLowerDoseThresholdDose(calculatedWeight(result)))
                .map(minDose -> isDoseCompliant(medAdmin, minDose, Dose::isGreaterThanOrEqualTo))
                .orElse(true);
        return new ComplianceResult(label, result, isCompliant);

    }

    @Override
    public boolean supportsEvaluation(RuleFiredResult result) {
        return hasCategory(result, RuleCategory.COMPLIANCE_SINGLE_MIN_DOSE) && MedicationIndicationDoseOptionsRule.ID.equals(result.getRuleIdentifier());
    }
}
