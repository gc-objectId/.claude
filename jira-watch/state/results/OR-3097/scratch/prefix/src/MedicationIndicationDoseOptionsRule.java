package com.guided.orci.engine.rule.medication.selection;

import com.guided.orci.dto.DoseOptionDTO;
import com.guided.orci.dto.MedicationDTO;
import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.dto.rule.context.ContextPatient;
import com.guided.orci.engine.*;
import com.guided.orci.engine.rule.GuidanceCategory;
import com.guided.orci.engine.rule.RuleCategory;
import com.guided.orci.guidance.Citation;
import com.guided.orci.models.medication.MedicationIndicationConfig;
import com.guided.orci.models.medication.MedicationRoute;
import com.guided.orci.models.medication.TypedWeight;
import com.guided.orci.service.CitationService;
import com.guided.orci.service.rules.medication.MedicationIndicationConfigService;
import com.guided.orci.types.Dose;
import com.guided.orci.types.wrappers.CitationId;
import com.guided.orci.utils.WithCitation;
import org.apache.commons.text.StringSubstitutor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import tech.units.indriya.ComparableQuantity;

import javax.measure.quantity.Mass;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Rule that provides dose options based on medication indication configurations.
 * Groups dose options by route and indication based on threshold data from MedicationIndicationConfig.
 */
@RuleDefinition(id = MedicationIndicationDoseOptionsRule.ID,
        description = "Provides dose options based on indication configurations",
        trigger = RuleTrigger.SELECTION,
        categories = {RuleCategory.COMPLIANCE_DEFAULT_DOSE, RuleCategory.COMPLIANCE_SINGLE_MAX_DOSE, RuleCategory.COMPLIANCE_SINGLE_MIN_DOSE},
        type = RuleType.WARNING,
        guidanceCategory = GuidanceCategory.WRONG_DOSE)
@Component
public class MedicationIndicationDoseOptionsRule extends MedicationSelectionRule implements FiltersByAntibioticRoute {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(MedicationIndicationDoseOptionsRule.class);

    public static final String INDICATION_DOSE_OPTIONS = "INDICATION_DOSE_OPTIONS";

    /**
     * Record to hold route and citation information from MedicationIndicationConfig without JPA entity references
     */
    public record RouteCitationInfo(MedicationRoute route, CitationId citationId, String citationText, String label, String url) {
        public Citation toCitation() {
            return Citation.builder()
                    .id(citationId)
                    .citation(citationText)
                    .label(label)
                    .url(url)
                    .build();
        }
    }
    public static final String ID = "w-indication-dose-options";
    public static final String ROUTE_CITATION_INFOS = "ROUTE_CITATION_INFOS";

    private final MedicationIndicationConfigService medicationIndicationConfigService;

    @Autowired
    public MedicationIndicationDoseOptionsRule(CitationService citationService,
                                               MedicationIndicationConfigService medicationIndicationConfigService) {
        super(citationService);
        this.medicationIndicationConfigService = medicationIndicationConfigService;
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }

    @Override
    protected EvaluationResult evaluate(MedicationSelectionContext context) {
        var medication = context.getMedication();
        if (medication == null) {
            return abstain(context, "Unable to resolve medication entity");
        }

        var pediatricStatus = Optional.ofNullable(context.getPatient())
                .map(ContextPatient::getPediatricStatus)
                .orElse(null);

        List<MedicationIndicationConfig> configs = medicationIndicationConfigService
                .findConfigurationsForMedication(medication.getMedicationIdentifier(), pediatricStatus);

        if (configs.isEmpty()) {
            return abstain(context, "No indication configurations found for medication: " +
                                    context.getMedication().getMedicationIdentifier());
        }

        Map<String, Object> details = details(context);
        Map<MedicationRoute, Map<String, List<DoseOptionDTO>>> indicationDoseOptions =
                buildIndicationDoseOptionsMap(context.getMedication(), configs, context);

        // Extract citation information
        List<RouteCitationInfo> routeCitationInfos = extractRouteCitationInfos(configs);
        details.put(INDICATION_DOSE_OPTIONS, indicationDoseOptions);
        details.put(ROUTE_CITATION_INFOS, routeCitationInfos);

        return baseBuilder(context)
                .needsAction(true)
                .details(details)
                .routeIndicationDoseOptions(indicationDoseOptions)
                .prompt(createPrompt(details))
                .build();
    }

