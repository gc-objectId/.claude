package com.guided.orci.engine.rule.medication.selection;

import com.guided.orci.engine.*;
import com.guided.orci.models.medication.MedicationCategory;
import com.guided.orci.models.patient.ConditionTag;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.service.CitationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;
import java.util.Set;

@RuleDefinition(id = NonDepolarizingNMBConditionsWarningRule.ID,
        description = "Warns when a non-depolarizing NMB is selected for patients having certain conditions",
        trigger = RuleTrigger.SELECTION,
        type = RuleType.WARNING)
@Component
@Slf4j
public class NonDepolarizingNMBConditionsWarningRule extends AbstractMedicationConditionsRule {
    public static final String ID = "w-nondep-nmb-conditions";

    @Autowired
    public NonDepolarizingNMBConditionsWarningRule(CitationService citationService) {
        super(citationService, RuleType.WARNING, MedicationCategory.NON_DEPOLARIZING_NMB, false);
    }

    @Override
    protected Set<ConditionCase> getConditionCases() {
        return Set.of(
                new ConditionCase(Set.of(
                        ConditionTag.MYASTHENIA_GRAVIS),
                        Optional.empty(),
                        CitationDefinition.MYASTHENIA_GRAVIS)
        );
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {

        return EvaluationResultPromptTemplate.builder().ruleIdentifier(getRuleIdentifier())
                .type(RuleType.WARNING)
                .warningText("Patient has ${" + CONDITION_NAMES_TEXT + "}. Consider reduced dose of non-depolarizing NMB agents.")
                .citations(getCitations(result))
                .build().createPrompt(result);
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }
}
