package com.guided.orci.engine.rule.medication.selection;

import com.guided.orci.dto.AllergyDTO;
import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.engine.*;
import com.guided.orci.models.allergy.AllergySeverity;
import com.guided.orci.models.allergy.IAllergy;
import com.guided.orci.models.medication.MedicationCategory;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.service.CitationService;
import com.guided.orci.types.wrappers.CitationId;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Administering penicillin when patient has a mild penicillin allergy
 */
@RuleDefinition(
        id = PenicillinWithMildPenicillinAllergyWarningRule.ID,
        description = "Warn if penicillin is selected and patient has mild penicillin allergy. Recommend test dose.",
        trigger = RuleTrigger.SELECTION,
        type = RuleType.WARNING
)
@Component
public class PenicillinWithMildPenicillinAllergyWarningRule extends MedicationSelectionRule {
    public static final String ID = "w-pen-mild-pen-allergy";
    public static final String ALLERGY_ALLERGEN = "ALLERGY_ALLERGEN";
    public static final String ALLERGY_REACTION = "ALLERGY_REACTION";

    public static final String ALLERGIES = "ALLERGIES";

    @Autowired
    public PenicillinWithMildPenicillinAllergyWarningRule(CitationService citationService) {
        super(citationService);
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }

    @Override
    protected EvaluationResult evaluate(MedicationSelectionContext context) {
        Map<String, Object> details = details(context);
        if (!context.getMedication().hasCategory(MedicationCategory.PENICILLIN)) {
            return abstain(context, details, "medication is not a " + MedicationCategory.PENICILLIN);
        }

        if(context.hasMatchingPreviousMedicationAdministrationAdministeredThroughApplication()) {
            return abstain(context, context.getMedication().getPrimaryMedicationCategory() + " previously administered");
        }

        // find the first mild penicillin allergy
        Optional<IAllergy> mildPenicillinAllergy = getAllergyByCategoryWithSeverity(
                context.getPatient().getAllergies(), MedicationCategory.PENICILLIN, Set.of(AllergySeverity.MILD));
        if (mildPenicillinAllergy.isEmpty()) {
            return abstain(context, details, "patient does not have a mild allergy to " + MedicationCategory.PENICILLIN);
        }

        details.put(ALLERGY_ALLERGEN, mildPenicillinAllergy.get().getAllergenName());
        details.put(ALLERGY_REACTION, mildPenicillinAllergy.get().getDisplayReaction());
        details.put(ALLERGIES, AllergyDTO.fromAllergies(mildPenicillinAllergy.stream().toList()));
        return baseBuilder(context).needsAction(true).details(details).prompt(createPrompt(details))
                .build();
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {
        var allergies = (List<AllergyDTO>) result.getOrDefault(ALLERGIES, List.of());
        return EvaluationResultPromptTemplate.builder().ruleIdentifier(getRuleIdentifier())
                .type(RuleType.WARNING)
                .warningText("Recommend test dose. Allergy to ${" + ALLERGY_ALLERGEN + "} with reaction: ${" + ALLERGY_REACTION + "}")
                .citations(getCitations(result))
                .relevantAllergies(allergies)
                .build().createPrompt(result);
    }

    public List<CitationId> getCitationDefinitions() {
        return List.of(CitationDefinition.PEN_ALLERGY_NO_CANDIDATES);
    }

}
