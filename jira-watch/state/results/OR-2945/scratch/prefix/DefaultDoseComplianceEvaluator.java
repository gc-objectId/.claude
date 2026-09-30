package com.guided.orci.engine.rule.compliance;

import com.guided.orci.dto.DoseOptionDTO;
import com.guided.orci.engine.rule.RuleCategory;
import com.guided.orci.engine.rule.medication.selection.InsulinDefaultDoseWarningRule;
import com.guided.orci.engine.rule.medication.selection.MedicationIndicationDoseOptionsRule;
import com.guided.orci.models.medication.MedicationAdministration;
import com.guided.orci.models.medication.MedicationIndicationConfig;
import com.guided.orci.models.medication.MedicationRoute;
import com.guided.orci.types.Dose;
import com.guided.orci.models.rules.RuleFiredResult;
import com.guided.orci.models.rules.compliance.ComplianceResult;
import com.guided.orci.service.MedicationAdministrationService;
import com.guided.orci.service.medication.MedicationService;
import com.guided.orci.service.rules.RuleService;
import com.guided.orci.service.rules.medication.MedicationIndicationConfigService;
import com.guided.orci.types.PediatricStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Optional;

@Component
public class DefaultDoseComplianceEvaluator extends RuleComplianceEvaluator {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(DefaultDoseComplianceEvaluator.class);
    public static final String ID = "default-dose";
    private final MedicationAdministrationService medicationAdministrationService;
    private final MedicationIndicationConfigService medicationIndicationConfigService;
    private final MedicationService medicationService;

    @Autowired
    public DefaultDoseComplianceEvaluator(RuleService ruleService, MedicationAdministrationService medicationAdministrationService, MedicationIndicationConfigService medicationIndicationConfigService, MedicationService medicationService) {
        super(ID, ruleService);
        this.medicationAdministrationService = medicationAdministrationService;
        this.medicationIndicationConfigService = medicationIndicationConfigService;
        this.medicationService = medicationService;
    }

    private static boolean isMedAdminCompliantWithDose(MedicationAdministration medAdmin, DoseOptionDTO defaultDoseOption) {
        var adminDose = medAdmin.getDose();
        var expectedDose = defaultDoseOption.toDose();
        if (adminDose.isEmpty() || expectedDose.isEmpty()) {
            return true;
        }

        var doseType = getDoseType(defaultDoseOption);
        return switch (doseType) {
            case FLAT -> adminDose.get().isEquivalentTo(expectedDose.get());
            case WEIGHT -> isWithinWeightBasedRange(adminDose.get(), expectedDose.get(), defaultDoseOption);
        };
    }

    private static boolean isWithinWeightBasedRange(Dose adminDose, Dose expectedDose, DoseOptionDTO defaultDoseOption) {
        if (defaultDoseOption.getRoundingFactor() == null) {
            return adminDose.isEquivalentTo(expectedDose);
        }
        var roundingDose = Dose.of(defaultDoseOption.getRoundingFactor(), defaultDoseOption.getCalculatedDoseUnits());
        if (roundingDose.isEmpty()) {
            return adminDose.isEquivalentTo(expectedDose);
        }
        var lowerBound = expectedDose.subtract(roundingDose.get());
        var upperBound = expectedDose.add(roundingDose.get());
        return adminDose.isGreaterThanOrEqualTo(lowerBound) && adminDose.isLessThanOrEqualTo(upperBound);
    }

    private static DoseType getDoseType(DoseOptionDTO defaultDoseOption) {
        return defaultDoseOption.getCalculatedLabel().equals(defaultDoseOption.getRawLabel())
                ? DoseType.FLAT
                : DoseType.WEIGHT;
    }

    @Override
    public ComplianceResult evaluate(RuleFiredResult result) {
        if (result.getRuleIdentifier().equals(InsulinDefaultDoseWarningRule.ID)) {
            // for w-insulin-default-dose, only the subcutaneous route has a default dose, so handle it separately
            return handleInsulinDoseGuidance(result);
        }

        if (result.getRuleIdentifier().equals(MedicationIndicationDoseOptionsRule.ID)) {
            return handleIndicationDefaultDose(result);
        }

        if (!hasDefaultDoseOverride(result)) {
            // assume compliance if there is no default dose set
            return new ComplianceResult(label, result, true);
        }

        var medAdmin = getMedAdmin(result);
        if (medAdmin.isEmpty() || medAdmin.get().getDoseAmount() == null) {
            // if there is no med admin or has no dose amount, we consider it compliant
            return new ComplianceResult(label, result, true);
        }

        // Only evaluate compliance for routes configured for this medication. Administrations via
        // unsupported routes (e.g. irrigation or topical use of an IV formulation) have no dose
        // guidance to compare against, so we can't meaningfully flag them as non-compliant.
        var route = medAdmin.get().getRoute();
        var medication = medicationService.findMedication(medAdmin.get().getMedicationIdentifier());
        if (medication.isPresent() && !medication.get().getUniqueMedicationRoutes().contains(route)) {
            return new ComplianceResult(label, result, true);
        }

        var defaultDoseOption = getDefaultDoseOverride(result, route);
        if (defaultDoseOption.isEmpty()) {
            return new ComplianceResult(label, result, true);
        }

        var isCompliant = isMedAdminCompliantWithDose(medAdmin.get(), defaultDoseOption.get());
        return new ComplianceResult(label, result, isCompliant);
    }

