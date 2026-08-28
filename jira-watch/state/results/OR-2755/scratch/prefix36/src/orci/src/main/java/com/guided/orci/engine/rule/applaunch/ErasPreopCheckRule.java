
package com.guided.orci.engine.rule.applaunch;

import com.guided.orci.dto.PatientContext;
import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.engine.*;
import com.guided.orci.models.medication.IMedicationAdministration;
import com.guided.orci.models.medication.MedicationCategory;
import com.guided.orci.models.patient.ConditionSet;
import com.guided.orci.models.patient.ConditionTag;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.service.CitationService;
import com.guided.orci.service.RuleMemoryService;
import com.guided.orci.types.wrappers.CitationId;
import com.guided.orci.utils.StringUtils;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.text.WordUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.*;
import java.time.temporal.TemporalAmount;
import java.util.*;
import java.util.stream.Collectors;

@RuleDefinition(id = ErasPreopCheckRule.ID, description = "Alerts if ERAs patient did not receive Acetaminophen and Celecoxib before the start of the case", trigger = RuleTrigger.LAUNCH, type = RuleType.ALERT)
@Slf4j
@Component
public class ErasPreopCheckRule extends AppLaunchRule {
    public static final String ID = "a-eras-preop";

    public static final String MEDICATIONS_NOT_GIVEN = "MEDICATIONS_NOT_GIVEN";
    public static final String MEDICATIONS_NOT_GIVEN_TEXT = "MEDICATIONS_NOT_GIVEN_TEXT";

    public static final String HAS_GI_BLEED = "HAS_GI_BLEED";
    public static final String HAS_ACETAMINOPHEN_ALLERGY = "HAS_ACETAMINOPHEN_ALLERGY";
    public static final String HAS_CELECOXIB_OR_NSAIDS_ALLERGY = "HAS_CELECOXIB_OR_NSAIDS_ALLERGY";
    public static final String ACETAMINOPHEN_GIVEN = "ACETAMINOPHEN_GIVEN";
    public static final String CELECOXIB_GIVEN = "CELECOXIB_GIVEN";

    @Autowired
    public ErasPreopCheckRule(CitationService citationService, RuleMemoryService ruleMemoryService) {
        super(citationService, ruleMemoryService);
    }


    @Override
    public String getRuleIdentifier() {
        return ID;
    }

    /**
     * We should fire pre-op alert if the following medications were not given pre-op
     *
     *     Celecoxib (pre-op is defined as 12 hours prior to start of case)
     *
     *     Acetaminophen  (pre-op is defined 6 hours prior to start of case)
     *
     * invalidation criteria
     *
     *     if patient has GI bleed (from conditions, already in excel spreadsheet, similiar alert is for a-ketorolac-gi-bleed) and did not give celecoxib, do not fire alert
     *
     *     if patient has allergy to acetaminophen, it invalidates acetaminophen
     *
     *     if patient has known allergy to celecoxib or NSAIDS, invalidates celecoxib
     */
    @Override
    protected EvaluationResult evaluate(PatientContext context) {
        Map<String, Object> details = details(context);

        if (!context.getOperation().isErasOperation()) {
            return abstain(context, details, "Patient is not ERAS patient");
        }



        Optional<? extends IMedicationAdministration> acetaminophen = getAcetaminophenAdministration(context);
        Optional<? extends IMedicationAdministration> celecoxib = getCelecoxibxAdministration(context);
        List<String> medicationsNotGiven = new ArrayList<>();

        details.put(ACETAMINOPHEN_GIVEN, acetaminophen.isPresent());
        details.put(CELECOXIB_GIVEN, celecoxib.isPresent());

        StringBuilder sb = new StringBuilder();
        if (acetaminophen.isPresent()) {
            sb.append("Acetaminophen was given. ");
        } else {
            if (context.getPatient().isAllergicTo(MedicationCategory.ACETAMINOPHEN)) {
                sb.append("Acetaminophen not given but patient is allergic to acetaminophen. ");
                details.put(HAS_ACETAMINOPHEN_ALLERGY, true);
            } else {
                medicationsNotGiven.add(MedicationCategory.ACETAMINOPHEN);
            }
        }

        if (celecoxib.isPresent()) {
            sb.append("Celecoxib was given. ");

        } else {
            Date oneYearAgo = Date.from(context.getEvaluationInstant().atZone(ZoneId.systemDefault()).toLocalDateTime().minusYears(1).atZone(ZoneId.systemDefault()).toInstant());
            if (context.getPatient().hasCondition(ConditionTag.GI_BLEED, oneYearAgo)) {
                sb.append("Celecoxib not given but patient has GI bleed. ");
                details.put(HAS_GI_BLEED, true);
            } else if (context.getPatient().isAllergicTo(MedicationCategory.CELECOXIB)
                    || context.getPatient().isAllergicTo(MedicationCategory.NSAID)) {
                sb.append("Celecoxib not given but patient is allergic to celecoxib or NSAIDS. ");
                details.put(HAS_CELECOXIB_OR_NSAIDS_ALLERGY, true);
            } else {
                medicationsNotGiven.add(MedicationCategory.CELECOXIB);
            }
        }

        // if we have medications that were not given, alert
        if(!medicationsNotGiven.isEmpty()) {
            details.put(MEDICATIONS_NOT_GIVEN, medicationsNotGiven);
            details.put(MEDICATIONS_NOT_GIVEN_TEXT, StringUtils.grammaticalList(medicationsNotGiven.stream().map(med -> WordUtils.capitalizeFully(med)).toList(), ""));
            return baseBuilder(context).details(details).needsAction(true).prompt(createPrompt(details)).explanation(sb.toString()).build();
        }

        return abstain(context, details, sb.toString());
    }

