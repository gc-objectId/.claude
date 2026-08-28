package com.guided.orci.engine.rule.event;

import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.engine.*;
import com.guided.orci.engine.rule.GuidanceCategory;
import com.guided.orci.integration.diabetes.ISCState;
import com.guided.orci.models.observation.Observation;
import com.guided.orci.models.observation.ObservationType;
import com.guided.orci.models.operation.EventCategory;
import com.guided.orci.models.patient.ConditionTag;
import com.guided.orci.models.patient.Operation;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.models.trackedValue.TrackedValue;
import com.guided.orci.service.CitationService;
import com.guided.orci.service.ObservationService;
import com.guided.orci.service.OperationService;
import com.guided.orci.service.PatientService;
import com.guided.orci.service.rules.diabetes.DefaultISCState;
import com.guided.orci.service.rules.diabetes.InsulinManagementService;
import com.guided.orci.types.wrappers.CitationId;
import com.guided.orci.units.Units;
import com.guided.orci.units.formatting.NumberFormatters;
import com.guided.orci.utils.TimebaseProvider;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.tuple.Pair;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.*;

import static com.guided.orci.service.rules.diabetes.InsulinManagementService.ISC_STATE;

@Slf4j
@RuleDefinition(
        id = AdjustInsulinInfusionRateRule.ID,
        description = "Alert for insulin infusion rate changes based on ISC and glucose",
        trigger = RuleTrigger.NOTIFICATION,
        type = RuleType.ALERT,
        guidanceCategory = GuidanceCategory.MONITORING
)
@Component
public class AdjustInsulinInfusionRateRule extends GlucoseEventBasedRule {

    public static final String ID = "a-adjust-insulin-infusion-rate";


    public static final String CURRENT_ISC = "CURRENT_ISC";
    public static final String PREVIOUS_ISC = "PREVIOUS_ISC";
    public static final String INITIAL_ISC = "INITIAL_ISC";
    public static final String CURRENT_RECOMMENDED_INFUSION_RATE = "CURRENT_RECOMMENDED_INFUSION_RATE";
    public static final String FORMATTED_CURRENT_RECOMMENDED_INFUSION_RATE = "FORMATTED_CURRENT_RECOMMENDED_INFUSION_RATE";

    public static final String CURRENT_INSULIN_INFUSION_RATE = "CURRENT_INSULIN_INFUSION_RATE";
    public static final String HAS_DIABETES_TYPE_I = "HAS_DIABETES_TYPE_I";

    public static final String RATE_DIFFERENCE = "RATE_DIFFERENCE";

    public static final BigDecimal LOW_RATE_THRESHOLD = new BigDecimal("0.5");
    public static final String IS_BELOW_LOW_RATE_THRESHOLD = "IS_BELOW_LOW_RATE_THRESHOLD";
    public static final String EXPANDED_CALCULATION = "EXPANDED_CALCULATION";

    private final InsulinManagementService insulinManagementService;

    public AdjustInsulinInfusionRateRule(
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

        // Do not fire if glucose < 70 mg/dL (hypoglycemia range)
        if (glucoseValue < 70.0f) {
            return abstain(context, "Glucose < 70 mg/dL");
        }

        // Check for active insulin infusion
        if (!hasActiveInsulinInfusion(context, Duration.ofHours(24))) {
            return abstain(context, "Patient not on insulin infusion");
        }


        var operation = getOperation(context);
        if (operation.isEmpty()) {
            return abstain(context, "No operation identified");
        }
        var caseId = operation.get().getCaseId();

        var currentRate = getLatestInsulinInfusionRate(context);
        if (currentRate.isEmpty()) {
            return abstain(context, "No current insulin infusion rate found");
        }
        Map<String, Object> details = details(context);
        var rateFormat = getRateFormatter();
        var iscFormat = getISCFormatter();
        details.put(CURRENT_INSULIN_INFUSION_RATE, currentRate.get().toDisplayString(rateFormat));

        var iscs = insulinManagementService.getLatestAndPreviousISCs(caseId);
        if (iscs.isEmpty()) {
            return abstain(context, "No ISCs found");
        }
        details.put(CURRENT_ISC, iscFormat.format(iscs.get().getLeft().getTrackedValue()));
        if (iscs.get().getRight() != null && iscs.get().getRight().getTrackedValue() != null) {
            details.put(PREVIOUS_ISC, iscFormat.format(iscs.get().getRight().getTrackedValue()));
        }
        var initialISC = insulinManagementService.getInitialISC(caseId);
        initialISC.ifPresent(trackedValue -> details.put(INITIAL_ISC, iscFormat.format(trackedValue.getTrackedValue())));


        var infusionRate = insulinManagementService.getLatestRecommendInsulinInfusionRate(caseId);
        if (infusionRate.isEmpty()) {
            return abstain(context, details, "No recommended infusion rate found");
        }

        var newInfusionRate = infusionRate.get().getTrackedValue();

        details.put(CURRENT_RECOMMENDED_INFUSION_RATE, newInfusionRate);

        // Calculate rate difference
        BigDecimal rateDifference = newInfusionRate.subtract(currentRate.get().rateAmount()).abs();
        details.put(RATE_DIFFERENCE, rateFormat.format(rateDifference));
        // Check if rate difference exceeds threshold
        if (rateDifference.compareTo(new BigDecimal("0.1")) <= 0) {
            return abstain(context, details, "Rate difference does not exceed 0.1 units/hr threshold");
        }

        var isBelowLowRateThreshold = newInfusionRate.compareTo(LOW_RATE_THRESHOLD) < 0;
        var hasDiabetesTypeI = context.getPatient().hasCondition(ConditionTag.DIABETES_TYPE_1);
        details.put(IS_BELOW_LOW_RATE_THRESHOLD, isBelowLowRateThreshold);
        details.put(HAS_DIABETES_TYPE_I, hasDiabetesTypeI);
        if (isBelowLowRateThreshold) {
            if (currentRate.get().rateAmount().compareTo(LOW_RATE_THRESHOLD) == 0) {
                return abstain(context, details, "Recommended rate is < 0.5 but patient already has an infusion of 0.5 units/hr");
            } else if (!hasDiabetesTypeI) {
                return abstain(context, details, "Recommended rate is < 0.5 but patient doesn't have diabetes type I");
            }

            details.put(FORMATTED_CURRENT_RECOMMENDED_INFUSION_RATE, rateFormat.format(LOW_RATE_THRESHOLD));

        } else {
            details.put(FORMATTED_CURRENT_RECOMMENDED_INFUSION_RATE, rateFormat.format(newInfusionRate));
        }



        details.put(CURRENT_GLUCOSE_VALUE, glucoseValue.intValue());
        details.put(GLUCOSE_UNITS, glucose.getObservationUnits() != null ? glucose.getObservationUnits() : "mg/dL");
        var calculationText = generateExpandedCalculation(operation.get(), hasDiabetesTypeI, context.getEventDate(), iscs.get());
        details.put(EXPANDED_CALCULATION, calculationText);


        return baseBuilder(context)
                .needsAction(true)
                .details(details)
                .prompt(createPrompt(details))
                .build();
    }

