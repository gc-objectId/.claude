package com.guided.orci.engine.rule.applaunch;

import com.guided.orci.dto.PatientContext;
import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.dto.rule.context.ContextInfusionMedicationAdministration;
import com.guided.orci.dto.rule.context.ContextMedicationAdministration;
import com.guided.orci.engine.*;
import com.guided.orci.engine.rule.GuidanceCategory;
import com.guided.orci.models.medication.*;
import com.guided.orci.models.observation.Observation;
import com.guided.orci.models.observation.ObservationType;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.repository.ObservationRepository;
import com.guided.orci.service.CitationService;
import com.guided.orci.service.RuleMemoryService;
import com.guided.orci.types.wrappers.CitationId;
import com.guided.orci.utils.DateUtils;
import lombok.extern.slf4j.Slf4j;
import org.apache.el.lang.EvaluationContext;
import org.jetbrains.annotations.Nullable;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * See also: PostInsulinGlucoseCheckScheduledRule
 * This rule is the app launch variant
 */
@RuleDefinition(
        id = PostInsulinGlucoseCheckAppLaunchRule.ID,
        description = "Alerts if patient has not had glucose checked in a timely manner after being given insulin",
        trigger = RuleTrigger.LAUNCH,
        type = RuleType.ALERT,
        guidanceCategory = GuidanceCategory.MONITORING
)
@Slf4j
@Component
public class PostInsulinGlucoseCheckAppLaunchRule extends AppLaunchRule {
    public static final String ID = "a-insulin-glucose-check-app-launch";
    public static final String INSULIN_ADMINISTRATION_DATE = "INSULIN_ADMINISTRATION_DATE";
    public static final String LATEST_GLUCOSE_TEST_DATE = "GLUCOSE_TEST_DATE";
    public static final String ROUTE_QUALIFIER = "ROUTE_QUALIFIER";
    public static final String STOPPED_DATE = "STOPPED_DATE";

    private final ObservationRepository observationRepository;

    public PostInsulinGlucoseCheckAppLaunchRule(CitationService citationService,
                                                RuleMemoryService ruleMemoryService,
                                                ObservationRepository observationRepository) {
        super(citationService, ruleMemoryService);
        this.observationRepository = observationRepository;
    }

    /**
     * Returns true if the provided med admin is an intraop administration and an hour or older
     *
     * @param context
     * @param medAdmin
     * @return true if the provided med admin is an intraop administration and an hour or older
     */
    private static boolean isIntraopAndOld(PatientContext context, IMedicationAdministration medAdmin) {
        var latestDate = medAdmin.getLatestEventDate();
        if (latestDate == null) {
            return false;
        }
        Duration timeSinceInfusionActivity = Duration.between(latestDate.toInstant(), context.getEvaluationInstant());
        return (context.getSafeOperationStartDate().before(latestDate) || context.getSafeOperationStartDate().equals(latestDate)) && timeSinceInfusionActivity.compareTo(Duration.ofHours(1)) >= 0;

    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }

    @Override
    protected EvaluationResult evaluate(PatientContext context) {
        Map<String, Object> details = details(context);

        var latestInsulinInfusion = getLatestInsulinInfusion(context);
        var latestInsulinBolus = getLatestInsulinBolus(context);
        if (latestInsulinInfusion.isEmpty() && latestInsulinBolus.isEmpty()) {
            return abstain(context, "No insulin administered that meets the criteria");
        }
        IMedicationAdministration latestInsulin;
        if (latestInsulinInfusion.isPresent()) {
            // bias towards infusion if present
            latestInsulin = latestInsulinInfusion.get();
            var stoppedDate = latestInsulinInfusion.get().getStoppedDate();
            stoppedDate.ifPresent(date -> details.put(STOPPED_DATE, DateUtils.formatAsStandardPhrase(date, true, context.getTimeZone())));
        } else {
            latestInsulin = latestInsulinBolus.get();
        }
        // we want to consider the latest event date
        Date insulinDate = latestInsulin.getLatestEventDate();
        details.put(INSULIN_ADMINISTRATION_DATE, DateUtils.formatAsStandardPhrase(insulinDate, true, context.getTimeZone()));

        details.put(ROUTE_QUALIFIER, latestInsulin.getRouteQualifier());

        List<Observation> glucoseObservations = observationRepository.findByPatientIdAndTypeAndEffectiveTimeAfterOrderByEffectiveTime(
                context.getPatient().getId(),
                ObservationType.GLUCOSE,
                insulinDate
        );

        if (!glucoseObservations.isEmpty()) {
            Date latestGlucoseDate = glucoseObservations.getLast().getEffectiveTime();
            var oneHourAgo = Date.from(context.getEvaluationTime().toInstant().minus(Duration.ofHours(1)));
            if (!latestGlucoseDate.before(oneHourAgo)) {
                details.put(LATEST_GLUCOSE_TEST_DATE, latestGlucoseDate);
                return abstain(context, "Glucose was checked at " + latestGlucoseDate);
            }
        }
        return baseBuilder(context).details(details).prompt(createPrompt(details)).needsAction(true).build();
    }

