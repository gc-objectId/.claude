package com.guided.orci.engine.rule.event;

import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.dto.rule.context.ContextMedicationAdministration;
import com.guided.orci.engine.*;
import com.guided.orci.engine.rule.GuidanceCategory;
import com.guided.orci.models.medication.IMedicationAdministration;
import com.guided.orci.models.medication.MedicationCategory;
import com.guided.orci.models.observation.ObservationType;
import com.guided.orci.models.operation.EventCategory;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.service.AntibioticLookbackService;
import com.guided.orci.service.CitationService;
import com.guided.orci.service.ObservationService;
import com.guided.orci.service.RuleMemoryService;
import com.guided.orci.types.wrappers.CitationId;
import com.guided.orci.units.formatting.NumberFormatters;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Rule that triggers an antibiotic redose reminder when cumulative Estimated Blood Loss (EBL)
 * exceeds threshold(s), indicating the need to redose antibiotics due to excessive blood loss.
 *
 * <p>Threshold logic:
 * <ul>
 *   <li>Patient weight >= 40kg: EBL threshold = 1500mL</li>
 *   <li>Patient weight < 40kg: EBL threshold = 25 mL/kg * patient_weight</li>
 * </ul>
 *
 * <p>The rule can fire multiple times at each threshold multiple (e.g., 1500mL, 3000mL, 4500mL...)
 * but only fires once per threshold multiple crossed.
 *
 * <p>Exclusion: Will not fire if no antibiotic has been administered since operation start.
 *
 * <p>Renal warning: If patient received aminoglycoside or vancomycin and has CrCl < 50,
 * a special warning message is displayed about consulting pharmacy.
 */
@Slf4j
@RuleDefinition(
        id = EstimatedBloodLossAntibioticRedoseReminderRule.ID,
        description = "Alerts to re-dose antibiotics when cumulative EBL exceeds threshold",
        trigger = RuleTrigger.NOTIFICATION,
        type = RuleType.ALERT,
        guidanceCategory = GuidanceCategory.DELAYED_MISSED_OR_WRONG_ANTIBIOTIC
)
@Component
public class EstimatedBloodLossAntibioticRedoseReminderRule extends EventBasedRule {
    public static final String ID = "a-ebl-antibiotic-redose-reminder";

    // Detail keys
    public static final String FORMATTED_CUMULATIVE_EBL = "FORMATTED_CUMULATIVE_EBL";
    public static final String FORMATED_EBL_THRESHOLD = "FORMATED_EBL_THRESHOLD";
    public static final String CUMULATIVE_EBL = "CUMULATIVE_EBL";
    public static final String EBL_THRESHOLD = "EBL_THRESHOLD";
    public static final String THRESHOLD_MULTIPLE = "THRESHOLD_MULTIPLE";
    public static final String PATIENT_WEIGHT_KG = "PATIENT_WEIGHT_KG";
    public static final String SHOW_RENAL_WARNING = "SHOW_RENAL_WARNING";
    public static final String CRCL = "CRCL";

    // Threshold constants
    private static final float ADULT_WEIGHT_THRESHOLD_KG = 40f;
    private static final float ADULT_EBL_THRESHOLD_ML = 1500f;
    private static final float PEDIATRIC_EBL_FACTOR_ML_PER_KG = 25f;
    private static final double RENAL_CRCL_THRESHOLD = 50.0;

    // Aminoglycosides that trigger renal warning
    private static final Set<String> AMINOGLYCOSIDES = Set.of(
            MedicationCategory.GENTAMICIN,
            MedicationCategory.TOBRAMYCIN,
            MedicationCategory.AMIKACIN
    );

    private final ObservationService observationService;
    private final RuleMemoryService ruleMemoryService;
    private final AntibioticLookbackService antibioticLookbackService;