    private ComplianceResult handleIndicationDefaultDose(RuleFiredResult result) {
        var medAdminOpt = getMedAdmin(result);
        if (medAdminOpt.isEmpty() || medAdminOpt.get().getDoseAmount() == null) {
            // early terminate - assume compliance
            return new ComplianceResult(label, result, true);
        }
        var medAdmin = medAdminOpt.get();
        var indication = medAdmin.getIndication();
        if (StringUtils.hasText(indication)) {
            var indicationConfig = this.medicationIndicationConfigService.findMatchingConfiguration(
                    new MedicationIndicationConfig.Context(medAdmin.getMedicationIdentifier(),
                            result.getRuleExecutionContext().getPatient().getDob(),
                            result.getRuleExecutionContext().getPatient().getActualWeight(),
                            result.getRuleExecutionContext().getOperation().getPediatricStatusOrDefault(PediatricStatus.ADULT),
                            medAdmin.getRoute(),
                            medAdmin.getIndication()));
            if (indicationConfig.isPresent()) {

                var defaultDose = indicationConfig.get().getDefaultDose();
                if (defaultDose.isPresent()) {
                    // if the default dose is the same as the administered dose, consider it compliant
                    var compliant = medAdmin.getDose().isPresent() && defaultDose.get().isEquivalentTo(medAdmin.getDose().get());
                    return new ComplianceResult(label, result, compliant);
                }
            }
        }
        // all other scenarios, consider it compliant
        return new ComplianceResult(label, result, true);
    }

    private ComplianceResult handleInsulinDoseGuidance(RuleFiredResult result) {
        assert result.getRuleIdentifier().equals(InsulinDefaultDoseWarningRule.ID);

        var medAdmin = getMedAdmin(result);
        if (medAdmin.isEmpty() || medAdmin.get().getDoseAmount() == null) {
            return new ComplianceResult(label, result, true);
        }

        if (!InsulinDefaultDoseWarningRule.ROUTES_OF_INTEREST.contains(medAdmin.get().getRoute())) {
            // If for a route we don't have interest in, assume compliance
            return new ComplianceResult(label, result, true);
        }

        log.warn("OR-2945 red check: pre-fix evaluator reading routeDoseOptionOverride for insulin firing {}", result.getId());
        if (result.getRouteDoseOptionOverride() == null) {
            return new ComplianceResult(label, result, true);
        }

        var defaultDoseOption = result.getRouteDoseOptionOverride()
                .getOrDefault(medAdmin.get().getRoute(), List.of()).stream()
                .filter(DoseOptionDTO::getDefaultOption)
                .findFirst();

        if (defaultDoseOption.isEmpty()) {
            return new ComplianceResult(label, result, true);
        }

        var isCompliant = isMedAdminCompliantWithDose(medAdmin.get(), defaultDoseOption.get());
        return new ComplianceResult(label, result, isCompliant);
    }

    private Optional<MedicationAdministration> getMedAdmin(RuleFiredResult result) {
        return medicationAdministrationService.getAdministrationByTrackingId(result.getRuleExecutionContext().getTrackingId());
    }

    @Override
    public boolean supportsEvaluation(RuleFiredResult result) {
        boolean hasDefaultDoseOverride = hasDefaultDoseOverride(result);
        boolean isInsulinRule = result.getRuleIdentifier().equals(InsulinDefaultDoseWarningRule.ID);
        boolean isIndicationsRule = result.getRuleIdentifier().equals(MedicationIndicationDoseOptionsRule.ID);

        return hasCategory(result, RuleCategory.COMPLIANCE_DEFAULT_DOSE)
               && (hasDefaultDoseOverride || isInsulinRule || isIndicationsRule);
    }

    private boolean hasDefaultDoseOverride(RuleFiredResult result) {
        boolean hasRouteOverrides = result.getRouteDefaultDoseOverride() != null
                                     && !result.getRouteDefaultDoseOverride().isEmpty();
        return hasRouteOverrides || result.getDefaultDoseOverride() != null;
    }

    private Optional<DoseOptionDTO> getDefaultDoseOverride(RuleFiredResult result, MedicationRoute route) {
        if (result.getRouteDefaultDoseOverride() != null) {
            var routeOverride = result.getRouteDefaultDoseOverride().get(route);
            if (routeOverride != null) {
                return Optional.of(routeOverride);
            }
        }
        return Optional.ofNullable(result.getDefaultDoseOverride());
    }

    private enum DoseType {
        FLAT,
        WEIGHT
    }
}
