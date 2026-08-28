package com.guided.orci.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.base.Stopwatch;
import com.guided.orci.dto.AntibioticCandidateDebugDTO;
import com.guided.orci.dto.AntibioticResolution;
import com.guided.orci.dto.CaseAntibioticProtocol;
import com.guided.orci.dto.MedicationDTO;
import com.guided.orci.dto.OperationDTO;
import com.guided.orci.dto.ProcedureAntibioticOptionDTO;
import com.guided.orci.dto.ProcedureTypeDTO;
import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.engine.MedicationSelectionContext;
import com.guided.orci.engine.MedicationSelectionRuleEngine;
import com.guided.orci.engine.PromptType;
import com.guided.orci.engine.rule.RuleCategory;
import com.guided.orci.featureflags.FeatureFlagService;
import com.guided.orci.models.medication.Medication;
import com.guided.orci.models.medication.MedicationCategory;
import com.guided.orci.models.patient.CaseAcuity;
import com.guided.orci.models.patient.Operation;
import com.guided.orci.models.patient.Patient;
import com.guided.orci.models.procedure.AntibioticPathway;
import com.guided.orci.models.procedure.AntibioticPathwayOption;
import com.guided.orci.models.procedure.ProcedureRisk;
import com.guided.orci.models.procedure.QualifiedProcedureType;
import com.guided.orci.models.user.User;
import com.guided.orci.multitenancy.context.TenantContextHolder;
import com.guided.orci.repository.OperationRepository;
import com.guided.orci.repository.PatientRepository;
import com.guided.orci.repository.AntibioticPathwayRepository;
import com.guided.orci.repository.UserRepository;
import com.guided.orci.service.rules.RuleService;
import com.guided.orci.types.PediatricStatus;
import com.guided.orci.types.wrappers.TenantKey;
import com.guided.orci.utils.TenantUtils;
import jakarta.transaction.Transactional;
import org.jetbrains.annotations.NotNull;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import javax.annotation.Nullable;
import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Resolves a case's antibiotic guidance: the procedures' configured pathways, walked against one
 * patient, reduced to the drugs that are safe to give.
 * <p>
 * A pathway is an ordered list of steps. A step holds options, which are alternatives to each other.
 * An option holds medication categories, which are given together. Every pathway of a procedure is
 * walked, each contributes the surviving options of its first step to have any, and the survivors are
 * pooled. A step number counts only within its own pathway, so one pathway's steps are not ordered
 * against another's.
 * <p>
 * Every pathway has to survive. One whose every step is ruled out leaves its procedure recommending
 * nothing rather than dropping out, because the route it states has no answer for this patient and
 * the pathways that did survive were written for a different question. Across procedures, an option
 * is offered when it names every drug of one of each procedure's surviving options.
 * <p>
 * A case whose procedures have a pathway written for them performed together walks that instead, and
 * none of them is read on its own terms - see {@link ProcedureCombinationPathwayService}.
 * <p>
 * The walk, its outcomes and the questions it deliberately leaves open are specified in
 * {@code service/ANTIBIOTIC_PATHWAY_RESOLUTION.md}. Read that before changing behaviour here.
 * <p>
 * Results are cached per tenant, case and user, because allergy suppression and toleration are per
 * user. Anything that changes an input to the walk has to invalidate at the matching scope.
 */
@Service
public class ProcedureAntibioticCandidateService implements TenantScopedRedisCache {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(ProcedureAntibioticCandidateService.class);

    /**
     * Namespaces the cached resolutions, and carries the shape they are stored in.
     * <p>
     * A stored resolution binds without rejecting unknown or absent fields, so an entry written under
     * an earlier shape is read as valid rather than failing. Deploys overlap and entries live for
     * {@link #CACHE_DURATION}, so the shape has to be part of the key: bump this whenever
     * {@link AntibioticResolution} or anything it holds gains, loses or renames a field. Entries under
     * the old name are then unreachable and expire on their own.
     */
    public static final String SCOPE = "antibiotic-resolution-v3";

    /** Matches what RedisService applies by default; a case outlives this only in theory. */
    private static final Duration CACHE_DURATION = Duration.ofHours(24);

    private final RuleService ruleService;
    private final AntibioticPathwayRepository antibioticPathwayRepository;
    private final MedicationSelectionRuleEngine medicationSelectionRuleEngine;
    private final AllergySuppressionService allergySuppressionService;
    private final RedisService redisService;
    private final PatientService patientService;
    private final OperationRepository operationRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final MedicationTolerationService medicationTolerationService;
    private final FeatureFlagService featureFlagService;
    private final ObjectMapper objectMapper;
    private final ProcedureCombinationPathwayService procedureCombinationPathwayService;

