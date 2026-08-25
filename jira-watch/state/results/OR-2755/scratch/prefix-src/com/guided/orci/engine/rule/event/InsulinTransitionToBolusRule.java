package com.guided.orci.engine.rule.event;

import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.engine.*;
import com.guided.orci.engine.rule.GuidanceCategory;
import com.guided.orci.models.medication.MedicationCategory;
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
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;

@Slf4j
@RuleDefinition(
        id = InsulinTransitionToBolusRule.ID,
        description = "Alert to consider transitioning to insulin bolus when infusion rate < 0.5 Units/hr",
        trigger = RuleTrigger.NOTIFICATION,
        type = RuleType.ALERT,
        guidanceCategory = GuidanceCategory.MONITORING
)
@Component
public class InsulinTransitionToBolusRule extends GlucoseEventBasedRule {

    public static final String ID = "a-insulin-transition-to-bolus";

    public static final String CURRENT_RECOMMENDED_INFUSION_RATE = "CURRENT_RECOMMENDED_INFUSION_RATE";
    private final InsulinManagementService insulinManagementService;

    public InsulinTransitionToBolusRule(
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
        Map<String, Object> details = details(context);

        if(context.getPatient().hasCondition(ConditionTag.DIABETES_TYPE_1)) {
            return abstain(context, details, "Patient has diabetes type I");
        }

        // Get the latest glucose reading
        Optional<Observation> latestGlucose = getLatestGlucose(context);
        if (latestGlucose.isEmpty()) {
            return abstain(context, details, "No recent glucose reading found");
        }


        Observation glucose = latestGlucose.get();
        Float glucoseValue = glucose.getNumericObservationValue();

        if (glucoseValue == null) {
            return abstain(context, details, "Glucose value is null");
        }
        details.put(CURRENT_GLUCOSE_VALUE, glucoseValue.intValue());
        details.put(GLUCOSE_UNITS, glucose.getObservationUnits() != null ? glucose.getObservationUnits() : "mg/dL");

        // Exclusion: Do not fire if glucose < 90 mg/dL (hypoglycemia protocol active)
        if (glucoseValue < 90.0f) {
            return abstain(context, details, "Glucose < 90 mg/dL");
        }

        // Check for active insulin infusion
        if (!hasActiveInsulinInfusion(context, Duration.ofHours(24))) {
            return abstain(context, details, "Patient not on insulin infusion");
        }

        var operation = getOperation(context);
        if (operation.isEmpty()) {
            return abstain(context, "No operation identified");
        }
        var caseId = operation.get().getCaseId();


        // Get recommended infusion rate
        Optional<TrackedValue> infusionRate = insulinManagementService.getLatestRecommendInsulinInfusionRate(caseId);
        if (infusionRate.isEmpty()) {
            return abstain(context, details, "No recommended infusion rate found");
        }

        var recommendedInfusionRate = infusionRate.get().getTrackedValue();


        details.put(CURRENT_RECOMMENDED_INFUSION_RATE, getRateFormatter().format(recommendedInfusionRate));

        // Main trigger: Alert if calculated rate < 0.5 Units/hr
        if (recommendedInfusionRate.compareTo(new BigDecimal("0.5")) >= 0) {
            return abstain(context, details, "Recommended infusion rate >= 0.5 Units/hr");
        }

        return baseBuilder(context)
                .needsAction(true)
                .details(details)
                .prompt(createPrompt(details))
                .build();
    }


    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {

        String title = "Consider Transition to Insulin Boluses";
        String description = "Recommended insulin infusion rate = ${" + CURRENT_RECOMMENDED_INFUSION_RATE + "} Units/hr based on most recent glucose = ${" + CURRENT_GLUCOSE_VALUE + "} ${" + GLUCOSE_UNITS + "}.<br/><br/>" +
                "Consider transitioning to insulin boluses, as insulin infusion pump cannot deliver rates < 0.5 Units/hr.";
        String acceptText = "Will Transition to Boluses";

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
        return List.of(CitationDefinition.INSULIN_TRANSITION_TO_BOLUS);
    }


}