    private Optional<? extends IMedicationAdministration> getMedicationAdministration(PatientContext context, String medicationCategory, TemporalAmount timeAgo) {
        Instant thresholdInstant = context.getSafeOperationStartInstant().minus(timeAgo);
        return context.getPatient().getMedicationAdministrations().stream()
                .filter(medAdmin ->
                        medAdmin.isAdministeredAfter(Date.from(thresholdInstant), context) &&
                        medAdmin.hasMedicationCategory(medicationCategory)).findAny();
    }

    private Optional<? extends IMedicationAdministration> getAcetaminophenAdministration(PatientContext context) {
        return getMedicationAdministration(context, MedicationCategory.ACETAMINOPHEN, Duration.ofHours(6));
    }

    private Optional<? extends IMedicationAdministration> getCelecoxibxAdministration(PatientContext context) {
        return getMedicationAdministration(context, MedicationCategory.CELECOXIB, Duration.ofHours(12));
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {
        List<String> medsNotGiven = (List<String>) result.get(MEDICATIONS_NOT_GIVEN);
        String acceptText = "Will Give Medications";
        List<RejectionReason> rejectionReasons = new ArrayList<>();
        rejectionReasons.add(RejectionReason.PATIENT_NOT_ON_ERAS_PROTOCOL);

        if (medsNotGiven != null) {
            if (medsNotGiven.size() == 1) {
                acceptText = "Will Give " + WordUtils.capitalizeFully(medsNotGiven.getFirst());
            }
            if (medsNotGiven.contains(MedicationCategory.ACETAMINOPHEN)) {
                rejectionReasons.add(RejectionReason.ALLERGY_TO_ACETAMINOPHEN);
            }
            if (medsNotGiven.contains(MedicationCategory.CELECOXIB)) {
                rejectionReasons.add(RejectionReason.ALLERGY_TO_CELECOXIB);
            }
            if (medsNotGiven.size() == 2) {
                rejectionReasons.add(RejectionReason.ALLERGY_TO_ACETAMINOPHEN_AND_CELECOXIB);
            }
            if (medsNotGiven.contains(MedicationCategory.CELECOXIB)) {
                rejectionReasons.add(RejectionReason.HISTORY_OF_GI_BLEED);
            }
        }
        rejectionReasons.add(RejectionReason.MEDICATION_GIVEN);

        return EvaluationResultPromptTemplate.builder().ruleIdentifier(getRuleIdentifier()).title("Administer ${" + MEDICATIONS_NOT_GIVEN_TEXT + "} for ERAS Patient").description(
                        "Patient is on ERAS protocol. Recommend ${" + MEDICATIONS_NOT_GIVEN_TEXT + "}.")
                .type(RuleType.ALERT).acceptText(acceptText).rejectText("Reject")
                .rejectReasons(rejectionReasons.stream()
                        .map(reason -> RejectionReasonOption.simple(reason))
                        .collect(Collectors.toList()))
                .citations(getCitations(result))
                .build().createPrompt(result);
    }

    @Override
    public List<CitationId> getCitationDefinitions() {
        return List.of(CitationDefinition.ERAS_PREOP);
    }
}