    private Optional<? extends IInfusionMedicationAdministration> getLatestInsulinInfusion(PatientContext context) {
        // get the latest insulin infusion
        return context.getPatient().getInfusionMedicationAdministrations().stream()
                .filter(medAdmin -> {
                    if (!medAdmin.hasMedicationCategory(MedicationCategory.INSULIN)) {
                        // if not insulin, disqualify
                        return false;
                    }
                    if (!isIntraopAndOld(context, medAdmin)) {
                        // if not intraop and at least one hour ago, disqualify
                        return false;
                    }
                    // infusion has extra criteria - it must be ongoing or stopped within the past hour. Otherwise, disqualify
                    boolean isOngoing = medAdmin.isOngoing(Date.from(context.getEvaluationInstant().minus(Duration.ofDays(7))), context);
                    if (!isOngoing) {
                        var stoppedDate = medAdmin.getStoppedDate();
                        if (stoppedDate.isPresent()) {
                            var timeSinceStop = Duration.between(stoppedDate.get().toInstant(), context.getEvaluationInstant());
                            // if the infusion has been stopped over an hour ago, it's disqualified
                            return timeSinceStop.compareTo(Duration.ofHours(1)) < 0;
                        }
                    }

                    return true;

                }).min(IMedicationAdministration.ORDERED_BY_LATEST_FIRST);
    }

    private Optional<? extends IBolusMedicationAdministration> getLatestInsulinBolus(PatientContext context) {
        // get the latest insulin bolus
        return context.getPatient().getBolusMedicationAdministrations().stream()
                .filter(medAdmin -> {
                    if (!medAdmin.hasMedicationCategory(MedicationCategory.INSULIN)) {
                        // if not insulin, disqualify
                        return false;
                    }
                    if (!isIntraopAndOld(context, medAdmin)) {
                        // if not intraop and at least one hour ago, disqualify
                        return false;
                    }
                    return true;

                }).min(IMedicationAdministration.ORDERED_BY_LATEST_FIRST);
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {
        return EvaluationResultPromptTemplate.builder()
                .type(PromptType.ALERT)
                .tabName("Check Glucose")
                .title("Check Glucose")
                .description(generateDescription(result))
                .acceptText("Will Check Glucose").rejectText("Reject")
                .rejectReasons(List.of(RejectionReasonOption.simple(RejectionReason.GLUCOSE_CHECK_ALREADY_DOCUMENTED)))
                .citations(getCitations(result))
                .build().createPrompt(result);

    }

    private String generateDescription(Map<String, Object> result) {
        MedicationRouteQualifier routeQualifier = (MedicationRouteQualifier) result.getOrDefault(ROUTE_QUALIFIER, MedicationRouteQualifier.BOLUS);
        return switch(routeQualifier) {
            case MedicationRouteQualifier.BOLUS ->  "Patient received insulin bolus at ${"  + INSULIN_ADMINISTRATION_DATE + "} and has not had glucose checked for more than one hour. Patients receiving insulin should have glucose checked every hour.";
            case MedicationRouteQualifier.INFUSION -> generateInfusionDescription(result);
        };
    }

    private String generateInfusionDescription(Map<String, Object> result) {
        var stoppedDate = result.get(STOPPED_DATE);
        if(stoppedDate != null) {
            return "Patient received an insulin infusion, stopped at ${" + STOPPED_DATE + "}  and has not had glucose checked for more than one hour. Patients receiving insulin should have glucose checked every hour.";
        }
        return "Patient is on an insulin infusion and has not had glucose checked for more than one hour. Patients on insulin infusions should have glucose checked every hour.";
    }

    public List<CitationId> getConditionalCitationDefinitions() {
        return List.of(CitationDefinition.INSULIN_BOLUS_GLUCOSE_CHECK, CitationDefinition.INSULIN_INFUSION_GLUCOSE_CHECK);
    }

    public List<CitationId> getMatchingCitationDefinitions(Map<String, Object> results) {
        MedicationRouteQualifier qualifier = (MedicationRouteQualifier) results.getOrDefault(ROUTE_QUALIFIER, MedicationRouteQualifier.BOLUS);

        return List.of((switch (qualifier) {
            case BOLUS -> CitationDefinition.INSULIN_BOLUS_GLUCOSE_CHECK;
            case INFUSION -> CitationDefinition.INSULIN_INFUSION_GLUCOSE_CHECK;
        }));
    }
}
