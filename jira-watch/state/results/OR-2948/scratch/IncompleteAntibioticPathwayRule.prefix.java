package com.guided.orci.engine.rule.event;

import com.guided.orci.dto.AntibioticResolution;
import com.guided.orci.dto.CaseAntibioticProtocol;
import com.guided.orci.dto.ProcedureAntibioticOptionDTO;
import com.guided.orci.dto.ProcedureTypeDTO;
import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.engine.*;
import com.guided.orci.engine.rule.GuidanceCategory;
import com.guided.orci.engine.rule.RuleCategory;
import com.guided.orci.models.medication.IMedicationAdministration;
import com.guided.orci.models.medication.MedicationCategory;
import com.guided.orci.models.operation.EventCategory;
import com.guided.orci.models.patient.CaseAcuity;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.service.AntibioticLookbackService;
import com.guided.orci.service.CitationService;
import com.guided.orci.service.RuleMemoryService;
import com.guided.orci.types.wrappers.CitationId;
import com.guided.orci.types.wrappers.FeatureId;
import com.guided.orci.utils.ListUtils;
import com.guided.orci.utils.StringUtils;
import jakarta.annotation.Nullable;
import lombok.extern.slf4j.Slf4j;
import org.apache.logging.log4j.util.Strings;
import org.jetbrains.annotations.NotNull;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

import static com.guided.orci.engine.EvaluationResultPromptTemplate.CITATION_TOOLTIP_PLACEHOLDER;
import static com.guided.orci.utils.StringUtils.grammaticalList;

@Slf4j
@RuleDefinition(
        id = IncompleteAntibioticPathwayRule.ID,
        description = "Alerts if, at procedure start, no recommended antibiotic option was given in full: " +
                      "either no antibiotic was given, or a combination was started and not completed.",
        trigger = RuleTrigger.NOTIFICATION,
        type = RuleType.ALERT,
        categories = {RuleCategory.COMPLIANCE_ANTIBIOTIC_PROPHYLAXIS},
        guidanceCategory = GuidanceCategory.DELAYED_MISSED_OR_WRONG_ANTIBIOTIC
)
@Component
public class IncompleteAntibioticPathwayRule extends EventBasedRule {
    public static final String ID = "a-incomplete-antibiotic-pathway";

    public static final String PATHWAY_STATUS = "PATHWAY_STATUS";
    public static final String PARTIALLY_GIVEN_GROUP = "PARTIALLY_GIVEN_GROUPS";
    public static final String ANTIBIOTIC_GROUP_CATEGORIES = "ANTIBIOTIC_GROUP_CATEGORIES";
    public static final String ANY_PROCEDURE_COULD_BE_QUALIFIED = "ANY_PROCEDURE_COULD_BE_QUALIFIED";
    public static final String MRSA_ADJUSTED_OPTION_RECOMMENDED = "MRSA_ADJUSTED_OPTION_RECOMMENDED";
    private static final String PROCEDURE_NAME = "PROCEDURE_NAME";
    private static final String USE_CLASSIFICATION_DISPLAY = "USE_CLASSIFICATION_DISPLAY";
    private static final String ANTIBIOTIC_GROUPS = "ANTIBIOTIC_GROUPS";
    private static final String ANTIBIOTIC_GROUP_QUALIFIERS = "ANTIBIOTIC_GROUP_QUALIFIERS";
    private static final String ANTIBIOTIC_GROUP_CLASSIFICATIONS = "ANTIBIOTIC_GROUP_CLASSIFICATIONS";
    private static final String PROCEDURE_TYPE_ALL_QUALIFIERS = "PROCEDURE_TYPE_ALL_QUALIFIERS";
    private static final String QUALIFIER_FEATURE_FLAG_ENABLED = "QUALIFIER_FEATURE_FLAG_ENABLED";
    private static final String CURRENT_PROCEDURE_QUALIFIER = "CURRENT_PROCEDURE_QUALIFIER";
    /** The procedures named with the qualifier each one binds, for the qualified rendering. */
    private static final String QUALIFIED_PROCEDURE_NAME = "QUALIFIED_PROCEDURE_NAME";

