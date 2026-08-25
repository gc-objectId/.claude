package com.guided.orci.engine.rule.medication.selection;

import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.engine.*;
import com.guided.orci.models.medication.MedicationCategory;
import com.guided.orci.models.observation.ObservationType;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.repository.ObservationRepository;
import com.guided.orci.service.CitationService;
import com.guided.orci.types.wrappers.CitationId;
import com.guided.orci.utils.DateUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@RuleDefinition(id = SuccinylcholineHyperkalemiaWarningRule.ID,
        description = "Alerts when succinylcholine is selected for patients with hyperkalemia",
        trigger = RuleTrigger.SELECTION,
        type = RuleType.WARNING)
@Component
@Slf4j
public class SuccinylcholineHyperkalemiaWarningRule extends MedicationSelectionRule {
    public static final String ID = "w-sux-hyper-k";

    public static final String POTASSIUM_QUANTITY = "POTASSIUM_QUANTITY";
    public static final String POTASSIUM_OBSERVATION_DATE = "POTASSIUM_OBSERVATION_DATE";
    private final ObservationRepository observationRepository;

    @Autowired
    public SuccinylcholineHyperkalemiaWarningRule(CitationService citationService,
                                                  ObservationRepository observationRepository) {
        super(citationService);
        this.observationRepository = observationRepository;
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
        var potassiumObservation = observationRepository.findTopByPatientIdAndTypeOrderByEffectiveTimeDesc(context.getPatient().getId(), ObservationType.POTASSIUM);
        if (potassiumObservation.isEmpty()) {
            return abstain(context, "No potassium observations found");
        }
        var mostRecentPotassium = potassiumObservation.get();
        if(mostRecentPotassium.getObservationUnits() == null) {
            return abstain(context, "Potassium observation has no units");
        }
        if (!mostRecentPotassium.getObservationUnits().equals("mmol/L")
            && !mostRecentPotassium.getObservationUnits().equals("mEq/L")) {
            log.warn("Unknown potassium units, consider adjusting rule to handle: {}", mostRecentPotassium.getObservationUnits());
            return abstain(context, "Unknown potassium units: " + mostRecentPotassium.getObservationUnits());
        }

        if (mostRecentPotassium.getNumericObservationValue() < 5.5f) {
            return abstain(context, "Potassium below hyperkalemia threshold");
        }

        var result = details(context);
        result.put(POTASSIUM_QUANTITY,
                mostRecentPotassium.getNumericObservationValue()
                + " " +
                mostRecentPotassium.getObservationUnits()
        );

        result.put(POTASSIUM_OBSERVATION_DATE,
                DateUtils.formatTimeOnlyRelativeToCurrentDay(
                        mostRecentPotassium.getEffectiveTime(), context.getTimeZone()));

        return baseBuilder(context).needsAction(true).prompt(createPrompt(result)).build();
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {
        return EvaluationResultPromptTemplate.builder().ruleIdentifier(getRuleIdentifier())
                .type(RuleType.WARNING)
                .warningText("Potassium = ${" + POTASSIUM_QUANTITY + "} at ${" + POTASSIUM_OBSERVATION_DATE + "}. Avoid Succinylcholine in patients with pre-existing hyperkalemia.")
                .citations(getCitations(result))
                .build().createPrompt(result);
    }

    @Override
    public List<CitationId> getCitationDefinitions() {
        return List.of(CitationDefinition.SUCCINYLCHOLINE_HYPERKALEMIA);
    }
}
