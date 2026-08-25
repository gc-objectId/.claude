package com.guided.orci.engine.rule.medication.selection;

import com.guided.orci.dto.OperationDTO;
import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.engine.*;
import com.guided.orci.models.medication.MedicationCategory;
import com.guided.orci.models.patient.ConditionTag;
import com.guided.orci.models.procedure.ProcedureType;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.service.CitationService;
import com.guided.orci.types.wrappers.CitationId;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import javax.annotation.Nullable;
import java.time.Duration;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;

@RuleDefinition(id = SuccinylcholineProcedureWarningRule.ID,
        description = "Warns when succinylcholine is selected during certain procedures",
        trigger = RuleTrigger.SELECTION,
        type = RuleType.WARNING)
@Component
@Slf4j
public class SuccinylcholineProcedureWarningRule extends MedicationSelectionRule {
    public static final String ID = "w-sux-procedure";
    public static final String WARNING = "warning";

    static Map<String, ProcedureWarning> WARNINGS = Map.of(
            ProcedureType.BURN, new ProcedureWarning(
                    "Succinylcholine can cause severe hyperkalemia " +
                    "in burn patients from 48h to 1 year post-injury.",
                    CitationDefinition.SUCCINYLCHOLINE_BURN
            ),
            ProcedureType.OPEN_EYE, new ProcedureWarning(
                    "Succinylcholine increases intraocular pressure.",
                    CitationDefinition.SUCCINYLCHOLINE_OPEN_EYE
            )
    );


    @Autowired
    public SuccinylcholineProcedureWarningRule(CitationService citationService) {
        super(citationService);
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }

    @Override
    protected EvaluationResult evaluate(MedicationSelectionContext context) {
        if (!context.getMedication().hasPrimaryCategory(MedicationCategory.SUCCINYLCHOLINE)) {
            return abstain(context, "Primary category not succinylcholine");
        }

        var procedureWarning = getProcedureWarning(context.getOperation());
        if (procedureWarning == null) {
            return abstain(context, "No warning for procedure type");
        }

        var isBurnProcedure = context.getOperation()
                .getProcedureTypes().stream()
                .anyMatch(it -> it.categories().contains(ProcedureType.BURN));

        if (isBurnProcedure) {
            Date oneYearAgo = Date.from(context.getEvaluationInstant().minus(Duration.ofDays(365)));
            boolean hasBurnWithinTimeframe = context.getPatient().getConditions().stream()
                    .anyMatch(condition -> condition.getOnsetDate() != null
                                           && condition.getOnsetDate().after(oneYearAgo)
                                           && condition.hasTag(ConditionTag.BURN));

            if (hasBurnWithinTimeframe) {
                return abstain(context, "Procedure is BURN and patient has burn condition within one year prior");
            }
        }


        var result = details(context);
        result.put(WARNING, procedureWarning);
        return baseBuilder(context)
                .needsAction(true)
                .prompt(createPrompt(result))
                .build();
    }

    private @Nullable ProcedureWarning getProcedureWarning(OperationDTO operation) {
        return operation.getProcedureTypes().stream()
                .flatMap(it -> it.categories().stream())
                .flatMap(key -> Stream.ofNullable(WARNINGS.get(key)))
                .findFirst().orElse(null);
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {
        var warning = (ProcedureWarning) result.get(WARNING);
        if (warning == null) {
            warning = WARNINGS.values().stream().findFirst().orElseThrow();
        }

        return EvaluationResultPromptTemplate.builder().ruleIdentifier(getRuleIdentifier())
                .type(RuleType.WARNING)
                .warningText(warning.warningText())
                .citations(getCitations(result))
                .build().createPrompt(result);
    }

    @Override
    public List<CitationId> getConditionalCitationDefinitions() {
        return WARNINGS.values().stream().map(it -> it.citationId()).toList();
    }

    @Override
    public List<CitationId> getMatchingCitationDefinitions(Map<String, Object> results) {
        return Optional.ofNullable((ProcedureWarning) results.get(WARNING))
                .map(it -> it.citationId())
                .stream()
                .toList();
    }

    private record ProcedureWarning(String warningText, CitationId citationId) {
    }
}
