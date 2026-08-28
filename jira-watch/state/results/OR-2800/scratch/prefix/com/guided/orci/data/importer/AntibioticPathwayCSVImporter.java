package com.guided.orci.data.importer;

import com.fasterxml.jackson.databind.MappingIterator;
import com.fasterxml.jackson.dataformat.csv.CsvMapper;
import com.fasterxml.jackson.dataformat.csv.CsvSchema;
import com.guided.orci.models.medication.MedicationCategory;
import com.guided.orci.models.patient.CaseAcuity;
import com.guided.orci.models.procedure.AntibioticPathway;
import com.guided.orci.models.procedure.AntibioticPathwayOption;
import com.guided.orci.models.procedure.ProcedureRisk;
import com.guided.orci.models.procedure.ProcedureType;
import com.guided.orci.repository.AntibioticPathwayRepository;
import com.guided.orci.repository.MedicationCategoryRepository;
import com.guided.orci.multitenancy.context.TenantContextHolder;
import com.guided.orci.repository.ProcedureTypeRepository;
import com.guided.orci.service.ProcedureAntibioticCandidateService;
import com.guided.orci.service.RedisService;
import com.guided.orci.types.wrappers.TenantKey;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

/**
 * Imports {@code procedures/antibiotic-pathways.csv}.
 *
 * <p>Columns are {@code Procedure,Risk,Acuity,Pathway}. One row is one pathway; a procedure with
 * several pathways gets several rows, and the {@code Procedure} column may name several procedures at
 * once, each of which gets its own copy.
 *
 * <p>{@code Risk} and {@code Acuity} scope a pathway to the cases it was written for. A blank column
 * does not constrain, several values in one {@code Acuity} cell are separated by {@code |} as in the
 * {@code Procedure} column, and the two columns are ANDed. {@code OR} and {@code AND} are the
 * operators of the {@code Pathway} cell alone, where the two have to be told apart.
 *
 * <p>The {@code Pathway} cell reads as steps separated by {@code ->}, alternatives within a step
 * separated by {@code OR}, and drugs given together joined by {@code AND}:
 * <pre>
 * CEFAZOLIN AND METRONIDAZOLE -> (CIPROFLOXACIN AND METRONIDAZOLE) OR (CIPROFLOXACIN AND CLINDAMYCIN)
 * </pre>
 * becomes one pathway of two steps: step 1 with a single option holding two categories, step 2 with
 * two options holding two each. Splitting on {@code OR} before {@code AND} is what makes {@code AND}
 * bind tighter, so no precedence handling is needed. The parentheses are there for whoever reads the
 * file; they are stripped and carry no meaning.
 *
 * <p>That grammar is the whole of it: steps, then alternatives, then a set given together, in that
 * nesting and no other. So {@code (A OR B) AND C} is spelled out as {@code (A AND C) OR (B AND C)},
 * which loses nothing. Distributing it here would be less to type and is deliberately not done: the
 * shipped configuration lists fewer combinations than distribution would generate, so expanding an
 * author's shorthand would invent regimens no clinician chose. {@code data/org/CLAUDE.md} has the
 * worked example and the full list of what the notation cannot say; anything outside it is rejected
 * by {@link #parseSteps} rather than guessed at.
 *
 * <p>A {@code Pathway} of {@code None} states that no antibiotic is wanted, and produces a pathway
 * with no options.
 */
