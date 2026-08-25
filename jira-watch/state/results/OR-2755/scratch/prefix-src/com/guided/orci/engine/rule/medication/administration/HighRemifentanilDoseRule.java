package com.guided.orci.engine.rule.medication.administration;

import com.guided.orci.engine.*;
import com.guided.orci.guidance.Citation;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.service.CitationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static com.guided.orci.units.Units.KILOGRAM;

/**
 * Alert if remifentanil bolus dose is greater than 8 micrograms/kg.
 *
 * The remifentanil dose is [xx mcg/kg]. Remifentanil boluses greater than 8
 * mcg/kg can lead to hypotension, bradycardia and chest rigidity. Consider
 * reducing dose.
 */
@RuleDefinition(id = HighRemifentanilDoseRule.ID, description = "Alerts if remifentanil dose is greater than 8 micrograms/kg", trigger = RuleTrigger.DOSE, type = RuleType.ALERT)
@Component
public class HighRemifentanilDoseRule extends HighDoseRule {
    private static final String REMIFENTANIL = "m-remifentanil";
    public static final String ID = "a-remifentanil-high-dose";

    @Autowired
    public HighRemifentanilDoseRule(CitationService citationService) {
        super(REMIFENTANIL, 8, "mcg", KILOGRAM, DOSE_MCG_PER_KG, citationService);
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> details) {
        return EvaluationResultPromptTemplate.builder().ruleIdentifier(getRuleIdentifier())
                .type(RuleType.ALERT)
                .title("High Remifentanil Dose")
                .description("The remifentanil dose is "
                             + String.format("%.0f", (Float) details.get(DOSE_MCG_PER_KG))
                             + " mcg/kg. Remifentanil boluses greater than 8 mcg/kg can lead to hypotension, bradycardia and chest rigidity.")
                .acceptText("Will Reduce Dose").rejectText("Reject")
                .rejectReasons(Stream.of(RejectionReason.PATIENT_REQUIRES_HIGHER_DOSE, RejectionReason.PATIENT_TOLERATED_BEFORE)
                        .map(reason -> RejectionReasonOption.simple(reason))
                        .collect(Collectors.toList()))
                .citations(List.of(Citation.builder()
                        .id(CitationDefinition.HIGH_REMIFENTANIL_DOSE)
                        .label("Alert Rationale")
                        .url("https://www.accessdata.fda.gov/drugsatfda_docs/label/2016/020630s016lbl.pdf").build()))
                .build().createPrompt(details);
    }
}
