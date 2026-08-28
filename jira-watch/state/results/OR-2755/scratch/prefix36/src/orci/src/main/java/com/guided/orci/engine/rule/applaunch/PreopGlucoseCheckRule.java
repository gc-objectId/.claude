package com.guided.orci.engine.rule.applaunch;

import com.google.common.base.Preconditions;
import com.guided.orci.dto.PatientContext;
import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.dto.rule.context.ContextInfusionMedicationAdministration;
import com.guided.orci.dto.rule.context.ContextMedicationAdministration;
import com.guided.orci.engine.*;
import com.guided.orci.engine.rule.GuidanceCategory;
import com.guided.orci.engine.rule.RuleCategory;
import com.guided.orci.models.medication.IMedicationAdministration;
import com.guided.orci.models.medication.InfusionEventType;
import com.guided.orci.models.medication.MedicationNote;
import com.guided.orci.models.medication.MedicationNoteStatus;
import com.guided.orci.models.observation.Observation;
import com.guided.orci.models.observation.ObservationType;
import com.guided.orci.models.patient.ConditionTag;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.service.CitationService;
import com.guided.orci.service.MedicationSetService;
import com.guided.orci.service.PatientService;
import com.guided.orci.service.RuleMemoryService;
import com.guided.orci.service.medication.MedicationService;
import com.guided.orci.types.wrappers.CitationId;
import com.guided.orci.utils.DateUtils;
import com.guided.orci.utils.StringUtils;
import lombok.extern.slf4j.Slf4j;
import org.jetbrains.annotations.NotNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RuleDefinition(
        id = PreopGlucoseCheckRule.ID,
        description = "Alerts if patient with diabetes or on antihyperglycemics has not had glucose tested day of surgery",
        trigger = RuleTrigger.LAUNCH,
        type = RuleType.ALERT,
        categories = {RuleCategory.COMPLIANCE_GLUCOSE_CHECK},
        guidanceCategory = GuidanceCategory.MONITORING
)
@Slf4j
@Component
public class PreopGlucoseCheckRule extends AppLaunchRule {
    public static final String ID = "a-preop-glucose";
    public static final String HAS_DIABETES = "HAS_DIABETES";
    public static final String ANTIHYPERGLYCEMICS_LIST = "ANTIHYPERGLYCEMICS_LIST";
    public static final String LATEST_ANTIHYPERGLYCEMIC_MED_ADMIN_NAME = "LATEST_ANTIHYPERGLYCEMIC_MED_ADMIN_NAME";
    public static final String LATEST_ANTIHYPERGLYCEMIC_MED_ADMIN_DATE = "LATEST_ANTIHYPERGLYCEMIC_MED_ADMIN_DATE";
    public static final String TRIGGER = "TRIGGER";
    private static final Duration GLUCOSE_LOOKBACK_DURATION = Duration.ofHours(4);
    private final PatientService patientService;
    private final MedicationSetService medicationSetService;
    private final MedicationService medicationService;

    @Autowired
    public PreopGlucoseCheckRule(CitationService citationService,
                                 MedicationSetService medicationSetService,
                                 PatientService patientService,
                                 RuleMemoryService ruleMemoryService,
                                 MedicationService medicationService) {
        super(citationService, ruleMemoryService);
        Preconditions.checkNotNull(medicationSetService);
        Preconditions.checkNotNull(patientService);
        this.patientService = patientService;
        this.medicationSetService = medicationSetService;
        this.medicationService = medicationService;
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }

