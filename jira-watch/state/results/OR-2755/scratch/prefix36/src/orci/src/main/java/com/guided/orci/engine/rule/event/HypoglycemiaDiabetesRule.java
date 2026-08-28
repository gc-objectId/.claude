package com.guided.orci.engine.rule.event;

import com.guided.orci.engine.*;
import com.guided.orci.engine.rule.GuidanceCategory;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.service.CitationService;
import com.guided.orci.service.ObservationService;
import com.guided.orci.service.OperationService;
import com.guided.orci.service.PatientService;
import com.guided.orci.types.wrappers.CitationId;
import com.guided.orci.utils.StringUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import static com.guided.orci.engine.EvaluationResultPromptTemplate.CITATION_TOOLTIP_PLACEHOLDER;

@Slf4j
@RuleDefinition(
        id = HypoglycemiaDiabetesRule.ID,
        description = "Alert for hypoglycemia with insulin infusion management, for patients with diabetes type I or who are pregnant",
        trigger = RuleTrigger.NOTIFICATION,
        type = RuleType.ALERT,
        guidanceCategory = GuidanceCategory.MONITORING
)
@Component
public class HypoglycemiaDiabetesRule extends BaseHypoglycemiaRule {
    public static final String ID = "a-hypoglycemia-dm1-pregnancy";

    public HypoglycemiaDiabetesRule(
            CitationService citationService,
            PatientService patientService, OperationService operationService, ObservationService observationService) {
        super(citationService, patientService, operationService, observationService);
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }

    @Override
    protected boolean handlesDiabetesAndPregnant() {
        return true;
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {
        boolean insulinOngoing = (Boolean) result.getOrDefault(HAS_ACTIVE_INSULIN, false);
        BigDecimal insulinRate = (BigDecimal) result.getOrDefault(CURRENT_INSULIN_RATE, BigDecimal.ZERO);
        boolean dextroseOngoing = (Boolean) result.getOrDefault(HAS_ACTIVE_DEXTROSE, false);
        boolean hasType1Diabetes = (Boolean) result.getOrDefault(HAS_DIABETES_TYPE_1, false);
        boolean isPregnant = (Boolean) result.getOrDefault(IS_PREGNANT, false);

        int glucoseValue = (int) result.getOrDefault(CURRENT_GLUCOSE_VALUE, 0);

        String glucoseAction = "";
        String glucoseThreshold = "";
        if (glucoseValue < 50) {
            glucoseAction = "For glucose < 50 mg/dL, administer 25 g (1 amp) D50W.";
            glucoseThreshold = "< 50 mg/dL";
        } else if (glucoseValue <= 69) {
            glucoseAction = "For glucose 50-69 mg/dL, administer 12.5 g (1/2 amp) D50W.";
            glucoseThreshold = "< 70 mg/dL";
        }

        String dextroseInfusionAction = "";
        if (dextroseOngoing && insulinOngoing) {
            dextroseInfusionAction = "maintain dextrose infusion.";
        } else if (insulinOngoing) {
            dextroseInfusionAction = "consider one of the following dextrose sources: " + CITATION_TOOLTIP_PLACEHOLDER + "<br/><ul>"
                                     + "<li>D5W ≥ 60 mL/hr</li>"
                                     + "<li>D10W ≥ 30 mL/hr</li>"
                                     + "<li>D20W ≥ 15 mL/hr</li>"
                                     + "</ul>";
        }

        String insulinInfusionRateAction = "";
        if (insulinOngoing && new BigDecimal("0.5").compareTo(insulinRate) == 0) {
            insulinInfusionRateAction = "maintain insulin infusion at 0.5 Units/hr";
        } else if (insulinOngoing && new BigDecimal("0.5").compareTo(insulinRate) != 0) {
            insulinInfusionRateAction = "change insulin infusion rate to 0.5 Units/hr";
        }

        String condition = "";
        if (hasType1Diabetes && isPregnant && insulinOngoing) {
            condition = "For pregnant patients with Type I Diabetes,";
        } else if (hasType1Diabetes && insulinOngoing) {
            condition = "For patients with Type I Diabetes,";
        } else if (isPregnant && insulinOngoing) {
            condition = "For pregnant patients,";
        }
        String glucoseStr = "Blood Glucose = " + glucoseValue + " mg/dL.";


        String glucoseCheckReminder = "For patients with glucose " + glucoseThreshold + ", glucose should be checked every 15min.";
        String title = StringUtils.joinSpaceSeparated("Administer D50W.", insulinInfusionRateAction.isEmpty() ? "" : StringUtils.capitalizeFirstLetter(insulinInfusionRateAction) + ".");
        String description = StringUtils.joinSpaceSeparated(glucoseStr,
                glucoseAction,
                condition.isEmpty() ? "" : condition,
                condition.isEmpty() ? "" : StringUtils.grammaticalList(List.of(insulinInfusionRateAction, dextroseInfusionAction), ""),
                glucoseCheckReminder);

        return EvaluationResultPromptTemplate.builder()
                .ruleIdentifier(getRuleIdentifier())
                .title(title)
                .description(description)
                .tabName("Hypoglycemia")
                .type(RuleType.ALERT)
                .acceptText("Will Administer D50W")
                .rejectText("Reject")
                .rejectReasons(Stream.of(
                        RejectionReasonOption.simple(RejectionReason.MEDICATION_GIVEN, "D50W already given")
                ).toList())
                .citations(getCitations(result))
                .build().createPrompt(result);
    }

    @Override
    public List<CitationId> getConditionalCitationDefinitions() {
        return List.of(
                CitationDefinition.HYPOGLYCEMIA_50_DIABETES,
                CitationDefinition.HYPOGLYCEMIA_70_DIABETES,
                CitationDefinition.HYPOGLYCEMIA_70_PREGNANT,
                CitationDefinition.HYPOGLYCEMIA_70_PREGNANT
        );
    }

    @Override
    public List<CitationId> getMatchingCitationDefinitions(Map<String, Object> details) {
        int glucoseValue = (int) details.getOrDefault(CURRENT_GLUCOSE_VALUE, 0);
        var isPregnant = (Boolean) details.getOrDefault(IS_PREGNANT, false);
        var hasDiabetesType1 = (Boolean) details.getOrDefault(HAS_DIABETES_TYPE_1, false);
        if (glucoseValue < 50) {
            return List.of(
                    hasDiabetesType1 || !isPregnant
                            ? CitationDefinition.HYPOGLYCEMIA_50_DIABETES
                            : CitationDefinition.HYPOGLYCEMIA_50_PREGNANT
            );
        }
        return List.of(
                hasDiabetesType1 || !isPregnant
                        ? CitationDefinition.HYPOGLYCEMIA_70_DIABETES
                        : CitationDefinition.HYPOGLYCEMIA_70_PREGNANT
        );
    }
}