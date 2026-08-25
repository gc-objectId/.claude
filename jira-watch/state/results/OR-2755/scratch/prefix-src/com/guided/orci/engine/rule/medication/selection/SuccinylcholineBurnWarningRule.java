package com.guided.orci.engine.rule.medication.selection;

import com.guided.orci.engine.*;
import com.guided.orci.models.patient.ConditionTag;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.service.CitationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Period;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@RuleDefinition(id = SuccinylcholineBurnWarningRule.ID,
        description = "Warns when succinylcholine is selected for patients with a burn",
        trigger = RuleTrigger.SELECTION,
        type = RuleType.WARNING)
@Component
@Slf4j
public class SuccinylcholineBurnWarningRule extends AbstractSuccinylcholineConditionsWarningRule {
    public static final String ID = "w-sux-condition-burn";

    @Autowired
    public SuccinylcholineBurnWarningRule(CitationService citationService) {
        super(citationService, RuleType.WARNING);
    }

    @Override
    protected Set<ConditionCase> getConditionCases() {
        return Set.of(
                new ConditionCase(Set.of(ConditionTag.BURN),
                        Optional.of(Period.ofYears(1)),
                        CitationDefinition.SUCCINYLCHOLINE_BURN)
        );
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {


        return EvaluationResultPromptTemplate.builder().ruleIdentifier(getRuleIdentifier())
                .type(RuleType.WARNING)
                .warningText("Burn reported on ${" + LATEST_CONDITION_DATE + "}. Succinylcholine can cause severe hyperkalemia from 48h to 1 year post-burn.")
                .citations(getCitations(result))
                .build().createPrompt(result);
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }
}