    public enum PathwayStatus {
        NONE_GIVEN,
        PARTIALLY_GIVEN
    }

    private final RuleMemoryService ruleMemoryService;
    private final AntibioticLookbackService antibioticLookbackService;

    public IncompleteAntibioticPathwayRule(CitationService citationService, RuleMemoryService ruleMemoryService, AntibioticLookbackService antibioticLookbackService) {
        super(citationService);
        this.ruleMemoryService = ruleMemoryService;
        this.antibioticLookbackService = antibioticLookbackService;
    }

    @Override
    public List<EventCategory> getApplicableEventCategories() {
        return List.of(EventCategory.PROCEDURE_START);
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }

    @Override
    public List<CitationId> getCitationDefinitions() {
        return List.of(CitationDefinition.ANTIBIOTIC_START_CASE_PROCEDURE);
    }

    @Override
    public List<CitationId> getConditionalCitationDefinitions() {
        return List.of(CitationDefinition.MRSA_INFECTION_STATUS);
    }

    @Override
    public List<CitationId> getMatchingCitationDefinitions(Map<String, Object> results) {
        if (Boolean.TRUE.equals(results.get(MRSA_ADJUSTED_OPTION_RECOMMENDED))) {
            return ListUtils.concat(getCitationDefinitions(), getConditionalCitationDefinitions());
        }
        return getCitationDefinitions();
    }

    @Override
    protected EvaluationResult evaluate(EventContext context) {
        if (ruleMemoryService.isRuleLockedOut(context, this)) {
            return abstain(context, "Already fired for this case.");
        }
        return antibioticsWereGiven(context) ? evaluatePartiallyGiven(context) : evaluateNoneGiven(context);
    }

    private boolean antibioticsWereGiven(EventContext context) {
        var operationStart = context.getSafeOperationStartInstant();
        var evaluationDateTime = context.getEvaluationTime();
        return context.getPatient().getMedicationAdministrations().stream()
                .anyMatch(administration -> {
                    if (!administration.hasMedicationCategory(MedicationCategory.ANTIBIOTIC)) {
                        return false;
                    }
                    if (!FiltersByAntibioticRoute.RECOGNIZED_ANTIBIOTIC_ROUTES.contains(administration.getRoute())) {
                        return false;
                    }
                    var lookbackPeriod = antibioticLookbackService.getLookbackPeriod(administration.getMedicationIdentifier());
                    return administration.isAdministeredBetween(Date.from(operationStart.minus(lookbackPeriod)), evaluationDateTime);
                });
    }

