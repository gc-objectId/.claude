package com.guided.orci.engine.rule.event;

import com.guided.orci.dto.CaseAntibioticProtocol;
import com.guided.orci.dto.ProcedureAntibioticOptionDTO;
import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.engine.*;
import com.guided.orci.engine.rule.GuidanceCategory;
import com.guided.orci.models.medication.IMedicationAdministration;
import com.guided.orci.models.medication.MedicationCategory;
import com.guided.orci.models.operation.EventCategory;
import com.guided.orci.models.patient.CaseAcuity;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.service.AntibioticLookbackService;
import com.guided.orci.service.CitationService;
import com.guided.orci.service.RuleMemoryService;
import com.guided.orci.types.wrappers.CitationId;
import com.guided.orci.utils.ListUtils;
import com.guided.orci.utils.StringUtils;
import jakarta.annotation.Nullable;
import org.slf4j.Logger; import org.slf4j.LoggerFactory;
import org.jetbrains.annotations.NotNull;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

import static com.guided.orci.engine.EvaluationResultPromptTemplate.CITATION_TOOLTIP_PLACEHOLDER;


@RuleDefinition(
        id = StartProcedureMissingAntibioticRule.ID,
        description = "Alerts if, at procedure start, we have antibiotic candidates and " +
                      "there does not exist a candidate group for which all antibiotics were given.",
        trigger = RuleTrigger.NOTIFICATION,
        type = RuleType.ALERT,
        guidanceCategory = GuidanceCategory.DELAYED_MISSED_OR_WRONG_ANTIBIOTIC
)
@Component
public class StartProcedureMissingAntibioticRule extends EventBasedRule {
    private static final Logger log = LoggerFactory.getLogger(StartProcedureMissingAntibioticRule.class);
    public static final String ID = "a-known-procedure-missing-antibiotic";

    public static String PARTIALLY_GIVEN_GROUP = "PARTIALLY_GIVEN_GROUPS";
    public static String PROCEDURE_NAME = "PROCEDURE_NAME";
    public static String USE_CLASSIFICATION_DISPLAY = "USE_CLASSIFICATION_DISPLAY";
    private final RuleMemoryService ruleMemoryService;
    private final AntibioticLookbackService antibioticLookbackService;

    public StartProcedureMissingAntibioticRule(CitationService citationService, RuleMemoryService ruleMemoryService, AntibioticLookbackService antibioticLookbackService) {
        super(citationService);
        this.ruleMemoryService = ruleMemoryService;
        this.antibioticLookbackService = antibioticLookbackService;
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }

    @Override
    public List<EventCategory> getApplicableEventCategories() {
        return List.of(EventCategory.PROCEDURE_START);
    }

    @Override
    public List<CitationId> getCitationDefinitions() {
        return List.of(CitationDefinition.ANTIBIOTIC_START_CASE_PROCEDURE);
    }

    @Override
    protected EvaluationResult evaluate(EventContext context) {
        if (ruleMemoryService.isRuleLockedOut(context, this)) {
            return abstain(context, "Already fired for this case.");
        }

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
        boolean anyProcedureCouldBeQualified = protocol.recommendingProcedures().stream()
                .anyMatch(procedure -> !procedure.availableQualifiers().isEmpty()
                                       && StringUtils.isNullOrEmpty(procedure.qualifier()));
        if (anyProcedureCouldBeQualified) {
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
        details.put(PROCEDURE_NAME, protocol.recommendingProcedureDisplayName());
        details.put(PARTIALLY_GIVEN_GROUP, group);
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
