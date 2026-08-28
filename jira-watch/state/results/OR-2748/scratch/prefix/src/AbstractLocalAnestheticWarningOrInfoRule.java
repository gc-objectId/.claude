package com.guided.orci.engine.rule.medication.selection;

import com.guided.orci.dto.DoseOptionDTO;
import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.engine.*;
import com.guided.orci.engine.rule.PromptText;
import com.guided.orci.engine.rule.common.BoundMedicationComponent;
import com.guided.orci.exceptions.NotImplementedException;
import com.guided.orci.guidance.Citation;
import com.guided.orci.models.medication.MedicationRoute;
import com.guided.orci.models.medication.TypedWeight;
import com.guided.orci.models.medication.WeightBasedDoseOption;
import com.guided.orci.models.patient.WeightCalculationType;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.models.rules.last.MaxDoseCalculation;
import com.guided.orci.models.rules.last.PriorAdminListItem;
import com.guided.orci.models.rules.last.RemainingDoseCalculation;
import com.guided.orci.service.CitationService;
import com.guided.orci.service.LASTProtocolService;
import com.guided.orci.service.medication.MedicationService;
import com.guided.orci.types.Dose;
import com.guided.orci.types.wrappers.CitationId;

import org.apache.commons.text.StringSubstitutor;
import org.apache.logging.log4j.util.Strings;

import java.math.BigDecimal;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static com.guided.orci.models.medication.MedicationCategory.LIDOCAINE;
import static com.guided.orci.models.medication.MedicationCategory.LOCAL_ANESTHETIC;


