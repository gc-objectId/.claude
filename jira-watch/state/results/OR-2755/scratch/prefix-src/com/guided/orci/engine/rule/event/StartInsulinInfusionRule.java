package com.guided.orci.engine.rule.event;

import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.dto.rule.context.ContextMedicationAdministration;
import com.guided.orci.engine.*;
import com.guided.orci.engine.rule.GuidanceCategory;
import com.guided.orci.models.medication.MedicationCategory;
import com.guided.orci.models.observation.Observation;
import com.guided.orci.models.observation.ObservationType;
import com.guided.orci.models.operation.EventCategory;
import com.guided.orci.models.patient.Operation;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.models.trackedValue.TrackedValue;
import com.guided.orci.repository.ObservationRepository;
import com.guided.orci.service.CitationService;
import com.guided.orci.service.ObservationService;
import com.guided.orci.service.OperationService;
import com.guided.orci.service.PatientService;
import com.guided.orci.service.rules.diabetes.InsulinManagementService;
import com.guided.orci.types.wrappers.CaseId;
import com.guided.orci.types.wrappers.CitationId;
import com.guided.orci.units.formatting.NumberFormatters;
import com.guided.orci.utils.DateUtils;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.tuple.Pair;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;

import static com.guided.orci.engine.EvaluationResultPromptTemplate.CITATION_TOOLTIP_PLACEHOLDER;

@Slf4j
@RuleDefinition(
        id = StartInsulinInfusionRule.ID,
        description = "Alert for starting insulin infusion when glucose > 180 mg/dL for two consecutive readings despite insulin bolus",
        trigger = RuleTrigger.NOTIFICATION,
        type = RuleType.ALERT,
        guidanceCategory = GuidanceCategory.MONITORING
)
@Component
public class StartInsulinInfusionRule extends GlucoseEventBasedRule {

    public static final String ID = "a-start-insulin-infusion";

    public static final String PREVIOUS_GLUCOSE_VALUE = "PREVIOUS_GLUCOSE_VALUE";
    public static final String PREVIOUS_GLUCOSE_TIMESTAMP = "PREVIOUS_GLUCOSE_TIMESTAMP";


    public static final String INSULIN_BOLUS_MEDICATION = "INSULIN_BOLUS_MEDICATION";
    public static final String INSULIN_BOLUS_TIMESTAMP = "INSULIN_BOLUS_TIMESTAMP";
    public static final String CURRENT_RECOMMENDED_INFUSION_RATE = "CURRENT_RECOMMENDED_INFUSION_RATE";
    public static final String CURRENT_ISC = "CURRENT_ISC";
    private static final float GLUCOSE_THRESHOLD = 180.0f;
    private static final BigDecimal LOW_INFUSION_RATE_THRESHOLD = new BigDecimal("0.5");
    private static final Duration INSULIN_INFUSION_EXCLUSION_WINDOW = Duration.ofDays(7);
    private final InsulinManagementService insulinManagementService;


    public StartInsulinInfusionRule(
            CitationService citationService,
            InsulinManagementService insulinManagementService,
            PatientService patientService,
            OperationService operationService,
            ObservationService observationService) {
        super(citationService, patientService, operationService, observationService);
        this.insulinManagementService = insulinManagementService;
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }

    @Override
    public List<EventCategory> getApplicableEventCategories() {
        return List.of(EventCategory.GLUCOSE_UPDATED);
    }