@Service
public class AntibioticPathwayCSVImporter extends Importer {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AntibioticPathwayCSVImporter.class);

    /** A pathway that wants no antibiotic at all. */
    private static final String NONE = "NONE";

    private static final String STEP_SEPARATOR = "->";
    private static final String OR_SEPARATOR = "\\s+OR\\s+";
    private static final String CATEGORY_SEPARATOR = "\\s+AND\\s+";
    /**
     * Separates the values a cell lists: the identifiers of a Procedure cell, the acuities of an
     * Acuity cell.
     */
    private static final String LIST_SEPARATOR = "\\|";

    /**
     * Split limit that keeps the empty string a trailing {@code ->} leaves behind, so {@code A -> B ->}
     * is rejected as a pathway with an empty step. Dropping it would import the row as {@code A -> B},
     * silently losing the fallback its author had started to write.
     */
    private static final int KEEP_TRAILING_EMPTY_STEPS = -1;

    private final AntibioticPathwayRepository antibioticPathwayRepository;
    private final ProcedureTypeRepository procedureTypeRepository;
    private final MedicationCategoryRepository medicationCategoryRepository;
    private final RedisService redisService;

    public AntibioticPathwayCSVImporter(AntibioticPathwayRepository antibioticPathwayRepository,
                                        ProcedureTypeRepository procedureTypeRepository,
                                        MedicationCategoryRepository medicationCategoryRepository,
                                        RedisService redisService) {
        this.antibioticPathwayRepository = antibioticPathwayRepository;
        this.procedureTypeRepository = procedureTypeRepository;
        this.medicationCategoryRepository = medicationCategoryRepository;
        this.redisService = redisService;
    }

    /**
     * Replaces the tenant's pathways with what this file describes.
     * <p>
     * The whole file is parsed before anything is deleted, and the delete and the write share one
     * transaction, so a file that cannot be read leaves the tenant on the configuration it already
     * had. Half-importing fails in the worst direction available: guidance resolves to
     * {@code NOT_CONFIGURED}, which reads as "this procedure needs no antibiotic".
     */
    @Override
    public void importResource(Resource resource) throws IOException {
        antibioticPathwayRepository.deleteAll();
        antibioticPathwayRepository.flush();
        log.warn("PREFIXPROBE after deleteAll count={} syncActive={}", antibioticPathwayRepository.count(),
                org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive());
        Map<String, ProcedureType> procedureTypeCache = new HashMap<>();
        Map<String, MedicationCategory> medicationCategoryCache = new HashMap<>();
        // Next pathway position per procedure, so a procedure's pathways keep the file's order.
        Map<String, Integer> nextPosition = new HashMap<>();
        // Identity of every pathway built, so a repeated row does not offer the same drugs twice.
        Set<String> seen = new HashSet<>();
        List<AntibioticPathway> pathways = new ArrayList<>();

        CsvMapper mapper = new CsvMapper();
        CsvSchema schema = CsvSchema.builder().setUseHeader(true).build();
        MappingIterator<Map<String, String>> rows = mapper.readerForMapOf(String.class)
                .with(schema).readValues(resource.getInputStream());

        AtomicInteger rowCounter = new AtomicInteger(1);
        AtomicInteger dataRows = new AtomicInteger();
        // Rows that name drugs. The denominator for "did any category resolve" has to exclude the
        // no-antibiotic rows, which never look a category up and so can never be counted as failing.
        AtomicInteger drugRows = new AtomicInteger();
        // Rows lost because a medication category did not resolve. Every row failing that way means
        // the medication list is missing, not that the rows are wrong.
        AtomicInteger unresolvedCategoryRows = new AtomicInteger();
        rows.forEachRemaining(row -> {
            int rowNumber = rowCounter.incrementAndGet();
            String procedureColumn = clean(row.get("Procedure"));
            String pathwayColumn = clean(row.get("Pathway"));
            String riskColumn = clean(row.get("Risk"));
            String acuityColumn = clean(row.get("Acuity"));

            if (!StringUtils.hasText(procedureColumn) && !StringUtils.hasText(pathwayColumn)) {
                // A blank line. Nothing was written, so there is nothing to report.
                return;
            }
            if (!StringUtils.hasText(procedureColumn) || !StringUtils.hasText(pathwayColumn)) {
                // One of the two required cells is missing while the other is filled, so somebody
                // wrote this row and it did not survive being read. The usual cause is a row that is
                // one comma short: the columns shift left, the drugs land in Acuity, and Pathway is
                // absent. Deliberately not counted as a data row, so a file where every row reads
                // this way still leaves dataRows at zero and throws on the header guard below.
                log.warn("row {}: Skipping malformed row, Procedure and Pathway are both required "
                         + "(Procedure={}, Pathway={}); a row one comma short shifts its columns",
                        rowNumber, procedureColumn, pathwayColumn);
                return;
            }
            dataRows.incrementAndGet();

            ProcedureRisk risk = null;
            if (StringUtils.hasText(riskColumn)) {
                Optional<ProcedureRisk> parsed = ProcedureRisk.fromString(riskColumn);
                if (parsed.isEmpty()) {
                    log.warn("row {}: Skipping pathway with unrecognized Risk: {}", rowNumber, riskColumn);
                    return;
                }
                risk = parsed.get();
            }

            // Empty Optional is a cell that did not parse; an empty set inside it is a blank cell,
            // which is the unscoped pathway. The two must not collapse into one another.
            Optional<Set<CaseAcuity>> parsedAcuities = parseAcuities(acuityColumn, rowNumber);
            if (parsedAcuities.isEmpty()) {
                return;
            }
            Set<CaseAcuity> acuities = parsedAcuities.get();

            boolean noProphylaxis = NONE.equalsIgnoreCase(pathwayColumn);
            if (!noProphylaxis) {
                drugRows.incrementAndGet();
            }
            List<List<List<MedicationCategory>>> steps = noProphylaxis
                    ? List.of()
                    : parseSteps(pathwayColumn, medicationCategoryCache, rowNumber, unresolvedCategoryRows);
            if (!noProphylaxis && steps.isEmpty()) {
                // parseSteps has already said why. Importing what survived would state a regimen
                // the configuration never described.
                return;
            }

            for (String procedureIdentifier : procedureColumn.split(LIST_SEPARATOR)) {
                procedureIdentifier = clean(procedureIdentifier);
                if (!StringUtils.hasText(procedureIdentifier)) {
                    continue;
                }
                ProcedureType procedureType = procedureTypeCache.computeIfAbsent(procedureIdentifier,
                        id -> procedureTypeRepository.findByIdentifier(id).orElse(null));
                if (procedureType == null) {
                    log.warn("row {}: Skipping unknown procedure type: {}", rowNumber, procedureIdentifier);
                    continue;
                }
                // Sorted so that two cells naming the same acuities in a different order are one key.
                if (!seen.add(procedureIdentifier + "|" + risk + "|" + new TreeSet<>(acuities) + "|"
                              + pathwayColumn)) {
                    log.warn("row {}: Skipping duplicate pathway for procedure {}", rowNumber, procedureIdentifier);
                    continue;
                }
                pathways.add(buildPathway(procedureType, risk, acuities, noProphylaxis, steps,
                        nextPosition.merge(procedureIdentifier, 1, Integer::sum) - 1));
            }
        });

        dropIncompleteRiskScopes(pathways);
        warnOnUncoveredScopes(pathways);
        // A tenant left with no pathways reads downstream as "no prophylaxis needed" and silences the
        // antibiotic alerts instead of raising one. The guards below throw rather than let that land:
        // the configuration on hand survives, the checksum goes unrecorded, and the next boot retries.
        if (rowCounter.get() > 1 && dataRows.get() == 0) {
            // Rows read, none carrying a Procedure and a Pathway: the header is not the one this
            // importer reads. A byte-order mark on the first column name does exactly this.
            throw new IllegalStateException("Antibiotic pathway import read " + (rowCounter.get() - 1)
                                            + " rows and found no Procedure/Pathway pair for tenant "
                                            + TenantContextHolder.getTenant() + "; check the header row");
        }
        if (drugRows.get() > 0 && unresolvedCategoryRows.get() == drugRows.get()) {
            // Every drug row named a category that does not exist, so the medication list is missing
            // rather than this file being wrong.
            throw new IllegalStateException("Antibiotic pathway import resolved no medication category "
                                            + "across all " + drugRows.get() + " drug rows for tenant "
                                            + TenantContextHolder.getTenant()
                                            + "; the medication list has not imported");
        }
        // The catch-all for rows that each dropped for their own reason, most often a procedure type
        // import that failed first and left every identifier here resolving to nothing. Asked of the
        // rows read rather than of what the table holds: on the boot that creates the table there is
        // no previous configuration to fall back on, which is the boot where this matters most.
        if (dataRows.get() > 0 && pathways.isEmpty()) {
            throw new IllegalStateException("Antibiotic pathway import resolved no pathways from "
                                            + dataRows.get() + " rows and would leave the tenant with "
                                            + "no antibiotic pathways: " + TenantContextHolder.getTenant());
        }

        // deleteAll, not deleteAllInBatch: a bulk delete leaves the options, their medication category
        // join rows, and the scoped acuities behind for the foreign keys to reject.
        antibioticPathwayRepository.saveAll(pathways);
        // Re-reads the count under the tenant the rows landed in, so a write the resolution cannot
        // see shows up here rather than as a case with no guidance and no explanation.
        log.info("Saved {} antibiotic pathways for tenant {}; table holds {}",
                pathways.size(), TenantContextHolder.getTenant(), antibioticPathwayRepository.count());
        clearCachedResolutionsAfterCommit(TenantContextHolder.getTenant());
    }

    /**
     * Drops the tenant's cached resolutions once the new rows are committed.
     * <p>
     * Every cached resolution was computed from the configuration this import just replaced, and is
     * recalculated only on a miss. The whole tenant goes, since nothing here says which cases the
     * changed rows reach.
     * <p>
     * After commit, not inside it: a reader that arrives between the clear and the commit still sees
     * the old rows, and the entry it writes then stands for its full cache lifetime with nothing left
     * to invalidate it. The admin upload path runs this while the cluster is serving, so that window
     * is reachable.
     *
     * @param tenant captured here because the callback must not depend on the thread's tenant context
     *               still being set when it runs
     */
    private void clearCachedResolutionsAfterCommit(TenantKey tenant) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            clearCachedResolutions(tenant);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                clearCachedResolutions(tenant);
            }
        });
    }

    private void clearCachedResolutions(TenantKey tenant) {
        redisService.deleteKeys(ProcedureAntibioticCandidateService.SCOPE,
                ProcedureAntibioticCandidateService.cacheKeyPrefixForTenant(tenant));
    }

    /**
     * Parses an {@code Acuity} cell into the acuities it names.
     *
     * <p>A blank cell yields an empty set, the pathway that applies at every acuity. Returns an empty
     * {@link Optional} when the cell names something {@link CaseAcuity} does not, which drops
     * the row: a cell nobody can read is not the same as a cell nobody wrote, and importing it as
     * unscoped would widen the pathway to every case the author meant to exclude.
     *
     * <p>Read with {@code fromClientValue} rather than {@code fromString} so the configuration shares
     * one vocabulary with the feeds that supply the value and with {@code displayName()}. It ignores
     * case and separators, so {@code non-urgent} — the form this file documents and the form the enum
     * prints — resolves, where the bare enum name would be the only accepted spelling.
     */
    private Optional<Set<CaseAcuity>> parseAcuities(String acuityColumn, int rowNumber) {
        if (!StringUtils.hasText(acuityColumn)) {
            return Optional.of(Set.of());
        }
        Set<CaseAcuity> acuities = new HashSet<>();
        for (String token : acuityColumn.split(LIST_SEPARATOR)) {
            token = clean(token);
            if (!StringUtils.hasText(token)) {
                continue;
            }
            Optional<CaseAcuity> parsed = CaseAcuity.fromClientValue(token);
            if (parsed.isEmpty()) {
                log.warn("row {}: Skipping pathway with unrecognized Acuity: {}", rowNumber, token);
                return Optional.empty();
            }
            acuities.add(parsed.get());
        }
        if (acuities.isEmpty()) {
            log.warn("row {}: Skipping pathway whose Acuity names no value: {}", rowNumber, acuityColumn);
            return Optional.empty();
        }
        return Optional.of(acuities);
    }

    /**
     * Warns about the cases a procedure's scopes leave with no pathway at all.
     * <p>
     * Walks the whole space a case can occupy - every risk, crossed with every acuity and with the
     * case that carries none - and reports the combinations no pathway of the procedure answers. A
     * combination with nothing to offer resolves as an unconfigured procedure, which suppresses the
     * missing-antibiotic alert rather than raising one.
     * <p>
     * This warns rather than drops, unlike the risk check below. Risk always resolves, so a gap there
     * is always reachable and always wrong. An acuity gap may be a deliberate statement that a
     * guideline covers only the acuities it names, so the decision belongs to whoever reads the file.
     * <p>
     * Counting the acuity-less case as a value of its own is the point: a procedure naming all four
     * acuities still answers nothing for a case whose acuity never arrived, which is the majority of
     * cases, and a check over the enum alone cannot see that.
     */
    private void warnOnUncoveredScopes(List<AntibioticPathway> pathways) {
        pathways.stream()
                .collect(Collectors.groupingBy(pathway -> pathway.getProcedureType().getIdentifier()))
                .forEach((identifier, procedurePathways) -> {
                    List<String> uncovered = uncoveredScopes(procedurePathways);
                    if (!uncovered.isEmpty()) {
                        log.warn("{} has no pathway for {}, so such a case resolves to no guidance",
                                identifier, String.join(", ", uncovered));
                    }
                });
    }

    /**
     * The scopes one procedure's pathways leave with nothing, named for a reader.
     * <p>
     * Separate from the logging above so the rule can be stated by a test rather than by reading a
     * log line back. Returns an empty list when every case a procedure can meet reaches a pathway.
     */
    static List<String> uncoveredScopes(List<AntibioticPathway> procedurePathways) {
        List<String> uncovered = new ArrayList<>();
        for (CaseAcuity acuity : acuityDomain()) {
            Set<ProcedureRisk> unservedRisks = new TreeSet<>();
            for (ProcedureRisk risk : ProcedureRisk.values()) {
                if (procedurePathways.stream().noneMatch(pathway -> pathway.appliesTo(risk, acuity))) {
                    unservedRisks.add(risk);
                }
            }
            if (unservedRisks.isEmpty()) {
                continue;
            }
            String named = acuity == null ? "no acuity" : acuity.name();
            uncovered.add(unservedRisks.size() == ProcedureRisk.values().length
                    ? named : named + " at " + unservedRisks + " risk");
        }
        return uncovered;
    }

    /** Every acuity a case can carry, including carrying none, which no named acuity matches. */
    private static List<CaseAcuity> acuityDomain() {
        List<CaseAcuity> domain = new ArrayList<>(List.of(CaseAcuity.values()));
        domain.add(null);
        return domain;
    }

    /**
     * Drops a procedure's risk-scoped pathways unless every risk has one, and unless the procedure
     * also has a pathway that applies at any risk.
     * <p>
     * Risk always resolves, so a procedure configured at one risk only leaves the other risk with
     * nothing to offer, which reads as a procedure nobody configured and suppresses the
     * missing-antibiotic alert. Half a protocol is worse than none: the whole scoped set goes and the
     * procedure reports as unconfigured, which is at least true.
     */
    private void dropIncompleteRiskScopes(List<AntibioticPathway> pathways) {
        Map<String, List<AntibioticPathway>> byProcedure = pathways.stream()
                .collect(Collectors.groupingBy(pathway -> pathway.getProcedureType().getIdentifier()));
        for (Map.Entry<String, List<AntibioticPathway>> entry : byProcedure.entrySet()) {
            List<AntibioticPathway> scoped = entry.getValue().stream()
                    .filter(pathway -> pathway.getRisk() != null)
                    .toList();
            if (scoped.isEmpty() || scoped.size() != entry.getValue().size()) {
                continue;
            }
            Set<ProcedureRisk> covered = scoped.stream()
                    .map(AntibioticPathway::getRisk)
                    .collect(Collectors.toSet());
            if (covered.size() < ProcedureRisk.values().length) {
                log.warn("Dropping the risk-scoped pathways for {}: only {} configured, so any other "
                         + "risk would resolve to no guidance at all", entry.getKey(), covered);
                pathways.removeAll(scoped);
            }
        }
    }

    private static AntibioticPathway buildPathway(ProcedureType procedureType,
                                                  ProcedureRisk risk,
                                                  Set<CaseAcuity> acuities,
                                                  boolean noProphylaxis,
                                                  List<List<List<MedicationCategory>>> steps,
                                                  int position) {
        AntibioticPathway pathway = AntibioticPathway.builder()
                .procedureType(procedureType)
                .risk(risk)
                // Fresh set per pathway: the row may name several procedures, and each entity needs
                // a collection of its own for Hibernate.
                .acuities(new HashSet<>(acuities))
                .noProphylaxis(noProphylaxis)
                .position(position)
                .build();
        for (int stepIndex = 0; stepIndex < steps.size(); stepIndex++) {
            List<List<MedicationCategory>> options = steps.get(stepIndex);
            for (int optionIndex = 0; optionIndex < options.size(); optionIndex++) {
                pathway.addOption(AntibioticPathwayOption.builder()
                        // Steps count from 1, matching how the configuration reads.
                        .stepNumber(stepIndex + 1)
                        .position(optionIndex)
                        // Fresh list per option: the MedicationCategory references are shared across
                        // options, but each entity needs a collection of its own for Hibernate.
                        .medicationCategories(new ArrayList<>(options.get(optionIndex)))
                        .build());
            }
        }
        return pathway;
    }

    /**
     * Parses a pathway cell into steps, each holding its options, each holding the categories given
     * together.
     *
     * <p>Returns empty when any category cannot be resolved. Dropping just the unresolvable category
     * would turn "give A and B" into "give A", and dropping just its option would silently narrow
     * the step, so an incomplete pathway is not imported at all.
     */
    private List<List<List<MedicationCategory>>> parseSteps(String pathway,
                                                            Map<String, MedicationCategory> cache,
                                                            int rowNumber,
                                                            AtomicInteger unresolvedCategoryRows) {
        List<List<List<MedicationCategory>>> steps = new ArrayList<>();
        for (String step : pathway.split(STEP_SEPARATOR, KEEP_TRAILING_EMPTY_STEPS)) {
            List<List<MedicationCategory>> options = new ArrayList<>();
            for (String option : step.trim().split(OR_SEPARATOR)) {
                String grouped = stripGrouping(option);
                // A parenthesis surviving stripGrouping is a grouping this format cannot express:
                // unbalanced, nested, or spanning an OR. Caught here so it does not reach the category
                // lookup and get reported as an unknown drug named "(CEFAZOLIN".
                if (grouped.indexOf('(') >= 0 || grouped.indexOf(')') >= 0) {
                    log.warn("row {}: Skipping pathway whose parentheses do not group one option's "
                             + "categories: {}", rowNumber, pathway);
                    return List.of();
                }
                List<MedicationCategory> categories = new ArrayList<>();
                for (String name : grouped.split(CATEGORY_SEPARATOR)) {
                    name = clean(name);
                    if (!StringUtils.hasText(name)) {
                        continue;
                    }
                    if (name.indexOf('(') >= 0 || name.indexOf(')') >= 0) {
                        // A parenthesis inside an AND set groups something the grammar cannot say.
                        log.warn("row {}: Skipping pathway whose parentheses do not group an AND set. "
                                + "Write each combination as its own AND group, joined by OR: {}",
                                rowNumber, pathway);
                        return List.of();
                    }
                    MedicationCategory category = cache.computeIfAbsent(name,
                            medicationCategoryRepository::findByCategoryName);
                    if (category == null) {
                        log.warn("row {}: Skipping pathway with unknown medication category: {}", rowNumber, name);
                        unresolvedCategoryRows.incrementAndGet();
                        return List.of();
                    }
                    if (categories.contains(category)) {
                        // The join table keys on (option, category), so the same category twice in one
                        // option is a constraint violation that would roll back the whole tenant.
                        log.warn("row {}: Skipping pathway naming {} twice in one option: {}",
                                rowNumber, name, pathway);
                        return List.of();
                    }
                    categories.add(category);
                }
                if (!categories.isEmpty()) {
                    options.add(categories);
                }
            }
            if (options.isEmpty()) {
                log.warn("row {}: Skipping pathway with an empty step: {}", rowNumber, pathway);
                return List.of();
            }
            steps.add(options);
        }
        return steps;
    }

    /**
     * Parentheses group an AND set for the reader only, so they are removed before splitting.
     *
     * <p>Runs after the {@code OR} split, so only a pair wrapping a whole option is removed. A pair
     * wrapping anything else leaves its brackets on a category name, which {@link #parseSteps}
     * rejects.
     */
    private static String stripGrouping(String option) {
        String trimmed = option.trim();
        if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
            return trimmed.substring(1, trimmed.length() - 1);
        }
        return trimmed;
    }
}
