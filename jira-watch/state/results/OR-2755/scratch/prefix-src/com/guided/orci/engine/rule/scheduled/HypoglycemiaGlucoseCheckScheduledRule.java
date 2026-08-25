package com.guided.orci.engine.rule.scheduled;

import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.engine.*;
import com.guided.orci.engine.config.ParameterizedRule;
import com.guided.orci.engine.rule.GuidanceCategory;
import com.guided.orci.engine.rule.scheduled.config.HypoglycemiaGlucoseCheckRuleConfig;
import com.guided.orci.models.observation.Observation;
import com.guided.orci.models.observation.ObservationType;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.service.CitationService;
import com.guided.orci.repository.ObservationRepository;
import com.guided.orci.types.wrappers.CitationId;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@RuleDefinition(
        id = HypoglycemiaGlucoseCheckScheduledRule.ID,
        description = "Alerts if patient with hypoglycemia has not had glucose checked within 15 minutes of the last glucose test",
        trigger = RuleTrigger.SCHEDULED,
        type = RuleType.ALERT,
        guidanceCategory = GuidanceCategory.MONITORING
)
@Component
public class HypoglycemiaGlucoseCheckScheduledRule extends ScheduledRule
        implements ParameterizedRule<HypoglycemiaGlucoseCheckRuleConfig> {
    /**
     * The glucose observation date that scheduled the job
     */
    public static final String GLUCOSE_TEST_DATE = "GLUCOSE_TEST_DATE";
    public static final String GLUCOSE_VALUE = "GLUCOSE_VALUE";
    public static final String GLUCOSE_UNITS = "GLUCOSE_UNITS";

    /**
     * The latest glucose observation date that invalidates the rule
     */
    public static final String LATEST_GLUCOSE_TEST_DATE = "LATEST_GLUCOSE_TEST_DATE";
    public static final String LATEST_GLUCOSE_VALUE = "LATEST_GLUCOSE_VALUE";
    public static final String LATEST_GLUCOSE_UNITS = "LATEST_GLUCOSE_UNITS";

    public static final String GLUCOSE_THRESHOLD = "GLUCOSE_THRESHOLD";


    public static final String ID = "a-hypoglycemia-glucose-check-15min";

    private ObservationRepository observationRepository;

    @Autowired
    public HypoglycemiaGlucoseCheckScheduledRule(ObservationRepository observationRepository,
                                                 CitationService citationService) {
        super(citationService);
        this.observationRepository = observationRepository;
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }

    @Override
    protected EvaluationResult evaluate(TimerContext context) {
        Map<String, Object> details = details(context);

        // Get the glucose value and timestamp that triggered this job
        Long glucoseTimestampMillis = (Long) context.getJobDetails().getOrDefault(HypoglycemiaGlucoseCheckJob.GLUCOSE_TIMESTAMP_IN_MILLIS, null);
        if (glucoseTimestampMillis == null) {
            return abstain(context, "No glucose timestamp in job details");
        }

        Date glucoseTimestamp = new Date(glucoseTimestampMillis);
        Float glucoseValue = (Float) context.getJobDetails().get(HypoglycemiaGlucoseCheckJob.GLUCOSE_VALUE);
        String glucoseUnits = (String) context.getJobDetails().getOrDefault(HypoglycemiaGlucoseCheckJob.GLUCOSE_UNITS, "mg/dL");
        String glucoseThresholdString = (String) context.getJobDetails().getOrDefault(HypoglycemiaGlucoseCheckJob.GLUCOSE_THRESHOLD, HypoglycemiaGlucoseCheckRuleConfig.DEFAULT_GLUCOSE_THRESHOLD);
        float glucoseThreshold = Float.parseFloat(glucoseThresholdString);

        details.put(GLUCOSE_TEST_DATE, glucoseTimestamp);
        details.put(GLUCOSE_VALUE, glucoseValue);
        details.put(GLUCOSE_UNITS, glucoseUnits);
        details.put(GLUCOSE_THRESHOLD, glucoseThresholdString);
        // Check if the triggering glucose value was below threshold
        if (glucoseValue == null || glucoseValue >= glucoseThreshold) {
            return abstain(context, "Glucose value " + glucoseValue + " is not below " + glucoseThreshold + " mg/dL threshold");
        }

        // Check if a new glucose measurement has been taken since the triggering glucose reading
        Optional<Observation> latestGlucoseObservation = this.observationRepository
                .findTopByPatientIdAndTypeAndEffectiveTimeAfterOrderByEffectiveTimeDesc(
                        context.getPatient().getId(),
                        ObservationType.GLUCOSE,
                        glucoseTimestamp);

        if (latestGlucoseObservation.isPresent()) {
            // record the latest glucose that abstains the rule
            Date latestGlucoseDate = latestGlucoseObservation.get().getEffectiveTime();
            details.put(LATEST_GLUCOSE_TEST_DATE, latestGlucoseDate);
            details.put(LATEST_GLUCOSE_VALUE, latestGlucoseObservation.map(Observation::getNumericObservationValue).orElse(null));
            details.put(LATEST_GLUCOSE_UNITS, latestGlucoseObservation.map(Observation::getObservationUnits).orElse("mg/dL"));
            return abstain(context, details, "Glucose was checked at " + latestGlucoseDate);
        }

        return baseBuilder(context).details(details).prompt(createPrompt(details)).needsAction(true).build();
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {
        return EvaluationResultPromptTemplate.builder()
                .ruleIdentifier(getRuleIdentifier())
                .type(RuleType.ALERT)
                .tabName("Check Glucose")
                .title("Check Glucose")
                .description("Blood glucose = ${" + GLUCOSE_VALUE + "} ${" + GLUCOSE_UNITS + "}. For patients with glucose < ${" + GLUCOSE_THRESHOLD + "} mg/dL, glucose should be checked every 15min.")
                .acceptText("Will Check Glucose")
                .rejectText("Reject")
                .citations(getCitations(result))
                .build().createPrompt(result);
    }

    @Override
    public List<CitationId> getCitationDefinitions() {
        return List.of(CitationDefinition.HYPOGLYCEMIA_GLUCOSE_CHECK_15MIN);
    }
}