    @Override
    protected EvaluationResult evaluate(EventContext context) {

        // Exclusion: Check if patient is already on active insulin infusion
        if (hasActiveInsulinInfusion(context)) {
            return abstain(context, "Patient is already on active insulin infusion");
        }

        // Get the current (most recent) glucose reading
        Optional<Observation> currentGlucoseOpt = getCurrentGlucose(context);
        if (currentGlucoseOpt.isEmpty()) {
            return abstain(context, "No recent glucose reading found");
        }

        var caseId = context.getOperation() != null ? new CaseId(context.getOperation().getCaseId()) : null;
        if (caseId == null) {
            // some events may not set case id, so we have to infer based on the patient
            var patient = this.patientService.getPatient(context.getPatient().getPatientId());
            caseId = this.operationService.findOperationBasedOnStartTime(patient, context.getEventDate()).map(Operation::getCaseId).orElse(null);

        }


        Map<String, Object> details = details(context);
        Observation currentGlucose = currentGlucoseOpt.get();
        Float currentGlucoseValue = currentGlucose.getNumericObservationValue();


        // Check if current glucose is > 180 mg/dL
        if (currentGlucoseValue == null || currentGlucoseValue <= GLUCOSE_THRESHOLD) {
            return abstain(context, details, "Current glucose value is not > 180 mg/dL");
        }
        details.put(CURRENT_GLUCOSE_VALUE, currentGlucoseValue.intValue());
        details.put(CURRENT_GLUCOSE_TIMESTAMP, DateUtils.formatTimeOnlyRelativeToCurrentDay(
                currentGlucose.getEffectiveTime(), context.getTimeZone()));
        details.put(GLUCOSE_UNITS, currentGlucose.getObservationUnits() != null ?
                currentGlucose.getObservationUnits() : "mg/dL");

        // Get the previous glucose reading (before the current one)
        Optional<Observation> previousGlucoseOpt = getPreviousGlucose(context, currentGlucose.getEffectiveTime());
        if (previousGlucoseOpt.isEmpty()) {
            return abstain(context, details, "No previous glucose reading found for comparison");
        }

        Observation previousGlucose = previousGlucoseOpt.get();
        Float previousGlucoseValue = previousGlucose.getNumericObservationValue();

        // Check if previous glucose is also > 180 mg/dL
        if (previousGlucoseValue == null || previousGlucoseValue <= GLUCOSE_THRESHOLD) {
            return abstain(context, details, "Previous glucose value is not > 180 mg/dL");
        }

        details.put(PREVIOUS_GLUCOSE_VALUE, previousGlucoseValue.intValue());
        details.put(PREVIOUS_GLUCOSE_TIMESTAMP, DateUtils.formatTimeOnlyRelativeToCurrentDay(
                previousGlucose.getEffectiveTime(), context.getTimeZone()));


        // Check if insulin bolus was given between the two glucose readings
        Optional<ContextMedicationAdministration> insulinBolusOpt = getInsulinBolusBetweenGlucoseReadings(
                context, previousGlucose.getEffectiveTime(), currentGlucose.getEffectiveTime());

        if (insulinBolusOpt.isEmpty()) {
            return abstain(context, details, "No insulin bolus administered between glucose readings");
        }

        ContextMedicationAdministration insulinBolus = insulinBolusOpt.get();

        details.put(INSULIN_BOLUS_MEDICATION, insulinBolus.getMedicationName());
        details.put(INSULIN_BOLUS_TIMESTAMP, DateUtils.formatTimeOnlyRelativeToCurrentDay(
                insulinBolus.getAdministrationDate(), context.getTimeZone()));


        // Get ISC and calculate recommended infusion rate
        Optional<TrackedValue> isc = getLatestISC(caseId);
        if (isc.isEmpty()) {
            return abstain(context, "No latest ISC");
        }
        details.put(CURRENT_ISC, getISCFormatter().format(isc.get().getTrackedValue()));

        Optional<TrackedValue> infusionRate = getRecommendedInfusionRate(caseId);

        if (infusionRate.isEmpty()) {
            return abstain(context, details, "No recommended infusion rate");
        }
        var recommendedInfusionRate = infusionRate.get().getTrackedValue();
        details.put(CURRENT_RECOMMENDED_INFUSION_RATE, getRateFormatter().format(recommendedInfusionRate));
        if (recommendedInfusionRate.compareTo(LOW_INFUSION_RATE_THRESHOLD) < 0) {
            return abstain(context, details, "Recommended infusion rate is < 0.5");
        }

        details.put(HAS_ACTIVE_DEXTROSE, hasActiveDextroseInfusion(context, Duration.ofHours(24)));

        return baseBuilder(context)
                .needsAction(true)
                .details(details)
                .prompt(createPrompt(details))
                .build();
    }

    /**
     * Get the current (most recent) glucose reading.
     * Looks back to whichever is more recent: 1 hour ago or the start of the case.
     */
    private Optional<Observation> getCurrentGlucose(EventContext context) {
        // Look back to whichever is more recent: 1 hour ago or case start
        Instant oneHourAgo = context.getEvaluationInstant().minus(Duration.ofHours(1));
        Instant caseStart = context.getSafeOperationStartInstant();

        // Use the more recent time (later instant)
        Instant lookbackTime = DateUtils.latest(oneHourAgo, caseStart);

        return observationService.getLatestObservation(
                context.getPatient(),
                Date.from(lookbackTime),
                ObservationType.GLUCOSE);
    }

