package com.guided.orci.engine.rule.medication.selection;

import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.dto.rule.context.ContextAllergy;
import com.guided.orci.engine.*;
import com.guided.orci.engine.rule.RuleCategory;
import com.guided.orci.models.allergy.AllergyReaction;
import com.guided.orci.models.allergy.AllergySeverity;
import com.guided.orci.models.medication.MedicationCategory;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.service.CitationService;
import com.guided.orci.types.wrappers.CitationId;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@RuleDefinition(
        id = CefazolinWithAnaphylaxisOrUnknownPenicillinAllergyRule.ID,
        description = "Alerts if cefazolin is selected for a patient with an anaphylaxis or unknown reaction to penicillin",
        trigger = RuleTrigger.SELECTION,
        type = RuleType.WARNING,
        categories = {RuleCategory.FILTERS_ANTIBIOTIC_CANDIDATES, RuleCategory.ALLERGY}
)
@Component
public class CefazolinWithAnaphylaxisOrUnknownPenicillinAllergyRule extends MedicationSelectionRule {
    public static final String ID = "w-cefazolin-anaphylaxis-unknown-pen-allergy";

    public static final String ALLERGY_ALLERGEN = "ALLERGY_ALLERGEN";
    public static final String ALLERGY_REACTION = "ALLERGY_REACTION";

    @Autowired
    public CefazolinWithAnaphylaxisOrUnknownPenicillinAllergyRule(CitationService citationService) {
        super(citationService);
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }

    @Override
    protected EvaluationResult evaluate(MedicationSelectionContext context) {
        if (!context.hasMedicationCategory(MedicationCategory.CEFAZOLIN)) {
            return abstain(context, "medication is not " + MedicationCategory.CEFAZOLIN);
        }

        if (context.hasMatchingPreviousMedicationAdministrationAdministeredThroughApplication()) {
            return abstain(context, context.getMedication().getPrimaryMedicationCategory() + " previously administered");
        }
        List<ContextAllergy> penicillinAllergies = context
                .getPatient()
                .getAllergies()
                .stream()
                .filter(allergy -> allergy.getAllergen() != null &&
                                   allergy.getAllergen()
                                           .getAllergenCategories()
                                           .contains(MedicationCategory.PENICILLIN) &&
                                   (allergy.getReactions()
                                            .contains(AllergyReaction.ANAPHYLAXIS) ||
                                    AllergySeverity.OTHER_UNKNOWN.equals(AllergySeverity.getNormalizedValue(allergy.getSeverity()))))
                .toList();

        if (penicillinAllergies.isEmpty()) {
            return abstain(context, "patient does not have an anaphylaxis or unknown allergy to penicillin");
        }
        Map<String, Object> details = details(context);
        // get the reaction that includes anaphylaxis if it exists, otherwise get any (expecting unknown)
        var matchingAllergy = penicillinAllergies.stream().filter(allergy -> allergy.getReactions().contains(AllergyReaction.ANAPHYLAXIS)).findFirst().orElse(penicillinAllergies.getFirst());
        var matchingAllergen = matchingAllergy.getAllergenName();
        var matchingReaction = matchingAllergy.getDisplayReaction();

        details.put(ALLERGY_ALLERGEN, matchingAllergen);
        details.put(ALLERGY_REACTION, matchingReaction);

        return baseBuilder(context).needsAction(true).details(details).prompt(createPrompt(details))
                .build();
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {
        return EvaluationResultPromptTemplate.builder().ruleIdentifier(getRuleIdentifier())
                .type(RuleType.WARNING)
                .warningText("Recommend test dose and/or consult Allergy. Allergy to ${" + ALLERGY_ALLERGEN + "} with reaction: ${" + ALLERGY_REACTION + "}")
                .citations(getCitations(result))
                .build().createPrompt(result);
    }

    public List<CitationId> getCitationDefinitions() {
        return List.of(CitationDefinition.PEN_ALLERGY_NO_CANDIDATES);
    }
}
