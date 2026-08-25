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

@RuleDefinition(id = SuccinylcholineMalignantHyperthermiaWarningRule.ID,
        description = "Warns when succinylcholine is selected for patients with the risk of malignant hyperthermia",
        trigger = RuleTrigger.SELECTION,
        type = RuleType.WARNING)
@Component
@Slf4j
public class SuccinylcholineMalignantHyperthermiaWarningRule extends AbstractSuccinylcholineConditionsWarningRule {
    public static final String ID = "w-sux-condition-mh";

    @Autowired
    public SuccinylcholineMalignantHyperthermiaWarningRule(CitationService citationService) {
        super(citationService, RuleType.WARNING);
    }

    @Override
    protected Set<ConditionCase> getConditionCases() {
        return Set.of(
            new ConditionCase(Set.of(
                    ConditionTag.CENTRONUCLEAR_MYOPATHY,
                    ConditionTag.CONGENITAL_FIBER_TYPE_DISPROPORTION,
                    ConditionTag.HYPERCKEMIA,
                    ConditionTag.NEMALINE_MYOPATHY
            ), Optional.empty(),
                    CitationDefinition.SUCCINYLCHOLINE_RYR1)
    );
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {


        return EvaluationResultPromptTemplate.builder().ruleIdentifier(getRuleIdentifier())
                .type(RuleType.WARNING)
                .warningText("Patient has ${" + CONDITION_NAMES_TEXT + "}. If RYR1-variant, succinylcholine may trigger Malignant Hyperthermia.")
                .citations(getCitations(result))
                .build().createPrompt(result);
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }
}