    /**
     * Get the previous glucose reading before the given timestamp.
     * Looks back up to 4 hours before case start (pre-op window).
     */
    private Optional<Observation> getPreviousGlucose(EventContext context, Date beforeTime) {
        // Look back up to 4 hours before operation start for pre-op glucose readings
        Instant fourHoursBeforeOp = context.getSafeOperationStartInstant().minus(Duration.ofHours(4));

        return observationService.getPriorObservation(
                        context.getPatient(),
                        beforeTime,
                        ObservationType.GLUCOSE)
                .filter(observation -> observation.getEffectiveInstant().isAfter(fourHoursBeforeOp));
    }

    /**
     * Check if an insulin bolus was administered between two glucose readings (with timestamps floored to the minute)
     */
    private Optional<ContextMedicationAdministration> getInsulinBolusBetweenGlucoseReadings(
            EventContext context, Date previousGlucoseTime, Date currentGlucoseTime) {
        // we floor to the minutes since med admins only have minute-level resolution
        var adjustedStart = Date.from(previousGlucoseTime.toInstant().truncatedTo(ChronoUnit.MINUTES));
        // exclusive hack by substracting 1 millisecond
        var adjustedEnd = Date.from(currentGlucoseTime.toInstant().truncatedTo(ChronoUnit.MINUTES).minusMillis(1));
        return context.getPatient().getBolusMedicationAdministrations().stream()
                .filter(medAdmin -> {
                    boolean isInsulin = medAdmin.hasMedicationCategory(MedicationCategory.INSULIN);
                    boolean isInBounds = medAdmin.isAdministeredBetween(adjustedStart, adjustedEnd);
                    return isInsulin && isInBounds;
                })
                .findFirst();
    }

    /**
     * Check if patient has an active insulin infusion.
     * Looks for insulin infusions started within the last 7 days that are still ongoing.
     */
    private boolean hasActiveInsulinInfusion(EventContext context) {
        return hasActiveInfusion(context, MedicationCategory.INSULIN, INSULIN_INFUSION_EXCLUSION_WINDOW);
    }


    private Optional<TrackedValue> getLatestISC(CaseId caseId) {
        return this.insulinManagementService.getLatestAndPreviousISCs(caseId).map(Pair::getLeft);
    }


    private Optional<TrackedValue> getRecommendedInfusionRate(CaseId caseId) {
        return this.insulinManagementService.getLatestRecommendInsulinInfusionRate(caseId);
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {
        String title = "Start Insulin Infusion at ${" + CURRENT_RECOMMENDED_INFUSION_RATE + "} Units/hr with Dextrose Source";
        String description = "Blood glucose = ${" + CURRENT_GLUCOSE_VALUE + "} ${" + GLUCOSE_UNITS + "}. " +
                             "For two consecutive glucose readings > 180 mg/dL despite insulin bolus, consider IV insulin infusion at ${" +
                             CURRENT_RECOMMENDED_INFUSION_RATE + "} Units/hr, based on this patient's insulin sensitivity. " + CITATION_TOOLTIP_PLACEHOLDER;
        Boolean isDextroseOngoing = (Boolean) result.getOrDefault(HAS_ACTIVE_DEXTROSE, false);
        if (!isDextroseOngoing) {
            description = description + "<br/><br/>" +
                          "Consider one of the following dextrose sources:<br/>" +
                          "<ul><li>D5W ≥ 60 mL/hr</li>" +
                          "<li>D10W ≥ 30 mL/hr</li>" +
                          "<li>D20W ≥ 15 mL/hr</li></ul>";
        }

        return EvaluationResultPromptTemplate.builder()
                .ruleIdentifier(getRuleIdentifier())
                .title(title)
                .description(description)
                .tabName("Glucose Management")
                .type(RuleType.ALERT)
                .acceptText("Will Start Infusion")
                .rejectText("Reject")
                .rejectReasons(Stream.of(
                        RejectionReasonOption.simple(RejectionReason.SHORT_CASE)
                ).toList())
                .citations(getCitations(result))
                .build().createPrompt(result);
    }

    @Override
    public List<CitationId> getCitationDefinitions() {
        return List.of(CitationDefinition.START_INSULIN_INFUSION);
    }



}