    @Override
    protected EvaluationResult evaluate(PatientContext context) {
        Map<String, Object> details = details(context);

        // check if we see a Glucose Test from the defined lookback window
        Instant glucoseLookbackStart = context.getSafeOperationStartInstant().minus(GLUCOSE_LOOKBACK_DURATION);

        Optional<Observation> glucoseTest = this.patientService.getLatestObservationByTypeAndAfterDate(context.getPatient().getId(), ObservationType.GLUCOSE, Date.from(glucoseLookbackStart));

        boolean hasGlucose = glucoseTest.isPresent();


        if (hasGlucose) {
            return abstain(context, details, "glucose was tested within the last " + GLUCOSE_LOOKBACK_DURATION.toHours() + " hours");
        }

        boolean hasDiabetes = context.getPatient().getConditions().stream().anyMatch(
                condition -> condition.hasTag(ConditionTag.DIABETES));
        details.put(HAS_DIABETES, hasDiabetes);

        if (hasDiabetes) {
            details.put(TRIGGER, TriggerType.DIABETES);
            return baseBuilder(context)
                    .needsAction(true)
                    .details(details)
                    .prompt(createPrompt(details))
                    .build();
        }


        // attempt to see if patient is on any antihyperglycemic drugs
        List<IMedicationAdministration> antihyperglycemics = getAntihyperglycemicMedAdmins(context);
        boolean isOnAntihyperglycemics = !antihyperglycemics.isEmpty();

        if (isOnAntihyperglycemics) {
            details.put(TRIGGER, TriggerType.ANTIHYPERGLYCEMICS_MED_ADMINS);
            details.put(ANTIHYPERGLYCEMICS_LIST, StringUtils.grammaticalList(
                    antihyperglycemics.stream()
                            .map(IMedicationAdministration::getMedicationName)
                            .distinct().toList(), ""));
            var latestAntihyperglycemic = antihyperglycemics.stream().min(IMedicationAdministration.ORDERED_BY_LATEST_FIRST).orElseThrow();
            String formattedDate = DateUtils.formatTimeOnlyRelativeToCurrentDay(latestAntihyperglycemic.getLatestEventDate(), context.getTimeZone());
            details.put(LATEST_ANTIHYPERGLYCEMIC_MED_ADMIN_DATE, formattedDate);
            details.put(LATEST_ANTIHYPERGLYCEMIC_MED_ADMIN_NAME, latestAntihyperglycemic.getMedicationName());
            return baseBuilder(context).needsAction(true).details(details).prompt(createPrompt(details)).build();
        } else {
            // attempt to look at notes
            List<MedicationNote> antihyperglycemicNotes = getAntihyperglycemicNotes(context);
            if (!antihyperglycemicNotes.isEmpty()) {
                details.put(TRIGGER, TriggerType.ANTIHYPERGLYCEMICS_MED_NOTES);
                details.put(ANTIHYPERGLYCEMICS_LIST, StringUtils.grammaticalList(
                        antihyperglycemicNotes.stream()
                                .map(MedicationNote::getMedicationName)
                                .distinct().toList(), ""));
                return baseBuilder(context).needsAction(true).details(details).prompt(createPrompt(details)).build();
            }
        }

        return abstain(context, details, "patient does not have diabetes and is not on any antihyperglycemics");
    }

    private @NotNull List<MedicationNote> getAntihyperglycemicNotes(PatientContext context) {
        return medicationService.findMedicationNotesByPatientAndEffectiveDateRangeAndStatusIn(context.getPatient().getPatientId(), context.getEvaluationTime(), List.of(MedicationNoteStatus.INTENDED, MedicationNoteStatus.ON_HOLD))
                .stream()
                .filter(note -> this.medicationSetService.isInSet("InsulinVS", note.getCodings()) ||
                                this.medicationSetService.isInSet("NonInsulinAntihyperglycemicsVS",
                                        note.getCodings()))
                .sorted(MedicationNote.ORDERED_BY_LATEST_EFFECTIVE_END_DATE_FIRST)
                .toList();
    }

