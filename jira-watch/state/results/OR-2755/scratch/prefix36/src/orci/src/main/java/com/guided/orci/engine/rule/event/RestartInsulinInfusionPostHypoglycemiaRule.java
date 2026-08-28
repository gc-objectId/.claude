        package com.guided.orci.engine.rule.event;

import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.engine.*;
import com.guided.orci.engine.rule.GuidanceCategory;
import com.guided.orci.models.observation.Observation;
import com.guided.orci.models.observation.ObservationType;
import com.guided.orci.models.operation.EventCategory;
import com.guided.orci.models.patient.ConditionTag;
import com.guided.orci.models.patient.Operation;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.models.trackedValue.TrackedValue;
import com.guided.orci.repository.ObservationRepository;
import com.guided.orci.service.CitationService;
import com.guided.orci.service.ObservationService;
import com.guided.orci.service.OperationService;
import com.guided.orci.service.PatientService;
import com.guided.orci.service.rules.diabetes.GlucoseAnalysisHelper;
import com.guided.orci.service.rules.diabetes.InsulinManagementService;
import com.guided.orci.types.wrappers.CaseId;
import com.guided.orci.types.wrappers.CitationId;
import com.guided.orci.units.formatting.NumberFormatters;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.tuple.Pair;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.Duration;
import java.util.*;
import java.util.stream.Stream;

@Slf4j
@RuleDefinition(
        id = RestartInsulinInfusionPostHypoglycemiaRule.ID,
        description = "Alert to restart insulin infusion after hypoglycemia resolved",
        trigger = RuleTrigger.NOTIFICATION,
        type = RuleType.ALERT,
        guidanceCategory = GuidanceCategory.MONITORING
)
@Component
public class RestartInsulinInfusionPostHypoglycemiaRule extends GlucoseEventBasedRule {

    public static final String ID = "a-restart-infusion-post-hypoglycemia";

    public static final String CURRENT_RECOMMENDED_INFUSION_RATE = "CURRENT_RECOMMENDED_INFUSION_RATE";
    public static final String CURRENT_ISC = "CURRENT_ISC";

    private final InsulinManagementService insulinManagementService;

