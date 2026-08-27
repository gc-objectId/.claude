package com.guided.orci.service;

import com.guided.orci.models.medication.MedicationCategory;
import com.guided.orci.models.patient.Operation;
import com.guided.orci.models.procedure.AntibioticPathway;
import com.guided.orci.models.procedure.AntibioticPathwayOption;
import com.guided.orci.models.procedure.ProcedureType;
import com.guided.orci.multitenancy.context.TenantContextHolder;
import com.guided.orci.repository.MedicationCategoryRepository;
import com.guided.orci.types.wrappers.TenantKey;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Antibiotic pathways that belong to a combination of procedures rather than to any one of them.
 * <p>
 * Procedures performed together can call for coverage none of them calls for alone, which the
 * configuration cannot express: {@code antibiotic-pathways.csv} keys every pathway to a single
 * procedure type, and its {@code |} separator gives each named procedure its own copy rather than
 * describing them performed together. So a combination lives here, in code, until the configuration
 * grows a way to say it.
 * <p>
 * A combination's pathway <em>replaces</em> what its members configure individually instead of being
 * reconciled with them. The members' own risk scoping stops applying with it, because the pathway was
 * written for the combination as a whole.
 * <p>
 * A combination is matched as an exact set. A case carrying a further procedure is not the combination
 * the pathway was written for - that third procedure may want coverage this pathway does not provide -
 * so it falls back to the per-procedure walk in {@link ProcedureAntibioticCandidateService}.
 */
@Service
public class ProcedureCombinationPathwayService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(ProcedureCombinationPathwayService.class);

    /** A combination is one org's clinical decision, so the org identifies it as much as the procedures do. */
    private record Combination(TenantKey.Org org, Set<String> procedureTypeIdentifiers) {
    }

    /**
     * Each combination's pathway, as its steps in order. A step names the medication categories to give
     * together, and the step below it is what to fall back to when they cannot be given - the same
     * reading a configured pathway gets.
     * <p>
     * A step here holds one option. Alternatives within a step are something the configuration
     * expresses and this table does not, because no shipped combination wants them.
     */
    private static final Map<Combination, List<List<String>>> PATHWAYS = Map.of(
            new Combination(TenantKey.Org.MAYO,
                    Set.of(ProcedureType.PANCREATECTOMY, ProcedureType.BILIARY_STENT_PLACEMENT)),
            List.of(List.of(MedicationCategory.PIPERACILLIN_TAZOBACTAM),
                    List.of(MedicationCategory.LEVOFLOXACIN,
                            MedicationCategory.METRONIDAZOLE,
                            MedicationCategory.VANCOMYCIN)));

    private final MedicationCategoryRepository medicationCategoryRepository;

    public ProcedureCombinationPathwayService(MedicationCategoryRepository medicationCategoryRepository) {
        this.medicationCategoryRepository = medicationCategoryRepository;
    }

    /**
     * The pathway written for exactly the procedures this case carries, or nothing when no combination
     * covers them.
     * <p>
     * The pathway is built here rather than read from {@code antibiotic_pathways}, whose rows each
     * belong to one procedure type. It is never persisted; it exists to carry the combination through
     * the same walk, patient filtering and display path a configured pathway takes, so a combination's
     * recommendation cannot behave differently from any other.
     */
    public List<AntibioticPathway> pathwaysFor(Operation operation) {
        if (!TenantContextHolder.hasTenant()) {
            // A combination belongs to one org, so without a tenant there is nothing to match against.
            return List.of();
        }
        Set<String> procedureTypeIdentifiers = operation.getQualifiedProcedureTypes().stream()
                .map(procedure -> procedure.procedureType().getIdentifier())
                .collect(Collectors.toSet());
        Combination combination = new Combination(TenantContextHolder.getTenant().getOrg(), procedureTypeIdentifiers);
        List<List<String>> steps = PATHWAYS.get(combination);
        if (steps == null) {
            return List.of();
        }
        log.info("Operation {} matches the antibiotic pathway for procedure combination {}",
                operation.getId(), procedureTypeIdentifiers);
        return toPathway(steps, combination);
    }

    /**
     * Resolves the step's category names against this tenant's medication categories.
     * <p>
     * A name that resolves to nothing takes the whole pathway down rather than just its own step: the
     * drugs in a step are given together, so dropping one would state a regimen the combination never
     * described, and dropping the step would promote its fallback into a first choice. With nothing
     * returned the case falls back to what its procedures configure individually. This is the rule
     * {@code AntibioticPathwayCSVImporter} applies to an unresolvable drug in a configured pathway.
     * <p>
     * A category that resolves but carries no medications is left to the walk, which rules the option
     * out and falls to the next step, exactly as it does for a configured pathway.
     */
    private List<AntibioticPathway> toPathway(List<List<String>> steps, Combination combination) {
        AntibioticPathway pathway = AntibioticPathway.builder()
                // No id, and no procedure type: this pathway exists only for this resolution, and it
                // belongs to the set rather than to any one of its members. The builder would otherwise
                // mint an id that matches no stored row, which is an id something downstream could cache
                // or save. Leaving both null makes persisting one fail rather than write a phantom row.
                .id(null)
                // Risk stays null, so the pathway applies at every risk: the combination replaces the
                // members' configuration, and the scoping on that configuration goes with it.
                .options(new ArrayList<>())
                .build();
        for (int stepIndex = 0; stepIndex < steps.size(); stepIndex++) {
            List<MedicationCategory> categories = new ArrayList<>();
            for (String categoryName : steps.get(stepIndex)) {
                MedicationCategory category = medicationCategoryRepository.findByCategoryNameWithMedications(categoryName);
                if (category == null) {
                    log.error("Medication category {} does not exist, so the antibiotic pathway for procedure combination {} cannot be recommended",
                            categoryName, combination.procedureTypeIdentifiers());
                    return List.of();
                }
                categories.add(category);
            }
            pathway.addOption(AntibioticPathwayOption.builder()
                    .id(null)
                    // Steps count from 1, matching how a configured pathway reads.
                    .stepNumber(stepIndex + 1)
                    .medicationCategories(categories)
                    .build());
        }
        return List.of(pathway);
    }
}