    public ProcedureAntibioticCandidateService(MedicationSelectionRuleEngine medicationSelectionRuleEngine, RuleService ruleService, AntibioticPathwayRepository antibioticPathwayRepository, AllergySuppressionService allergySuppressionService, RedisService redisService, PatientService patientService, OperationRepository operationRepository, PatientRepository patientRepository, UserRepository userRepository, MedicationTolerationService medicationTolerationService, FeatureFlagService featureFlagService, ObjectMapper objectMapper, ProcedureCombinationPathwayService procedureCombinationPathwayService) {
        this.medicationSelectionRuleEngine = medicationSelectionRuleEngine;
        this.ruleService = ruleService;
        this.antibioticPathwayRepository = antibioticPathwayRepository;
        this.allergySuppressionService = allergySuppressionService;
        this.redisService = redisService;
        this.patientService = patientService;
        this.operationRepository = operationRepository;
        this.patientRepository = patientRepository;
        this.userRepository = userRepository;
        this.medicationTolerationService = medicationTolerationService;
        this.featureFlagService = featureFlagService;
        this.objectMapper = objectMapper;
        this.procedureCombinationPathwayService = procedureCombinationPathwayService;
    }

    @Async
    @Transactional
    public void asynchronouslyRebuildCandidates(Patient patient, Operation operation, User user) {
        // Re-attach before touching anything but the ids. This runs on its own thread, after the
        // caller's transaction committed, so every argument arrives detached and reading a lazy
        // association off one - as the cache key does, through the operation's procedure types -
        // would throw.
        user = userRepository.findById(user.getId()).orElseThrow();
        patient = patientRepository.findById(patient.getId()).orElseThrow();
        operation = operationRepository.findById(operation.getId()).orElseThrow();
        // Dropped now rather than on commit. This already runs after the caller's transaction
        // committed, so there is no pending write to race, and the resolve below has to miss the
        // cache for the rebuild to happen at all.
        dropCachedResolution(operation, user);
        resolve(patient, operation, user);
    }

    /** The immediate drop. Callers outside a settled write want {@link #invalidateCachedCandidates}. */
    private void dropCachedResolution(Operation operation, @Nullable User user) {
        redisService.deleteHashValue(SCOPE, caseKey(operation), userField(user));
    }

    /**
     * Drops one user's cached resolution for a case, for a change only that user sees: their allergy
     * suppression or their toleration settings.
     * <p>
     * The patient's own allergies are not such a change. They are a fact about the patient, so every
     * reader of the case is answering a different question afterwards, including the no-user
     * resolution the event and HL7 paths read. Those go through {@link #invalidateCachedCandidates(Operation)}.
     */
    public void invalidateCachedCandidates(Operation operation, @Nullable User user) {
        String key = caseKey(operation);
        String field = userField(user);
        runAfterCommit(() -> redisService.deleteHashValue(SCOPE, key, field));
    }

    /**
     * Drops every user's cached resolution for a case, for a change to what the case itself
     * configures: its procedures, their qualifiers, or its acuity. A writer of those has no
     * user to name and must not leave another user reading the superseded answer.
     */
    public void invalidateCachedCandidates(Operation operation) {
        String key = caseKey(operation);
        runAfterCommit(() -> redisService.deleteValue(SCOPE, key));
    }

    /**
     * Drops every cached resolution for a tenant. A stored resolution is a snapshot of the drugs and
     * the procedure names as they read at the time, so re-importing the configuration or the
     * medication list is the moment to discard the tenant's answers wholesale.
     */
    @Override
    public void clearCacheForTenant(TenantKey tenantKey) {
        String prefix = cacheKeyPrefixForTenant(tenantKey);
        runAfterCommit(() -> redisService.deleteKeys(SCOPE, prefix));
    }

