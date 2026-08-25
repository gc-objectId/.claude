package com.guided.orci.engine.rule.medication.selection;

import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.dto.rule.context.ContextAllergen;
import com.guided.orci.dto.rule.context.ContextAllergy;
import com.guided.orci.engine.*;
import com.guided.orci.models.medication.MedicationCategory;
import com.guided.orci.service.CitationService;
import com.guided.orci.utils.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Map;
import java.util.Set;

@RuleDefinition(
        id = NarcoticAcetaminophenAllergyInfoRule.ID,
        description = "Display if an ACETAMINOPHEN is selected and the patient has an allergy with the ACETAMINOPHEN and NARCOTIC tags",
        trigger = RuleTrigger.SELECTION,
        type = RuleType.INFO
)
@Component
public class NarcoticAcetaminophenAllergyInfoRule extends MedicationSelectionRule {
    public static final String ID = "i-narcotic-acetaminophen-allergy";

    public static final Set<String> TARGET_ALLERGEN_CATEGORIES = Set.of(
            MedicationCategory.NARCOTIC,
            MedicationCategory.ACETAMINOPHEN
    );

    public static final String REACTION = "REACTION";
    public static final String ALLERGEN = "ALLERGEN";

    @Autowired
    public NarcoticAcetaminophenAllergyInfoRule(CitationService citationService) {
        super(citationService);
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }

    @Override
    protected EvaluationResult evaluate(MedicationSelectionContext context) {
        if (!context.getMedication().hasPrimaryCategory(MedicationCategory.ACETAMINOPHEN)) {
            return abstain(context, "Selected medication is not " + MedicationCategory.ACETAMINOPHEN);
        }

        var matchingAllergy = context.getPatient().getAllergies().stream()
                .filter(allergy -> allergy.getAllergen() != null && allergy.getAllergen().hasCategories(TARGET_ALLERGEN_CATEGORIES))
                .findFirst();

        if (matchingAllergy.isEmpty()) {
            return abstain(context,
                    "No patient allergy to allergen with categories: " + StringUtils.setToString(TARGET_ALLERGEN_CATEGORIES));
        }
        var details = details(context);
        details.put(REACTION, matchingAllergy.get().getDisplayReaction());
        details.put(ALLERGEN, matchingAllergy.get().getAllergenName());

        return baseBuilder(context)
                .needsAction(true)
                .details(details)
                .prompt(createPrompt(details))
                .build();
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {
        return EvaluationResultPromptTemplate.builder().ruleIdentifier(getRuleIdentifier())
                .type(RuleType.INFO)
                .infoText("Allergy to ${" + ALLERGEN + "} with reaction: ${" + REACTION + "}")
                .build().createPrompt(result);
    }

}