    public RestartInsulinInfusionPostHypoglycemiaRule(
            ObservationService observationService,
            CitationService citationService,
            InsulinManagementService insulinManagementService,
            PatientService patientService,
            OperationService operationService) {
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
        if(context.getPatient().hasCondition(ConditionTag.DIABETES_TYPE_1)) {
            return abstain(context, "Patient has diabetes type 1");
        }
        if(context.getPatient().isPregnant()) {
            return abstain(context, "Patient is pregnant");
        }
        // Get the latest glucose reading
        Optional<Observation> latestGlucose = getLatestGlucose(context);
        if (latestGlucose.isEmpty()) {
            return abstain(context, "No recent glucose reading found");
        }

        Observation glucose = latestGlucose.get();
        Float glucoseValue = glucose.getNumericObservationValue();

        if (glucoseValue == null) {
            return abstain(context, "Glucose value is null");
        }
        Map<String, Object> details = details(context);
        details.put(CURRENT_GLUCOSE_VALUE, glucoseValue.intValue());
        details.put(GLUCOSE_UNITS, glucose.getObservationUnits() != null ? glucose.getObservationUnits() : "mg/dL");
        // Current glucose must be ≥ 90
        if (glucoseValue < 90.0f) {
            return abstain(context, details,"Current glucose is not ≥ 90 mg/dL");
        }

        // Must NOT have active insulin infusion
        if (hasActiveInsulinInfusion(context, Duration.ofHours(24))) {
            return abstain(context, details,"Patient has active insulin infusion");
        }

        // Get case ID for infusion rate lookup
        var caseId = context.getOperation() != null ? new CaseId(context.getOperation().getCaseId()) : null;

        if (caseId == null) {
            // No caseId from context, try to find operation by patient and time
            var patient = this.patientService.getPatient(context.getPatient().getPatientId());
            Optional<Operation> operation = this.operationService.findOperationBasedOnStartTime(patient, context.getEventDate());
            caseId = operation.map(Operation::getCaseId).orElse(null);
        }

        if (caseId == null) {
            return abstain(context, details, "Unable to identify case for infusion rate lookup");
        }

        // Get all glucose readings from the operation (or last 24 hours if no operation)
        Date searchStartDate = getSearchStartDate(context);
        List<Observation> allGlucoseReadings = observationService.getObservations(
                        context.getPatient().getId(),
                        searchStartDate,
                        ObservationType.GLUCOSE);

        if (allGlucoseReadings.isEmpty()) {
            return abstain(context, details, "No glucose readings found in search window");
        }

        // Extract prior glucose values (before current reading) in chronological order (oldest first).
        // allGlucoseReadings is sorted by effectiveTime ascending from the repository query.
        List<Float> priorGlucoseValues = allGlucoseReadings.stream()
                .filter(obs -> obs.getEffectiveTime().before(glucose.getEffectiveTime()))
                .map(Observation::getNumericObservationValue)
                .filter(Objects::nonNull)
                .toList();

        // Check if there's a hypoglycemia (< 70) without a subsequent recovery (> 90)
        boolean hasUnresolvedHypoglycemia = GlucoseAnalysisHelper.hasHypoglycemiaWithoutRecovery(
                priorGlucoseValues,
                70.0f,  // hypoThreshold
                90.0f   // recoveryThreshold
        );

        if (!hasUnresolvedHypoglycemia) {
            return abstain(context, details, "No prior hypoglycemia found or already had a recovery");
        }

        // Get the recommended infusion rate from TrackedValue
        Optional<TrackedValue> infusionRate = insulinManagementService.getLatestRecommendInsulinInfusionRate(caseId);
        if (infusionRate.isEmpty()) {
            return abstain(context, details, "No recommended infusion rate found");
        }

        var recommendedRate = infusionRate.get().getTrackedValue();

        if(recommendedRate.compareTo(new BigDecimal("0.5")) < 0) {
            return abstain(context, details, "Recommended insulin rate is less than 0.5");
        }

        // Get ISC for details
        Optional<Pair<TrackedValue, TrackedValue>> iscs = insulinManagementService.getLatestAndPreviousISCs(caseId);


        details.put(CURRENT_RECOMMENDED_INFUSION_RATE, getRateFormatter().format(recommendedRate));
        iscs.ifPresent(iscPair -> details.put(CURRENT_ISC, getISCFormatter().format(iscPair.getLeft().getTrackedValue())));

        return baseBuilder(context)
                .needsAction(true)
                .details(details)
                .prompt(createPrompt(details))
                .build();
    }



    private Date getSearchStartDate(EventContext context) {
        // Try to get operation start time first
        if (context.getOperation() != null) {
            var caseId = new CaseId(context.getOperation().getCaseId());
            Optional<Operation> operation = this.operationService.getOperation(caseId);
            if (operation.isPresent() && operation.get().getStartTime() != null) {
                return operation.get().getStartTime();
            }
        }

        // Fall back to 24 hours ago if no operation
        return Date.from(context.getEvaluationInstant().minus(Duration.ofHours(24)));
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {


        String title = "Restart Insulin Infusion at ${" + CURRENT_RECOMMENDED_INFUSION_RATE + "} Units/hr";
        String description = "Blood glucose = ${" + CURRENT_GLUCOSE_VALUE + "} ${" + GLUCOSE_UNITS + "}. " +
                "For resolved hypoglycemia with glucose ≥ 90 mg/dL, consider restarting insulin infusion at ${" + CURRENT_RECOMMENDED_INFUSION_RATE + "} Units/hr.";
        String acceptText = "Will Restart Infusion";

        return EvaluationResultPromptTemplate.builder()
                .ruleIdentifier(getRuleIdentifier())
                .title(title)
                .description(description)
                .tabName("Insulin Management")
                .type(RuleType.ALERT)
                .acceptText(acceptText)
                .rejectText("Reject")
                .citations(getCitations(result))
                .build().createPrompt(result);
    }

    @Override
    public List<CitationId> getCitationDefinitions() {
        return List.of(CitationDefinition.INSULIN_INFUSION_RATE);
    }
}
