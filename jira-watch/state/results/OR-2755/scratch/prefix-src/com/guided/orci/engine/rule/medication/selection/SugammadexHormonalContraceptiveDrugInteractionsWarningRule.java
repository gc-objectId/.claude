package com.guided.orci.engine.rule.medication.selection;

import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.engine.*;
import com.guided.orci.models.medication.MedicationCategory;
import com.guided.orci.models.medication.MedicationNote;
import com.guided.orci.models.medication.MedicationNoteStatus;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.service.CitationService;
import com.guided.orci.service.MedicationSetService;
import com.guided.orci.service.medication.MedicationService;
import com.guided.orci.types.wrappers.CitationId;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@RuleDefinition(id = SugammadexHormonalContraceptiveDrugInteractionsWarningRule.ID,
        description = "Warns when sugammadex is selected for patients on hormonal contraceptives",
        trigger = RuleTrigger.SELECTION,
        type = RuleType.WARNING)
@Component
@Slf4j
public class SugammadexHormonalContraceptiveDrugInteractionsWarningRule extends MedicationSelectionRule {
    public static final String ID = "w-sugammadex-hormonal-contraceptive-drug-interactions";
    public static final String HORMONAL_CONTRACEPTIVES_VS = "HormonalContraceptivesVS";

    protected static final String WARNING_TEXT = "Patient uses hormonal contraception that has reduced efficacy with sugammadex. Counsel patient to use additional, non-hormonal contraceptive method for next 7 days.";
    private final MedicationService medicationService;
    private final MedicationSetService medicationSetService;

    @Autowired
    public SugammadexHormonalContraceptiveDrugInteractionsWarningRule(CitationService citationService, MedicationService medicationService,
                                                                      MedicationSetService medicationSetService) {
        super(citationService);
        this.medicationService = medicationService;
        this.medicationSetService = medicationSetService;
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
    public String getRuleIdentifier() {
        return ID;
    }

    @Override
    protected EvaluationResult evaluate(MedicationSelectionContext context) {
        if (!context.getMedication().hasPrimaryCategory(MedicationCategory.SUGAMMADEX)) {
            return abstain(context, "Medication is not " + MedicationCategory.SUGAMMADEX);
        }
        List<MedicationNote> hormonalContraceptives = medicationService.findMedicationNotesByPatientAndEffectiveDateRangeAndStatusIn(context.getPatient().getPatientId(), context.getEvaluationTime(), List.of(MedicationNoteStatus.INTENDED, MedicationNoteStatus.ON_HOLD))
                .stream()
                .filter(note -> medicationSetService.isInSet(HORMONAL_CONTRACEPTIVES_VS, note.getCodings()))
                .sorted(MedicationNote.ORDERED_BY_LATEST_EFFECTIVE_END_DATE_FIRST)
                .toList();

        if(hormonalContraceptives.isEmpty()) {
            return abstain(context, "Patient is not on any hormonal contraceptives");
        }

        return baseBuilder(context).needsAction(true).prompt(createPrompt(details(context))).build();
    }

    @Override
    public List<CitationId> getCitationDefinitions() {
        return List.of(CitationDefinition.SUGAMMADEX_HORMONAL_CONTRACEPTIVE_DRUG_INTERACTIONS);
    }
}
