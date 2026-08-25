package com.guided.orci.engine.rule.medication.selection;

import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.engine.*;
import com.guided.orci.models.medication.MedicationCategory;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.service.CitationService;
import com.guided.orci.types.wrappers.CitationId;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@RuleDefinition(
        id = GlycopyrrolatePregnancyWarningRule.ID,
        description = "Warns that patient is pregnant when selecting glycopyrrolate",
        trigger = RuleTrigger.SELECTION,
        type = RuleType.WARNING
)
@Slf4j
@Component
public class GlycopyrrolatePregnancyWarningRule extends MedicationSelectionRule {
    public static final String ID = "w-glycopyrrolate-pregnancy";
    public static final String EXCLUDE_FROM_PREGNANCY_RULES = "EXCLUDE_FROM_PREGNANCY_RULES";


    public static final String WARNING_TEXT = "May lead to fetal bradycardia when used in combination with Neostigmine.";

    @Autowired
    public GlycopyrrolatePregnancyWarningRule(CitationService citationService) {
        super(citationService);
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }

    @Override
    protected EvaluationResult evaluate(MedicationSelectionContext context) {
        if (!context.getMedication().hasPrimaryCategory(MedicationCategory.GLYCOPYRROLATE)) {
            var medicationIdentifier = context.getMedication().getMedicationIdentifier();
            return abstain(context, "%s is not %s" .formatted(medicationIdentifier, MedicationCategory.GLYCOPYRROLATE));
        }
        if(!context.getPatient().isPregnant()) {
            return abstain(context, "patient is not pregnant");
        }
        if(hasProcedureCategory(context, EXCLUDE_FROM_PREGNANCY_RULES)) {
            return abstain(context, "procedure type is excluded from pregnancy rules");
        }
        var details = details(context);
        return baseBuilder(context)
                .needsAction(true)
                .details(details)
                .prompt(createPrompt(details))
                .build();
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {
        return EvaluationResultPromptTemplate.builder().ruleIdentifier(getRuleIdentifier())
                .type(RuleType.WARNING)
                .warningText(WARNING_TEXT)
                .citations(getCitations(result))
                .build().createPrompt(result);
    }

    @Override
    public List<CitationId> getCitationDefinitions() {
        return List.of(CitationDefinition.GLYCOPYRROLATE_PREGNANCY);
    }


}
