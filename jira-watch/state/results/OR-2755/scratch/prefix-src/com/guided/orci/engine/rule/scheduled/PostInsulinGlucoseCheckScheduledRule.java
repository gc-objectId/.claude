package com.guided.orci.engine.rule.scheduled;

import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.engine.*;
import com.guided.orci.engine.config.ParameterizedRule;
import com.guided.orci.engine.quartz.ScheduledRuleJob;
import com.guided.orci.engine.rule.GuidanceCategory;
import com.guided.orci.engine.rule.scheduled.config.PostInsulinGlucoseCheckRuleConfig;
import com.guided.orci.models.medication.MedicationCategory;
import com.guided.orci.models.medication.MedicationRouteQualifier;
import com.guided.orci.models.observation.Observation;
import com.guided.orci.models.observation.ObservationType;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.repository.ObservationRepository;
import com.guided.orci.service.CitationService;
import com.guided.orci.types.wrappers.CitationId;
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
        id = PostInsulinGlucoseCheckScheduledRule.ID,
        description = "Alerts if patient has not had glucose checked in a timely manner after being given insulin",
        trigger = RuleTrigger.CONTINUOUS,
        type = RuleType.ALERT,
        guidanceCategory = GuidanceCategory.MONITORING
)
@Component
public class PostInsulinGlucoseCheckScheduledRule extends ScheduledRule
        implements ParameterizedRule<PostInsulinGlucoseCheckRuleConfig> {
    public static final String INSULIN_ADMINISTRATION_DATE = "INSULIN_ADMINISTRATION_DATE";
    public static final String LATEST_GLUCOSE_TEST_DATE = "GLUCOSE_TEST_DATE";

    public static final String ROUTE_QUALIFIER = "ROUTE_QUALIFIER";

    public static final String ID = "a-insulin-glucose-check";

    private ObservationRepository observationRepository;

    @Autowired
    public PostInsulinGlucoseCheckScheduledRule(ObservationRepository observationRepository, CitationService citationService) {
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

        Long insulinAdminDateMillis = (Long) context.getJobDetails().getOrDefault(ScheduledRuleJob.MEDICATION_ADMINISTRATION_ADMIN_DATE_IN_MILLIS, null);
        Date insulinAdminDate = new Date(insulinAdminDateMillis);
        details.put(INSULIN_ADMINISTRATION_DATE, insulinAdminDate);
        details.put(ROUTE_QUALIFIER, context.getJobDetails().getOrDefault(ROUTE_QUALIFIER, null));

        Date oneHourAgo = Date.from(context.getEvaluationInstant().minus(Duration.ofHours(1)));
        Optional<Observation> glucoseObservation = this.observationRepository.findTopByPatientIdAndTypeAndEffectiveTimeGreaterThanEqualOrderByEffectiveTimeDesc(context.getPatient().getId(), ObservationType.GLUCOSE, oneHourAgo);

        boolean hasRecentBolus = hasRecentInsulinBolus(context);
        boolean hasActiveInfusion = hasActiveInsulinInfusion(context);

        if (glucoseObservation.isPresent()) {
            Date latestGlucoseDate = glucoseObservation.get().getEffectiveTime();
            details.put(LATEST_GLUCOSE_TEST_DATE, latestGlucoseDate);
            return abstain(context, details, "glucose checked");
        }

        if (!hasActiveInfusion && !hasRecentBolus) {
            return abstain(context, details, "no recent insulin");
        }
        return baseBuilder(context).details(details).prompt(createPrompt(details)).needsAction(true).build();
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {
        return EvaluationResultPromptTemplate.builder().tabName("Check Glucose").title("Check Glucose").description(
                        "Patient is on insulin and has not had glucose checked for more than one hour. Patients receiving insulin should have glucose checked every hour.")
                .acceptText("Will Check Glucose").rejectText("Reject")
                .type(RuleType.ALERT)
                .rejectReasons(List.of(RejectionReasonOption.simple(RejectionReason.GLUCOSE_CHECK_ALREADY_DOCUMENTED)))
                .citations(getCitations(result))
                .build().createPrompt(result);

    }

    public List<CitationId> getConditionalCitationDefinitions() {
        return List.of(CitationDefinition.INSULIN_BOLUS_GLUCOSE_CHECK, CitationDefinition.INSULIN_INFUSION_GLUCOSE_CHECK);
    }

    public List<CitationId> getMatchingCitationDefinitions(Map<String, Object> results) {
        MedicationRouteQualifier qualifier = MedicationRouteQualifier.valueOf((String) results.getOrDefault(ROUTE_QUALIFIER, MedicationRouteQualifier.BOLUS.name()));

        return List.of((switch (qualifier) {
            case BOLUS -> CitationDefinition.INSULIN_BOLUS_GLUCOSE_CHECK;
            case INFUSION -> CitationDefinition.INSULIN_INFUSION_GLUCOSE_CHECK;
        }));
    }

    /**
     * Returns true if the infusion has recent activity (past one hour) or is ongoing (by looking at past 24 hours worth of activity)
     */
    protected boolean hasActiveInsulinInfusion(TimerContext context) {
        Date twentyFourHoursAgo = Date.from(context.getEvaluationInstant().minus(Duration.ofHours(24)));

        Date oneHourAgo = Date.from(context.getEvaluationInstant().minus(Duration.ofHours(1)));

        return context.getPatient().getInfusionMedicationAdministrations().stream()
                .anyMatch(infusion -> {
                    boolean isInsulin = infusion.hasMedicationCategory(MedicationCategory.INSULIN);
                    boolean isActive = infusion.isOngoing(twentyFourHoursAgo, context);
                    boolean hasRecentActivity = infusion.hasDocumentedActivityBetween(oneHourAgo, context.getEvaluationTime());
                    return isInsulin && (isActive || hasRecentActivity);
                });
    }

    /**
     * Has an insulin bolus within the past hour
     */
    protected boolean hasRecentInsulinBolus(TimerContext context) {
        Date oneHourAgo = Date.from(context.getEvaluationInstant().minus(Duration.ofHours(1)));

        return context.getPatient().getBolusMedicationAdministrations().stream()
                .anyMatch(bolus -> {
                    boolean isInsulin = bolus.hasMedicationCategory(MedicationCategory.INSULIN);
                    boolean isRecent = bolus.isAdministeredBetween(oneHourAgo, context.getEvaluationTime());
                    return isInsulin && isRecent;
                });
    }
}
