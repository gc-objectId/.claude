package com.guided.orci.engine.rule.medication.selection;

import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.engine.*;
import com.guided.orci.models.medication.MedicationCategory;
import com.guided.orci.models.patient.ConditionTag;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.service.CitationService;
import com.guided.orci.types.wrappers.CitationId;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.text.DecimalFormat;
import java.time.Duration;
import java.util.Date;
import java.util.List;
import java.util.Map;


@RuleDefinition(id = VancomycinRenalDiseaseWarningRule.ID,
        description = "Warns to consult pharmacy if vancomycin is selected for patients that may have renal disease with a recent administration of vancomyin",
        trigger = RuleTrigger.SELECTION,
        type = RuleType.WARNING)
@Slf4j
@Component
public class VancomycinRenalDiseaseWarningRule extends MedicationSelectionRule {
    public static final String ID = "w-vancomycin-renal-disease";


    public static final String CRCL = "CRCL";
    public static final String CRCL_DISPLAY = "CRCL_DISPLAY";
    public static final String ON_DIALYSIS = "ON_DIALYSIS";

    @Autowired
    public VancomycinRenalDiseaseWarningRule(CitationService citationService) {
        super(citationService);
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }

    @Override
    protected EvaluationResult evaluate(MedicationSelectionContext context) {
        if(!context.hasPrimaryMedicationCategory(MedicationCategory.VANCOMYCIN)) {
            return abstain(context, "medication is not " + MedicationCategory.VANCOMYCIN);
        }
        var last24Hours = Date.from(context.getEvaluationInstant().minus(Duration.ofHours(24)));
        var last48Hours = Date.from(context.getEvaluationInstant().minus(Duration.ofHours(48)));
        var details = details(context);
        if (
                context.getPatient().hasCondition(ConditionTag.ON_DIALYSIS) &&
                context.getPatient().getMedicationAdministrations().stream().anyMatch(medAdmin ->
                        medAdmin.isPrimaryMedicationCategory(MedicationCategory.VANCOMYCIN) && medAdmin.isAdministeredAfter(last48Hours, context))) {
            // patient is on dialysis and received vancomycin in the last 48h
            details.put(ON_DIALYSIS, true);
            return baseBuilder(context).details(details).ruleTrigger(RuleTrigger.SELECTION).prompt(createPrompt(details)).needsAction(true).build();
        } else if (context.getPatient().getCrCl().filter(crcl -> crcl < 50).isPresent() && context.getPatient().getMedicationAdministrations().stream().anyMatch(medAdmin ->
                medAdmin.isPrimaryMedicationCategory(MedicationCategory.VANCOMYCIN) && medAdmin.isAdministeredAfter(last24Hours, context))) {
            // patient has low CrCl and received vancomycin in the last 24 hours
            details.put(CRCL, context.getPatient().getCrCl().get());
            DecimalFormat df = new DecimalFormat("#.#");
            details.put(CRCL_DISPLAY, df.format(context.getPatient().getCrCl().get()) + " mL/min");
            return baseBuilder(context).details(details).prompt(createPrompt(details)).ruleTrigger(RuleTrigger.SELECTION).needsAction(true).build();
        }
        return abstain(context, "Patient does not have renal disease with recent vancomycin administration");
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {
        String description = "For patients on dialysis, consult pharmacy before administering additional vancomycin dose.";
        String trigger = ON_DIALYSIS;
        if(result.containsKey(CRCL)) {
            description = "CrCl = ${" + CRCL_DISPLAY + "}. For patients with renal disease, consult pharmacy before administering additional vancomycin dose.";
            trigger = CRCL;
        }

        EvaluationResultPrompt prompt = EvaluationResultPromptTemplate.builder().ruleIdentifier(getRuleIdentifier())
                .type(RuleType.WARNING)
                .warningText(description)
                .citations(getCitations(result))
                .build().createPrompt(result);

        prompt.setTrigger(trigger);
        return prompt;
    }

    @Override
    public List<CitationId> getCitationDefinitions() {
        return List.of(CitationDefinition.VANCOMYCIN_RENAL_DISEASE);
    }


}