    /**
     * Drops a cached answer once the change that supersedes it is committed, not while it is still
     * pending.
     * <p>
     * A reader arriving between the drop and the commit still sees the old rows, so the entry it
     * writes stands for the full {@link #CACHE_DURATION} with nothing left to invalidate it. Every
     * writer here runs inside a transaction, and several of them serve a live cluster, so the window
     * is reachable. Placed on the invalidation rather than on each caller so a new writer cannot
     * reintroduce the race by forgetting.
     * <p>
     * The keys are computed by the caller, before this runs: they read the tenant context and the
     * operation, and neither is guaranteed to be readable from the callback.
     * <p>
     * With no transaction in progress there is nothing to wait for, so the drop happens immediately.
     */
    private static void runAfterCommit(Runnable invalidation) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            invalidation.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                invalidation.run();
            }
        });
    }

    /**
     * The prefix every one of a tenant's cache keys starts with. Exposed so a writer that invalidates
     * the whole tenant at once does not have to know how a key is put together.
     */
    public static String cacheKeyPrefixForTenant(TenantKey tenantKey) {
        return "tenant:" + tenantKey.value() + "/";
    }

    /**
     * The single antibiotic answer for a case and patient: what the procedures' pathways call for,
     * plus the options that are safe for this patient. Every caller consumes this one result, so the
     * drugs an alert recommends, the procedures it credits, and whether the case wants prophylaxis at
     * all cannot drift apart.
     * <p>
     * The walk is specified in {@code service/ANTIBIOTIC_PATHWAY_RESOLUTION.md}.
     * <p>
     * Note: caches the whole resolution, including one that prefers nothing. Call
     * {@code invalidateCachedCandidates} to force recalculation.
     *
     * @param user if user is passed, then the user's allergy suppression settings will be used
     */
    @Transactional
    public AntibioticResolution resolve(Patient patient, Operation operation, @Nullable User user) {
        var tenantKey = TenantContextHolder.getTenant();
        Optional<AntibioticResolution> cached = getResolutionFromCache(operation, user);
        if (cached.isPresent()) {
            return cached.get();
        }

        List<ProcedurePathways> pathwaysPerProcedure = applicablePathways(operation);
        CaseAntibioticProtocol protocol = toProtocol(pathwaysPerProcedure, true);
        if (!protocol.callsForProphylaxis()) {
            // Either nothing is configured or every procedure deliberately wants no antibiotic. Both
            // are answers, and neither needs the patient narrowed against anything.
            //
            // Logged because this answer is cached and silences every antibiotic alert on the case,
            // which is otherwise indistinguishable from pathways that failed to load.
            log.info("Operation {} has no antibiotic pathways to walk under tenant {}: {} (tenant holds {} pathways)",
                    operation.getId(), tenantKey,
                    pathwaysPerProcedure.stream()
                            .map(pathways -> pathways.procedure().procedureType().getIdentifier()
                                             + " drug=" + pathways.drug().size()
                                             + " none=" + pathways.noProphylaxis())
                            .toList(),
                    antibioticPathwayRepository.count());
            AntibioticResolution unfiltered = AntibioticResolution.unfiltered(protocol);
            setResolutionInCache(operation, user, unfiltered);
            return unfiltered;
        }

        Stopwatch watch = Stopwatch.createStarted();
        MedicationSelectionContext context = new MedicationSelectionContext();
        context.buildAndSetContextPatient(patient, patientService);
        context.setZoneId(TenantUtils.getTenantTimeZone(tenantKey).toZoneId());
        context.setOperation(new OperationDTO(operation));
        // Selection rules run against this context, so give them the same configuration every other
        // consumer sees. Nothing is preferred yet - that is what is being computed.
        context.setAntibiotics(Optional.of(AntibioticResolution.unfiltered(protocol)));
        if (user != null) {
            context.setEvaluatingUserId(user.getId());
            context.setEnabledFeatureFlags(featureFlagService.getEnabledFeatures(user, true));
            allergySuppressionService.doAllergySuppression(context, user, operation);
        } else {
            context.setEnabledFeatureFlags(featureFlagService.getEnabledFeatures(tenantKey, true));
        }

        // Categories a selection rule ruled out while walking. A category the walk never reached is
        // absent, which is what tells "unsafe for this patient" from "an earlier step answered".
        Set<String> contraindicated = new LinkedHashSet<>();
        CaseSurvivors survivors = survivingOptions(pathwaysPerProcedure, new Walk(
                operation,
                toleratedMedicationCategories(user, operation),
                ruleService.getRulesWithRuleCategory(RuleCategory.FILTERS_ANTIBIOTIC_CANDIDATES),
                context,
                contraindicated,
                new HashMap<>()));
        log.info("Finished ProcedureAntibioticCandidateService.resolve - {}", watch.stop());

        if (survivors.disagreed()) {
            log.info("Operation {} has procedures whose surviving options do not overlap - suppressing recommendation",
                    operation.getId());
            protocol = toProtocol(pathwaysPerProcedure, false);
        }
        AntibioticResolution resolution = new AntibioticResolution(protocol, toDTOs(survivors.shared()), contraindicated);
        setResolutionInCache(operation, user, resolution);
        return resolution;
    }

    /**
     * The case's guidance with the configuration it came from, for the in-app debugger: every pathway
     * its procedures configure, each option marked with what the walk made of it.
     * <p>
     * Lists the pathways this case is scoped out of by risk or acuity as well, marked
     * {@code appliesToCase = false}, since a pathway the walk was never allowed to read is a common
     * reason the recommendation is not the one a reader expected.
     * <p>
     * Reads the cached resolution rather than re-walking, so what it explains is the answer guidance
     * is actually serving. A caller wanting the walk re-run invalidates first.
     */
    @Transactional
    public AntibioticCandidateDebugDTO explain(Patient patient, Operation operation, @Nullable User user) {
        AntibioticResolution resolution = resolve(patient, operation, user);
        CaseAcuity acuity = CaseAcuity.fromString(operation.getAcuity())
                .orElse(null);
        Set<Set<String>> recommended = resolution.preferred().stream()
                .map(ProcedureAntibioticCandidateService::drugsOf)
                .collect(Collectors.toSet());
        List<AntibioticCandidateDebugDTO.ProcedureDebug> procedures = operation.getQualifiedProcedureTypes().stream()
                .sorted(Comparator.comparing(procedure -> procedure.procedureType().getIdentifier()))
                .map(procedure -> {
                    String identifier = procedure.procedureType().getIdentifier();
                    // The rating as stored for the badge, and the risk the walk actually matched on,
                    // which is the default where the rating never ran.
                    ProcedureRisk rated = ratedProcedureRisk(operation, identifier);
                    ProcedureRisk risk = procedureRisk(operation, identifier);
                    return new AntibioticCandidateDebugDTO.ProcedureDebug(
                            ProcedureTypeDTO.create(procedure),
                            rated,
                            antibioticPathwayRepository
                                    .findByProcedureType_IdentifierOrderByPositionAsc(identifier)
                                    .stream()
                                    .map(pathway -> explainPathway(pathway, risk, acuity, recommended,
                                            resolution.contraindicated()))
                                    .toList());
                })
                .toList();
        return new AntibioticCandidateDebugDTO(resolution.outcome(), acuity, resolution.preferred(),
                resolution.contraindicated(), procedures);
    }

    private static AntibioticCandidateDebugDTO.PathwayDebug explainPathway(AntibioticPathway pathway,
                                                                          @Nullable ProcedureRisk procedureRisk,
                                                                          @Nullable CaseAcuity caseAcuity,
                                                                          Set<Set<String>> recommended,
                                                                          Set<String> contraindicated) {
        List<AntibioticCandidateDebugDTO.StepDebug> steps = pathway.getOptions().stream()
                .collect(Collectors.groupingBy(AntibioticPathwayOption::getStepNumber, TreeMap::new, Collectors.toList()))
                .entrySet().stream()
                .map(step -> new AntibioticCandidateDebugDTO.StepDebug(step.getKey(), step.getValue().stream()
                        .map(option -> explainOption(option, recommended, contraindicated))
                        .toList()))
                .toList();
        return new AntibioticCandidateDebugDTO.PathwayDebug(pathway.getPosition(), pathway.getRisk(),
                pathway.getAcuities(), pathway.appliesTo(procedureRisk, caseAcuity), pathway.isNoProphylaxis(),
                pathway.toNotation(), steps);
    }

    private static AntibioticCandidateDebugDTO.OptionDebug explainOption(AntibioticPathwayOption option,
                                                                        Set<Set<String>> recommended,
                                                                        Set<String> contraindicated) {
        List<String> categories = option.getMedicationCategories().stream()
                .map(MedicationCategory::getCategoryName)
                .toList();
        return new AntibioticCandidateDebugDTO.OptionDebug(categories,
                statusOf(categories, recommended, contraindicated));
    }

    /**
     * An option is recommended when the case offers exactly its drugs, and contraindicated when a rule
     * ruled out any one of them. Recommendation is asked first, though the two cannot both hold: an
     * option carrying a contraindicated category never survives the walk.
     */
    private static AntibioticCandidateDebugDTO.OptionStatus statusOf(List<String> categories,
                                                                    Set<Set<String>> recommended,
                                                                    Set<String> contraindicated) {
        if (recommended.contains(Set.copyOf(categories))) {
            return AntibioticCandidateDebugDTO.OptionStatus.RECOMMENDED;
        }
        if (categories.stream().anyMatch(contraindicated::contains)) {
            return AntibioticCandidateDebugDTO.OptionStatus.CONTRAINDICATED;
        }
        return AntibioticCandidateDebugDTO.OptionStatus.NOT_SELECTED;
    }

    /**
     * A procedure's pathways that apply to this case, split by what they offer. A procedure may have
     * both drug pathways and a pathway saying no antibiotic is wanted. That is not a conflict, it is
     * prophylaxis being optional.
     */
    private record ProcedurePathways(QualifiedProcedureType procedure,
                                     List<AntibioticPathway> drug,
                                     boolean noProphylaxis) {
    }

    /**
     * What every option of a case is judged against. The case, the categories this reader has already
     * accepted and the rules that can withdraw an option are the same for every drug, so they are read
     * once per resolution rather than once per drug considered.
     *
     * @param context           mutated as the walk goes, since each option is judged with its own drug set on it
     * @param contraindicated   collects the categories a rule objected to, across every pathway walked
     * @param categoryVerdicts  each category's safety, computed on first sight and reused thereafter
     */
    private record Walk(Operation operation,
                        Set<String> toleratedCategories,
                        Set<String> includedRules,
                        MedicationSelectionContext context,
                        Set<String> contraindicated,
                        Map<String, Boolean> categoryVerdicts) {
    }

    /** The medication categories this user has accepted for this case, overriding the allergy screen. */
    private Set<String> toleratedMedicationCategories(@Nullable User user, Operation operation) {
        if (user == null) {
            return Set.of();
        }
        return medicationTolerationService.getSettings(user, operation)
                .getToleratedMedicationCategories().entrySet().stream()
                .filter(Map.Entry::getValue)
                .map(Map.Entry::getKey)
                .collect(Collectors.toUnmodifiableSet());
    }

    /**
     * Every procedure on the case with the pathways that apply to it, sorted by identifier so the
     * result is deterministic.
     * <p>
     * A pathway written for the case's procedures performed together speaks for all of them, so every
     * procedure gets it and none is read on its own terms - see {@link ProcedureCombinationPathwayService}.
     * Giving each procedure the same pathway is what credits them all with the recommendation and
     * leaves them nothing to disagree about.
     */
    private List<ProcedurePathways> applicablePathways(Operation operation) {
        List<AntibioticPathway> combination = procedureCombinationPathwayService.pathwaysFor(operation);
        // Acuity belongs to the case, so it is read once and shared by every procedure, where risk is
        // stratified per procedure and read inside the loop. Null when the feed sent none or sent a
        // token nothing maps, which are the same thing to a pathway: no acuity to match on.
        CaseAcuity acuity = CaseAcuity.fromString(operation.getAcuity())
                .orElse(null);
        return operation.getQualifiedProcedureTypes().stream()
                .map(procedure -> combination.isEmpty()
                        ? configuredPathways(operation, procedure, acuity)
                        // A combination's pathway is built in code and always names drugs, so it is
                        // never the no-prophylaxis kind.
                        : new ProcedurePathways(procedure, combination, false))
                .sorted(Comparator.comparing(pathways -> pathways.procedure().procedureType().getIdentifier()))
                .toList();
    }

    /**
     * The pathways this procedure is configured with, narrowed to the risk and the acuity the case
     * carries.
     */
    private ProcedurePathways configuredPathways(Operation operation,
                                                 QualifiedProcedureType procedure,
                                                 @Nullable CaseAcuity acuity) {
        String identifier = procedure.procedureType().getIdentifier();
        ProcedureRisk risk = procedureRisk(operation, identifier);
        // Matched on identifier: the instance the operation carries need not be the row the
        // configuration hangs off, and matching on the entity finds nothing and reports it as a
        // procedure nobody configured.
        List<AntibioticPathway> configured = antibioticPathwayRepository
                .findByProcedureType_IdentifierOrderByPositionAsc(identifier);
        List<AntibioticPathway> applicable = configured.stream()
                .filter(pathway -> pathway.appliesTo(risk, acuity))
                .toList();
        if (!configured.isEmpty() && applicable.isEmpty()) {
            // The procedure is configured but describes no case like this one, so it will report as
            // unconfigured and silence its alerts. Logged rather than changed: the answer is a
            // configuration gap, and this is how its frequency becomes measurable instead of inferred.
            log.info("Operation {} matched no antibiotic pathway for {}: {} configured, "
                     + "procedure risk {} case acuity {}", operation.getId(), identifier,
                    configured.size(), risk, acuity == null ? "none" : acuity.name());
        }
        return new ProcedurePathways(procedure,
                applicable.stream().filter(pathway -> !pathway.isNoProphylaxis()).toList(),
                applicable.stream().anyMatch(AntibioticPathway::isNoProphylaxis));
    }

    /**
     * The risk a procedure was rated at on this case. ORCI derives risk rather than reading it from a
     * feed, so an absent value means the rating has not run rather than that the procedure carries no
     * risk, and it reads as {@link ProcedureRisk#DEFAULT}. Without that a procedure configured only by
     * risk would resolve to nothing while unrated, which reads downstream as "no protocol"
     * and takes the missing-antibiotic alert down with it.
     */
    private static ProcedureRisk procedureRisk(Operation operation, String procedureTypeIdentifier) {
        return Objects.requireNonNullElse(ratedProcedureRisk(operation, procedureTypeIdentifier),
                ProcedureRisk.DEFAULT);
    }

    /**
     * The rating as stored, null where it has not run. Only the debugger asks this: the walk needs a
     * risk to match pathways on and reads {@link #procedureRisk} instead, and telling a reader the
     * procedure is low risk when nothing rated it sends them looking for a rating that was never made.
     */
    @Nullable
    private static ProcedureRisk ratedProcedureRisk(Operation operation, String procedureTypeIdentifier) {
        return ProcedureRisk.fromString(operation
                        .getProcedureTypeCalculatedAttributes(procedureTypeIdentifier)
                        .get(ProcedureRisk.ATTRIBUTE_KEY))
                .orElse(null);
    }

    /**
     * What the case offers this patient: every option that covers all of its procedures.
     * <p>
     * Only options a procedure configured are ever offered, so the case never combines two procedures'
     * needs into a regimen no one wrote, even where the combination would cover both. For a
     * single-procedure case this is the identity, since every option covers itself.
     */
    private CaseSurvivors survivingOptions(List<ProcedurePathways> pathwaysPerProcedure, Walk walk) {
        List<List<AntibioticPathwayOption>> byProcedure = pathwaysPerProcedure.stream()
                .filter(pathways -> !pathways.drug().isEmpty())
                .map(pathways -> survivorsOf(pathways, walk))
                .toList();
        if (byProcedure.isEmpty()) {
            return new CaseSurvivors(List.of(), false);
        }
        List<AntibioticPathwayOption> shared = distinctByDrugs(byProcedure.stream().flatMap(List::stream).toList())
                .stream()
                .filter(option -> byProcedure.stream().allMatch(procedureOptions -> covers(option, procedureOptions)))
                .toList();
        // Nothing shared while every procedure had something of its own is disagreement, not
        // contraindication: each procedure can be covered, just not by one regimen. A procedure that
        // survived nothing is the other case, and stays ALL_CONTRAINDICATED.
        boolean disagreed = shared.isEmpty() && byProcedure.stream().noneMatch(List::isEmpty);
        return new CaseSurvivors(shared, disagreed);
    }

    /**
     * What one procedure offers this patient: the surviving options of its pathways pooled, or
     * nothing when any one pathway survived nothing.
     * <p>
     * A pathway states a route the configuration wants available for this procedure. One that ends
     * with no surviving option is a route this patient has no answer for, and the pathways that did
     * survive answer a different question than the one it asked, so they do not stand in for it. A
     * pathway scoped to another risk or acuity was filtered out before this and cannot die here.
     * <p>
     * Every pathway is walked even once one has died, because a category ruled out in a later pathway
     * still has to be named as contraindicated.
     */
    private List<AntibioticPathwayOption> survivorsOf(ProcedurePathways pathways, Walk walk) {
        List<List<AntibioticPathwayOption>> perPathway = pathways.drug().stream()
                .map(pathway -> survivingStepOf(pathway, walk))
                .toList();
        long died = perPathway.stream().filter(List::isEmpty).count();
        if (died > 0) {
            log.info("Procedure {} recommends nothing: {} of its {} pathways survived no option",
                    pathways.procedure().procedureType().getIdentifier(), died, perPathway.size());
            return List.of();
        }
        return distinctByDrugs(perPathway.stream().flatMap(List::stream).toList());
    }

    /**
     * What the case offers, and whether an empty answer means the procedures could not be covered by
     * one regimen rather than that nothing was safe.
     */
    private record CaseSurvivors(List<AntibioticPathwayOption> shared, boolean disagreed) {
    }

    /**
     * One entry per distinct set of drugs, keeping the first. Two routes can converge on the same
     * answer, and offering it twice shows a repeated recommendation that says nothing.
     */
    private static List<AntibioticPathwayOption> distinctByDrugs(List<AntibioticPathwayOption> options) {
        Set<Set<String>> seen = new LinkedHashSet<>();
        return options.stream().filter(option -> seen.add(drugsOf(option))).toList();
    }

    /**
     * Whether this option answers for a procedure: it covers one when it names every drug of at least
     * one of that procedure's own surviving options. A wider regimen therefore stands in for a
     * narrower one it contains, and two regimens that merely overlap cover neither.
     */
    private static boolean covers(AntibioticPathwayOption option, List<AntibioticPathwayOption> procedureOptions) {
        Set<String> drugs = drugsOf(option);
        return procedureOptions.stream().anyMatch(covered -> drugs.equals(drugsOf(covered)));
    }

    private static Set<String> drugsOf(AntibioticPathwayOption option) {
        return option.getMedicationCategories().stream()
                .map(MedicationCategory::getCategoryName)
                .collect(Collectors.toSet());
    }

    private static Set<String> drugsOf(ProcedureAntibioticOptionDTO option) {
        return option.getMedicationCandidates().stream()
                .map(ProcedureAntibioticOptionDTO.MedicationCandidate::medicationCategory)
                .collect(Collectors.toSet());
    }

    /**
     * The surviving options of a pathway's first step to have any, or nothing when every step is
     * ruled out. A step is reached as a whole but survives per option, so a step offering A or B
     * contributes B alone when A is unsafe. Steps are evaluated lazily, so the rule engine never runs
     * against one below the answer: a step exists only to say what to fall back to.
     */
    private List<AntibioticPathwayOption> survivingStepOf(AntibioticPathway pathway, Walk walk) {
        return pathway.getOptions().stream()
                .collect(Collectors.groupingBy(AntibioticPathwayOption::getStepNumber, TreeMap::new, Collectors.toList()))
                .values().stream()
                .map(step -> step.stream()
                        .filter(option -> isValidOption(option, walk))
                        .toList())
                .filter(viable -> !viable.isEmpty())
                .findFirst()
                .orElseGet(List::of);
    }

    private CaseAntibioticProtocol toProtocol(List<ProcedurePathways> pathwaysPerProcedure, boolean agreed) {
        List<ProcedureTypeDTO> noProphylaxisProcedures = pathwaysPerProcedure.stream()
                .filter(ProcedurePathways::noProphylaxis)
                .map(pathways -> ProcedureTypeDTO.create(pathways.procedure()))
                .toList();
        List<CaseAntibioticProtocol.ProcedureProtocol> offering = pathwaysPerProcedure.stream()
                .filter(pathways -> !pathways.drug().isEmpty())
                .map(pathways -> new CaseAntibioticProtocol.ProcedureProtocol(
                        ProcedureTypeDTO.create(pathways.procedure()),
                        toDTOs(pathways.drug().stream()
                                .flatMap(pathway -> pathway.getOptions().stream())
                                .toList())))
                .toList();
        boolean acuityScoped = pathwaysPerProcedure.stream()
                .flatMap(pathways -> pathways.drug().stream())
                .anyMatch(pathway -> !pathway.getAcuities().isEmpty());
        return new CaseAntibioticProtocol(offering, noProphylaxisProcedures,
                agreed && !offering.isEmpty(), acuityScoped);
    }

    private static List<ProcedureAntibioticOptionDTO> toDTOs(List<AntibioticPathwayOption> options) {
        return options.stream().map(ProcedureAntibioticOptionDTO::new).toList();
    }

    /**
     * Whether every drug in the option is safe for this patient. An option is given as a whole, so one
     * contraindicated drug rules out the option rather than reducing it.
     */
    private boolean isValidOption(AntibioticPathwayOption option, Walk walk) {
        // An option names the drugs to give together, so one naming none is not an answer: it would
        // stop the walk at a step offering the room nothing. The importer will not build one; losing
        // its join rows would.
        if (option.getMedicationCategories().isEmpty()) {
            log.warn("Option ruled out: step {} names no medication categories, so there is nothing to give",
                    option.getStepNumber());
            return false;
        }
        return option.getMedicationCategories().stream().allMatch(category -> isSafeCategory(category, walk));
    }

    /**
     * Whether this category is safe for the patient, remembered for the rest of the walk. One category
     * sits in many of a case's pathways and the verdict turns only on the patient and the drug, so the
     * rules run once per category rather than once per option naming it.
     */
    private boolean isSafeCategory(MedicationCategory category, Walk walk) {
        return walk.categoryVerdicts()
                .computeIfAbsent(category.getCategoryName(), name -> evaluateCategory(category, walk));
    }

    /**
     * Runs the selection rules over every medication of a category. A category nothing is linked to is
     * ruled out rather than passed: with no medication to run the rules against it would clear every
     * check and be recommended, while naming a drug no one can give.
     */
    private boolean evaluateCategory(MedicationCategory category, Walk walk) {
        List<Medication> candidateMedications = category.getMedications().stream()
                .filter(med -> !med.hasMedicationCategory(MedicationCategory.EXCLUDE_FROM_ANTIBIOTIC_CANDIDATE_EVAL))
                .toList();
        // Asked of the drugs that will actually be judged, not of the category's whole list. A
        // category linked to nothing, or linked only to drugs excluded from this evaluation, leaves
        // the loop below nothing to run: it would fall through and report the category safe, which
        // recommends a drug no rule has ever been asked about.
        if (candidateMedications.isEmpty()) {
            log.warn("Category {} ruled out: it has no medication this evaluation can judge",
                    category.getCategoryName());
            return false;
        }
        for (Medication medication : candidateMedications) {
            if (walk.toleratedCategories().contains(medication.getPrimaryMedicationCategory())) {
                continue;
            }
            // The weight and NDC do not bear on whether a drug may be given, so the context carries
            // the medication alone.
            walk.context().setMedication(new MedicationDTO(medication,
                    walk.operation().getPediatricStatusOrDefault(PediatricStatus.ADULT)));

            // Only rules that can withdraw a candidate bear on this decision, and only on an alert:
            // a rule that advises on a drug leaves it available.
            Optional<EvaluationResult> invalidatingResult = medicationSelectionRuleEngine
                    .evaluateOnly(walk.context(), walk.includedRules()).stream()
                    .filter(result -> result.isNeedsAction()
                                      && PromptType.ALERT.equals(result.getPrompt().getType()))
                    .findFirst();

            if (invalidatingResult.isPresent()) {
                // Named by category, not by option: a consumer asking "is this one unsafe" is asking
                // about the drug in hand.
                walk.contraindicated().add(category.getCategoryName());
                log.debug("Category {} ruled out by rule {}",
                        category.getCategoryName(), invalidatingResult.get().getRuleId());
                return false;
            }
        }
        return true;
    }

    private Optional<AntibioticResolution> getResolutionFromCache(Operation operation, @Nullable User user) {
        try {
            Object value = redisService.getHashValue(SCOPE, caseKey(operation), userField(user));
            if (!(value instanceof String json) || json.isEmpty()) {
                return Optional.empty();
            }
            return Optional.of(objectMapper.readValue(json, AntibioticResolution.class));
        } catch (JsonProcessingException | RuntimeException e) {
            // Anything unreadable here is a miss. Recomputing costs a case its resolution time,
            // whereas throwing takes down the alerting path this cache exists to keep fast.
            //
            // The read itself is inside this, not just the parse: an entry written under an earlier
            // storage shape can sit at this key with the wrong Redis type, and asking for a field of
            // it fails rather than returning nothing. Dropping the key repairs it for the next write,
            // which would otherwise fail the same way until the entry expired.
            log.warn("Discarding an unusable cached antibiotic resolution", e);
            discardCaseEntry(operation);
            return Optional.empty();
        }
    }

    private void discardCaseEntry(Operation operation) {
        try {
            redisService.deleteValue(SCOPE, caseKey(operation));
        } catch (RuntimeException e) {
            log.warn("Could not drop the unusable antibiotic resolution entry", e);
        }
    }

    private void setResolutionInCache(Operation operation, @Nullable User user, AntibioticResolution resolution) {
        try {
            redisService.setHashValue(SCOPE, caseKey(operation), userField(user),
                    objectMapper.writeValueAsString(resolution), CACHE_DURATION);
        } catch (JsonProcessingException | RuntimeException e) {
            // A resolution that cannot be cached is still a valid answer to hand back.
            log.warn("Could not cache the antibiotic resolution for operation {}", operation.getId(), e);
        }
    }

    /**
     * One key per case, holding a field per user.
     * <p>
     * The resolution varies per user, but the configuration it reads is the case's. A change to that
     * configuration has to drop every user's answer at once, and its writer has no user to name, so
     * the variants live together under a key that writer can delete.
     */
    @NotNull
    public static String cacheKeyForCase(Operation operation) {
        return caseKey(operation);
    }

    @NotNull
    private static String caseKey(Operation operation) {
        return "tenant:" + TenantContextHolder.getTenant().value() + "/op:" + operation.getId();
    }

    /** A resolution reached with no user still varies from a user's, so it gets its own field. */
    @NotNull
    private static String userField(@Nullable User user) {
        return user == null ? "no-user" : user.getId().toString();
    }


}