    private Map<MedicationRoute, Map<String, List<DoseOptionDTO>>> buildIndicationDoseOptionsMap(MedicationDTO medication,
                                                                                                 List<MedicationIndicationConfig> configs,
                                                                                                 MedicationSelectionContext context) {


        return configs.stream()
                .sorted(Comparator.comparing(MedicationIndicationConfig::getIndicationRank,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(Collectors.groupingBy(
                        MedicationIndicationConfig::getRoute,
                        LinkedHashMap::new, // Preserve route ordering
                        Collectors.groupingBy(
                                MedicationIndicationConfig::getIndication,
                                LinkedHashMap::new, // Preserve indication ordering
                                Collectors.flatMapping(
                                        config -> configToDoseOptions(medication, config, context).stream(),
                                        Collectors.toList()
                                )
                        )
                ));
    }

    private List<DoseOptionDTO> configToDoseOptions(MedicationDTO medication, MedicationIndicationConfig config, MedicationSelectionContext context) {
        // Find the route dose options for the specific route from both regular and weight-based dose options
        Stream<DoseOptionDTO> regularDoseOptions = medication.getRouteDoseOptions().stream()
                .filter(routeOption -> routeOption.getRoute().equals(config.getRoute()))
                .flatMap(routeOption -> routeOption.getDoseOptions().stream());

        Stream<DoseOptionDTO> weightBasedDoseOptions = medication.getRouteWeightBasedDoseOptions().stream()
                .filter(routeOption -> routeOption.getRoute().equals(config.getRoute()))
                .flatMap(routeOption -> routeOption.getDoseOptions().stream());

        return Stream.concat(regularDoseOptions, weightBasedDoseOptions)
                .filter(doseOption -> matchesConfigCriteria(doseOption, config, context))
                .map(doseOption -> determineDefaultDose(doseOption, config, context))
                .collect(Collectors.collectingAndThen(
                        Collectors.toMap(
                                DoseOptionDTO::getCalculatedLabel, // Use calculated label as key for deduplication
                                Function.identity(),
                                (existing, replacement) ->
                                    // Prefer weight-based dose options over flat ones
                                    replacement.isWeightBased() ? replacement : existing
                        ),
                        map -> map.values().stream()
                                .sorted(DoseOptionDTO.DOSE_COMPARATOR) // Sort in ascending order by dose value
                                .collect(Collectors.toList())
                ));
    }

    private DoseOptionDTO determineDefaultDose(DoseOptionDTO doseOption, MedicationIndicationConfig config, MedicationSelectionContext context) {
        var defaultDose = config.getDefaultDose();
        var optionalDose = doseOption.toDose();
        var weight = context.getCalculatedPatientWeight().map( calculatedWeight -> calculatedWeight.value().quantity()).orElse(null);
        if (defaultDose.isPresent() && optionalDose.isPresent()) {
            // Convert both doses to comparable flat doses if either is weight-based
            Dose comparableDose = convertToComparableDose(optionalDose.get(), weight);
            Dose comparableDefaultDose = convertToComparableDose(defaultDose.get(), weight);
            return doseOption.toBuilder().defaultOption(comparableDose.isEquivalentTo(comparableDefaultDose)).build();
        }
        return doseOption;
    }

    private boolean matchesConfigCriteria(DoseOptionDTO doseOption, MedicationIndicationConfig config, MedicationSelectionContext context) {
        Optional<Dose> doseOptional = doseOption.toDose();
        if (doseOptional.isEmpty()) {
            // if we can't get a dose for whatever reason, keep it.
            return true;
        }
        var weight = context.getCalculatedPatientWeight().map(w -> w.value().quantity()).orElse(null);
        Dose dose = doseOptional.get().calculateDose(weight);


        // Check lower threshold (inclusive)
        Optional<Dose> lowerThreshold = config.getCalculatedLowerDoseThresholdDose(weight);
        if (lowerThreshold.isPresent()) {
            if (dose.isLessThan(lowerThreshold.get())) {
                return false;
            }
        }

        // Check upper threshold (exclusive)
        Optional<Dose> upperThreshold = config.getCalculatedUpperDoseThresholdDose(weight);
        if (upperThreshold.isPresent()) {
            if ((dose.isGreaterThanOrEqualTo(upperThreshold.get()))) {
                return false;
            }
        }

        return true;
    }


    /**
     * Convert a dose to a comparable flat dose, calculating weight-based doses if necessary.
     */
    private Dose convertToComparableDose(Dose dose, ComparableQuantity<Mass> weight) {
        if (dose instanceof Dose.PatientWeightBasedDose weightBasedDose) {
            // Get patient weight from context
            if (weight == null) {
                log.warn("No patient weight available to calculate weight-based dose: {}", dose);
                return dose;
            }
            // Calculate the flat dose
            return weightBasedDose.calculateDose(weight);
        }
        return dose;
    }

    /**
     * Extract route and citation information from MedicationIndicationConfig entities into DTOs
     */
    private List<RouteCitationInfo> extractRouteCitationInfos(List<MedicationIndicationConfig> configs) {
        return configs.stream()
                .sorted(Comparator.comparing(MedicationIndicationConfig::getIndicationRank,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .filter(config -> config.getCitationId() != null)
                .map(config -> {

                    var citationDef = citationService.findById(config.getCitationId());
                    if(citationDef.isPresent()) {
                        var citation = citationDef.get().toCitation();
                        return new RouteCitationInfo(
                                config.getRoute(),
                                citation.getId(),
                                citation.getCitation(),
                                citation.getLabel(),
                                citation.getUrl()
                        );
                    }
                    return null;
                })
                .filter(Objects::nonNull)
                .distinct() // Remove duplicates
                .collect(Collectors.toList());
    }

    /**
     * Returns route-based citations from route citation information DTOs
     */
    private Map<MedicationRoute, List<Citation>> getRouteBasedCitationsFromRouteCitationInfos(
            List<RouteCitationInfo> routeCitationInfos, Map<String, Object> details) {
        
        Map<MedicationRoute, List<Citation>> routeBasedCitations = new HashMap<>();
        
        // Group citation infos by route
        Map<MedicationRoute, List<RouteCitationInfo>> citationsByRoute = routeCitationInfos.stream()
                .collect(Collectors.groupingBy(RouteCitationInfo::route));
        
        for (Map.Entry<MedicationRoute, List<RouteCitationInfo>> entry : citationsByRoute.entrySet()) {
            MedicationRoute route = entry.getKey();
            List<RouteCitationInfo> routeCitationInfoList = entry.getValue();
            
            // Create citations with string substitution for route-specific template variables
            List<Citation> routeCitations = routeCitationInfoList.stream()
                    .distinct() // Remove duplicates if multiple indications have same citation
                    .map(citationInfo -> {
                        // Apply string substitution for route-specific template variables
                        StringSubstitutor sub = new StringSubstitutor(createRouteSubstitutionMap(route, details));
                        
                        return Citation.builder()
                                .id(citationInfo.citationId())
                                .citation(sub.replace(citationInfo.citationText()))
                                .url(citationInfo.url())
                                .label(sub.replace(citationInfo.label()))
                                .build();
                    })
                    .collect(Collectors.toList());
            
            if (!routeCitations.isEmpty()) {
                routeBasedCitations.put(route, routeCitations);
            }
        }
        
        return routeBasedCitations;
    }

    /**
     * Create substitution map for route-specific template variables
     */
    private Map<String, String> createRouteSubstitutionMap(MedicationRoute route, Map<String, Object> details) {
        var subMap = new HashMap<String, String>();
        
        // Add route-prefixed template variables for potential future use
        // Currently minimal implementation as most template variables would be context-specific
        subMap.put("ROUTE", route.toString());
        
        // Add any existing route-specific details that might be used in citations
        String routePrefix = route + "_";
        details.entrySet().stream()
                .filter(entry -> entry.getKey().startsWith(routePrefix))
                .forEach(entry -> {
                    String key = entry.getKey().substring(routePrefix.length());
                    subMap.put(key, "${" + entry.getKey() + "}");
                });
        
        return subMap;
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> details) {
        List<RouteCitationInfo> routeCitationInfos = (List<RouteCitationInfo>)
                details.getOrDefault(ROUTE_CITATION_INFOS, List.of());
        
        return EvaluationResultPromptTemplate.builder()
                .ruleIdentifier(getRuleIdentifier())
                .type(RuleType.WARNING)
                .citationsLocation(CitationLocation.NEXT_TO_DOSE_OPTIONS)
                .routeBasedCitations(getRouteBasedCitationsFromRouteCitationInfos(routeCitationInfos, details))
                .build().createPrompt(details);
    }


}
