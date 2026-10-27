package com.guided.orci.engine.rule.event;

import com.guided.orci.dto.rule.EvaluationResult;
import com.guided.orci.dto.rule.context.ContextMedication;
import com.guided.orci.engine.*;
import com.guided.orci.engine.rule.GuidanceCategory;
import com.guided.orci.engine.rule.RuleCategory;
import com.guided.orci.models.medication.IMedicationAdministration;
import com.guided.orci.models.medication.MedicationRoute;
import com.guided.orci.models.operation.EventCategory;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.service.CitationService;
import com.guided.orci.service.RuleMemoryService;
import com.guided.orci.types.wrappers.CitationId;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static com.guided.orci.engine.EvaluationResultPromptTemplate.CITATION_TOOLTIP_PLACEHOLDER;
import static com.guided.orci.utils.StringUtils.grammaticalList;

@Slf4j
@RuleDefinition(
        id = ERASAntiemeticsRule.ID,
        description = "Alerts if patient has not received suitable anti-emetics after an ERAS operation.",
        trigger = RuleTrigger.NOTIFICATION,
        type = RuleType.ALERT,
        guidanceCategory = GuidanceCategory.ERAS,
        categories = {RuleCategory.COMPLIANCE_ERAS_ANTIEMETICS}
)
@Component
public class ERASAntiemeticsRule extends EventBasedRule {
    public static final String ID = "a-eras-antiemetics";
    public static final String NUM_ANTIEMETIC_CATEGORIES = "NUM_ANTIEMETICS";
    public static final String ADMINISTERED_ANTIEMETICS = "ADMINISTERED_ANTIEMETICS";

    private RuleMemoryService ruleMemoryService;


    @Autowired
    public ERASAntiemeticsRule(CitationService citationService, RuleMemoryService ruleMemoryService) {
        super(citationService);
        this.ruleMemoryService = ruleMemoryService;
    }

    @Override
    public String getRuleIdentifier() {
        return ID;
    }

    private Set<String> getAntiemeticsSet(List<MedRoutePair> medRoutePairs) {
        return medRoutePairs.stream()
                .flatMap(medRoutePair ->
                        medRoutePair.med()
                                .getAntiemeticClassSpecifier(medRoutePair.route()).stream())
                .collect(Collectors.toSet());
    }

    @Override
    protected EvaluationResult evaluate(EventContext context) {
        Map<String, Object> details = details(context);
        if (ruleMemoryService.isRuleLockedOut(context, this)) {
            return baseBuilder(context)
                    .details(details)
                    .explanation("Rule fired recently")
                    .build();
        }

        if (!context.getOperation().isErasOperation()) {
            return baseBuilder(context).details(details).explanation("Not ERAS operation.").build();
        }

        List<MedRoutePair> antiemeticMedAdmins = context.getPatient()
                .getMedicationAdministrations().stream()
                .filter(medAdmin -> medAdmin.occurredAfterOperationStartIncludingIntraOp(context))
                .sorted(IMedicationAdministration.ORDERED_BY_LATEST_FIRST)
                .flatMap(medAdmin -> medAdmin.getMedication().stream()
                        .filter(med -> med.isAntiemetic(medAdmin.getRoute()))
                        .map(med -> new MedRoutePair(ContextMedication.fromMedication(med), medAdmin.getRoute()))
                )
                .toList();

        Set<String> antiemetics = getAntiemeticsSet(antiemeticMedAdmins);
        details.put(NUM_ANTIEMETIC_CATEGORIES, antiemetics.size());
        details.put(ADMINISTERED_ANTIEMETICS, antiemeticMedAdmins);

        if (antiemetics.size() >= 2) {
            return baseBuilder(context).details(details).explanation("Patient received valid antiemetics").build();
        }

        // Atomic claim: guards against concurrent PROCEDURE_FINISH + PROCEDURE_FINISH_ANESTHESIA_DOCUMENTED both firing.
        if (!ruleMemoryService.trySetRuleLockout(context, this, Duration.ofHours(6))) {
            return baseBuilder(context).details(details).explanation("Rule fired recently").build();
        }
        return baseBuilder(context).needsAction(true).prompt(createPrompt(details)).details(details).build();
    }

