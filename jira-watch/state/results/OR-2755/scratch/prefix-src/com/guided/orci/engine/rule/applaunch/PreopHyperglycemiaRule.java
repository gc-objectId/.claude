package com.guided.orci.engine.rule.applaunch;

import com.guided.orci.dto.PatientContext;
import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.engine.*;
import com.guided.orci.engine.RuleType;
import com.guided.orci.engine.rule.GuidanceCategory;
import com.guided.orci.models.medication.IMedicationAdministration;
import com.guided.orci.models.medication.MedicationCategory;
import com.guided.orci.models.observation.Observation;
import com.guided.orci.models.observation.ObservationType;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.repository.ObservationRepository;
import com.guided.orci.service.CitationService;
import com.guided.orci.service.RuleMemoryService;
import com.guided.orci.types.wrappers.CitationId;
import com.guided.orci.utils.DateUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Component
@RuleDefinition(
        id = PreopHyperglycemiaRule.ID,
        description = "Alerts when pre-op glucose measurement is >= 180 mg/dL at case start.",
        trigger = RuleTrigger.LAUNCH,
        type = RuleType.ALERT,
        guidanceCategory = GuidanceCategory.MONITORING
)
public class PreopHyperglycemiaRule extends AppLaunchRule {
    public static final String ID = "a-preop-hyperglycemia";
    public static final String GLUCOSE_VALUE = "GLUCOSE_VALUE";
    public static final String GLUCOSE_UNITS = "GLUCOSE_UNITS";
    public static final String GLUCOSE_TIMESTAMP = "GLUCOSE_TIMESTAMP";
    private static final Duration MEASUREMENT_LOOKBACK = Duration.ofHours(4);
    private static final int ALERT_THRESHOLD = 180;

    private final ObservationRepository observationRepository;

    @Autowired
    public PreopHyperglycemiaRule(CitationService citationService,
                                  RuleMemoryService ruleMemoryService,
                                  ObservationRepository observationRepository) {
        super(citationService, ruleMemoryService);
        this.observationRepository = observationRepository;
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }

    @Override
    protected EvaluationResult evaluate(PatientContext context) {
        Map<String, Object> details = details(context);

        Instant caseStartInstant = context.getSafeOperationStartInstant();
        Instant lowerBound = caseStartInstant.minus(MEASUREMENT_LOOKBACK);

        Optional<Observation> latestGlucoseOpt =
                observationRepository.findTopByPatientIdAndTypeAndEffectiveTimeAfterOrderByEffectiveTimeDescCreatedDateDesc(
                        context.getPatient().getId(), ObservationType.GLUCOSE, Date.from(lowerBound));

        if (latestGlucoseOpt.isEmpty()) {
            return abstain(context, details, "No qualifying glucose measurement within 4 hours.");
        }

        Observation latestGlucose = latestGlucoseOpt.get();

        Instant glucoseInstant = latestGlucose.getEffectiveTime().toInstant();
        if (glucoseInstant.isAfter(caseStartInstant)) {
            return abstain(context, details, "Glucose measurement occurs after case start.");
        }

        Float glucoseValue = latestGlucose.getNumericObservationValue();
        if (glucoseValue == null) {
            return abstain(context, details, "Glucose measurement is non-numeric.");
        }
        details.put(GLUCOSE_VALUE, glucoseValue.intValue());
        String glucoseUnits = Optional.ofNullable(latestGlucose.getObservationUnits()).orElse("mg/dL");
        details.put(GLUCOSE_UNITS, glucoseUnits);
        details.put(GLUCOSE_TIMESTAMP, DateUtils.formatAsStandardPhrase(latestGlucose.getEffectiveTime(), true, context.getTimeZone()));

        if (!"mg/dL".equalsIgnoreCase(glucoseUnits)) {
            return abstain(context, details, "Glucose measurement not reported in mg/dL.");
        }

        if (glucoseValue <= ALERT_THRESHOLD) {
            return abstain(context, details, "Glucose below alert threshold.");
        }

        if (hasInsulinSinceMeasurement(context, glucoseInstant, caseStartInstant)) {
            return abstain(context, details, "Insulin already administered since glucose measurement.");
        }

        return baseBuilder(context)
                .needsAction(true)
                .details(details)
                .prompt(createPrompt(details))
                .build();
    }

    private boolean hasInsulinSinceMeasurement(PatientContext context, Instant measurementInstant, Instant caseStartInstant) {
        Date measurementDate = Date.from(measurementInstant);
        Date caseStartDate = Date.from(caseStartInstant);
        Date sevenDaysAgo = Date.from(context.getSafeOperationStartDate().toInstant().minus(Duration.ofDays(7)));

        for (IMedicationAdministration administration : context.getPatient().getMedicationAdministrations()) {
            // skip if not insulin or is from before 7 days ago
            if (!administration.hasMedicationCategory(MedicationCategory.INSULIN) || administration.getLatestEventDate().before(sevenDaysAgo)) {
                continue;
            }
            if (administration.isAdministeredBetween(measurementDate, caseStartDate)) {
                return true;
            }
        }
        return false;
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> details) {
        return EvaluationResultPromptTemplate.builder()
                .ruleIdentifier(getRuleIdentifier())
                .title("Treat Glucose > 180 mg/dL")
                .description("Blood glucose = ${" + GLUCOSE_VALUE + "} ${" + GLUCOSE_UNITS + "}. For glucose > 180 mg/dL, consider insulin.")
                .tabName("Hyperglycemia")
                .type(RuleType.ALERT)
                .acceptText("Will Treat")
                .rejectText("Reject")
                .rejectReasons(List.of(
                        RejectionReasonOption.simple(RejectionReason.MEDICATION_GIVEN, "Already Treated")))
                .citations(getCitations(details))
                .build()
                .createPrompt(details);
    }

    @Override
    public List<CitationId> getCitationDefinitions() {
        return List.of(CitationDefinition.PREOP_HYPERGLYCEMIA);
    }
}