public abstract class AbstractLocalAnestheticWarningOrInfoRule extends AbstractLocalAnestheticRule {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AbstractLocalAnestheticWarningOrInfoRule.class);
    protected MedicationService medicationService;

    public AbstractLocalAnestheticWarningOrInfoRule(LASTProtocolService lastProtocolService, CitationService citationService, MedicationService medicationService, PromptType promptType) {
        super(lastProtocolService, citationService, promptType);
        this.medicationService = medicationService;
    }

    @Override
    public EvaluationResult evaluate(MedicationSelectionContext context) {
        var details = details(context);
        // adds buffers for compliance
        details.put("BUFFER_MG", 5d);
        details.put("BUFFER_ML", 1d);
        details.put(CITATION_MEDICATION_NAME, generateCitationMedicationName(context.getMedication().getMedicationName(), context.getMedication().getPrimaryMedicationCategory()));

        var localAnestheticResult = lastProtocolService.getMedComponentToUse(context.getMedication());
        if (localAnestheticResult.isError()) {
            return abstain(context, localAnestheticResult.getError());
        }
        var localAnesthetic = localAnestheticResult.getOk();
        // Only set explicit med name for multi-component medications
        if (context.getMedication().isMulticomponent()) {
            details.put(EXPLICIT_MED_NAME, localAnesthetic.componentName());
        }

        var patientWeight = getTypedWeight(context.getPatient(), details);
        if (patientWeight.isEmpty()) {
            return abstain(context, "Patient has no weight provided");
        }

        details.put(LOCAL_ANESTHETIC_ADMINISTRATIONS, lastProtocolService.getRelevantAdministrationDetails(context.getPatient().getPatientId(), context, context.getTimeZone()));

        var builder = baseBuilder(context);
        boolean needsAction;
        if (localAnesthetic.isLidocaine()) {
            needsAction = evaluateLidocaine(context, localAnesthetic, details, builder, patientWeight.get());
        } else {
            needsAction = evaluateNonLidocaine(context, localAnesthetic, details, builder, patientWeight.get());
        }
        if (!needsAction) {
            return builder.build();
        }
        return builder.prompt(createPrompt(details)).build();
    }

    protected Set<MedicationRoute> getRoutes(MedicationSelectionContext context) {
        var routes = context.getMedication().getAvailableRoutes();
        if (routes != null && !routes.isEmpty()) {
            return routes;
        }
        // if there are no routes, we probably have a g- medication. Attempt to get all routes from all available meds of the same primary category
        return medicationService.getAllRoutesByPrimaryMedicationCategory(
                context.getMedication().getPrimaryMedicationCategory(), context.getPatient().getPediatricStatus());
    }

    private boolean evaluateLidocaine(
            MedicationSelectionContext context,
            BoundMedicationComponent localAnesthetic,
            Map<String, Object> details,
            EvaluationResult.EvaluationResultBuilder builder,
            TypedWeight patientWeight
    ) {
        details.put(IS_LIDOCAINE, true);

        var routes = getRoutes(context);
        details.put(AVAILABLE_ROUTES, routes);

        var routeBasedMaxDose = new HashMap<MedicationRoute, SingleMaxDose>();
        var routeWeightBasedDoseOptionOverrides = new HashMap<MedicationRoute, List<DoseOptionDTO>>();
        Map<MedicationRoute, BigDecimal> remainingDoseMlPerRoute = new HashMap<>();
        Map<MedicationRoute, Boolean> hasConcentrationPerRoute = new HashMap<>();

        for (MedicationRoute route : routes) {
            var routeDetails = new HashMap<String, Object>();

            // override dose options for IV lidocaine
            if (MedicationRoute.INTRAVENOUS.equals(route)) {
                var roundingDose = Dose.of("10 mg").orElseThrow();

                routeWeightBasedDoseOptionOverrides.put(MedicationRoute.INTRAVENOUS, Stream.of(
                                "1.5 mg/kg",
                                "1 mg/kg"
                        ).map(it -> DoseOptionDTO.fromWeightBasedDoseOption(new WeightBasedDoseOption(Dose.of(it).orElseThrow(), roundingDose), context.getPatient().getPediatricStatus(), patientWeight)).toList()
                );
            }

            var remainingDoseCalculation = lastProtocolService.calculateRemainingDose(
                    localAnesthetic.withRoute(route),
                    context.getPatient().getPatientId(),
                    context.getPatient().getPediatricStatus(),
                    patientWeight,
                    context);

            if (remainingDoseCalculation.isEmpty()) {
                builder.explanation("Couldn't calculate remaining dose");
                return false;
            }

            MaxDoseCalculation maxDoseCalculation = remainingDoseCalculation.get().getGivenMedMaxDose();
            populateDetailsLidocaine(patientWeight, remainingDoseCalculation.get(), routeDetails);

            remainingDoseCalculation.get().getRemainingDoseMl().ifPresent(it -> remainingDoseMlPerRoute.put(route, it));

            hasConcentrationPerRoute.put(route, false);
            if (maxDoseCalculation instanceof MaxDoseCalculation.ConcentrationCalculated) {
                hasConcentrationPerRoute.put(route, true);
            }

            context.getMedication().getTargetUnit(route).ifPresent(targetUnit -> {
                var remainingDose = remainingDoseCalculation.get().getRemainingDose(targetUnit);
                Optional<Dose> allowableOverage = MedicationRoute.INTRAVENOUS.equals(route)
                        ? Dose.of(5f, targetUnit)
                        : Optional.empty();
                routeBasedMaxDose.put(route, new SingleMaxDose(remainingDose, allowableOverage, LIDOCAINE));
            });

            routeDetails.forEach((key, val) ->
                    details.put(route + "_" + key, val));
        }

        Map<MedicationRoute, PromptType> routePromptTypeMap = getRouteBasedPromptTypes(routes, remainingDoseMlPerRoute, hasConcentrationPerRoute);
        details.put(REMAINING_DOSE_ML_PER_ROUTE, remainingDoseMlPerRoute);
        if (!routePromptTypeMap.containsValue(promptType)) {
            builder.explanation("No " + promptType + " in any routes");
            return false;
        }

        builder.needsAction(true)
                .details(details)
                .routeWeightBasedDoseOptionOverride(routeWeightBasedDoseOptionOverrides)
                .routeBasedMaxDose(routeBasedMaxDose);

        return true;
    }

    private boolean evaluateNonLidocaine(
            MedicationSelectionContext context,
            BoundMedicationComponent localAnesthetic,
            Map<String, Object> details,
            EvaluationResult.EvaluationResultBuilder builder,
            TypedWeight patientWeight
    ) {

        details.put(IS_LIDOCAINE, false);

        var routes = getRoutes(context);
        details.put(AVAILABLE_ROUTES, routes);

        Optional<Dose> remainingDose = Optional.empty();
        Map<MedicationRoute, BigDecimal> remainingDoseMlPerRoute = new HashMap<>();
        Map<MedicationRoute, Boolean> hasConcentrationPerRoute = new HashMap<>();

        var maybeRemainingDoseCalculation = lastProtocolService.calculateRemainingDose(
                localAnesthetic,
                context.getPatient().getPatientId(),
                context.getPatient().getPediatricStatus(),
                patientWeight,
                context);

        if (maybeRemainingDoseCalculation.isEmpty()) {
            builder.explanation("Couldn't calculate max dose");
            return false;
        }

        RemainingDoseCalculation remainingDoseCalculation = maybeRemainingDoseCalculation.get();
        MaxDoseCalculation maxDoseCalculation = remainingDoseCalculation.getGivenMedMaxDose();

        for (var route : routes) {
            var routeDetails = new HashMap<String, Object>();
            populateDetailsNonLidocaine(patientWeight, remainingDoseCalculation, routeDetails);
            remainingDoseCalculation.getRemainingDoseMl().ifPresent(it -> remainingDoseMlPerRoute.put(route, it));

            // For non-lidocaine, concentration is the same for all routes
            hasConcentrationPerRoute.put(route, false);
            if (maxDoseCalculation instanceof MaxDoseCalculation.ConcentrationCalculated) {
                hasConcentrationPerRoute.put(route, true);
            }
            routeDetails.forEach((key, val) ->
                    details.put(route + "_" + key, val));
        }

        var targetUnit = context.getMedication().getTargetUnitAssumingUniformUnitsPerRoute();

        if (targetUnit.isPresent()) {
            remainingDose = Optional.of(remainingDoseCalculation.getRemainingDose(targetUnit.get()));
        } else {
            log.info("Unable to determine target units for med {}", context.getMedication().getMedicationIdentifier());
        }

        Map<MedicationRoute, PromptType> routePromptTypeMap = getRouteBasedPromptTypes(routes, remainingDoseMlPerRoute, hasConcentrationPerRoute);
        details.put(REMAINING_DOSE_ML_PER_ROUTE, remainingDoseMlPerRoute);
        if (!routePromptTypeMap.containsValue(promptType)) {
            builder.explanation("No " + promptType + " in any routes");
            return false;
        }

        if (remainingDose.isPresent()) {
            // if the calculated remaining dose unit is different from the target unit, this means we will be unable to filter
            // the dose options later, so only set the max dose here if the units align
            if (remainingDose.get().getUnit().equals(targetUnit.get())) {
                var maxDose = new SingleMaxDose(
                        remainingDose.get(),
                        Optional.empty(),
                        context.getMedication().getPrimaryMedicationCategory());
                builder.maxDose(Optional.of(maxDose));
            }
        }

        builder.needsAction(true)
                .details(details);
        return true;
    }


    /**
     * Logic Summary (Updated with OR-1925 fix):
     * <p>
     * 1. Spinal/Intrathecal routes:
     * - If concentration unknown → INFO
     * - If concentration known:
     * - 0 < remaining dose ≤ 2 mL → WARNING
     * - Otherwise → INFO
     * <p>
     * 2. Topical route:
     * - Always → INFO
     * <p>
     * 3. Epidural route:
     * - If concentration unknown → INFO
     * - If concentration known:
     * - 0 < remaining dose ≤ 15 mL → WARNING
     * - Otherwise → INFO
     * <p>
     * 4. All other routes (nerve block, IV, etc.):
     * - Always → WARNING
     * - Display max in mL if concentration known, mg if not
     */
    private Map<MedicationRoute, PromptType> getRouteBasedPromptTypes(Set<MedicationRoute> routes,
                                                                      Map<MedicationRoute, BigDecimal> remainingDoseMlPerRoute,
                                                                      Map<MedicationRoute, Boolean> hasConcentrationPerRoute) {
        return routes.stream().collect(Collectors.toMap(Function.identity(), route -> {
            boolean routeHasConcentration = hasConcentrationPerRoute.getOrDefault(route, false);
            return switch (route) {
                // intrathecal and spinal: if no concentration, show info. If concentration known, warning if 0 < remaining dose ≤ 2 mL, else info
                case INTRATHECAL, SPINAL -> {
                    if (!routeHasConcentration) {
                        yield PromptType.INFO;
                    }
                    double remainingDoseMl = remainingDoseMlPerRoute.getOrDefault(route, BigDecimal.ZERO).doubleValue();
                    yield (remainingDoseMl > 0d && remainingDoseMl <= 2d)
                            ? PromptType.WARNING
                            : PromptType.INFO;
                }
                case TOPICAL -> PromptType.INFO;
                // epidural: if no concentration, show info. If concentration known, warning if 0 < remaining dose ≤ 15 mL, else info
                case EPIDURAL -> {
                    if (!routeHasConcentration) {
                        yield PromptType.INFO;
                    }
                    double remainingDoseMl = remainingDoseMlPerRoute.getOrDefault(route, BigDecimal.ZERO).doubleValue();
                    yield (remainingDoseMl > 0d && remainingDoseMl <= 15d)
                            ? PromptType.WARNING
                            : PromptType.INFO;
                }
                // nerve block, IV, and other routes: always warning (display in mL if concentration known, mg if not)
                default -> PromptType.WARNING;
            };
        }));
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {
        Set<MedicationRoute> routes = (Set<MedicationRoute>) result.getOrDefault(AVAILABLE_ROUTES, new HashSet<>());

        var administrations = (List<PriorAdminListItem>) result.getOrDefault(LOCAL_ANESTHETIC_ADMINISTRATIONS, List.of());
        EvaluationResultPromptTemplate.EvaluationResultPromptTemplateBuilder builder = EvaluationResultPromptTemplate.builder()
                .ruleIdentifier(getRuleIdentifier());

        var remainingDoseMlPerRoute = (Map<MedicationRoute, BigDecimal>) result.getOrDefault(REMAINING_DOSE_ML_PER_ROUTE, Map.of());

        // Build hasConcentration map per route by checking if each route has HAS_CONCENTRATION in details
        Map<MedicationRoute, Boolean> hasConcentrationPerRoute = routes.stream()
                .collect(Collectors.toMap(
                        Function.identity(),
                        route -> result.containsKey(route + "_" + HAS_CONCENTRATION)
                ));

        Map<MedicationRoute, PromptType> routePromptTypeMap = getRouteBasedPromptTypes(routes, remainingDoseMlPerRoute, hasConcentrationPerRoute);
        String explicitMedName = (String) result.getOrDefault(EXPLICIT_MED_NAME, "");

        builder.routeBasedCitations(getRouteBasedCitations(result, routePromptTypeMap));

        // todo: if multi-component, be explicit about which component the max dose applies to

        if (administrations.isEmpty()) {
            // no previous med admins
            builder.routeBasedPromptText(routes.stream()
                    .filter(route -> routePromptTypeMap.get(route) == promptType)
                    .collect(Collectors.toMap(Function.identity(), (route) ->
                            // no administrations, don't show anything for info
                            Objects.requireNonNull(routePromptTypeMap.get(route) == PromptType.INFO
                                    ? new PromptText(PromptType.INFO, null)
                                    : new PromptText(PromptType.WARNING,
                                    Strings.isEmpty(explicitMedName) ?
                                            "<b>Max dose is ${" + route + "_" + REMAINING_DOSE + "}</b>"
                                            : "<b>Max dose of " + explicitMedName + " is ${" + route + "_" + REMAINING_DOSE + "}</b>"
                            )))));
        } else {
            // display previous med admins
            var adminHtml = String.join("",
                    administrations.stream()
                            .map(it -> it.toHTML())
                            .toList());
            builder.routeBasedPromptText(routes.stream()
                    .filter(route -> routePromptTypeMap.get(route) == promptType)
                    .collect(Collectors.toMap(Function.identity(), (route) ->
                            Objects.requireNonNull(routePromptTypeMap.get(route) == PromptType.INFO
                                    ? new PromptText(PromptType.INFO, getInfoTextWhenPreviousMedAdmins(adminHtml))
                                    : new PromptText(PromptType.WARNING, getWarningTextWhenPreviousMedAdmins(route, result, explicitMedName, adminHtml))))));
        }
        return builder.build().createPrompt(result);
    }

    /**
     * Returns the default citations to be route specific for this rule
     *
     * @param details            the details map
     * @param routePromptTypeMap the map of routes to promptTypes to convert keys for
     * @return map of route to citations
     */
    private Map<MedicationRoute, List<Citation>> getRouteBasedCitations(Map<String, Object> details,
                                                                        Map<MedicationRoute, PromptType> routePromptTypeMap) {
        Map<MedicationRoute, List<Citation>> routeBasedCitations = new HashMap<>();
        if (promptType.equals(PromptType.INFO)) {
            return Collections.emptyMap();
        }
        var routesOfInterest = routePromptTypeMap.entrySet().stream().filter(entry -> entry.getValue().equals(promptType)).map(Map.Entry::getKey).collect(Collectors.toSet());
        for (MedicationRoute route : routesOfInterest) {
            if (!routePromptTypeMap.get(route).equals(PromptType.WARNING)) {
                // only create citations for warning, not info
                continue;
            }
            var subMap = new HashMap<String, String>();

            subMap.put(MAX_DOSE, "${" + route + "_" + MAX_DOSE + "}");
            subMap.put(REMAINING_DOSE, "${" + route + "_" + REMAINING_DOSE + "}");
            subMap.put(MAX_DOSE_MG_PER_KG, "${" + route + "_" + MAX_DOSE_MG_PER_KG + "}");
            subMap.put(MAX_DOSE_MG, "${" + route + "_" + MAX_DOSE_MG + "}");
            subMap.put(CONCENTRATION_MG_ML, "${" + route + "_" + CONCENTRATION_MG_ML + "}");
            subMap.put(MAX_DOSE_TIMES_CONCENTRATION_ML, "${" + route + "_" + MAX_DOSE_TIMES_CONCENTRATION_ML + "}");
            subMap.put(ROUNDING_TEXT, "${" + route + "_" + ROUNDING_TEXT + "}");
            subMap.put(REMAINING_ALLOWED_DOSE, "${" + route + "_" + REMAINING_ALLOWED_DOSE + "}");
            subMap.put(REMAINING_DOSE_ML, "${" + route + "_" + REMAINING_DOSE_ML + "}");
            subMap.put(REMAINING_PERCENT, "${" + route + "_" + REMAINING_PERCENT + "}");
            subMap.put(EXPANDED_CALCULATION, "${" + route + "_" + EXPANDED_CALCULATION + "}");
            StringSubstitutor sub = new StringSubstitutor(subMap);
            var citations = this.getMatchingCitationDefinitions(route, details).stream()
                    .map(citationService::findById)
                    .flatMap(Optional::stream)
                    .map(CitationDefinition::toCitation).toList();
            var routeCitations = citations.stream().map(citation -> Citation.builder()
                    .id(citation.getId())
                    .citation(sub.replace(citation.getCitation()))
                    .url(citation.getUrl())
                    .label(sub.replace(citation.getLabel()))
                    .build()
            ).toList();
            routeBasedCitations.put(route, routeCitations);

        }
        return routeBasedCitations;
    }

    private static String getInfoTextWhenPreviousMedAdmins(String adminHtml) {
        return "Prior local anesthetics administered:<span class='last-local-anesthetic-data'>"
               + "<table class='administration-table'><tbody>"
               + adminHtml
               + "</tbody></table></span>";
    }

    private static String getWarningTextWhenPreviousMedAdmins(MedicationRoute route, Map<String, Object> result, String explicitMedName, String adminHtml) {
        var remainingDoseMg = Double.parseDouble((String) result.get(route + "_" + REMAINING_ALLOWED_DOSE));
        var doseTemplateVariable = remainingDoseMg > 0 ? route + "_" + REMAINING_DOSE : route + "_" + MAX_DOSE;

        return (Strings.isEmpty(explicitMedName)
                ? "<b>Max dose is ${" + doseTemplateVariable + "},</b> adjusted for: "
                : "<b>Max dose of " + explicitMedName + " is ${" + doseTemplateVariable + "},</b> adjusted for: ")
               + EvaluationResultPromptTemplate.CITATION_TOOLTIP_PLACEHOLDER
               + "<span class='last-local-anesthetic-data'><table class='administration-table'><tbody>"
               + adminHtml
               + "</tbody></table></span>";
    }

    @Override
    public List<CitationId> getConditionalCitationDefinitions() {
        return List.of(
                CitationDefinition.LAST_LOCAL_ANESTHETIC_CONCENTRATION,
                CitationDefinition.LAST_LOCAL_ANESTHETIC_NO_CONCENTRATION,
                CitationDefinition.LAST_LIDOCAINE_IV_CONCENTRATION,
                CitationDefinition.LAST_LIDOCAINE_IV_NO_CONCENTRATION,
                CitationDefinition.LAST_LOCAL_ANESTHETIC_IDEAL,
                CitationDefinition.LAST_LOCAL_ANESTHETIC_CONCENTRATION_MAX,
                CitationDefinition.LAST_LOCAL_ANESTHETIC_NO_CONCENTRATION_MAX,
                CitationDefinition.LAST_LIDOCAINE_IV_CONCENTRATION_MAX,
                CitationDefinition.LAST_LIDOCAINE_IV_NO_CONCENTRATION_MAX
        );
    }

    @Override
    public List<CitationId> getMatchingCitationDefinitions(Map<String, Object> results) {
        throw new NotImplementedException();
    }

    public List<CitationId> getMatchingCitationDefinitions(MedicationRoute route, Map<String, Object> details) {
        var citations = new ArrayList<CitationId>();

        var isLidocaine = (Boolean) details.getOrDefault(IS_LIDOCAINE, false);
        var isIv = MedicationRoute.INTRAVENOUS.equals(route);
        var hasConcentration = details.containsKey(route + "_" + HAS_CONCENTRATION);

        // Check if remaining amount is ≤0% by checking remaining allowed dose
        var remainingAllowedDoseKey = route + "_" + REMAINING_ALLOWED_DOSE;
        // assume 0 if key missing
        var remainingDoseMg = Double.parseDouble((String) details.getOrDefault(remainingAllowedDoseKey, "0"));

        boolean useMaxDoseCitations = remainingDoseMg <= 0.0;

        if (isLidocaine && isIv) {
            if (useMaxDoseCitations) {
                citations.add(hasConcentration
                        ? CitationDefinition.LAST_LIDOCAINE_IV_CONCENTRATION_MAX
                        : CitationDefinition.LAST_LIDOCAINE_IV_NO_CONCENTRATION_MAX);
            } else {
                citations.add(hasConcentration
                        ? CitationDefinition.LAST_LIDOCAINE_IV_CONCENTRATION
                        : CitationDefinition.LAST_LIDOCAINE_IV_NO_CONCENTRATION);
            }
        } else {
            if (useMaxDoseCitations) {
                citations.add(hasConcentration
                        ? CitationDefinition.LAST_LOCAL_ANESTHETIC_CONCENTRATION_MAX
                        : CitationDefinition.LAST_LOCAL_ANESTHETIC_NO_CONCENTRATION_MAX);
            } else {
                citations.add(hasConcentration
                        ? CitationDefinition.LAST_LOCAL_ANESTHETIC_CONCENTRATION
                        : CitationDefinition.LAST_LOCAL_ANESTHETIC_NO_CONCENTRATION);
            }
        }

        if (WeightCalculationType.IDEAL.equals(details.getOrDefault(WEIGHT_CALCULATION_TYPE, WeightCalculationType.ACTUAL))) {
            citations.add(CitationDefinition.LAST_LOCAL_ANESTHETIC_IDEAL);
        }
        return citations;
    }
}
