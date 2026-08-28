package com.guided.orci.engine.rule.medication.selection;

import com.guided.orci.data.DataKey;
import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.engine.*;
import com.guided.orci.models.medication.*;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.service.CitationService;
import com.guided.orci.service.MedicationSetService;
import com.guided.orci.service.medication.MedicationService;
import com.guided.orci.types.wrappers.CitationId;
import com.guided.orci.utils.DateUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RuleDefinition(id = SuccinylcholinePriorMedicationAdministrationWarningRule.ID,
        description = "Alerts when succinylcholine is selected for patients with prior medication administrations of specific medications",
        trigger = RuleTrigger.SELECTION,
        type = RuleType.WARNING)
@Component
@Slf4j
public class SuccinylcholinePriorMedicationAdministrationWarningRule extends MedicationSelectionRule {
    public static final String ID = "w-sux-prior-meds";

    public static String LATEST_MEDICATION = "LATEST_MEDICATION";
    public static String LATEST_MEDICATION_PRIMARY_CATEGORY = "LATEST_MEDICATION_PRIMARY_CATEGORY";

    private final MedicationService medicationService;

    private final MedicationSetService medicationSetService;
    @Autowired
    public SuccinylcholinePriorMedicationAdministrationWarningRule(CitationService citationService, MedicationService medicationService, MedicationSetService medicationSetService) {
        super(citationService);
        this.medicationService = medicationService;
        this.medicationSetService = medicationSetService;
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }

    @Override
    protected EvaluationResult evaluate(MedicationSelectionContext context) {
        if (!context.getMedication().hasPrimaryCategory(MedicationCategory.SUCCINYLCHOLINE)) {
            return abstain(context, "Primary category not succinylcholine");
        }
        Map<String, Object> details = details(context);
        var last24Hours = context.getEvaluationInstant().minus(Duration.ofHours(24));
        var last3weeks = context.getEvaluationInstant().minus(Duration.ofDays(21));

        var matchingMeds = context.getPatient().getMedicationAdministrations().stream().filter(medAdmin -> {

            var administeredInLast24Hours = medAdmin.isAdministeredBetween(Date.from(last24Hours), context.getEvaluationTime());
            if (administeredInLast24Hours && medAdmin.hasPrimaryMedicationCategory(Set.of(
                    MedicationCategory.GALANTAMINE,
                    MedicationCategory.RIVASTIGMINE,
                    MedicationCategory.PYRIDOSTIGMINE,
                    MedicationCategory.NEOSTIGMINE
            ))) {
                return true;
            }

            var administeredInLast3Weeks = medAdmin.isAdministeredBetween(Date.from(last3weeks), context.getEvaluationTime());
            if (administeredInLast3Weeks && medAdmin.hasPrimaryMedicationCategory(Set.of(
                    MedicationCategory.DONEPEZIL,
                    MedicationCategory.DONEPEZIL_MEMANTINE
            ))) {
                return true;
            }

            return false;
        }).sorted(IMedicationAdministration.ORDERED_BY_LATEST_FIRST).toList();



        if (matchingMeds.isEmpty()) {
            // if we didn't find any matching med admins, we look for only DONEPEZIL from medication notes
            var notes = medicationService.findCompletedMedicationNotesByPatientAndEffectiveStartDateAfter(context.getPatient().getPatientId(), Date.from(last3weeks));
            // TODO do this in a single query instead of looping
            var matchingNotes = notes.stream().filter(note -> medicationSetService.isInSet("DonepezilVS", note.getCodings())).sorted(MedicationNote.ORDERED_BY_LATEST_EFFECTIVE_END_DATE_FIRST).toList();
            if (matchingNotes.isEmpty()) {
                return abstain(context, "Patient has prior medication admins or notes of interest");
            }
            var latestMatchingNote = matchingNotes.getFirst();
            details.put(LATEST_MEDICATION, latestMatchingNote.getMedicationName());
            // Note: we assume the category is Donepezil so we can set the citation correctly
            details.put(LATEST_MEDICATION_PRIMARY_CATEGORY, MedicationCategory.DONEPEZIL);
            details.put(DataKey.LATEST_ADMINISTRATION_DATE, latestMatchingNote.getEffectiveStartDate());
            String formattedAdministrationDate = DateUtils.formatMonthDayYear(latestMatchingNote.getEffectiveStartDate(), context.getTimeZone());
            details.put(DataKey.LATEST_ADMINISTRATION_DATE_FORMATTED, formattedAdministrationDate);
        } else {
            var latestMatchingAdmin = matchingMeds.getFirst();
            details.put(LATEST_MEDICATION, latestMatchingAdmin.getMedication().get().getShortName());
            details.put(LATEST_MEDICATION_PRIMARY_CATEGORY, latestMatchingAdmin.getMedication().get().getPrimaryMedicationCategory());
            var latestRelevantDate = getLatestRelevantDate(latestMatchingAdmin);
            details.put(DataKey.LATEST_ADMINISTRATION_DATE, latestRelevantDate);
            String formattedAdministrationDate = DateUtils.formatAsStandardPhrase(latestRelevantDate, false, context.getTimeZone());
            details.put(DataKey.LATEST_ADMINISTRATION_DATE_FORMATTED, formattedAdministrationDate);
        }

        return baseBuilder(context).details(details).needsAction(true).prompt(createPrompt(details)).build();
    }

    /**
     * Returns the latest start/rate change date if infusion, otherwise it will return the latest event date.
     */
    private Date getLatestRelevantDate(IMedicationAdministration medAdmin) {
        if (medAdmin instanceof IInfusionMedicationAdministration infusion) {
            return infusion.getLatestInfusionEvent(Set.of(InfusionEventType.START, InfusionEventType.RATE_CHANGE)).map(InfusionEvent::getEventDate).orElse(medAdmin.getLatestEventDate());
        }
        return medAdmin.getLatestEventDate();
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {
        return EvaluationResultPromptTemplate.builder().ruleIdentifier(getRuleIdentifier())
                .type(RuleType.WARNING)
                .warningText("Patient received ${" + LATEST_MEDICATION + "} at ${" + DataKey.LATEST_ADMINISTRATION_DATE_FORMATTED + "}. Succinylcholine may cause prolonged paralysis.")
                .citations(getCitations(result))
                .build().createPrompt(result);
    }

    @Override
    public List<CitationId> getConditionalCitationDefinitions() {
        return List.of(CitationDefinition.SUCCINYLCHOLINE_DONEPIZIL_GALANTAMINE_RIVASTIGMINE, CitationDefinition.MYASTHENIA_GRAVIS);
    }

    @Override
    public List<CitationId> getMatchingCitationDefinitions(Map<String, Object> results) {
        var primaryCategory = (String) results.get(LATEST_MEDICATION_PRIMARY_CATEGORY);
        var citationId = switch (primaryCategory) {
            case MedicationCategory.GALANTAMINE,
                 MedicationCategory.DONEPEZIL_MEMANTINE,
                 MedicationCategory.RIVASTIGMINE,
                 MedicationCategory.DONEPEZIL -> CitationDefinition.SUCCINYLCHOLINE_DONEPIZIL_GALANTAMINE_RIVASTIGMINE;
            case MedicationCategory.PYRIDOSTIGMINE,
                 MedicationCategory.NEOSTIGMINE -> CitationDefinition.MYASTHENIA_GRAVIS;
            case null, default -> null;
        };
        if (citationId == null) {
            return List.of();
        }
        return List.of(citationId);
    }
}
