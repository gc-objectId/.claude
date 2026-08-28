package com.guided.orci.engine.rule.medication.selection;

import com.guided.orci.dto.AllergyDTO;
import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.dto.rule.context.ContextAllergy;
import com.guided.orci.engine.*;
import com.guided.orci.models.allergy.AlertableCephalosporinCrossReaction;
import com.guided.orci.models.allergy.AllergySeverity;
import com.guided.orci.models.medication.MedicationCategory;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.repository.AlertableCephalosporinCrossReactionRepository;
import com.guided.orci.service.CitationService;
import com.guided.orci.types.wrappers.CitationId;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static com.guided.orci.engine.rule.medication.selection.AbstractProcedureTypeAwareMedicationSelectionRule.HAS_MODERATE_CEPH_ALLERGY;

@RuleDefinition(id = CephalosporinWithNoCrossReactionsTypeIOrUnknownCephalosporinAllergyRule.ID,
        description = "Warns when selected cephalosporin does not cross reaction with other cephalosporins and patient has a Type I or unknown cephalosporin (generation only) allergy",
        trigger = RuleTrigger.SELECTION,
        type = RuleType.WARNING)
@Component
public class CephalosporinWithNoCrossReactionsTypeIOrUnknownCephalosporinAllergyRule extends MedicationSelectionRule {
    public static final String ID = "w-ceph-no-cross-reaction-type-i-unknown-ceph-gen-allergy";
    public static final String ALLERGY_ALLERGEN = "ALLERGY_ALLERGEN";
    public static final String ALLERGY_REACTION = "ALLERGY_REACTION";
    public static final String ALLERGIES = "ALLERGIES";
    private static final Set<AllergySeverity> SEVERITIES_OF_INTEREST = Set.of(AllergySeverity.MODERATE, AllergySeverity.OTHER_UNKNOWN);
    private AlertableCephalosporinCrossReactionRepository alertableCephalosporinCrossReactionRepository;

    @Autowired
    public CephalosporinWithNoCrossReactionsTypeIOrUnknownCephalosporinAllergyRule(AlertableCephalosporinCrossReactionRepository alertableCephalosporinCrossReactionRepository, CitationService citationService) {
        super(citationService);
        this.alertableCephalosporinCrossReactionRepository = alertableCephalosporinCrossReactionRepository;
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }

    @Override
    protected EvaluationResult evaluate(MedicationSelectionContext context) {
        if (!context.getMedication().getMedicationCategories().contains(MedicationCategory.CEPHALOSPORIN)) {
            return abstain(context, "Medication is not a cephalosporin");
        }

        if (context.hasMatchingPreviousMedicationAdministrationAdministeredThroughApplication()) {
            return abstain(context, context.getMedication().getPrimaryMedicationCategory() + " previously administered");
        }
        List<ContextAllergy> allergies = context.getPatient().getAllergies().stream()
                .filter(allergy -> SEVERITIES_OF_INTEREST.contains(AllergySeverity.getNormalizedValue(allergy.getSeverity())) &&
                                   allergy.getAllergen() != null &&
                                   // allergy is a generational ceph allergy
                                   allergy.getAllergen().getAllergenCategories().stream().anyMatch(category -> MedicationCategory.CEPHALOSPORIN_GENERATIONS.contains(category)) &&
                                   // allergy is not the selected medication
                                   !allergy.isAssociatedWithMedication(context.getMedication().getMedicationIdentifier())
                )
                .toList();

        if (allergies.isEmpty()) {
            return abstain(context, "Patient does not have a Type I or unknown cephalosporin allergy");
        }
        AlertableCephalosporinCrossReaction crossReaction = this.alertableCephalosporinCrossReactionRepository.findByMedicationId(context.getMedication().getId());

        List<ContextAllergy> warnableAllergies = allergies.stream().filter(allergen ->
                crossReaction == null
                || !crossReaction.hasAllergenWithIdentifier(allergen.getAllergen().getAllergenIdentifier())).toList();

        if (warnableAllergies.isEmpty()) {
            return abstain(context, "All cephalosporin allergies defined as alertable");
        }

        var moderateAllergy = warnableAllergies.stream().filter(allergy -> AllergySeverity.MODERATE.equals(AllergySeverity.getNormalizedValue(allergy.getSeverity()))).findFirst();
        var cephAllergy = moderateAllergy.orElse(warnableAllergies.getFirst());

        Map<String, Object> details = new HashMap<>();
        details.put(MEDICATION_NAME, context.getMedication().getMedicationName());
        details.put(MEDICATION_ID, context.getMedication().getMedicationIdentifier());
        details.put(ALLERGY_ALLERGEN, cephAllergy.getAllergenName());
        details.put(ALLERGY_REACTION, cephAllergy.getDisplayReaction());
        details.put(ALLERGIES, AllergyDTO.fromAllergies(warnableAllergies));
        details.put(HAS_MODERATE_CEPH_ALLERGY, moderateAllergy.isPresent());

        return baseBuilder(context).needsAction(true).details(details).prompt(createPrompt(details)).build();
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
        return List.of(CitationDefinition.CEPH_ALLERGY_CANDIDATES, CitationDefinition.UNKNOWN_CEPH_PEN_ALLERGY);
    }

    public List<CitationId> getMatchingCitationDefinitions(Map<String, Object> results) {
        var citations = ((Boolean) results.getOrDefault(HAS_MODERATE_CEPH_ALLERGY, false)) ? List.of(CitationDefinition.CEPH_ALLERGY_NO_CANDIDATES) : List.of(CitationDefinition.UNKNOWN_CEPH_PEN_ALLERGY);
        return citations;
    }
}