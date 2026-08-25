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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import static com.guided.orci.engine.EvaluationResultPromptTemplate.CITATION_TOOLTIP_PLACEHOLDER;

@Slf4j
@RuleDefinition(
        id = HypoglycemiaRule.ID,
        description = "Alert for hypoglycemia with insulin infusion management, for non-diabetic non-pregnant patients",
        trigger = RuleTrigger.NOTIFICATION,
        type = RuleType.ALERT,
        guidanceCategory = GuidanceCategory.MONITORING
)
@Component
public class HypoglycemiaRule extends BaseHypoglycemiaRule {
    public static final String ID = "a-hypoglycemia";

    public HypoglycemiaRule(
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
        return false;
    }

    @Override
    protected void innerEvaluate(Map<String, Object> details) {
        int glucoseValue = (Integer) details.get(CURRENT_GLUCOSE_VALUE);
        boolean hasActiveInsulin = (Boolean) details.get(HAS_ACTIVE_INSULIN);

        // Determine alert type and D50W dose
        AlertType alertType;
        String d50wDose;

        if (glucoseValue < 50.0f) {
            // Severe hypoglycemia (<50 mg/dL)
            if (hasActiveInsulin) {
                alertType = AlertType.SEVERE_HYPOGLYCEMIA_WITH_INSULIN;
            } else {
                alertType = AlertType.SEVERE_HYPOGLYCEMIA_NO_INSULIN;
            }
            d50wDose = "25g (1 amp)";
        } else {
            // Moderate hypoglycemia (50-69 mg/dL)
            if (hasActiveInsulin) {
                alertType = AlertType.MODERATE_HYPOGLYCEMIA_WITH_INSULIN;
            } else {
                alertType = AlertType.MODERATE_HYPOGLYCEMIA_NO_INSULIN;
            }
            d50wDose = "12.5g (1/2 amp)";
        }

        details.put(D50W_DOSE, d50wDose);
        details.put(ALERT_TYPE, alertType);
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {
        AlertType alertType = (AlertType) result.getOrDefault(ALERT_TYPE, AlertType.MODERATE_HYPOGLYCEMIA_NO_INSULIN);
        boolean hasActiveInsulin = (Boolean) result.getOrDefault(HAS_ACTIVE_INSULIN, false);


        String acceptText = "Will Administer D50W";

        String title = hasActiveInsulin ? "Administer D50W and Hold Insulin" : "Administer D50W";

        List<String> actions = new ArrayList<>();
        String administerAction = "administer ${" + D50W_DOSE + "} D50W";
        String holdInsulinAction = "hold insulin infusion";

        actions.add(administerAction);
        if (hasActiveInsulin) {
            actions.add(holdInsulinAction);
        }


        String description = "Blood glucose = ${" + CURRENT_GLUCOSE_VALUE + "} ${" + GLUCOSE_UNITS + "}. " +
                "For glucose " + getGlucoseRange(alertType) + ", " +
                StringUtils.grammaticalList(actions, "") + ". Check glucose every 15 min until glucose > 90 mg/dL.";

        return EvaluationResultPromptTemplate.builder()
                .ruleIdentifier(getRuleIdentifier())
                .title(title)
                .description(description.trim())
                .tabName("Hypoglycemia")
                .type(RuleType.ALERT)
                .acceptText(acceptText)
                .rejectText("Reject")
                .rejectReasons(Stream.of(
                        RejectionReasonOption.simple(RejectionReason.MEDICATION_GIVEN, "D50W already given")
                ).toList())
                .citations(getCitations(result))
                .build().createPrompt(result);
    }

    private String getGlucoseRange(AlertType alertType) {
        return switch (alertType) {
            case SEVERE_HYPOGLYCEMIA_WITH_INSULIN, SEVERE_HYPOGLYCEMIA_NO_INSULIN -> "< 50 mg/dL";
            case MODERATE_HYPOGLYCEMIA_WITH_INSULIN, MODERATE_HYPOGLYCEMIA_NO_INSULIN -> "50-69 mg/dL";
        };
    }

    @Override
    public List<CitationId> getConditionalCitationDefinitions() {
        return List.of(
                CitationDefinition.HYPOGLYCEMIA_50_ON_INSULIN,
                CitationDefinition.HYPOGLYCEMIA_50,
                CitationDefinition.HYPOGLYCEMIA_70_ON_INSULIN,
                CitationDefinition.HYPOGLYCEMIA_70
        );
    }

    @Override
    public List<CitationId> getMatchingCitationDefinitions(Map<String, Object> details) {
        AlertType alertType = (AlertType) details.get(ALERT_TYPE);
        return switch (alertType) {
            case SEVERE_HYPOGLYCEMIA_WITH_INSULIN -> List.of(CitationDefinition.HYPOGLYCEMIA_50_ON_INSULIN);
            case SEVERE_HYPOGLYCEMIA_NO_INSULIN -> List.of(CitationDefinition.HYPOGLYCEMIA_50);
            case MODERATE_HYPOGLYCEMIA_WITH_INSULIN -> List.of(CitationDefinition.HYPOGLYCEMIA_70_ON_INSULIN);
            case MODERATE_HYPOGLYCEMIA_NO_INSULIN -> List.of(CitationDefinition.HYPOGLYCEMIA_70);
            case null -> List.of();
        };
    }

    public enum AlertType {
        SEVERE_HYPOGLYCEMIA_WITH_INSULIN,    // <50 + insulin
        SEVERE_HYPOGLYCEMIA_NO_INSULIN,      // <50 no insulin
        MODERATE_HYPOGLYCEMIA_WITH_INSULIN,  // 50-69 + insulin
        MODERATE_HYPOGLYCEMIA_NO_INSULIN     // 50-69 no insulin
    }
}