    private EvaluationResult evaluateNoneGiven(EventContext context) {
        if (!procedureTypeIsKnown(context)) {
            return abstain(context, "Procedure type is not known");
        }

        List<ProcedureAntibioticOptionDTO> preferredAntibiotics = context.getPreferredAntibiotics();
        CaseAntibioticProtocol protocol = context.getAntibioticProtocol();

        if (preferredAntibiotics.isEmpty()) {
            return abstain(context, "No antibiotic to recommend: " + context.getAntibioticOutcomeDescription());
        }
        // A procedure that offers drugs and also a no-antibiotic pathway leaves giving nothing a
        // valid answer, so a case that gave nothing has not missed a dose. Without this the
        // procedures configured both ways are reported as missed prophylaxis for doing what their
        // own configuration permits.
        if (context.getAntibioticOutcome().filter(AntibioticResolution.Outcome.OPTIONAL_PROPHYLAXIS::equals).isPresent()) {
            return abstain(context, "Giving no antibiotic is compliant for this case");
        }

        // Drugs are preferred only on the authority of procedures that agree on them, so there is
        // always at least one procedure to name here.
        List<ProcedureTypeDTO> recommendingProcedures = protocol.recommendingProcedures();

        Map<String, Object> details = details(context);
        details.put(PATHWAY_STATUS, PathwayStatus.NONE_GIVEN);
        details.put(MRSA_ADJUSTED_OPTION_RECOMMENDED, preferredAntibiotics.stream().anyMatch(ProcedureAntibioticOptionDTO::isMrsaAdjusted));
        details.put(PROCEDURE_NAME, protocol.recommendingProcedureDisplayName());
        details.put(ANTIBIOTIC_GROUPS, preferredAntibiotics.stream().map(it ->
                it.getCandidateDisplayLabels()).toList());
        details.put(ANTIBIOTIC_GROUP_QUALIFIERS, preferredAntibiotics.stream()
                .map(it -> it.getQualifier()).toList());
        details.put(ANTIBIOTIC_GROUP_CLASSIFICATIONS, preferredAntibiotics.stream()
                .map(it -> it.getAcuity()).toList());
        details.put(ANTIBIOTIC_GROUP_CATEGORIES, optionCategories(preferredAntibiotics));
        details.put(ANY_PROCEDURE_COULD_BE_QUALIFIED, anyProcedureCouldBeQualified(protocol));
        // Label recommendations by acuity whenever the case's own acuity did not select them, which covers
        // both an unknown acuity and one none of the candidates cover.
        CaseAcuity caseAcuity = CaseAcuity.fromString(context.getOperation().getAcuity()).orElse(null);
        boolean useClassificationDisplay = preferredAntibiotics.stream()
                .anyMatch(it -> it.getAcuity() != null && it.getAcuity() != caseAcuity);
        details.put(USE_CLASSIFICATION_DISPLAY, useClassificationDisplay);

        // Qualifiers scope a recommendation, and procedures agree on drugs rather than on scope, so
        // each name carries its own qualifier and the available ones span every recommending procedure.
        boolean qualifierFeatureFlagEnabled = context.getEnabledFeatureFlags().contains(FeatureId.ANTIBIOTIC_CANDIDATE_PROCEDURE_TYPE_QUALIFIERS);
        details.put(QUALIFIER_FEATURE_FLAG_ENABLED, qualifierFeatureFlagEnabled);
        details.put(PROCEDURE_TYPE_ALL_QUALIFIERS, protocol.availableQualifiers().stream().toList());
        details.put(QUALIFIED_PROCEDURE_NAME, protocol.qualifiedRecommendingProcedureDisplayName());
        // Discriminates the qualified rendering from the unqualified one. Procedures that agree while
        // qualified are all qualified, so any of them answers that question.
        details.put(CURRENT_PROCEDURE_QUALIFIER, recommendingProcedures.getFirst().qualifier());

        // Atomic claim: guards against concurrent INCISION_TIME + PROCEDURE_START events both firing.
        if (!ruleMemoryService.trySetRuleLockoutForDurationOfOperation(context, this)) {
            return abstain(context, "Already fired for this case.");
        }
        return baseBuilder(context).needsAction(true).prompt(createPrompt(details)).details(details).build();
    }

    private static List<List<String>> optionCategories(List<ProcedureAntibioticOptionDTO> options) {
        return options.stream()
                .map(option -> option.getMedicationCandidates().stream()
                        .map(ProcedureAntibioticOptionDTO.MedicationCandidate::medicationCategory)
                        .toList())
                .toList();
    }

    private static boolean anyProcedureCouldBeQualified(CaseAntibioticProtocol protocol) {
        return protocol.recommendingProcedures().stream()
                .anyMatch(procedure -> !procedure.availableQualifiers().isEmpty()
                                       && StringUtils.isNullOrEmpty(procedure.qualifier()));
    }

    private boolean procedureTypeIsKnown(EventContext context) {
        return !context.getOperation().getProcedureTypes().isEmpty();
    }