    public EstimatedBloodLossAntibioticRedoseReminderRule(
            CitationService citationService,
            ObservationService observationService,
            RuleMemoryService ruleMemoryService, AntibioticLookbackService antibioticLookbackService) {
        super(citationService);
        this.observationService = observationService;
        this.ruleMemoryService = ruleMemoryService;
        this.antibioticLookbackService = antibioticLookbackService;
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }

    @Override
    public List<EventCategory> getApplicableEventCategories() {
        return List.of(EventCategory.EBL_UPDATED);
    }

    @Override
    protected EvaluationResult evaluate(EventContext context) {
        var details = details(context);

        // Get patient weight
        Float weightKg = context.getPatient().getWeightKg();
        if (weightKg == null) {
            return abstain(context, details, "Patient weight unavailable");
        }
        details.put(PATIENT_WEIGHT_KG, weightKg);
        var elbFormatter = NumberFormatters.formatUpToXDecimalPlaces(2);
        // Calculate EBL threshold based on weight
        float eblThreshold = calculateEblThreshold(weightKg);
        details.put(EBL_THRESHOLD, eblThreshold);
        details.put(FORMATED_EBL_THRESHOLD, elbFormatter.format(eblThreshold));

        // Get operation start date
        Date opStart = context.getSafeOperationStartDateIncludingIntraOp();

        // Find most recent antibiotic admin since operation start
        var mostRecentAntibioticAdmin = context.getPatient().getBolusMedicationAdministrations().stream()
                .filter(admin -> {
                    if (!admin.hasMedicationCategory(MedicationCategory.ANTIBIOTIC)) {
                        return false;
                    }
                    if (!FiltersByAntibioticRoute.RECOGNIZED_ANTIBIOTIC_ROUTES.contains(admin.getRoute())) {
                        return false;
                    }
                    Duration lookbackPeriod = antibioticLookbackService.getLookbackPeriod(admin.getMedicationIdentifier());
                    Date cutoff = Date.from(context.getSafeOperationStartInstant().minus(lookbackPeriod));
                    return admin.isAdministeredAfter(cutoff, context);
                })
                .min(IMedicationAdministration.ORDERED_BY_LATEST_FIRST);

        if (mostRecentAntibioticAdmin.isEmpty()) {
            return abstain(context, details, "No prior antibiotic administered since operation start");
        }

        // Calculate cumulative EBL since most recent antibiotic administration
        List<Float> eblValues = observationService.getObservationValues(
                context.getPatient().getId(), mostRecentAntibioticAdmin.get().getAdministrationDate(), ObservationType.EBL);
        float cumulativeEbl = eblValues.stream().reduce(0f, Float::sum);
        details.put(CUMULATIVE_EBL, cumulativeEbl);
        details.put(FORMATTED_CUMULATIVE_EBL, elbFormatter.format(cumulativeEbl));

        // Calculate the current threshold multiple
        int currentMultiple = (int) Math.floor(cumulativeEbl / eblThreshold);
        if (currentMultiple < 1) {
            return abstain(context, details, "Cumulative EBL (" + cumulativeEbl + " mL) below threshold (" + eblThreshold + " mL)");
        }
        details.put(THRESHOLD_MULTIPLE, currentMultiple);

        // Check if this threshold multiple has already fired
        if (hasAlreadyFiredForMultiple(context, currentMultiple)) {
            return abstain(context, details, "Already fired for threshold multiple " + currentMultiple);
        }

        // Check for renal warning condition (aminoglycoside/vancomycin + CrCl < 50)
        boolean showRenalWarning = shouldShowRenalWarning(context, opStart);
        details.put(SHOW_RENAL_WARNING, showRenalWarning);

        // Add CrCl to details if available
        context.getPatient().getCrCl().ifPresent(crcl -> details.put(CRCL, crcl));

        // Set lockout to prevent re-firing for this threshold multiple
        setFiredForMultiple(context, currentMultiple);

        return baseBuilder(context)
                .needsAction(true)
                .prompt(createPrompt(details))
                .details(details)
                .build();
    }

