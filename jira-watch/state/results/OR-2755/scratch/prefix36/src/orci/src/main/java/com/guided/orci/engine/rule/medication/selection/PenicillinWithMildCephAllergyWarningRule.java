package com.guided.orci.engine.rule.medication.selection;

import com.guided.orci.dto.AllergyDTO;
import com.guided.orci.dto.MedicationDTO;
import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.engine.*;
import com.guided.orci.models.allergy.AllergySeverity;
import com.guided.orci.models.allergy.IAllergy;
import com.guided.orci.models.medication.MedicationCategory;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.service.CitationService;
import com.guided.orci.types.wrappers.CitationId;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Administering penicillin when patient has a mild ceph (the class) allergy
 */
@RuleDefinition(
        id = PenicillinWithMildCephAllergyWarningRule.ID,
        description = "Warn if penicillin is selected and patient has mild cephalosporin (all generations and class) allergy. Recommend test dose.",
        trigger = RuleTrigger.SELECTION,
        type = RuleType.WARNING
)
@Slf4j
@Component
public class PenicillinWithMildCephAllergyWarningRule extends MedicationSelectionRule {
    public static final String ID = "w-pen-mild-ceph-allergy";
    public static final String CEPH_ALLERGY_ALLERGEN = "CEPH_ALLERGY_ALLERGEN";
    public static final String CEPH_ALLERGY_REACTION = "CEPH_ALLERGY_REACTION";

    public static final String MEDICATION_CATEGORY = "MEDICATION_CATEGORY";
    public static final String ALLERGIES = "ALLERGIES";

    @Autowired
    public PenicillinWithMildCephAllergyWarningRule(CitationService citationService) {
        super(citationService);
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }

    @Override
    protected EvaluationResult evaluate(MedicationSelectionContext context) {
        MedicationDTO medication = context.getMedication();
        boolean isPenicillin = medication.hasCategory(MedicationCategory.PENICILLIN);
        if (!isPenicillin) {
            return abstain(context, "medication " + medication.getMedicationName() + " is not a " + MedicationCategory.PENICILLIN);
        }

        if(context.hasMatchingPreviousMedicationAdministrationAdministeredThroughApplication()) {
            return abstain(context, context.getMedication().getPrimaryMedicationCategory() + " previously administered");
        }

        var mildCephalosporin = getAllergyByCategoryWithSeverity(
                context.getPatient().getAllergies(),
                MedicationCategory.CEPHALOSPORIN,
                Set.of(AllergySeverity.MILD));

        if (mildCephalosporin.isEmpty()) {
            return abstain(context, "patient does not have a mild allergy to cephalosporins");
        }

        IAllergy cephAllergy = mildCephalosporin.get();
        Map<String, Object> details = new HashMap<>();
        details.put(MEDICATION_NAME, medication.getMedicationName());
        details.put(MEDICATION_ID, medication.getMedicationIdentifier());
        details.put(MEDICATION_CATEGORY, MedicationCategory.PENICILLIN);
        details.put(CEPH_ALLERGY_ALLERGEN, cephAllergy.getAllergenName());
        details.put(CEPH_ALLERGY_REACTION, cephAllergy.getDisplayReaction());
        details.put(ALLERGIES, AllergyDTO.fromAllergies(mildCephalosporin.stream().toList()));
        return baseBuilder(context).needsAction(true).details(details).prompt(createPrompt(details))
                .build();
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {
        var allergies = (List<AllergyDTO>) result.getOrDefault(ALLERGIES, List.of());
        return EvaluationResultPromptTemplate.builder().ruleIdentifier(getRuleIdentifier())
                .type(RuleType.WARNING)
                .warningText("Recommend test dose. Allergy to ${" + CEPH_ALLERGY_ALLERGEN + "} with reaction: ${" + CEPH_ALLERGY_REACTION + "}")
                .citations(getCitations(result))
                .relevantAllergies(allergies)
                .build().createPrompt(result);
    }

    public List<CitationId> getCitationDefinitions() {
        return List.of(CitationDefinition.CEPH_ALLERGY_NO_CANDIDATES);
    }
}

