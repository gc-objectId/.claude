package com.guided.orci.engine.rule.medication.selection;

import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.engine.EvaluationResultPrompt;
import com.guided.orci.engine.EvaluationResultPromptTemplate;
import com.guided.orci.engine.MedicationSelectionContext;
import com.guided.orci.engine.MedicationSelectionRule;
import com.guided.orci.engine.RuleDefinition;
import com.guided.orci.engine.RuleTrigger;
import com.guided.orci.engine.RuleType;
import com.guided.orci.engine.rule.GuidanceCategory;
import com.guided.orci.engine.rule.RuleCategory;
import com.guided.orci.engine.rule.compliance.MedicationAdministeredComplianceEvaluator;
import com.guided.orci.models.medication.MedicationCategory;
import com.guided.orci.models.observation.Observation;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.service.CitationService;
import com.guided.orci.service.MrsaStatusService;
import com.guided.orci.service.RuleMemoryService;
import com.guided.orci.types.wrappers.CitationId;
import com.guided.orci.utils.DateUtils;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@RuleDefinition(
        id = MrsaInfectionStatusWarningRule.ID,
        description = "Warns to consider vancomycin for antibiotics when MRSA appears recently positive with no subsequent negative result",
        trigger = RuleTrigger.SELECTION,
        type = RuleType.WARNING,
        guidanceCategory = GuidanceCategory.DELAYED_MISSED_OR_WRONG_ANTIBIOTIC,
        categories = RuleCategory.COMPLIANCE_MEDICATION_ADMINISTERED
)
public class MrsaInfectionStatusWarningRule extends MedicationSelectionRule {
    public static final String ID = "w-mrsa-infection-status";

    public static final String MRSA_POSITIVE_DATE = "MRSA_POSITIVE_DATE";
    public static final String MRSA_POSITIVE_OBSERVATION_ID = "MRSA_POSITIVE_OBSERVATION_ID";
    public static final String MRSA_LATER_NEGATIVE_OBSERVATION_IDS = "MRSA_LATER_NEGATIVE_OBSERVATION_IDS";
    private static final Duration VANCOMYCIN_RECENT_ADMIN_WINDOW = Duration.ofHours(1);

    private final MrsaStatusService mrsaStatusService;
    private final RuleMemoryService ruleMemoryService;

    public MrsaInfectionStatusWarningRule(MrsaStatusService mrsaStatusService,
                                          RuleMemoryService ruleMemoryService,
                                          CitationService citationService) {
        super(citationService);
        this.mrsaStatusService = mrsaStatusService;
        this.ruleMemoryService = ruleMemoryService;
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }

    @Override
    protected EvaluationResult evaluate(MedicationSelectionContext context) {
        var details = details(context);

        if (!context.hasMedicationCategory(MedicationCategory.ANTIBIOTIC)) {
            return abstain(context, details, "selected medication is not " + MedicationCategory.ANTIBIOTIC);
        }

        if (ruleMemoryService.isRuleLockedOut(context, this)) {
            return abstain(context, details, "Already fired for this case.");
        }

        if (context.hasPrimaryMedicationCategory(MedicationCategory.VANCOMYCIN)) {
            return abstain(context, details, "selected medication is " + MedicationCategory.VANCOMYCIN);
        }

        if (context.getPatient().isAllergicTo(MedicationCategory.VANCOMYCIN)) {
            return abstain(context, details, "patient has vancomycin allergy");
        }

        if (hasOngoingVancomycinInfusion(context)) {
            return abstain(context, details, "patient has ongoing vancomycin infusion");
        }

        Date vancomycinLookback = Date.from(context.getEvaluationInstant().minus(VANCOMYCIN_RECENT_ADMIN_WINDOW));
        if (hasRecentVancomycinAdministration(context, vancomycinLookback)) {
            return abstain(context, details, "patient has vancomycin administration in the last hour");
        }

        MrsaStatusService.MrsaStatus mrsaStatus = mrsaStatusService.statusAsOf(
                context.getPatient().getId(), context.getEvaluationInstant());

        if (mrsaStatus.results().isEmpty()) {
            return abstain(context, details, "no MRSA observations in the last 7 days");
        }

        if (mrsaStatus.latestPositive().isEmpty()) {
            return abstain(context, details, "no positive MRSA result in the last 7 days");
        }

        Observation latestPositiveObservation = mrsaStatus.latestPositive().get();
        Date latestPositiveEffectiveTime = latestPositiveObservation.getEffectiveTime();
        details.put(MRSA_POSITIVE_OBSERVATION_ID, latestPositiveObservation.getId());

        List<UUID> laterNegativeIds = mrsaStatus.laterNegatives().stream()
                .map(Observation::getId)
                .toList();

        if (!laterNegativeIds.isEmpty()) {
            details.put(MRSA_LATER_NEGATIVE_OBSERVATION_IDS, laterNegativeIds);
            return abstain(context, details, "subsequent negative MRSA result found");
        }

        details.put(MRSA_POSITIVE_DATE, DateUtils.formatMonthDayYear(latestPositiveEffectiveTime, context.getTimeZone()));
        details.put(MedicationAdministeredComplianceEvaluator.TARGET_MEDICATION_CATEGORY_KEY, MedicationCategory.VANCOMYCIN);
        ruleMemoryService.setRuleLockoutForDurationOfOperation(context, this);

        return baseBuilder(context)
                .needsAction(true)
                .details(details)
                .prompt(createPrompt(details))
                .build();
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {
        return EvaluationResultPromptTemplate.builder()
                .ruleIdentifier(getRuleIdentifier())
                .type(RuleType.WARNING)
                .warningText("MRSA positive on ${" + MRSA_POSITIVE_DATE + "}. Consider adding Vancomycin.")
                .citations(getCitations(result))
                .build()
                .createPrompt(result);
    }

    @Override
    public List<CitationId> getCitationDefinitions() {
        return List.of(CitationDefinition.MRSA_INFECTION_STATUS);
    }

    private boolean hasOngoingVancomycinInfusion(MedicationSelectionContext context) {
        return context.getPatient().getInfusionMedicationAdministrations().stream()
                .anyMatch(administration ->
                        administration.isPrimaryMedicationCategory(MedicationCategory.VANCOMYCIN)
                        && administration.isOngoing(null, context));
    }

    private boolean hasRecentVancomycinAdministration(MedicationSelectionContext context, Date since) {
        boolean hasRecentBolus = context.getPatient().getBolusMedicationAdministrations().stream()
                .anyMatch(administration ->
                        administration.isPrimaryMedicationCategory(MedicationCategory.VANCOMYCIN)
                        && administration.isAdministeredAfter(since, context));

        boolean hasRecentInfusionActivity = context.getPatient().getInfusionMedicationAdministrations().stream()
                .anyMatch(administration ->
                        administration.isPrimaryMedicationCategory(MedicationCategory.VANCOMYCIN)
                        && administration.hasCalculatedActivityBetween(since, context.getEvaluationTime()));

        return hasRecentBolus || hasRecentInfusionActivity;
    }
}
