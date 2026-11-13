package com.guided.orci.engine.rule.medication.selection;

import com.google.common.collect.Range;
import com.guided.orci.dto.DoseOptionDTO;
import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.engine.*;
import com.guided.orci.engine.rule.GuidanceCategory;
import com.guided.orci.engine.rule.RuleCategory;
import com.guided.orci.guidance.Citation;
import com.guided.orci.models.medication.FlatDoseOption;
import com.guided.orci.models.medication.MedicationCategory;
import com.guided.orci.models.medication.MedicationRoute;
import com.guided.orci.models.observation.Observation;
import com.guided.orci.models.observation.ObservationType;
import com.guided.orci.models.patient.ConditionTag;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.service.CitationService;
import com.guided.orci.service.ObservationService;
import com.guided.orci.service.TenantService;
import com.guided.orci.service.rules.diabetes.InsulinManagementService;
import com.guided.orci.types.Dose;
import com.guided.orci.types.wrappers.CitationId;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Slf4j
@RuleDefinition(id = InsulinDefaultDoseWarningRule.ID,
        description = "Sets a default dose for insulin based on glucose values",
        trigger = RuleTrigger.SELECTION,
        categories = {RuleCategory.COMPLIANCE_DEFAULT_DOSE},
        type = RuleType.WARNING,
        guidanceCategory = GuidanceCategory.WRONG_DOSE
)
@Component
public class InsulinDefaultDoseWarningRule extends MedicationSelectionRule {

    public static final String ID = "w-insulin-default-dose";

    public static final String ROUTE_CITATION_IDS = "ROUTE_CITATION_IDS";
    public static final String RANGE_TEXT_SUFFIX = "_RANGE_TEXT";
    public static final String LAST_GLUCOSE = "LAST_GLUCOSE";

    public static final String USE_MODERATE_DOSE_SCALE = "USE_MODERATE_DOSE_SCALE";
    public static final Set<MedicationRoute> ROUTES_OF_INTEREST = Set.of(
            MedicationRoute.INTRAVENOUS,
            MedicationRoute.INTRAOSSEOUS,
            MedicationRoute.SUBCUTANEOUS);
    private final ObservationService observationService;
    private final InsulinManagementService insulinManagementService;
    private final TenantService tenantService;


    @Autowired
    public InsulinDefaultDoseWarningRule(ObservationService observationService, CitationService citationService, InsulinManagementService insulinManagementService, TenantService tenantService) {
        super(citationService);
        this.observationService = observationService;
        this.insulinManagementService = insulinManagementService;
        this.tenantService = tenantService;
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }


    @Override
    protected EvaluationResult evaluate(MedicationSelectionContext context) {
        if (!context.getMedication().hasCategory(MedicationCategory.INSULIN)) {
            return abstain(context, "selected medication is not " + MedicationCategory.INSULIN);
        }

        var availableRoutes = context.getMedication().getAvailableRoutes();
        if (availableRoutes == null || availableRoutes.stream().noneMatch(ROUTES_OF_INTEREST::contains)) {
            return abstain(context, "selected medication has no configured routes of interest for insulin dosing");
        }

        var routeDoseUnits = context.getMedication().getRouteDoseUnits();
        if (ROUTES_OF_INTEREST.stream().noneMatch(routeDoseUnits::containsKey)) {
            return abstain(context, "selected medication has no dose units configured for insulin dosing routes");
        }

        Optional<Observation> lastGlucose = lastGlucose(context);
        Map<String, Object> details = details(context);

        if (lastGlucose.isEmpty()) {
            return abstain(context, details, "patient has no valid glucose value in the last hour");
        }
        // rely on no configuration for 0 for this to work correctly by not matching any valid config
        int glucoseValueAsInt = 0;
        try {
            glucoseValueAsInt = lastGlucose.get().getNumericObservationValue().intValue();
        } catch (Exception e) {

        }
        final int currentGlucoseValue = glucoseValueAsInt;
        details.put(LAST_GLUCOSE, currentGlucoseValue);
        var isModerateDosePatient = isModerateDosePatient(context);
        details.put(USE_MODERATE_DOSE_SCALE, isModerateDosePatient);
        var doseConfig = tenantService.getConfig().getInsulinDoseConfig();
        var subcutaneousConfig = isModerateDosePatient
                ? doseConfig.subcutaneousModerateDose().getEntry(currentGlucoseValue)
                : doseConfig.subcutaneousLowDose().getEntry(currentGlucoseValue);
        var intravenousIntraosseousConfig = doseConfig.intravenousIntraosseous().getEntry(currentGlucoseValue);
        if (subcutaneousConfig == null && intravenousIntraosseousConfig == null) {
            return abstain(context, details, "patient's glucose does not fall into any range of interest");
        }

        // relies on a BigDecimal that matches with the dose option calculated dose value downstream
        Optional<BigDecimal> subcutaneousConfigDefault = Optional.empty();
        Optional<BigDecimal> intravenousIntraosseousConfigDefault = Optional.empty();
        Map<MedicationRoute, CitationId> citationIds = new HashMap<>();
        if (subcutaneousConfig != null) {
            subcutaneousConfigDefault = Optional.of(BigDecimal.valueOf(subcutaneousConfig.getValue()));
            details.put(MedicationRoute.SUBCUTANEOUS + RANGE_TEXT_SUFFIX, getRangeText(subcutaneousConfig.getKey()));
            citationIds.put(MedicationRoute.SUBCUTANEOUS, CitationDefinition.INSULIN_DOSE_GUIDANCE);
        }
        if (intravenousIntraosseousConfig != null) {
            intravenousIntraosseousConfigDefault = Optional.of(BigDecimal.valueOf(intravenousIntraosseousConfig.getValue()));
            details.put(MedicationRoute.INTRAVENOUS + "_" + MedicationRoute.INTRAOSSEOUS + RANGE_TEXT_SUFFIX, getRangeText(intravenousIntraosseousConfig.getKey()));
            citationIds.put(MedicationRoute.INTRAVENOUS, CitationDefinition.INSULIN_DOSE_GUIDANCE_IV_IO);
            citationIds.put(MedicationRoute.INTRAOSSEOUS, CitationDefinition.INSULIN_DOSE_GUIDANCE_IV_IO);
        }
        details.put(ROUTE_CITATION_IDS, citationIds);

        return baseBuilder(context)
                .needsAction(true)
                .details(details)
                .prompt(createPrompt(details))
                .routeDefaultDoseOverride(generateRouteDefaultDose(context, subcutaneousConfigDefault, intravenousIntraosseousConfigDefault))
                .build();

    }

    /**
     * We consider a patient for moderate dose subcutaneous insulin if all of the following are true
     * <ul>
     *     <li>total daily dose of insulin >=40U</li>
     *     <li>Diabetes Type II</li>
     *     <li>eGFR >= 45</li>
     *     <li>PATIENT_AGE < 70 </li>
     * </ul>
     *
     * @param context
     * @return
     */
    protected boolean isModerateDosePatient(MedicationSelectionContext context) {
        var patient = context.getPatient();
        boolean hasDiabetesType2 = patient.hasCondition(ConditionTag.DIABETES_TYPE_2);
        boolean isUnder70 = patient.getAge() != null && patient.getAge() < 70;
        boolean hasNoRenalFailure = observationService.getLatestObservation(patient, ObservationType.EGFR).flatMap(obs -> Optional.ofNullable(obs.getNumericObservationValue())).map(value -> value >= 45).orElse(false);
        var insulinDailyDose = insulinManagementService.getInsulinDailyDose(context, context.getOperation().getAdmissionDate(), context.getPatient());
        boolean hasHighDailyDose = insulinDailyDose.totalDailyDose() != null && insulinDailyDose.totalDailyDose().isGreaterThanOrEqualTo(Dose.of("40 Units").orElseThrow());

        return hasDiabetesType2 && isUnder70 && hasNoRenalFailure && hasHighDailyDose;
    }

