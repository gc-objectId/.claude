package com.guided.orci.engine.rule.medication.selection;

import com.guided.orci.dto.rule.context.ContextCondition;
import com.guided.orci.engine.*;
import com.guided.orci.models.patient.ConditionTag;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.service.CitationService;
import com.guided.orci.utils.StringUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.*;

@RuleDefinition(id = SuccinylcholineHyperkalemiaConditionWarningRule.ID,
        description = "Warns when succinylcholine is selected for patients with the risk of hyperkalemia",
        trigger = RuleTrigger.SELECTION,
        type = RuleType.WARNING)
@Component
@Slf4j
public class SuccinylcholineHyperkalemiaConditionWarningRule extends AbstractSuccinylcholineConditionsWarningRule {
    public static final String ID = "w-sux-condition-hyper-k";

    @Autowired
    public SuccinylcholineHyperkalemiaConditionWarningRule(CitationService citationService) {
        super(citationService, RuleType.WARNING);
    }

    @Override
    protected Set<ConditionCase> getConditionCases() {
        return Set.of(
                new ConditionCase(
                        Set.of(
                                ConditionTag.PARAPLEGIA,
                                ConditionTag.QUADRIPLEGIA
                        ),
                        Optional.empty(),
                        CitationDefinition.SUCCINYLCHOLINE_PARA_QUAD),
                new ConditionCase(
                        Set.of(
                                ConditionTag.STROKE
                        ),
                        Optional.empty(),
                        CitationDefinition.SUCCINYLCHOLINE_STROKE)
        );
    }

    @Override
    protected String getConditionNames(List<MatchedCase> matchingCases) {
        var strokeCondition = matchingCases.stream().filter(it -> it.matchingCase().conditions().contains(ConditionTag.STROKE)).findFirst();
        var nonStrokeConditions = matchingCases.stream().filter(it -> !it.matchingCase().conditions().contains(ConditionTag.STROKE)).toList();
        var conditionNames = new ArrayList<>(nonStrokeConditions.stream()
                .map(MatchedCase::conditions)
                .flatMap(List::stream)
                .map(ContextCondition::getConditionLabel)
                .distinct()
                .sorted()
                .toList());
        if (strokeCondition.isPresent()) {
            conditionNames.add("history of stroke");
        }
        return StringUtils.grammaticalList(conditionNames, "");
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {
        return EvaluationResultPromptTemplate.builder().ruleIdentifier(getRuleIdentifier())
                .type(RuleType.WARNING)
                .warningText("Patient has ${" + CONDITION_NAMES_TEXT + "}. Succinylcholine can cause severe hyperkalemia.")
                .citations(getCitations(result))
                .build().createPrompt(result);
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }
}
