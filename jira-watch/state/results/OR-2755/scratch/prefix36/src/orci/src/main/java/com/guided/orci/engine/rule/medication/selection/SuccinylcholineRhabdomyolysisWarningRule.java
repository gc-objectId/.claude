package com.guided.orci.engine.rule.medication.selection;

import com.guided.orci.engine.*;
import com.guided.orci.models.patient.ConditionTag;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.service.CitationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;
import java.util.Set;

@RuleDefinition(id = SuccinylcholineRhabdomyolysisWarningRule.ID,
        description = "Warns when succinylcholine is selected for patients with risk of rhabdomyolysis",
        trigger = RuleTrigger.SELECTION,
        type = RuleType.WARNING)
@Component
@Slf4j
public class SuccinylcholineRhabdomyolysisWarningRule extends AbstractSuccinylcholineConditionsWarningRule {
    public static final String ID = "w-sux-condition-rhabdo";

    @Autowired
    public SuccinylcholineRhabdomyolysisWarningRule(CitationService citationService) {
        super(citationService, RuleType.WARNING);
    }

    @Override
    protected Set<ConditionCase> getConditionCases() {
        return Set.of(
                new ConditionCase(Set.of(
                        ConditionTag.MYOADENYLATE_DEAMINASE_DEFICIENCY,
                        ConditionTag.CARNITINE_PALMITOYLTRANSFERASE_2_DEFICIENCY,
                        ConditionTag.MYOPHOSPHORYLASE_DEFICIENCY
                ), Optional.empty(),
                        CitationDefinition.SUCCINYLCHOLINE_ENZYMOPATHIES)

        );
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {

        return EvaluationResultPromptTemplate.builder().ruleIdentifier(getRuleIdentifier())
                .type(RuleType.WARNING)
                .warningText("Patient has ${" + CONDITION_NAMES_TEXT + "}. Succinylcholine can cause rhabdomyolysis.")
                .citations(getCitations(result))
                .build().createPrompt(result);
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }
}