    private String getRangeText(Range range) {
        if (range.hasLowerBound() && range.hasUpperBound()) {
            return range.lowerEndpoint() + "-" + range.upperEndpoint();
        } else if (range.hasLowerBound()) {
            return "≥" + range.lowerEndpoint();
        } else if (range.hasUpperBound()) {
            return "≤" + range.upperEndpoint();
        }
        return "unknown";

    }

    private Map<MedicationRoute, DoseOptionDTO> generateRouteDefaultDose(MedicationSelectionContext context, Optional<BigDecimal> subcutaneousConfigDefaultDose, Optional<BigDecimal> intravenousIntraosseousConfigDefaultDose) {
        var opts = new HashMap<MedicationRoute, DoseOptionDTO>();
        var medication = context.getMedication();
        var routeUnits = medication.getRouteDoseUnits();

        Stream.of(
                Map.entry(MedicationRoute.SUBCUTANEOUS, subcutaneousConfigDefaultDose),
                Map.entry(MedicationRoute.INTRAVENOUS, intravenousIntraosseousConfigDefaultDose),
                Map.entry(MedicationRoute.INTRAOSSEOUS, intravenousIntraosseousConfigDefaultDose)
        ).forEach(entry -> {
            var route = entry.getKey();
            entry.getValue().ifPresent(dose -> {
                var units = routeUnits.get(route);
                if (units == null) {
                    log.warn("Medication {} is missing dose units for route {} - skipping default dose for this route", medication.getMedicationIdentifier(), route);
                    return;
                }
                opts.put(route, DoseOptionDTO.fromDoseOption(new FlatDoseOption(dose, units.units())));
            });
        });

        if (!opts.isEmpty()) {
            return opts;
        }
        return null;
    }

    private Optional<Observation> lastGlucose(MedicationSelectionContext context) {
        Date oneHourAgo = Date.from(context.getEvaluationInstant().minus(Duration.ofHours(1)));
        Optional<Observation> glucoseObservation = this.observationService.getLatestObservation(context.getPatient(), oneHourAgo, ObservationType.GLUCOSE);
        if (glucoseObservation.isEmpty()) {
            return glucoseObservation;
        }
        if (glucoseObservation.get().getNumericObservationValue() == null) {
            // the latest glucose reading doesn't have a value
            return Optional.empty();
        }
        if (!"mg/dL".equals(glucoseObservation.get().getObservationUnits())) {
            // the latest glucose reading isn't in expected mg/dL units
            return Optional.empty();
        }
        return glucoseObservation;
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {
        Map<MedicationRoute, CitationId> citationIds = (Map<MedicationRoute, CitationId>) result.getOrDefault(ROUTE_CITATION_IDS, new HashMap<>());

        // Convert Map<MedicationRoute, CitationId> to Map<MedicationRoute, List<Citation>>
        Map<MedicationRoute, List<Citation>> routeBasedCitations = citationIds.entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        entry -> citationService.findById(entry.getValue())
                                .map(CitationDefinition::toCitation)
                                .map(List::of)
                                .orElse(List.of())
                ));

        return EvaluationResultPromptTemplate.builder().ruleIdentifier(getRuleIdentifier())
                .type(RuleType.WARNING)
                .routeBasedCitations(routeBasedCitations)
                .citationsLocation(CitationLocation.NEXT_TO_DOSE_OPTIONS)
                .build().createPrompt(result);
    }

    @Override
    public List<CitationId> getConditionalCitationDefinitions() {
        return List.of(CitationDefinition.INSULIN_DOSE_GUIDANCE, CitationDefinition.INSULIN_DOSE_GUIDANCE_IV_IO);
    }
}
