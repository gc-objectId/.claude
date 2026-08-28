package com.guided.orci.engine.rule.applaunch;

import com.guided.orci.dto.PatientContext;
import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.engine.*;
import com.guided.orci.models.medication.IMedicationAdministration;
import com.guided.orci.models.medication.MedicationCategory;
import com.guided.orci.models.medication.MedicationRoute;
import com.guided.orci.service.CitationService;
import com.guided.orci.service.RuleMemoryService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Prompts at case start to give oral (PO) doxycycline before a dilation & evacuation / dilation & curettage
 * procedure. PO doxycycline is recommended prophylaxis within the four hours before anesthesia start for these
 * procedures, so when no qualifying oral administration is recorded in that window the rule fires for the
 * clinician to give it or document why not.
 *
 * <p>Only an oral administration satisfies the check: doxycycline is matched by the DOXYCYCLINE category combined
 * with an ORAL route, because the prophylaxis is route-specific and an intravenous dose does not fulfill it.
 */
@Slf4j
@Component
@RuleDefinition(
        id = PreopDoxycyclineCheckRule.ID,
        description = "Alerts at case start when oral Doxycycline was not administered within 4 hours before anesthesia start for D&E/D&C cases.",
        trigger = RuleTrigger.LAUNCH,
        type = RuleType.ALERT
)
public class PreopDoxycyclineCheckRule extends AppLaunchRule {
    public static final String ID = "a-preop-doxycycline-check";

    private static final Duration PREOP_WINDOW = Duration.ofHours(4);

    private static final Set<String> TARGET_PROCEDURES = Set.of(
            "p-dilation-and-evacuation-nonpregnancy",
            "p-dilation-and-evacuation-abortion",
            "p-dilation-and-evacuation-postpartum",
            "p-dilation-and-evacuation-other",
            "p-dilation-and-curettage");

    @Autowired
    public PreopDoxycyclineCheckRule(CitationService citationService, RuleMemoryService ruleMemoryService) {
        super(citationService, ruleMemoryService);
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }

    @Override
    protected EvaluationResult evaluate(PatientContext context) {
        Map<String, Object> details = details(context);

        if (!hasTargetProcedure(context)) {
            return abstain(context, details, "No D&E/D&C procedure present.");
        }

        Instant caseStart = context.getSafeOperationStartInstant();
        Instant windowStart = caseStart.minus(PREOP_WINDOW);

        if (hasPreopOralDoxycycline(context, windowStart, caseStart)) {
            return abstain(context, details, "Oral doxycycline already administered in preop window.");
        }

        return baseBuilder(context)
                .needsAction(true)
                .details(details)
                .prompt(createPrompt(details))
                .build();
    }

    private boolean hasTargetProcedure(PatientContext context) {
        return context.getOperation().getProcedureTypes().stream()
                .anyMatch(procedureType -> TARGET_PROCEDURES.contains(procedureType.procedureId()));
    }

    private boolean hasPreopOralDoxycycline(PatientContext context, Instant windowStart, Instant caseStart) {
        Date windowStartDate = Date.from(windowStart);
        Date caseStartDate = Date.from(caseStart);
        for (IMedicationAdministration administration : context.getPatient().getMedicationAdministrations()) {
            if (administration.hasMedicationCategory(MedicationCategory.DOXYCYCLINE)
                    && administration.getRoute() == MedicationRoute.ORAL
                    && administration.isAdministeredBetween(windowStartDate, caseStartDate)) {
                return true;
            }
        }
        return false;
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> details) {
        return EvaluationResultPromptTemplate.builder()
                .ruleIdentifier(getRuleIdentifier())
                .title("Doxycycline PO Not Given Preoperatively")
                .description("Doxycycline PO is recommended within 4 hours prior to the start of a D&E procedure. "
                        + "No oral administration has been recorded in the preoperative window.")
                .type(RuleType.ALERT)
                .acceptText("Will Give Doxycycline")
                .rejectText("Reject")
                .rejectReasons(List.of(
                        RejectionReasonOption.simple(RejectionReason.MEDICATION_GIVEN),
                        RejectionReasonOption.simple(RejectionReason.ALLERGY_TO_DOXYCYCLINE)))
                .build()
                .createPrompt(details);
    }
}