    private String generateExpandedCalculation(Operation operation, boolean hasDiabetesType1, Date eventDate, Pair<TrackedValue, TrackedValue> iscs) {
        var iscFormat = getISCFormatter();
        BigDecimal currentISCValue = iscs.getLeft().getTrackedValue();
        BigDecimal previousISCValue = null;
        if(iscs.getRight() != null) {
             previousISCValue = iscs.getRight().getTrackedValue();
        }
        String iscExplanation = "";
        try {
            if (iscs.getLeft().getMetadata().containsKey(ISC_STATE)) {
                var iscState = insulinManagementService.decodeIscState(iscs.getLeft().getMetadata().get(ISC_STATE));
                iscExplanation = iscState.explain(previousISCValue, currentISCValue, iscFormat);
            }
        } catch(Exception e){
            log.warn("Unable to identify ISC details", e);
        }
        List<String> texts = new ArrayList<>();
        texts.add(iscExplanation);


        // The ISC is adjusted for renal function only when the eGFR reads as a number below 45. An
        // inequality such as ">90" or a result-less row carries no number, so it adjusts nothing.
        var lowEGFR = observationService.getLatestObservation(operation.getPatient(), ObservationType.EGFR)
                .map(Observation::getNumericObservationValue)
                .filter(value -> value < 45);
        boolean eGFRAdjusted = lowEGFR.isPresent();
        var eGFRFormat = NumberFormatters.formatUpToXDecimalPlaces(2);
        if (hasDiabetesType1 && eGFRAdjusted) {
            texts.add("ISC has been adjusted for Type 1 Diabetes and eGFR = " + eGFRFormat.format(lowEGFR.get()) + " < 45");
        } else if (hasDiabetesType1) {
            texts.add("ISC has been adjusted for Type 1 Diabetes");
        } else if (eGFRAdjusted) {
            texts.add("ISC has been adjusted for eGFR = " + eGFRFormat.format(lowEGFR.get()) + " < 45");
        }
        // TODO track insulin daily dose as a tracked value?
        TimebaseProvider tb = () -> eventDate;

        var insulinDailyDose = insulinManagementService.getInsulinDailyDose((tb), operation.getAdmissionDate(),operation.getPatient());
        boolean insulinExceedsThreshold = insulinManagementService.insulinDoseExceedsThreshold(operation.getPatient(), insulinDailyDose);

        if(insulinExceedsThreshold && insulinDailyDose.totalDailyDose() != null) {
            texts.add("ISC has been adjusted for standing insulin = " + insulinDailyDose.totalDailyDose().format(Units.Formats.TWO_DECIMAL_FORMAT) +  " > 1 unit/kg/day");
        }
        return "<expandable title=\"Show Calculation\">" + String.join("<br/>", texts) + "</expandable>";

    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {
        String title = "Change Insulin Infusion Rate to ${" + FORMATTED_CURRENT_RECOMMENDED_INFUSION_RATE + "} Units/hr";
        String description = "Blood glucose = ${" + CURRENT_GLUCOSE_VALUE + "} ${" + GLUCOSE_UNITS + "}. ";
        boolean hasDiabetesTypeI = (Boolean) result.getOrDefault(HAS_DIABETES_TYPE_I, false);
        boolean isBelowLowRateThreshold = (Boolean) result.getOrDefault(IS_BELOW_LOW_RATE_THRESHOLD, false);
        if( hasDiabetesTypeI && isBelowLowRateThreshold ) {
            description += "Recommended insulin infusion rate is ${" + FORMATTED_CURRENT_RECOMMENDED_INFUSION_RATE + "} Units/hr. Patient has Type I Diabetes and needs a continuous insulin source. Consider changing the insulin infusion rate to 0.5 Units/hr with a continuous source of dextrose, as insulin infusion pump cannot deliver rates < 0.5 Units/hr.";
        }  else {
            description += "Recommend changing the insulin infusion rate to ${" + FORMATTED_CURRENT_RECOMMENDED_INFUSION_RATE + "} Units/hr.";
        }

        String acceptText = "Will Change Rate";

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