    private EvaluationResult evaluatePartiallyGiven(EventContext context) {
        CaseAntibioticProtocol protocol = context.getAntibioticProtocol();
        // The alert names a drug to give, so it may only name one this patient can have. That is what
        // the resolution's survivors are; the configuration behind them also holds the steps ruled out
        // for this patient, and naming one of those would tell the room to give a contraindicated drug.
        var antibioticCandidates = context.getPreferredAntibiotics();
        if (antibioticCandidates.isEmpty()) {
            return abstain(context, "No procedure candidates: " + context.getAntibioticOutcomeDescription());
        }

        var antibioticAdmins = getAntibioticMedicationAdministrations(context, antibioticCandidates);
        if (antibioticAdmins.isEmpty()) {
            return abstain(context, "No suitable antibiotics given.");
        }

        var completelyGivenGroup = findCompletelyGivenGroup(antibioticCandidates, antibioticAdmins);
        if (completelyGivenGroup.isPresent()) {
            return abstain(context, "Procedure candidates were given.");
        }

        // A qualifier scopes which antibiotics a procedure calls for, so a procedure that could carry
        // one but was mapped without it leaves the recommendation unsettled. Procedures agree on drugs
        // rather than on scope, so any of them being unqualified is enough to hold the alert back.
        if (anyProcedureCouldBeQualified(protocol)) {
            return abstain(context, "Procedure type qualifiers are available but current procedure is unqualified.");
        }

        // Every survivor is a complete answer on its own, so a survivor that is part-way given is
        // reported whichever pathway or step it came from. A step number counts only within its own
        // pathway, leaving no ordering to prefer one of these over another.
        List<Group> group = findPartiallyGivenGroups(antibioticCandidates, antibioticAdmins);
        if (group.isEmpty()) {
            return abstain(context, "No recommended antibiotics are part-way given.");
        }

        var details = details(context);
        details.put(PATHWAY_STATUS, PathwayStatus.PARTIALLY_GIVEN);
        details.put(MRSA_ADJUSTED_OPTION_RECOMMENDED, antibioticCandidates.stream().anyMatch(ProcedureAntibioticOptionDTO::isMrsaAdjusted));
        details.put(PROCEDURE_NAME, protocol.recommendingProcedureDisplayName());
        details.put(PARTIALLY_GIVEN_GROUP, group);
        details.put(ANTIBIOTIC_GROUP_CATEGORIES, optionCategories(antibioticCandidates));
        boolean useClassificationDisplay = StringUtils.isNullOrEmpty(context.getOperation().getAcuity())
                                           && antibioticCandidates.stream().anyMatch(it -> it.getAcuity() != null);
        details.put(USE_CLASSIFICATION_DISPLAY, useClassificationDisplay);

        // Atomic claim: if concurrent events (e.g. INCISION_TIME and PROCEDURE_START) both pass the
        // isRuleLockedOut check above, only the first to win this SET NX actually fires.
        if (!ruleMemoryService.trySetRuleLockoutForDurationOfOperation(context, this)) {
            return abstain(context, "Already fired for this case.");
        }
        return baseBuilder(context).needsAction(true).prompt(createPrompt(details)).details(details).build();
    }

    private List<Group> findPartiallyGivenGroups(
            List<ProcedureAntibioticOptionDTO> candidateGroups,
            List<? extends IMedicationAdministration> administeredAntibiotics
    ) {
        List<Group> partiallyPresentGroups = new ArrayList<>();
        for (var candidateGroup : candidateGroups) {

            var candidates = candidateGroup.getMedicationCandidates();
            var missingMeds = new ArrayList<>(candidateGroup.getCandidateDisplayLabels());
            var givenMeds = new ArrayList<String>();
            for (var candidate : candidates) {
                for (var administeredAntibiotic : administeredAntibiotics) {
                    if (administeredAntibiotic.hasMedicationCategory(candidate.medicationCategory())) {
                        givenMeds.add(administeredAntibiotic.getMedicationShortName());
                        missingMeds.remove(candidate.displayLabel());
                    }
                }
            }
            // Part-way given means something arrived and something is still owed, which is what
            // missingMeds says directly. Comparing counts instead reads a repeated dose of one drug as
            // a second drug arriving, so a group falls silent with a drug still missing.
            if (!givenMeds.isEmpty() && !missingMeds.isEmpty()) {
                Group partiallyGivenGroup = new Group(missingMeds, givenMeds, candidateGroup.getAcuity());
                partiallyPresentGroups.add(partiallyGivenGroup);
            }
        }
        return partiallyPresentGroups;
    }