    /**
     * Calculates the EBL threshold based on patient weight.
     * For patients >= 40kg: 1500mL
     * For patients < 40kg: 25 mL/kg * weight
     */
    private float calculateEblThreshold(float weightKg) {
        if (weightKg >= ADULT_WEIGHT_THRESHOLD_KG) {
            return ADULT_EBL_THRESHOLD_ML;
        } else {
            return PEDIATRIC_EBL_FACTOR_ML_PER_KG * weightKg;
        }
    }

    /**
     * Gets the lockout rule ID for a specific threshold multiple.
     */
    private String getLockoutRuleId(int multiple) {
        return ID + "-multiple-" + multiple;
    }

    /**
     * Checks if this rule has already fired for the given threshold multiple in this case.
     */
    private boolean hasAlreadyFiredForMultiple(EventContext context, int currentMultiple) {
        String lockoutRuleId = getLockoutRuleId(currentMultiple);
        return ruleMemoryService.isRuleLockedOut(
                context.getPatient().getId(),
                context.getOperation().getOperationId(),
                lockoutRuleId
        );
    }

    /**
     * Sets lockout for the given threshold multiple to prevent re-firing.
     */
    private void setFiredForMultiple(EventContext context, int multiple) {
        String lockoutRuleId = getLockoutRuleId(multiple);
        ruleMemoryService.setRuleLockout(
                context.getPatient().getId(),
                context.getOperation().getOperationId(),
                lockoutRuleId,
                Duration.ofHours(24)
        );
    }

    /**
     * Determines if the renal warning should be shown.
     * Condition: Patient received aminoglycoside or vancomycin AND CrCl < 50
     */
    private boolean shouldShowRenalWarning(EventContext context, Date opStart) {
        Double crcl = context.getPatient().getCrCl().orElse(null);
        if (crcl == null || crcl >= RENAL_CRCL_THRESHOLD) {
            return false;
        }

        // Check if patient has received aminoglycoside or vancomycin since operation start
        return context.getPatient().getBolusMedicationAdministrations().stream()
                .filter(med -> med.isAdministeredAfter(opStart, context))
                .anyMatch(med -> hasAminoglycosideOrVancomycin(med));
    }

    private boolean hasAminoglycosideOrVancomycin(ContextMedicationAdministration med) {
        return med.hasMedicationCategory(MedicationCategory.AMINOGLYCOSIDE)
               || med.isPrimaryMedicationCategory(MedicationCategory.VANCOMYCIN);
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {
        boolean showRenalWarning = Boolean.TRUE.equals(result.get(SHOW_RENAL_WARNING));

        String description;
        if (showRenalWarning) {
            description = "EBL = ${" + FORMATTED_CUMULATIVE_EBL + "} mL. Consider antibiotic re-dose when EBL > ${" + FORMATED_EBL_THRESHOLD + "} mL. " +
                          "When redosing vancomycin or aminoglycosides in cases with renal insufficiency, " +
                          "consult with pharmacy on appropriate re-dosing schedule and quantity.";
        } else {
            description = "EBL = ${" + FORMATTED_CUMULATIVE_EBL + "} mL. Consider antibiotic re-dose when EBL > ${" + FORMATED_EBL_THRESHOLD + "} mL.";
        }

        return EvaluationResultPromptTemplate.builder()
                .ruleIdentifier(getRuleIdentifier())
                .title("Re-dose antibiotics")
                .tabName("Re-dose antibiotics")
                .description(description)
                .type(RuleType.ALERT)
                .acceptText("Will Re-dose antibiotics")
                .rejectText("Reject")
                .rejectReasons(List.of(
                        RejectionReasonOption.simple(RejectionReason.SURGEON_REQUEST, "Surgeon requested no re-dose"),
                        RejectionReasonOption.simple(RejectionReason.OTHER)
                ))
                .citations(getCitations(result))
                .build()
                .createPrompt(result);
    }

    @Override
    public List<CitationId> getCitationDefinitions() {
        return List.of(CitationDefinition.EBL_ANTIBIOTIC_REDOSE_REMINDER);
    }


}
