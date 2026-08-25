package com.guided.orci.engine.rule.medication.administration;

import java.util.List;
import java.util.Map;

import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.service.CitationService;
import com.guided.orci.types.wrappers.CitationId;
import lombok.extern.slf4j.Slf4j;
import com.guided.orci.engine.EvaluationResultPrompt;
import com.guided.orci.engine.EvaluationResultPromptTemplate;
import com.guided.orci.engine.RuleDefinition;
import com.guided.orci.engine.RuleTrigger;
import com.guided.orci.engine.RuleType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import static com.guided.orci.units.Units.KILOGRAM;

/**
 * Alert if succinylcholine bolus dose is greater than 2 mg/kg
 * 
 * Succinylcholine dose is [XX mg/kg]. Doses greater than 2 mg/kg are not
 * necessary to achieve intubating conditions, and may result in unnecessary
 * postoperative myalgias.
 * 
 */
@RuleDefinition(id = HighSuccinylcholineDoseRule.ID, description = "Alerts if succinylcholine dose is greater than 2 micrograms/kg", trigger = RuleTrigger.DOSE, type = RuleType.ALERT)
@Slf4j
@Component
public class HighSuccinylcholineDoseRule extends HighDoseRule {
    private static final String SUCCINYLCHOLINE = "m-succinylcholine";
    public static final String ID = "a-succinylcholine-high-dose";

    @Autowired
    public HighSuccinylcholineDoseRule(CitationService citationService) {
        super(SUCCINYLCHOLINE, 2f, "mg", KILOGRAM, DOSE_MG_PER_KG, citationService);
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> details) {

        return EvaluationResultPromptTemplate.builder()
                .ruleIdentifier(getRuleIdentifier())
                .title("High Succinylcholine Dose")
                .description("Succinylcholine dose is " + String.format("%.1f", (Float) details.get(DOSE_MG_PER_KG))
                             + " mg/kg. Doses greater than 2 mg/kg are not necessary to achieve intubating conditions, and may result in unnecessary postoperative myalgias.")
                .type(RuleType.ALERT)
                .acceptText("Will Reduce Dose").rejectText("Reject")
                .citations(getCitations(details))
                .build().createPrompt(details);
    }

    @Override
    public List<CitationId> getCitationDefinitions() {
        return List.of(CitationDefinition.SUCCINYLCHOLINE_HIGH_DOSE);
    }
}
