package com.guided.orci.engine.rule.scheduled;

import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.engine.*;
import com.guided.orci.engine.config.ParameterizedRule;
import com.guided.orci.engine.quartz.ScheduledRuleJob;
import com.guided.orci.engine.rule.GuidanceCategory;
import com.guided.orci.engine.rule.scheduled.config.PostInsulinDextroseCheckRuleConfig;
import com.guided.orci.models.medication.MedicationCategory;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.service.CitationService;
import com.guided.orci.types.wrappers.CitationId;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Date;
import java.util.List;
import java.util.Map;

@Slf4j
@RuleDefinition(
        id = PostInsulinDextroseCheckScheduledRule.ID,
        description = "Alerts if patient on insulin infusion does not have a documented dextrose",
        trigger = RuleTrigger.CONTINUOUS,
        type = RuleType.ALERT,
        guidanceCategory = GuidanceCategory.MONITORING
)
@Component
public class PostInsulinDextroseCheckScheduledRule extends ScheduledRule
        implements ParameterizedRule<PostInsulinDextroseCheckRuleConfig> {

    public static final String INSULIN_ADMINISTRATION_DATE = "INSULIN_ADMINISTRATION_DATE";
    public static final String ID = "a-insulin-dextrose-check";

    @Autowired
    public PostInsulinDextroseCheckScheduledRule(CitationService citationService) {
        super(citationService);
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }

    @Override
    protected EvaluationResult evaluate(TimerContext context) {
        Map<String, Object> details = details(context);

        // Get the insulin administration timestamp from job details
        Long insulinAdminDateMillis = (Long) context.getJobDetails()
                .getOrDefault(ScheduledRuleJob.MEDICATION_ADMINISTRATION_ADMIN_DATE_IN_MILLIS, null);
        if(insulinAdminDateMillis == null) {
            return abstain(context, details, "No insulin administration date found");
        }
        Date insulinAdminDate = new Date(insulinAdminDateMillis);
        details.put(INSULIN_ADMINISTRATION_DATE, insulinAdminDate);

        // Check if insulin infusion is still active
        if (!hasActiveInsulinInfusion(context)) {
            return abstain(context, details, "Insulin infusion is no longer active");
        }

        // Check for active dextrose infusion within the last 7 days
        if (hasActiveDextroseInfusion(context)) {
            return abstain(context, details, "Patient has active dextrose infusion");
        }

        // Alert: insulin is active but no dextrose source documented
        return baseBuilder(context).details(details)
                .prompt(createPrompt(details))
                .needsAction(true)
                .build();
    }

    /**
     * Checks if patient has an active insulin infusion
     */
    private boolean hasActiveInsulinInfusion(TimerContext context) {
        // Check for any active insulin infusion that was started around the recorded time
        // We use a small window to account for timing differences
        // It basically should have come in 30 mins ago (when we scheduled the job) but we're looking within the prior hour
        Date oneHourAgo = Date.from(context.getEvaluationInstant().minus(Duration.ofHours(1)));

        return context.getPatient().getInfusionMedicationAdministrations().stream()
                .anyMatch(infusion -> {
                    boolean isInsulin = infusion.hasMedicationCategory(MedicationCategory.INSULIN);
                    boolean isActive = infusion.isOngoing(oneHourAgo, context); // Check if not stopped/paused after cutoff
                    return isInsulin && isActive;
                });
    }

    /**
     * Checks if patient has an active dextrose infusion
     */
    private boolean hasActiveDextroseInfusion(TimerContext context) {
        // use seven days in case dextrose was given awhile ago
        Date sevenDaysAgo = Date.from(context.getEvaluationInstant().minus(Duration.ofDays(7)));

        return context.getPatient().getInfusionMedicationAdministrations().stream()
                .anyMatch(infusion -> {
                    boolean isDextrose = infusion.hasMedicationCategory(MedicationCategory.DEXTROSE);
                    boolean isActive = infusion.isOngoing(sevenDaysAgo, context); // Check if currently active
                    return isDextrose && isActive;
                });
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {
        return EvaluationResultPromptTemplate.builder()
                .type(PromptType.ALERT)
                .tabName("Administer Dextrose")
                .title("Administer Dextrose")
                .description("Patient is receiving insulin infusion. Patients on insulin infusion should also have a source of dextrose (e.g., D5W, D10W, D20W infusion).")
                .acceptText("Will Administer Dextrose")
                .rejectText("Reject")
                .rejectReasons(List.of(
                        RejectionReasonOption.simple(RejectionReason.MEDICATION_GIVEN),
                        RejectionReasonOption.simple(RejectionReason.PATIENT_NOT_ON_INSULIN)
                ))
                .citations(getCitations(result))
                .build()
                .createPrompt(result);
    }

    @Override
    public List<CitationId> getCitationDefinitions() {
        return List.of(CitationDefinition.INSULIN_DEXTROSE_CHECK);
    }
}