    private @NotNull List<IMedicationAdministration> getAntihyperglycemicMedAdmins(PatientContext context) {
        Instant operationStartTime = context.getSafeOperationStartInstant();

        Instant evaluationTime = context.getEvaluationInstant();
        Instant sevenDaysAgo = evaluationTime.minus(Duration.ofDays(7));
        return context.getPatient().getMedicationAdministrations().stream()
                .filter(medAdmin -> {
                    if (medAdmin instanceof ContextMedicationAdministration medicationAdministration) {
                        Instant administrationDate = medicationAdministration.getAdministrationDate().toInstant();
                        if (sevenDaysAgo.isBefore(administrationDate) &&
                            administrationDate.isBefore(evaluationTime) &&
                            administrationDate.isBefore(operationStartTime)) {

                            if (this.medicationSetService.isInSet("InsulinVS",
                                    medAdmin.getCodings()) ||
                                this.medicationSetService.isInSet("NonInsulinAntihyperglycemicsVS",
                                        medAdmin.getCodings())) {
                                return true;
                            } else {
                                log.debug("medication action does not match action criteria: {}", medAdmin);
                            }
                        }
                    } else if (medAdmin instanceof ContextInfusionMedicationAdministration infusionMedicationAdministration) {
                        if (infusionMedicationAdministration.hasEventOnOrAfter(InfusionEventType.START, sevenDaysAgo) &&
                            infusionMedicationAdministration.hasEventBefore(InfusionEventType.START, evaluationTime) &&
                            infusionMedicationAdministration.hasEventBefore(InfusionEventType.START, operationStartTime)) {

                            if (this.medicationSetService.isInSet("InsulinVS",
                                    medAdmin.getCodings()) ||
                                this.medicationSetService.isInSet("NonInsulinAntihyperglycemicsVS",
                                        medAdmin.getCodings())) {
                                return true;
                            } else {
                                log.debug("medication action does not match action criteria: {}", medAdmin);
                            }
                        }
                    }
                    return false;
                }).sorted(IMedicationAdministration.ORDERED_BY_LATEST_FIRST)
                .collect(Collectors.toList());
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> details) {
        var trigger = (TriggerType) details.getOrDefault(TRIGGER, TriggerType.DIABETES);
        var description = switch (trigger) {
            case DIABETES -> "Patients with diabetes should have a glucose check on the day of surgery.";
            case ANTIHYPERGLYCEMICS_MED_ADMINS -> {
                var date = details.getOrDefault(LATEST_ANTIHYPERGLYCEMIC_MED_ADMIN_DATE, null);
                if (date != null) {
                    yield "Patient received ${" + LATEST_ANTIHYPERGLYCEMIC_MED_ADMIN_NAME + "} at ${" + LATEST_ANTIHYPERGLYCEMIC_MED_ADMIN_DATE + "}. Patients on antihyperglycemics should have a glucose check on the day of surgery.";
                }
                yield "Patient received ${" + LATEST_ANTIHYPERGLYCEMIC_MED_ADMIN_NAME + "}. Patients on antihyperglycemics should have a glucose check on the day of surgery.";

            }
            case ANTIHYPERGLYCEMICS_MED_NOTES -> "Patient takes ${" + ANTIHYPERGLYCEMICS_LIST
                                                 + "}. Patients on antihyperglycemics should have a glucose check on the day of surgery.";
        };

        EvaluationResultPromptTemplate promptTemplate = EvaluationResultPromptTemplate.builder().ruleIdentifier(getRuleIdentifier())
                .title("Check Glucose")
                .description(description)
                .type(RuleType.ALERT).acceptText("Will Check Glucose").rejectText("Reject")
                .rejectReasons(List.of(
                        RejectionReasonOption.simple(RejectionReason.GLUCOSE_CHECK_ALREADY_DOCUMENTED),
                        RejectionReasonOption.simple(RejectionReason.PATIENT_DOES_NOT_HAVE_DIABETES)))
                .citations(getCitations(details))
                .build();

        EvaluationResultPrompt prompt = promptTemplate.createPrompt(details);
        prompt.setTrigger(trigger.name());
        return prompt;
    }

    @Override
    public List<CitationId> getCitationDefinitions() {
        return List.of(CitationDefinition.PREOP_GLUCOSE);
    }

    public enum TriggerType {
        DIABETES, ANTIHYPERGLYCEMICS_MED_ADMINS, ANTIHYPERGLYCEMICS_MED_NOTES;
    }

}
