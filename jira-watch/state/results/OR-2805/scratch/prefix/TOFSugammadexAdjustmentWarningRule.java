package com.guided.orci.engine.rule.medication.selection;

import com.guided.orci.dto.DoseOptionDTO;
import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.engine.*;
import com.guided.orci.engine.config.ParameterizedRule;
import com.guided.orci.engine.rule.GuidanceCategory;
import com.guided.orci.engine.rule.RuleCategory;
import com.guided.orci.engine.rule.medication.selection.config.TOFSugammadexAdjustmentWarningRuleConfig;
import com.guided.orci.models.medication.IMedicationAdministration;
import com.guided.orci.models.medication.MedicationCategory;
import com.guided.orci.models.medication.WeightBasedDoseOption;
import com.guided.orci.models.observation.ObservationType;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.service.CitationService;
import com.guided.orci.service.ObservationService;
import com.guided.orci.service.PatientWeightService;
import com.guided.orci.service.rules.RuleService;
import com.guided.orci.types.Dose;
import com.guided.orci.types.wrappers.CitationId;
import com.guided.orci.units.Units;
import com.guided.orci.utils.DateUtils;
import com.guided.orci.utils.FunctionalUtils;
import com.guided.orci.utils.WithCitation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RuleDefinition(id = TOFSugammadexAdjustmentWarningRule.ID,
        description = "Warns when sugammadex is selected with prior medications and TOF",
        trigger = RuleTrigger.SELECTION,
        categories = {RuleCategory.COMPLIANCE_DEFAULT_DOSE},
        type = RuleType.WARNING,
        guidanceCategory = GuidanceCategory.WRONG_DOSE
)
@Component
public class TOFSugammadexAdjustmentWarningRule extends MedicationSelectionRule
        implements ParameterizedRule<TOFSugammadexAdjustmentWarningRuleConfig> {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(TOFSugammadexAdjustmentWarningRule.class);
    public static final String ID = "w-sugammadex-default-dose";

    public static final String TOF = "TOF";
    public static final String TOF_RATIO = "TOF_RATIO";

    private final ObservationService observationService;
    private final PatientWeightService patientWeightService;
    private final RuleService ruleService;

    @Autowired
    public TOFSugammadexAdjustmentWarningRule(CitationService citationService, PatientWeightService patientWeightService, ObservationService observationService, RuleService ruleService) {
        super(citationService);
        this.patientWeightService = patientWeightService;
        this.observationService = observationService;
        this.ruleService = ruleService;
    }


    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {

        return EvaluationResultPromptTemplate.builder().ruleIdentifier(getRuleIdentifier())
                .type(RuleType.WARNING)
                .citationsLocation(CitationLocation.NEXT_TO_DOSE_OPTIONS)
                .citations(getCitations(result))
                .build().createPrompt(result);
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }

    public List<CitationId> getConditionalCitationDefinitions() {
        return List.of(CitationDefinition.SUGAMMADEX_1, CitationDefinition.SUGAMMADEX_0_DOT_22, CitationDefinition.SUGAMMADEX_2, CitationDefinition.SUGAMMADEX_4, CitationDefinition.SUGAMMADEX_16);
    }

    @Override
    public List<CitationId> getMatchingCitationDefinitions(Map<String, Object> results) {
        CitationId citationId = (CitationId) results.get(CITATION_ID);
        if (citationId == null) {
            return List.of();
        }
        return List.of(citationId);
    }

    @Override
    protected EvaluationResult evaluate(MedicationSelectionContext context) {
        if (!context.hasPrimaryMedicationCategory(MedicationCategory.SUGAMMADEX)) {
            return abstain(context, "Medication is not " + MedicationCategory.SUGAMMADEX);
        }
        var config = ruleService.getConfig(TOFSugammadexAdjustmentWarningRule.class);
        var mostRecentRocuronium = context.getPatient().getMostRecentIntraopMedicationAdministration(MedicationCategory.ROCURONIUM, context.getSafeOperationStartDate());
        var mostRecentVecuronium = context.getPatient().getMostRecentIntraopMedicationAdministration(MedicationCategory.VECURONIUM, context.getSafeOperationStartDate());
        if (mostRecentRocuronium.isEmpty() && mostRecentVecuronium.isEmpty()) {
            return abstain(context, "No prior medications of " + MedicationCategory.ROCURONIUM + " or " + MedicationCategory.VECURONIUM);
        }
        var details = details(context);
        DoseOptionDTO defaultDoseOverride = null;
        var roundingDose = context.getMedication().getWeightRoundingFactor().flatMap(roundingFactor -> Dose.of(roundingFactor, "mg"));
        // we expect a rounding factor defined for sugammadex
        if (roundingDose.isEmpty()) {
            return abstain(context, "No rounding factor defined for " + MedicationCategory.SUGAMMADEX);
        }
        // expect actual weight but will use the calculated weight in case we do ever need to use a different weight type
        var calculatedWeight = context.getCalculatedPatientWeight();
        if (calculatedWeight.isEmpty()) {
            return abstain(context, "No calculated patient weight");
        }
        var sugammadexPatientWeight = calculatedWeight.map(WithCitation::value);
        if (sugammadexPatientWeight.isEmpty()) {
            return abstain(context, "No patient weight defined for sugammadex (unexpected)");
        }
        details.put(WEIGHT_KG, sugammadexPatientWeight.map(it -> it.quantity().to(Units.KILOGRAM).getValue()).orElse(null));


        if (mostRecentRocuronium.isPresent()) {
            // check for recent roc dose
            Date threeMinutesAgo = context.getDateBeforeEvaluationDate(Duration.ofMinutes(3));
            var rocAdmin = mostRecentRocuronium.get();

            if (DateUtils.isBetween(threeMinutesAgo, context.getEvaluationTime(), rocAdmin.getStartOfAdministrationDate())) {
                // single-dose mode (Mayo): the most recent single rocuronium bolus in the window; otherwise the cumulative dose over the window
                Double relevantRocDose = config.useSingleDoseForHighRocuronium()
                        ? mostRecentRocuroniumBolusDoseMg(context, threeMinutesAgo)
                        : context.getPatient().calculateCumulativeDose(threeMinutesAgo.toInstant(), MedicationCategory.ROCURONIUM, context);

                var weightTypeAdjustment = this.patientWeightService.getWeightTypeAdjustment(context.getPatient(), mostRecentRocuronium.get().getMedication().get().getMedicationIdentifier(), MedicationCategory.ROCURONIUM, context.getOperation().getProcedureTypeId());
                var rocuroniumTypedWeight = this.patientWeightService.getTypedWeight(context.getPatient(), weightTypeAdjustment);
                if (rocuroniumTypedWeight.isPresent()) {

                    // the rocuronium dose amount threshold is N mg/kg of the typed weight (configurable, default 1.2)
                    var rocThreshold = rocuroniumTypedWeight.get().quantity().getValue();
                    if (relevantRocDose != null && rocThreshold != null
                            && relevantRocDose >= rocThreshold.doubleValue() * config.getRocuronium16MgKgThreshold()) {
                        defaultDoseOverride = DoseOptionDTO.fromWeightBasedDoseOption(new WeightBasedDoseOption(new BigDecimal("16"), "mg/kg", roundingDose.orElseThrow()), context.getPatient().getPediatricStatus(),
                                sugammadexPatientWeight.get(), true);
                        details.put(CITATION_ID, CitationDefinition.SUGAMMADEX_16);

                        return baseBuilder(context)
                                .details(details)
                                .needsAction(true)
                                .routeDefaultDoseOverride(buildRouteDefaultDoseOverrides(context, defaultDoseOverride))
                                .prompt(createPrompt(details))
                                .build();
                    } else {
                        log.debug("Recent rocuronium dose did not meet threshold");
                    }
                }
            }
        }
        var latestNMBDate = FunctionalUtils.maxOptional(mostRecentRocuronium.map(IMedicationAdministration::getStartOfAdministrationDate), mostRecentVecuronium.map(IMedicationAdministration::getStartOfAdministrationDate));
        if (latestNMBDate.isEmpty()) {
            return abstain(context, details, "No latest NMB administration date");
        }

        var threeMinutesAfterLatestNMB = DateUtils.plus(latestNMBDate.get(), Duration.ofMinutes(3));
        var tof = observationService.getMaxObservation(context, threeMinutesAfterLatestNMB, ObservationType.TOF);
        BigDecimal defaultDoseValue = null;
        if (tof.isEmpty()) {
            return abstain(context, details, "No TOF data in timeframe of interest");
        }
        var tofInteger = tof.get().intValue();
        details.put(TOF, tofInteger);
        switch (tofInteger) {
            case 0 -> {
                details.put(CITATION_ID, CitationDefinition.SUGAMMADEX_4);
                defaultDoseValue = new BigDecimal("4");
            }
            case 1, 2, 3 -> {
                details.put(CITATION_ID, CitationDefinition.SUGAMMADEX_2);
                defaultDoseValue = new BigDecimal("2");
            }
            case 4 -> {
                if (!config.isTof4RatioDosingEnabled()) {
                    // simplified scheme (Mayo): TOF ≥ 1 is always 2 mg/kg, no ratio-based dosing
                    details.put(CITATION_ID, CitationDefinition.SUGAMMADEX_2);
                    defaultDoseValue = new BigDecimal("2");
                } else if (mostRecentRocuronium.isPresent()) {
                    // ratio-based dosing only applicable to Rocuronium
                    var tofRatio = observationService.getMaxObservation(context, threeMinutesAfterLatestNMB, ObservationType.TOF_RATIO);
                    if (tofRatio.isEmpty()) {
                        details.put(CITATION_ID, CitationDefinition.SUGAMMADEX_1);
                        defaultDoseValue = new BigDecimal("1");
                    } else {
                        float tofRatioValue = tofRatio.get();
                        details.put(TOF_RATIO, tofRatioValue);
                        if (tofRatioValue < 50) {
                            details.put(CITATION_ID, CitationDefinition.SUGAMMADEX_1);
                            defaultDoseValue = new BigDecimal("1");
                        } else if (tofRatioValue >= 50 && tofRatioValue < 90) {
                            details.put(CITATION_ID, CitationDefinition.SUGAMMADEX_0_DOT_22);
                            defaultDoseValue = new BigDecimal("0.22");
                        }
                    }
                }
            }
            default -> {
                return abstain(context, details, "Invalid TOF value: " + tofInteger);
            }
        }
        if (defaultDoseValue == null) {
            return abstain(context, details, "No default dose value set");
        }

        defaultDoseOverride =
                DoseOptionDTO.fromWeightBasedDoseOption(new WeightBasedDoseOption(defaultDoseValue, "mg/kg", roundingDose.orElseThrow()), context.getPatient().getPediatricStatus(),
                        sugammadexPatientWeight.get(), true);

        if (defaultDoseOverride.getPreroundedDoseAmount().compareTo(new BigDecimal("25")) <= 0) {
            // if we're under 25, just round up to 25
            defaultDoseOverride = DoseOptionDTO.fromWeightBasedDoseOption(new WeightBasedDoseOption(defaultDoseValue, "mg/kg", Dose.of(25f, "mg").orElseThrow(), RoundingMode.UP), context.getPatient().getPediatricStatus(),
                    sugammadexPatientWeight.get(), true);
        }
        log.error("OR2805-REDCHECK-PREFIX-DEFAULT-DOSE=" + defaultDoseOverride.getCalculatedDoseAmount());
        return baseBuilder(context)
                .needsAction(true)
                .routeDefaultDoseOverride(buildRouteDefaultDoseOverrides(context, defaultDoseOverride))
                .details(details)
                .prompt(createPrompt(details))
                .build();

    }

    /**
     * Dose (in mg) of the most recent rocuronium bolus administered within the window. Considers
     * boluses only (infusions are ignored, matching calculateCumulativeDose) and only mg-denominated
     * doses. Returns null when there is no qualifying bolus.
     */
    private Double mostRecentRocuroniumBolusDoseMg(MedicationSelectionContext context, Date windowStart) {
        return context.getPatient().getBolusMedicationAdministrations().stream()
                .filter(admin -> admin.hasMedicationCategory(MedicationCategory.ROCURONIUM))
                .filter(admin -> admin.getStartOfAdministrationDate() != null
                                 && DateUtils.isBetween(windowStart, context.getEvaluationTime(), admin.getStartOfAdministrationDate()))
                .filter(admin -> "mg".equals(admin.getDoseUnits()) && admin.getDoseAmount() != null)
                .max(Comparator.comparing(IMedicationAdministration::getStartOfAdministrationDate))
                .map(admin -> admin.getDoseAmount().doubleValue())
                .orElse(null);
    }
}
