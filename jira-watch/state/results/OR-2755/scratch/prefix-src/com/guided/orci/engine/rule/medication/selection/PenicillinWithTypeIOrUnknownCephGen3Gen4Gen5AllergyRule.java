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

import java.util.*;

import static com.guided.orci.engine.rule.medication.selection.AbstractProcedureTypeAwareMedicationSelectionRule.HAS_MODERATE_CEPH_ALLERGY;

/**
 * Administering penicillin when patient has a Type I (moderate) or unknown ceph generation
 * 3, 4, or 5 allergy
 */
@RuleDefinition(
        id = PenicillinWithTypeIOrUnknownCephGen3Gen4Gen5AllergyRule.ID,
        description = "Warn if penicillin is selected and patient has Type I (moderate) or unknown 3rd, 4th, or 5th generation cephalosporin allergy. Recommend test dose.",
        trigger = RuleTrigger.SELECTION,
        type = RuleType.WARNING
)
@Component
public class PenicillinWithTypeIOrUnknownCephGen3Gen4Gen5AllergyRule extends MedicationSelectionRule {
    public static final String ID = "w-pen-type-i-unknown-ceph-gen3-gen4-gen5-allergy";
    public static final String CEPH_ALLERGY_ALLERGEN = "CEPH_ALLERGY_ALLERGEN";
    public static final String CEPH_ALLERGY_REACTION = "CEPH_ALLERGY_REACTION";
    public static final String CEPH_ALLERGY_GENERATION = "CEPH_ALLERGY_GENERATION";

    public static final String MEDICATION_CATEGORY = "MEDICATION_CATEGORY";
    public static final String ALLERGIES = "ALLERGIES";

    public static final Set<String> CATEGORIES_OF_INTEREST = Set.of(MedicationCategory.CEPHALOSPORIN_GENERATION_3, MedicationCategory.CEPHALOSPORIN_GENERATION_4,
            MedicationCategory.CEPHALOSPORIN_GENERATION_5);

    @Autowired
    public PenicillinWithTypeIOrUnknownCephGen3Gen4Gen5AllergyRule(CitationService citationService) {
        super(citationService);
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }

    @Override
    protected EvaluationResult evaluate(MedicationSelectionContext context) {
        if (!context.getMedication().hasCategory(MedicationCategory.PENICILLIN)) {
            return abstain(context, "medication is not a " + MedicationCategory.PENICILLIN);
        }

        if(context.hasMatchingPreviousMedicationAdministrationAdministeredThroughApplication()) {
            return abstain(context, context.getMedication().getPrimaryMedicationCategory() + " previously administered");
        }

        List<IAllergy> matchingAllergies = getAllergyByCategoryWithSeverityStream(
                context.getPatient().getAllergies(), CATEGORIES_OF_INTEREST,
                Set.of(AllergySeverity.MODERATE, AllergySeverity.OTHER_UNKNOWN)).toList();

        if (matchingAllergies.isEmpty()) {
            return abstain(context, "patient does not have a Type I allergy or moderate to 3rd, 4th, or 5th generation cephalosporin");
        }

        var moderateAllergy = matchingAllergies.stream().filter(allergy -> AllergySeverity.MODERATE.equals(AllergySeverity.getNormalizedValue(allergy.getSeverity()))).findFirst();
        var matchingAllergy = moderateAllergy.orElse(matchingAllergies.getFirst());
        Optional<String> allergenCategory = getGenerationTag(matchingAllergy);

        Map<String, Object> details = new HashMap<>();
        details.put(MEDICATION_NAME, context.getMedication().getMedicationName());
        details.put(MEDICATION_ID, context.getMedication().getMedicationIdentifier());
        details.put(MEDICATION_CATEGORY, MedicationCategory.PENICILLIN);
        details.put(CEPH_ALLERGY_ALLERGEN, matchingAllergy.getAllergenName());
        details.put(CEPH_ALLERGY_GENERATION, allergenCategory.get());
        details.put(CEPH_ALLERGY_REACTION, matchingAllergy.getDisplayReaction());
        details.put(ALLERGIES, AllergyDTO.fromAllergies(matchingAllergies));
        details.put(HAS_MODERATE_CEPH_ALLERGY, moderateAllergy.isPresent());


        return baseBuilder(context).needsAction(true).details(details).prompt(createPrompt(details))
                .build();
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {
        var allergies = (List<AllergyDTO>) result.getOrDefault(ALLERGIES, List.of());
        return EvaluationResultPromptTemplate.builder().ruleIdentifier(getRuleIdentifier())
                .type(RuleType.WARNING)
                .warningText("Recommend test dose. Allergy to ${" + CEPH_ALLERGY_ALLERGEN + "} with reaction: ${" + CEPH_ALLERGY_REACTION + "}")
                .relevantAllergies(allergies)
                .citations(getCitations(result))
                .build().createPrompt(result);
    }

    public List<CitationId> getCitationDefinitions() {
        return List.of();
    }

    public List<CitationId> getConditionalCitationDefinitions() {
        return List.of(CitationDefinition.CEPH_ALLERGY_CANDIDATES, CitationDefinition.UNKNOWN_CEPH_PEN_ALLERGY);
    }

    public List<CitationId> getMatchingCitationDefinitions(Map<String, Object> results) {
        var citations = ((Boolean) results.getOrDefault(HAS_MODERATE_CEPH_ALLERGY, false)) ? List.of(CitationDefinition.CEPH_ALLERGY_NO_CANDIDATES) : List.of(CitationDefinition.UNKNOWN_CEPH_PEN_ALLERGY);
        return citations;
    }
}
