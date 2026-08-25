package com.guided.orci.engine.rule.scheduled;

import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.engine.*;
import com.guided.orci.engine.config.ParameterizedRule;
import com.guided.orci.engine.rule.GuidanceCategory;
import com.guided.orci.engine.rule.scheduled.config.NoInsulinGlucoseCheckRuleConfig;
import com.guided.orci.models.medication.MedicationCategory;
import com.guided.orci.models.observation.Observation;
import com.guided.orci.models.observation.ObservationType;
import com.guided.orci.models.patient.ConditionTag;
import com.guided.orci.repository.ObservationRepository;
import com.guided.orci.service.CitationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@RuleDefinition(
        id = NoInsulinGlucoseCheckScheduledRule.ID,
        description = "Alerts if a diabetic patient who has not received intraop insulin has not had glucose checked in the past 2 hours",
        trigger = RuleTrigger.SCHEDULED,
        type = RuleType.ALERT,
        guidanceCategory = GuidanceCategory.MONITORING
)
@Component
public class NoInsulinGlucoseCheckScheduledRule extends ScheduledRule
        implements ParameterizedRule<NoInsulinGlucoseCheckRuleConfig> {

    public static final String ID = "a-no-insulin-glucose-check";

    public static final String HAS_DIABETES = "HAS_DIABETES";
    public static final String OPERATION_START_DATE = "OPERATION_START_DATE";
    public static final String LATEST_GLUCOSE_TEST_DATE = "GLUCOSE_TEST_DATE";
    public static final String GLUCOSE_LOOKBACK_HOURS = "GLUCOSE_LOOKBACK_HOURS";

    static final Duration GLUCOSE_LOOKBACK = Duration.ofHours(2);

    private final ObservationRepository observationRepository;

    @Autowired
    public NoInsulinGlucoseCheckScheduledRule(ObservationRepository observationRepository,
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
        // No feature-flag check here: ScheduledRuleEngine gates scheduling at case start, so a disabled
        // flag stops new cases. Jobs already scheduled for in-flight cases drain at case end (handleCaseStop
        // deletes them, and the case-ended branch below abstains as a backstop).
        Map<String, Object> details = details(context);
        details.put(GLUCOSE_LOOKBACK_HOURS, GLUCOSE_LOOKBACK.toHours());

        boolean hasDiabetes = context.getPatient().hasCondition(ConditionTag.DIABETES);
        details.put(HAS_DIABETES, hasDiabetes);
        if (!hasDiabetes) {
            return abstain(context, details, "patient not diabetic");
        }

        Date operationStart = context.getOperationStartTime();
        if (operationStart == null) {
            return abstain(context, details, "no operation start time");
        }
        details.put(OPERATION_START_DATE, operationStart);

        if (context.getOperation().getEndTime() != null) {
            return abstain(context, details, "case ended");
        }

        if (hasIntraopInsulinAdministration(context, operationStart)) {
            return abstain(context, details, "intraop insulin administered");
        }

        Date lookbackStart = Date.from(context.getEvaluationInstant().minus(GLUCOSE_LOOKBACK));
        Optional<Observation> glucoseObservation = this.observationRepository
                .findTopByPatientIdAndTypeAndEffectiveTimeGreaterThanEqualOrderByEffectiveTimeDesc(
                        context.getPatient().getId(), ObservationType.GLUCOSE, lookbackStart);
        if (glucoseObservation.isPresent()) {
            details.put(LATEST_GLUCOSE_TEST_DATE, glucoseObservation.get().getEffectiveTime());
            return abstain(context, details, "glucose checked");
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
                .description("Patient has a diagnosis of diabetes and has not had glucose checked in the past 2 hours. Diabetic patients should have glucose checked at least every 2 hours.")
                .acceptText("Will Check Glucose")
                .rejectText("Reject")
                .rejectReasons(List.of(RejectionReasonOption.simple(RejectionReason.GLUCOSE_CHECK_ALREADY_DOCUMENTED)))
                .citations(getCitations(result))
                .build().createPrompt(result);
    }

    private boolean hasIntraopInsulinAdministration(TimerContext context, Date operationStart) {
        Date evaluationTime = context.getEvaluationTime();

        boolean hasIntraopBolus = context.getPatient().getBolusMedicationAdministrations().stream()
                .anyMatch(bolus -> bolus.hasMedicationCategory(MedicationCategory.INSULIN)
                        && bolus.isAdministeredBetween(operationStart, evaluationTime));
        if (hasIntraopBolus) {
            return true;
        }

        return context.getPatient().getInfusionMedicationAdministrations().stream()
                .anyMatch(infusion -> infusion.hasMedicationCategory(MedicationCategory.INSULIN)
                        && infusion.hasDocumentedActivityBetween(operationStart, evaluationTime));
    }
}