    /**
     * Filters the antibiotic medication administrations that occurred between the start of the case and now
     * We only consider antibiotics that fall into at least one candidate group.
     */
    @NotNull
    private List<? extends IMedicationAdministration> getAntibioticMedicationAdministrations(EventContext context, List<ProcedureAntibioticOptionDTO> antibioticCandidates) {
        Set<String> validMedicationCategories = new HashSet<>();
        for (var candidateGroup : antibioticCandidates) {
            for (var candidate : candidateGroup.getMedicationCandidates()) {
                validMedicationCategories.add(candidate.medicationCategory());
            }
        }

        return context.getPatient().getMedicationAdministrations().stream()
                .filter(admin -> {
                    if (!admin.hasMedicationCategory(MedicationCategory.ANTIBIOTIC) || !admin.hasAnyMedicationCategory(validMedicationCategories)) {
                        return false;
                    }
                    if (!FiltersByAntibioticRoute.RECOGNIZED_ANTIBIOTIC_ROUTES.contains(admin.getRoute())) {
                        return false;
                    }
                    Duration lookbackPeriod = antibioticLookbackService.getLookbackPeriod(admin.getMedicationIdentifier());
                    Instant cutoff = context.getSafeOperationStartDate().toInstant().minus(lookbackPeriod);
                    return admin.isAdministeredBetween(Date.from(cutoff), context.getEvaluationTime());
                })
                .toList();
    }

    private Optional<ProcedureAntibioticOptionDTO> findCompletelyGivenGroup(
            List<ProcedureAntibioticOptionDTO> candidateGroups,
            List<? extends IMedicationAdministration> administeredAntibiotics
    ) {
        return candidateGroups.stream()
                .filter(group -> allCandidatesWereAdministered(group, administeredAntibiotics))
                .findFirst();
    }

