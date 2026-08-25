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
 * Administrating a 3rd, 4th, 5th generation cephalosporin and patient has a
 * Type I penicillin allergy and no cephalosporin (the class) allergy
 */
@RuleDefinition(id = CephGen3OrGen4OrGen5WithType1OrUnknownPenicillinAllergyRule.ID,
        description = "Warns if 3rd, 4th, or 5th generation cephalosporin is selected for a patient with Type I or unknown penicillin allergy",
        trigger = RuleTrigger.SELECTION,
        type = RuleType.WARNING)
@Component
public class CephGen3OrGen4OrGen5WithType1OrUnknownPenicillinAllergyRule extends AbstractProcedureTypeAwareMedicationSelectionRule {
    public static final String ID = "w-ceph-gen3-gen4-gen5-type-i-unknown-pen-allergy";

    public static final String MEDICATION_CATEGORY = "MEDICATION_CATEGORY";

    public static final String ALLERGY_ALLERGEN = "ALLERGY_ALLERGEN";
    public static final String ALLERGY_REACTION = "ALLERGY_REACTION";
    public static final String ALLERGIES = "ALLERGIES";

    public static final Set<String> CEPHALOSPORINS = Set.of(
            MedicationCategory.CEPHALOSPORIN_GENERATION_3, MedicationCategory.CEPHALOSPORIN_GENERATION_4,
            MedicationCategory.CEPHALOSPORIN_GENERATION_5);

    @Autowired
    public CephGen3OrGen4OrGen5WithType1OrUnknownPenicillinAllergyRule(CitationService citationService) {
        super(citationService);
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }

    @Override
    protected EvaluationResult evaluate(MedicationSelectionContext context) {
        Optional<String> medicationCategory = context.getMedication().findAnyCategoryInSet(CEPHALOSPORINS);
        if (medicationCategory.isEmpty()) {
            return abstain(context, "medication is not a 3rd, 4th, or 5th generation cephalosporin");
        }

        if(context.hasMatchingPreviousMedicationAdministrationAdministeredThroughApplication()) {
            return abstain(context, context.getMedication().getPrimaryMedicationCategory() + " previously administered");
        }

        // penicillin allergy of type I
        List<IAllergy> moderateOrUnknownPenicillinAllergies = getAllergyByCategoryWithSeverityStream(
                context.getPatient().getAllergies(), Set.of(MedicationCategory.PENICILLIN),
                Set.of(AllergySeverity.MODERATE, AllergySeverity.OTHER_UNKNOWN)).toList();
        if (moderateOrUnknownPenicillinAllergies.isEmpty()) {
            return abstain(context, "patient does not have a Type I or unknown allergy to penicillin");
        }

        var moderateAllergy = moderateOrUnknownPenicillinAllergies.stream().filter(allergy-> AllergySeverity.MODERATE.equals(AllergySeverity.getNormalizedValue(allergy.getSeverity()))).findFirst();
        var penAllergy = moderateAllergy.orElse(moderateOrUnknownPenicillinAllergies.getFirst());
        Map<String, Object> details = details(context);
        details.put(MEDICATION_CATEGORY, medicationCategory.get());
        details.put(ALLERGY_ALLERGEN, penAllergy.getAllergenName());
        details.put(ALLERGY_REACTION, penAllergy.getDisplayReaction());
        details.put(ALLERGIES, AllergyDTO.fromAllergies(moderateOrUnknownPenicillinAllergies));
        details.put(HAS_MODERATE_PEN_ALLERGY, moderateAllergy.isPresent());


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
        return List.of();
    }

    public List<CitationId> getConditionalCitationDefinitions() {
        return List.of(CitationDefinition.PEN_ALLERGY_NO_CANDIDATES, CitationDefinition.UNKNOWN_CEPH_PEN_ALLERGY);
    }

    public List<CitationId> getMatchingCitationDefinitions(Map<String, Object> results) {
        var citations = ((Boolean) results.getOrDefault(HAS_MODERATE_PEN_ALLERGY, false)) ? List.of(CitationDefinition.PEN_ALLERGY_NO_CANDIDATES) : List.of(CitationDefinition.UNKNOWN_CEPH_PEN_ALLERGY);
        return citations;
    }

}
