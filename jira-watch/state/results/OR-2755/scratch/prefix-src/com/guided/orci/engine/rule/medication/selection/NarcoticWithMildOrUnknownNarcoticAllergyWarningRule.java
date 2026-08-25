package com.guided.orci.engine.rule.medication.selection;

import com.guided.orci.dto.AllergyDTO;
import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.engine.*;
import com.guided.orci.models.allergy.AllergySeverity;
import com.guided.orci.models.medication.MedicationCategory;
import com.guided.orci.service.CitationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Administering narcotic when patient has a mild or unknown allergy to the narcotic
 */
@RuleDefinition(
        id = NarcoticWithMildOrUnknownNarcoticAllergyWarningRule.ID,
        description = "Warn if a narcotic is selected when patient has a mild or unknown allergy to the same narcotic",
        trigger = RuleTrigger.SELECTION,
        type = RuleType.WARNING
)
@Component
public class NarcoticWithMildOrUnknownNarcoticAllergyWarningRule extends MedicationSelectionRule {
    public static final String ID = "w-narcotic-mild-unknown-narcotic-allergy";
    public static final String ALLERGY_ALLERGEN = "ALLERGY_ALLERGEN";
    public static final String ALLERGY_REACTION = "ALLERGY_REACTION";
    public static final String ALLERGIES = "ALLERGIES";

    public static final Set<AllergySeverity> MILD_OR_UNKNOWN = Set.of(AllergySeverity.MILD, AllergySeverity.OTHER_UNKNOWN);

    @Autowired
    public NarcoticWithMildOrUnknownNarcoticAllergyWarningRule(CitationService citationService) {
        super(citationService);
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }

    @Override
    protected EvaluationResult evaluate(MedicationSelectionContext context) {
        if (!context.getMedication().hasCategory(MedicationCategory.NARCOTIC)) {
            return abstain(context, "medication is not a " + MedicationCategory.NARCOTIC);
        }

        Set<String> matchingCategories = context.getMedication().getMedicationCategories().stream().filter(category -> !MedicationCategory.NARCOTIC.equals(category) && !MedicationCategory.ROUTE_CATEGORIES.contains(category)).collect(Collectors.toSet());

        // find the first matching narcotic allergy
        // we look at the medication's categories and disqualify any route-based categories and NARCOTICS itself.
        // any matching categories are considered medications and we look for a matching tag on the patient's allergies.
        // Ex. HYDROmorphone IV the medication should be tagged as HYDROMOPHONE and the allergy should also be tagged as HYDROMOPHONE

        var mildOrUnknownNarcoticAllergy = context.getPatient().getAllergies().stream()
                .filter(allergy -> allergy.getAllergen() != null && allergy.getAllergen().getAllergenCategories().stream().anyMatch(category -> matchingCategories.contains(category))
                                   && MILD_OR_UNKNOWN.contains(AllergySeverity.getNormalizedValue(allergy.getSeverity())))
                .findAny();
        if (mildOrUnknownNarcoticAllergy.isEmpty()) {
            return abstain(context, "patient does not have a mild or unknown allergy to the narcotic");
        }
        Map<String, Object> details = new HashMap<>();
        details.put(MEDICATION_NAME, context.getMedication().getMedicationName());
        details.put(MEDICATION_ID, context.getMedication().getMedicationIdentifier());
        details.put(ALLERGY_REACTION, mildOrUnknownNarcoticAllergy.get().getDisplayReaction());
        details.put(ALLERGY_ALLERGEN, mildOrUnknownNarcoticAllergy.get().getAllergenName());
        details.put(ALLERGIES, AllergyDTO.fromAllergies(mildOrUnknownNarcoticAllergy.stream().toList()));
        return baseBuilder(context).needsAction(true).details(details).prompt(createPrompt(details))
                .build();
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {
        var allergies = (List<AllergyDTO>) result.getOrDefault(ALLERGIES, List.of());
        return EvaluationResultPromptTemplate.builder().ruleIdentifier(getRuleIdentifier())
                .type(RuleType.WARNING)
                .warningText("Sensitivity to ${" + ALLERGY_ALLERGEN + "} with reaction: ${" + ALLERGY_REACTION + "}")
                .relevantAllergies(allergies)
                .build().createPrompt(result);
    }
}