    private static boolean allCandidatesWereAdministered(
            ProcedureAntibioticOptionDTO candidateGroup,
            List<? extends IMedicationAdministration> administeredAntibiotics
    ) {
        return candidateGroup.getMedicationCandidates().stream()
                .allMatch(candidate ->
                        administeredAntibiotics.stream()
                                .anyMatch(admin -> admin.hasMedicationCategory(candidate.medicationCategory())));
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {
        return PathwayStatus.PARTIALLY_GIVEN.equals(result.get(PATHWAY_STATUS))
                ? partiallyGivenPrompt(result)
                : noneGivenPrompt(result);
    }

    private EvaluationResultPrompt noneGivenPrompt(Map<String, Object> result) {
        // list of groups
        var antibioticGroups = (List<List<String>>) result.getOrDefault(ANTIBIOTIC_GROUPS, List.of());

        // each group optionally has a qualifier (in order)
        var antibioticGroupQualifiers = (List<String>) result.getOrDefault(ANTIBIOTIC_GROUP_QUALIFIERS, List.of());

        // each group optionally has a case acuity (in order)
        var antibioticGroupAcuities = (List<CaseAcuity>) result.getOrDefault(ANTIBIOTIC_GROUP_CLASSIFICATIONS, List.of());

        // all possible qualifiers for the procedure type
        var procedureTypeAllQualifiers = (List<String>) result.getOrDefault(PROCEDURE_TYPE_ALL_QUALIFIERS, List.of());
        var qualifierFeatureFlagEnabled = (boolean) result.getOrDefault(QUALIFIER_FEATURE_FLAG_ENABLED, false);
        var useClassificationDisplay = (boolean) result.getOrDefault(USE_CLASSIFICATION_DISPLAY, false);

        var thisProcedureQualifier = (String) result.getOrDefault(CURRENT_PROCEDURE_QUALIFIER, "");

        StringBuilder description = new StringBuilder("Patient received no antibiotics. ");

        if (useClassificationDisplay) {
            description.append("<br/><br/>");
            // Every option for one acuity belongs on a single row, joined with OR, so the alert never
            // shows the same acuity twice with competing recommendations.
            var groupsByAcuity = new LinkedHashMap<CaseAcuity, List<List<String>>>();
            var groupsWithNoAcuity = new ArrayList<List<String>>();
            for (int i = 0; i < antibioticGroups.size(); i++) {
                CaseAcuity acuity = antibioticGroupAcuities.get(i);
                if (acuity == null) {
                    groupsWithNoAcuity.add(antibioticGroups.get(i));
                } else {
                    groupsByAcuity.computeIfAbsent(acuity, k -> new ArrayList<>())
                            .add(antibioticGroups.get(i));
                }
            }

            // Acuities recommending an identical set of options share one row ("urgent or emergent").
            // The key ignores drug order within a group; the first-seen grouping supplies display order.
            var displayGroupsByKey = new LinkedHashMap<List<List<String>>, List<List<String>>>();
            var acuitiesByKey = new LinkedHashMap<List<List<String>>, TreeSet<CaseAcuity>>();
            groupsByAcuity.forEach((acuity, groups) -> {
                List<List<String>> key = groups.stream().map(group -> group.stream().sorted().toList()).toList();
                displayGroupsByKey.putIfAbsent(key, groups);
                acuitiesByKey.computeIfAbsent(key, k -> new TreeSet<>()).add(acuity);
            });

            List<String> rows = new ArrayList<>();
            acuitiesByKey.forEach((key, acuities) -> {
                String acuityLabel = grammaticalList(
                        acuities.stream().map(CaseAcuity::displayName).toList(), "or", "");
                // qualifiedProcedureName is prepended with "Prior to incision for " by getRecommendation()
                String qualifiedProcedureName = acuityLabel + " ${" + PROCEDURE_NAME + "}";
                rows.add(getRecommendation(qualifiedProcedureName, displayGroupsByKey.get(key)));
            });
            if (!groupsWithNoAcuity.isEmpty()) {
                rows.add(getRecommendation("${" + PROCEDURE_NAME + "}", groupsWithNoAcuity));
            }
            description.append(String.join("<br/><br/>", rows));
        } else if (qualifierFeatureFlagEnabled && Strings.isNotBlank(thisProcedureQualifier)) {
            // Procedures are qualified: each name already carries the qualifier it binds, so a case
            // recommending one drug set across differently scoped procedures reads correctly.
            String recommendation = getRecommendation("${" + QUALIFIED_PROCEDURE_NAME + "}", antibioticGroups);
            description.append(recommendation);
        } else if (qualifierFeatureFlagEnabled && !procedureTypeAllQualifiers.isEmpty()
                   && antibioticGroupQualifiers.stream().anyMatch(Strings::isNotBlank)) {
            // The current procedure carries no qualifier but the recommendations do, so each is listed
            // under the qualifier it binds. Selecting this on the procedure type having qualifiers alone
            // would reach here with none of the recommendations carrying one, and every row would then
            // name a null qualifier and declare the real ones to need no prophylaxis.
            description.append("<br/><br/>");
            var remainingQualifiers = new HashSet<>(procedureTypeAllQualifiers);
            List<String> rows = new ArrayList<>();
            var groupsByQualifier = new HashMap<String, List<List<String>>>();

            for (int i = 0; i < antibioticGroups.size(); i++) {
                List<String> antibioticGroup = antibioticGroups.get(i);
                String groupQualifier = antibioticGroupQualifiers.get(i);
                remainingQualifiers.remove(groupQualifier);
                groupsByQualifier.computeIfAbsent(groupQualifier, k -> new ArrayList<>()).add(antibioticGroup);
            }

            for (var entry : groupsByQualifier.entrySet()) {
                var groupQualifier = entry.getKey();
                var antibioticGroup = entry.getValue();
                String qualifiedProcedureName = "${" + PROCEDURE_NAME + "} " + groupQualifier;
                rows.add(getRecommendation(qualifiedProcedureName, antibioticGroup));
            }

            // remaining qualifiers have no recommended antibiotics
            for (var qualifier : remainingQualifiers) {
                rows.add("Prior to incision for ${" + PROCEDURE_NAME + "} " + qualifier +
                         ", no antibiotic prophylaxis recommended.");
            }
            description.append(String.join("<br/><br/>",
                    // reverse the rows so that the "no prophylaxis recommended" rows come first.
                    rows.reversed()
            ));
        } else {
            // no qualifier
            description.append(getRecommendation("${" + PROCEDURE_NAME + "}", antibioticGroups));
        }


        String title = antibioticGroups.size() == 1
                ? ("Administer " + grammaticalList(antibioticGroups.getFirst(), ""))
                : "Administer Antibiotics";

        return EvaluationResultPromptTemplate
                .builder().ruleIdentifier(getRuleIdentifier())
                .title(title)
                .description(description.toString())
                .tabName("Administer Antibiotics")
                .type(RuleType.ALERT)
                .acceptText("Will Give Antibiotic").rejectText("Reject")
                .rejectReasons(List.of(
                        RejectionReasonOption.simple(RejectionReason.SURGEON_REQUEST),
                        RejectionReasonOption.simple(RejectionReason.ANTIBIOTIC_NOT_NEEDED),
                        RejectionReasonOption.simple(RejectionReason.ANTIBIOTIC_ALREADY_GIVEN)
                ))
                .citations(getCitations(result))
                .build().createPrompt(result);
    }

    private String getRecommendation(String qualifiedProcedureName, List<List<String>> antibioticGroups) {
        var builder = new StringBuilder();
        if (antibioticGroups.size() == 1) {
            builder.append("Prior to incision for ").append(qualifiedProcedureName).append(", recommend ")
                    .append(grammaticalList(antibioticGroups.getFirst(), ""));
        } else {
            var groups = antibioticGroups.stream().map(it -> grammaticalList(it, "")).toList();
            builder.append("Prior to incision for ").append(qualifiedProcedureName).append(", recommend: ")
                    .append(CITATION_TOOLTIP_PLACEHOLDER)
                    .append("<br/>")
                    .append(String.join("<br/>OR<br/>", groups));
        }
        return builder.toString();
    }

    private EvaluationResultPrompt partiallyGivenPrompt(Map<String, Object> result) {
        var groups = (List<Group>) result.getOrDefault(PARTIALLY_GIVEN_GROUP, List.of());
        var useClassificationDisplay = (boolean) result.getOrDefault(USE_CLASSIFICATION_DISPLAY, false);

        List<String> allMedsAdministered = ListUtils.deduplicate(groups.stream().flatMap(it -> it.medsAdministered.stream()).toList());
        List<String> allMissingMeds = ListUtils.deduplicate(groups.stream().flatMap(it -> it.missingMeds.stream()).toList());
        String alreadyAdministeredMeds = StringUtils.grammaticalList(allMedsAdministered.stream().toList(), "");
        // Two regimens short of the same drugs are one instruction to the room, however many pathways
        // they came from, so the reader is offered each distinct completion once.
        List<List<String>> alternatives = groups.stream().map(Group::missingMeds).distinct().toList();

        List<RejectionReasonOption> rejectionReasons = ListUtils.concat(
                allMissingMeds.stream()
                        .map(it -> RejectionReasonOption.simple(RejectionReason.ANTIBIOTIC_ALREADY_GIVEN, it + " already given"))
                        .toList(),
                List.of(
                        RejectionReasonOption.simple(RejectionReason.SURGEON_REQUEST),
                        RejectionReasonOption.simple(RejectionReason.ANTIBIOTIC_NOT_NEEDED)
                )
        );

        if (useClassificationDisplay) {
            // current operation acuity unknown - display all options by acuity
            var acuitiesByMissingMeds = new LinkedHashMap<List<String>, TreeSet<CaseAcuity>>();
            for (var group : groups) {
                if (group.caseClassification() == null) continue;
                List<String> sortedKey = group.missingMeds.stream().sorted().toList();
                acuitiesByMissingMeds.computeIfAbsent(sortedKey, k -> new TreeSet<>()).add(group.caseClassification());
            }
            List<String> rows = new ArrayList<>();
            for (var entry : acuitiesByMissingMeds.entrySet()) {
                String acuityLabel = StringUtils.grammaticalList(
                        entry.getValue().stream().map(CaseAcuity::displayName).toList(), "or", "");
                String prefix = "For " + acuityLabel + " ${" + PROCEDURE_NAME + "}";
                rows.add(prefix + ", recommend " + StringUtils.grammaticalList(entry.getKey(), ""));
            }
            return EvaluationResultPromptTemplate
                    .builder().ruleIdentifier(getRuleIdentifier())
                    .title("Administer Additional Antibiotic")
                    .description("Patient received " + alreadyAdministeredMeds + ". " + String.join("<br/><br/>", rows))
                    .tabName("Administer Antibiotics")
                    .type(RuleType.ALERT)
                    .acceptText("Will Give Antibiotic").rejectText("Reject")
                    .rejectReasons(rejectionReasons)
                    .citations(getCitations(result))
                    .build().createPrompt(result);
        } else if (alternatives.size() == 1) {
            String missingMeds = StringUtils.grammaticalList(alternatives.getFirst(), "");
            return EvaluationResultPromptTemplate
                    .builder().ruleIdentifier(getRuleIdentifier())
                    .title("Administer " + missingMeds)
                    .description("Patient received " + alreadyAdministeredMeds + ". " +
                                 "For ${" + PROCEDURE_NAME + "}, recommend " + missingMeds +
                                 " in addition" + ((allMedsAdministered.size() == 1) ? (" to " + alreadyAdministeredMeds) : "."))
                    .tabName("Administer Antibiotics")
                    .type(RuleType.ALERT)
                    .acceptText("Will Give Antibiotic").rejectText("Reject")
                    .rejectReasons(rejectionReasons)
                    .citations(getCitations(result))
                    .build().createPrompt(result);
        } else {
            return EvaluationResultPromptTemplate
                    .builder().ruleIdentifier(getRuleIdentifier())
                    .title("Administer Additional Antibiotic")
                    .description("Patient received " + alreadyAdministeredMeds + ". " +
                                 "For ${" + PROCEDURE_NAME + "}, recommend one of the following additional antibiotics:" + CITATION_TOOLTIP_PLACEHOLDER + " <br/>" +
                                 String.join("<br/>OR<br/>", alternatives.stream().map(it -> String.join(" and ", it)).toList())
                    )
                    .tabName("Administer Antibiotics")
                    .type(RuleType.ALERT)
                    .acceptText("Will Give Antibiotic").rejectText("Reject")
                    .rejectReasons(rejectionReasons)
                    .citations(getCitations(result))
                    .build().createPrompt(result);
        }
    }

    public record Group(List<String> missingMeds, List<String> medsAdministered,
                        @Nullable CaseAcuity caseClassification) {
    }
}
