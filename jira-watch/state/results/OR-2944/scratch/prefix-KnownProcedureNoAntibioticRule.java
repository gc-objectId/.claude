package com.guided.orci.engine.rule.event;

import com.guided.orci.dto.AntibioticResolution;
import com.guided.orci.dto.CaseAntibioticProtocol;
import com.guided.orci.dto.ProcedureAntibioticOptionDTO;
import com.guided.orci.dto.ProcedureTypeDTO;
import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.engine.*;
import com.guided.orci.engine.rule.GuidanceCategory;
import com.guided.orci.models.medication.MedicationCategory;
import com.guided.orci.models.operation.EventCategory;
import com.guided.orci.models.patient.CaseAcuity;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.service.AntibioticLookbackService;
import com.guided.orci.service.CitationService;
import com.guided.orci.service.RuleMemoryService;
import com.guided.orci.types.wrappers.CitationId;
import com.guided.orci.types.wrappers.FeatureId;
import com.guided.orci.utils.StringUtils;
import org.slf4j.Logger; import org.slf4j.LoggerFactory;
import org.apache.logging.log4j.util.Strings;
import org.springframework.stereotype.Component;

import java.util.*;

import static com.guided.orci.engine.EvaluationResultPromptTemplate.CITATION_TOOLTIP_PLACEHOLDER;
import static com.guided.orci.utils.StringUtils.grammaticalList;


@RuleDefinition(
        id = KnownProcedureNoAntibioticRule.ID,
        description = "Alerts if patient has not received antibiotics at procedure start",
        trigger = RuleTrigger.NOTIFICATION,
        type = RuleType.ALERT,
        guidanceCategory = GuidanceCategory.DELAYED_MISSED_OR_WRONG_ANTIBIOTIC
)
@Component
public class KnownProcedureNoAntibioticRule extends EventBasedRule {
    private static final Logger log = LoggerFactory.getLogger(KnownProcedureNoAntibioticRule.class);
    public static final String ID = "a-known-procedure-no-antibiotic";

    private final String ANTIBIOTIC_GROUPS = "ANTIBIOTIC_GROUPS";
    private final String ANTIBIOTIC_GROUP_QUALIFIERS = "ANTIBIOTIC_GROUP_QUALIFIERS";
    private final String ANTIBIOTIC_GROUP_CLASSIFICATIONS = "ANTIBIOTIC_GROUP_CLASSIFICATIONS";
    private final String PROCEDURE_TYPE_ALL_QUALIFIERS = "PROCEDURE_TYPE_ALL_QUALIFIERS";
    private final String QUALIFIER_FEATURE_FLAG_ENABLED = "QUALIFIER_FEATURE_FLAG_ENABLED";
    private final String CURRENT_PROCEDURE_QUALIFIER = "CURRENT_PROCEDURE_QUALIFIER";
    private final String USE_CLASSIFICATION_DISPLAY = "USE_CLASSIFICATION_DISPLAY";
    private final String PROCEDURE_NAME = "PROCEDURE_NAME";
    /** The procedures named with the qualifier each one binds, for the qualified rendering. */
    private final String QUALIFIED_PROCEDURE_NAME = "QUALIFIED_PROCEDURE_NAME";
    private final RuleMemoryService ruleMemoryService;
    private final AntibioticLookbackService antibioticLookbackService;

    public KnownProcedureNoAntibioticRule(CitationService citationService, RuleMemoryService ruleMemoryService, AntibioticLookbackService antibioticLookbackService) {
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
    protected EvaluationResult evaluate(EventContext context) {
        if (ruleMemoryService.isRuleLockedOut(context, this)) {
            return abstain(context, "Already fired for this case.");
        }

        if (antibioticsWereGiven(context)) {
            return abstain(context, "Antibiotics were given");
        }

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
        details.put(PROCEDURE_NAME, protocol.recommendingProcedureDisplayName());
        details.put(ANTIBIOTIC_GROUPS, preferredAntibiotics.stream().map(it ->
                it.getCandidateDisplayLabels()).toList());
        details.put(ANTIBIOTIC_GROUP_QUALIFIERS, preferredAntibiotics.stream()
                .map(it -> it.getQualifier()).toList());
        details.put(ANTIBIOTIC_GROUP_CLASSIFICATIONS, preferredAntibiotics.stream()
                .map(it -> it.getAcuity()).toList());
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

    private boolean procedureTypeIsKnown(EventContext context) {
        return !context.getOperation().getProcedureTypes().isEmpty();
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {
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

    public String getRecommendation(String qualifiedProcedureName, List<List<String>> antibioticGroups) {
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

    public List<CitationId> getCitationDefinitions() {
        return List.of(
                CitationDefinition.ANTIBIOTIC_START_CASE_PROCEDURE
        );
    }
}