    @Override
    public EvaluationResultPrompt createPrompt(Map<String, Object> result) {
        var administeredAntiemetics = (List<MedRoutePair>) result.getOrDefault(ADMINISTERED_ANTIEMETICS, List.of());

        var medRecommendations = new ArrayList<>(List.of(
                "Ondansetron",
                "Haloperidol",
                "Dexamethasone",
                "Scopolamine"
        ));

        String prompt;

        if (administeredAntiemetics.isEmpty()) {
            // no antiemetics
            prompt = "Patient has not received antiemetics. " +
                     "Patients on ERAS protocol should receive at least 2 antiemetics. " +
                     "Recommend 2 of the following: " + CITATION_TOOLTIP_PLACEHOLDER + "<br><br>" +
                     displayMedRecommendations(medRecommendations);
        } else {

            administeredAntiemetics.forEach(administeredAntiemetic ->
                    medRecommendations.removeIf(recommendation ->
                            // We attempt to toUpperCase the displayed name here to match on category
                            // if we match the primary category, remove it from the list of recommended meds since it was already administered
                            administeredAntiemetic.med().getPrimaryMedicationCategory() != null &&
                            administeredAntiemetic.med().getPrimaryMedicationCategory().equals(recommendation.toUpperCase())));

            // one antiemetic
            if (administeredAntiemetics.size() == 1) {
                prompt = "Patient has received " +
                         administeredAntiemetics.getFirst().med().getShortName()
                         + " only. Patients on ERAS protocol should receive at least 2 antiemetics. " +
                         "Recommend one of the following: " + CITATION_TOOLTIP_PLACEHOLDER + "<br><br>" +
                         displayMedRecommendations(medRecommendations);
            } else {
                var administeredMedsString = grammaticalList(
                        administeredAntiemetics.stream().map(it -> it.med().getShortName()).toList()
                        , "");
                var firstAntiemetic = administeredAntiemetics.getFirst();
                var antiemeticClass = firstAntiemetic.med()
                        .getAntiemeticClassSpecifier(firstAntiemetic.route())
                        .orElseThrow();
                prompt = "Patient has received "
                         + administeredMedsString +
                         ", but all administered antiemetics are of class "
                         + antiemeticClass +
                         ". At least two antiemetics of different classes must be administered " +
                         "to meet ERAS protocol. Recommend one of the following:<br><br>" +
                         displayMedRecommendations(medRecommendations);
            }
        }

        String acceptText = administeredAntiemetics.isEmpty() ? "Will Give Antiemetics" : "Will Give Antiemetic";

        return EvaluationResultPromptTemplate
                .builder().ruleIdentifier(getRuleIdentifier())
                .title("Administer Antiemetics")
                .description(prompt)
                .tabName("ERAS Protocol")
                .type(RuleType.ALERT)
                .acceptText(acceptText).rejectText("Reject")
                .rejectReasons(Stream.of(
                                RejectionReason.PATIENT_NOT_ON_ERAS_PROTOCOL,
                                RejectionReason.ANTIEMETICS_GIVEN

                        )
                        .map(reason -> RejectionReasonOption.simple(reason))
                        .collect(Collectors.toList()))
                .citations(getCitations(result))
                .build()
                .createPrompt(result);
    }

    private String displayMedRecommendations(List<String> medRecommendations) {
        return "<ul> " + String.join("", medRecommendations.stream()
                .map(medRecommendation -> "<li>" + medRecommendation + "</li>")
                .toList())
               + "</ul>";
    }

    @Override
    public List<EventCategory> getApplicableEventCategories() {
        return List.of(EventCategory.ERAS_OPERATION_END);
    }

    private record MedRoutePair(ContextMedication med, MedicationRoute route) {
    }

    @Override
    public List<CitationId> getCitationDefinitions() {
        return List.of(CitationDefinition.ERAS_ANTIMETICS);
    }
}
