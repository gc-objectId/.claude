package com.guided.orci.service;

import com.google.common.collect.ImmutableMap;
import com.guided.orci.dto.MedicationDTO;
import com.guided.orci.engine.rule.common.BoundMedicationComponent;
import com.guided.orci.exceptions.NotImplementedException;
import com.guided.orci.models.medication.*;
import com.guided.orci.models.rules.last.*;
import com.guided.orci.types.Concentration;
import com.guided.orci.types.Dose;
import com.guided.orci.types.PediatricStatus;
import com.guided.orci.types.wrappers.PatientId;
import com.guided.orci.units.Units;
import com.guided.orci.utils.Result;
import com.guided.orci.utils.TimebaseProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.measure.Quantity;
import javax.measure.quantity.Mass;
import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static com.guided.orci.models.medication.MedicationCategory.*;
import static com.guided.orci.units.Units.KILOGRAM;


@Service
@Slf4j
public class LASTProtocolService {

    public static final Duration LIDOCAINE_IV_LOOKBACK_PERIOD = Duration.ofMinutes(450); // 7.5 hours
    public static final Duration BUPIVACAINE_LIPOSOME_LOOKBACK_PERIOD = Duration.ofHours(120); // 5 days
    private static final BigDecimal BUPIVACAINE_LIPOSOME_MAX_DOSE_MG = new BigDecimal("266");
    private static final BigDecimal BUPIVACAINE_LIPOSOME_PEDIATRIC_MG_PER_KG = new BigDecimal("4");
    private static final Duration LIPOSOMAL_BUPIVACAINE_CO_ADMINISTRATION_WINDOW = Duration.ofMinutes(5);
    private static final BigDecimal BUPIVACAINE_TO_LIPOSOMAL_DOSE_RATIO = new BigDecimal("0.5");

    public static final Duration CHLOROPROCAINE_LOOKBACK_PERIOD = Duration.ofHours(6);

    /**
     * Lookback period for checking if an infusion has had a start/rate change event.
     */
    private static final Duration INFUSION_START_LOOKBACK_PERIOD = Duration.ofDays(7);
    private static final int LIDOCAINE_IV_FULL_DOSE_WINDOW_MINUTES = 75;
    private static final int LIDOCAINE_IV_HALF_LIFE_MINUTES = 90;
    private final MedicationAdministrationService medicationAdministrationService;
    private final Map<String, BigDecimal> medMgPerKg;
    private final Map<String, BigDecimal> medMlPerKg;


    public LASTProtocolService(MedicationAdministrationService medicationAdministrationService) {
        this.medicationAdministrationService = medicationAdministrationService;
        Map<String, BigDecimal> medMgPerKg = new HashMap<>();
        medMgPerKg.put(BUPIVACAINE, new BigDecimal("2.5"));
        medMgPerKg.put(MEPIVACAINE, new BigDecimal("5"));
        medMgPerKg.put(ROPIVACAINE, new BigDecimal("3"));
        medMgPerKg.put(CHLOROPROCAINE, new BigDecimal("11"));
        medMgPerKg.put(BUPIVACAINE_EPINEPHRINE, new BigDecimal("3"));
        medMgPerKg.put(LIDOCAINE_EPINEPHRINE, new BigDecimal("7"));
        medMgPerKg.put(MEPIVACAINE_EPINEPHRINE, new BigDecimal("7"));
        medMgPerKg.put(ROPIVACAINE_EPINEPHRINE, new BigDecimal("3.5"));
        medMgPerKg.put(CHLOROPROCAINE_EPINEPHRINE, new BigDecimal("14"));
        medMgPerKg.put(BUPIVACAINE_CLONIDINE, new BigDecimal("2.5"));
        medMgPerKg.put(BUPIVACAINE_DEXTROSE, new BigDecimal("2.5"));
        medMgPerKg.put(FENTANYL_BUPIVACAINE, new BigDecimal("2.5"));
        medMgPerKg.put(HYDROMORPHONE_BUPIVACAINE, new BigDecimal("2.5"));
        medMgPerKg.put(HYDROMORPHONE_BUPIVACAINE_CLONIDINE, new BigDecimal("2.5"));
        medMgPerKg.put(EPINEPHRINE_CLONIDINE_ROPIVACAINE_MORPHINE, new BigDecimal("3.5"));
        medMgPerKg.put(EPINEPHRINE_KETOROLAC_ROPIVACAINE, new BigDecimal("3.5"));
        medMgPerKg.put(CLONIDINE_EPINEPHRINE_KETOROLAC_ROPIVACAINE_MORPHINE, new BigDecimal("3.5"));
        medMgPerKg.put(ROPIVACAINE_EPINEPHRINE_CLONIDINE_KETOROLAC, new BigDecimal("3.5"));
        medMgPerKg.put(EPINEPHRINE_CLONIDINE_ROPIVACAINE, new BigDecimal("3.5"));
        this.medMgPerKg = ImmutableMap.copyOf(medMgPerKg);

        Map<String, BigDecimal> medMlPerKg = new HashMap<>();
        medMlPerKg.put(LIDOCAINE_EPINEPHRINE_ROPIVACAINE, new BigDecimal("0.7"));
        medMlPerKg.put(LIDOCAINE_BUPIVACAINE_0_DOT_5_EPINEPHRINE,
                // 42/65 mL/kg
                new BigDecimal(42).divide(new BigDecimal(65), MathContext.DECIMAL64));

        medMlPerKg.put(LIDOCAINE_BUPIVACAINE_0_DOT_25_EPINEPHRINE,
                // 84/95 mL/kg
                new BigDecimal(84).divide(new BigDecimal(95), MathContext.DECIMAL64));
        this.medMlPerKg = ImmutableMap.copyOf(medMlPerKg);
    }

    public List<PriorAdminListItem> getRelevantAdministrationDetails(PatientId patientId, TimebaseProvider tb, TimeZone timeZone) {
        return getRelevantAdministrations(patientId, tb).stream()
                .map(it -> new PriorAdminListItem(it, timeZone)).toList();
    }

    public List<? extends AbstractMedicationAdministration> getRelevantAdministrations(PatientId patientId, TimebaseProvider tb) {
        return medicationAdministrationService.getAdministrationsByMedicationCategory(
                patientId,
                MedicationCategory.LOCAL_ANESTHETIC
        ).stream().filter(
                medAdmin -> isRelevantMedAdmin(medAdmin, tb)
        ).sorted(AbstractMedicationAdministration.ORDERED_BY_LATEST_FIRST).toList();
    }

    private boolean isRelevantMedAdmin(AbstractMedicationAdministration medAdmin, TimebaseProvider tb) {
        var now = tb.getTimebaseAsInstant();
        if (medAdmin instanceof IInfusionMedicationAdministration infusion) {
            var infusionStartLookbackCutoff = Date.from(now.minus(INFUSION_START_LOOKBACK_PERIOD));

            if (infusion.isOngoing(infusionStartLookbackCutoff, tb)) {
                // A START or RATE_CHANGE event that occurred in the last 7 days AND no subsequent STOP event
                return true;
            }

            // A START or RATE_CHANGE event that occurred in the last 7 days
            var mostRecentStartOrRateChangeEvent = infusion.getMostRecentEvent(Set.of(InfusionEventType.START, InfusionEventType.RATE_CHANGE));
            if (mostRecentStartOrRateChangeEvent.isEmpty() || mostRecentStartOrRateChangeEvent.get().getEventDate().before(infusionStartLookbackCutoff)) {
                return false;
            }
            // AND a STOP event that has occurred in the window specific to the med category
            var mostRecentStopEvent = infusion.getMostRecentEvent(InfusionEventType.STOP);
            var stopEventCutoff = Date.from(now.minus(getLookbackPeriod(medAdmin)));
            return mostRecentStopEvent.isPresent() && mostRecentStopEvent.get().getEventDate().after(stopEventCutoff);
        } else if (medAdmin instanceof IBolusMedicationAdministration) {
            var cutoffDate = Date.from(now.minus(getLookbackPeriod(medAdmin)));
            return medAdmin.isAdministeredAfter(cutoffDate, tb);
        } else {
            throw new RuntimeException("Unknown med admin type: " + medAdmin.getClass().getName());
        }
    }

    /**
     * Calculates the remaining allowable dose for a given local anesthetic medication
     * This returns all the same data as calculateRemainingPercentage, with the addition of
     * a calculated concrete dose based based on the given med's maximum dose and the remaining percent
     * <p>
     * Unlike calculateRemainingPercentage, this method can fail if the given med's total max dose
     * cannot be calculated
     */
    public Optional<RemainingDoseCalculation> calculateRemainingDose(
            CheckedDose checkedDose,
            PatientId patientId,
            PediatricStatus pediatricStatus,
            TypedWeight patientWeight,
            TimebaseProvider tb
    ) {
        var givenMed = checkedDose.medication();
        var givenMedMaxDose = calculateLocalAnestheticTotalMaxDose(
                patientWeight.quantity(),
                givenMed,
                pediatricStatus
        );
        if (givenMedMaxDose.isEmpty()) {
            log.warn("Unable to calculate max dose for given med {}", givenMed.parentMedId());
            return Optional.empty();
        }
        var remainingPercentageCalc = calculateRemainingPercentage(patientId, pediatricStatus, patientWeight, tb, checkedDose);
        var remainingDoseCalc = new RemainingDoseCalculation(remainingPercentageCalc);

        remainingDoseCalc.setGivenMedMaxDose(givenMedMaxDose.get());

        var remainingDoseAmount = givenMedMaxDose.get().maxDose().getValue().multiply(remainingDoseCalc.getRemainingPercent());

        switch (givenMedMaxDose.get()) {
            case MaxDoseCalculation.JustMg ignored -> {
                remainingDoseCalc.setRemainingDoseMg(remainingDoseAmount);
            }
            case MaxDoseCalculation.ConcentrationCalculated cc -> {
                remainingDoseCalc.setRemainingDoseMg(remainingDoseAmount);
                var remainingDoseMl = remainingDoseAmount.divide(cc.concentrationMgMl(), RoundingMode.HALF_UP);
                remainingDoseCalc.setRemainingDoseMl(Optional.of(remainingDoseMl));
            }
            case MaxDoseCalculation.JustMl ignored -> {
                throw new NotImplementedException("Calculating 'remaining dose' for mL-dosed meds (" + givenMed.parentMedId() + ")" +
                                                  "without concentration isn't supported. " +
                                                  "(we aren't expecting these to be dosed via Guided yet)");
            }
        }

        return Optional.of(remainingDoseCalc);
    }

    /**
     * Calculate the remaining local anesthetic percentage available for a given patient and the dose being checked.
     * Prior doses the checked product's label permits alongside it are left out of the steps.
     * Result will be a RemainingPercentCalculation containing the calculation steps and a number between 0 and 1
     * indicating the fraction of local anesthetic remaining
     */
    public RemainingPercentCalculation calculateRemainingPercentage(
            PatientId patientId,
            PediatricStatus pediatricStatus,
            TypedWeight patientWeight,
            TimebaseProvider tb,
            CheckedDose checkedDose
    ) {
        var calculation = new RemainingPercentCalculation();
        var priorDoses = getRelevantAdministrations(patientId, tb).stream()
                .flatMap(priorAdmin -> resolvePriorDose(priorAdmin, pediatricStatus, patientWeight, tb).stream())
                .toList();
        var excludedDoses = liposomalBupivacaineExclusion(checkedDose, pediatricStatus, patientWeight)
                .map(exclusion -> exclusion.excludedFrom(priorDoses))
                .orElse(List.of());
        BigDecimal allowableFraction = new BigDecimal("1");
        for (var priorDose : priorDoses) {
            if (excludedDoses.contains(priorDose)) {
                continue;
            }
            var priorAdmin = priorDose.admin();
            var maxDose = priorDose.maxDose().maxDose().getValue();

            HalfLifeCalculation halfLifeCalculation;
            BigDecimal remainingDoseAmount;
            if (isLidocaineIntravenous(priorAdmin)) {
                halfLifeCalculation = adjustLidocaineIvDose(priorAdmin, priorDose.givenDose(), priorDose.lookbackInstant(), tb);
            } else {
                halfLifeCalculation = HalfLifeCalculation.generateFullDoseCalculation(priorDose.givenDose());
            }
            remainingDoseAmount = halfLifeCalculation.adjustedDoseAmount();

            var givenFraction = remainingDoseAmount.divide(maxDose, 2, RoundingMode.HALF_UP);

            calculation.addStep(
                    priorAdmin.getMedicationName(),
                    remainingDoseAmount,
                    maxDose,
                    priorDose.maxDose().dosePerKgMultiplier(),
                    givenFraction,
                    halfLifeCalculation,
                    priorDose.doseUnit());

            allowableFraction = allowableFraction.subtract(givenFraction).max(BigDecimal.ZERO);
        }
        calculation.setRemainingPercent(allowableFraction);
        return calculation;
    }

    private record PriorDose(AbstractMedicationAdministration admin, MaxDoseCalculation maxDose, Dose givenDose, String doseUnit, Instant lookbackInstant) {
    }

    private Optional<PriorDose> resolvePriorDose(
            AbstractMedicationAdministration priorAdmin,
            PediatricStatus pediatricStatus,
            TypedWeight patientWeight,
            TimebaseProvider tb
    ) {
        var maybePriorMed = priorAdmin.getMedication();
        if (maybePriorMed.isEmpty()) {
            log.warn("No medication for prior admin {}", priorAdmin.getMedicationIdentifier());
            return Optional.empty();
        }

        var localAnesthetic = BoundMedicationComponent.extractComponentByCategory(priorAdmin, LOCAL_ANESTHETIC);
        if (localAnesthetic.isError()) {
            log.warn("Unable to process prior local anesthetic: {} reason: {}", maybePriorMed.get().getMedicationIdentifier(), localAnesthetic.getError());
            return Optional.empty();
        }

        var priorAdminMaxDose = calculateLocalAnestheticTotalMaxDose(patientWeight.quantity(), localAnesthetic.getOk(), pediatricStatus);
        if (priorAdminMaxDose.isEmpty()) {
            log.warn("Unable to calculate max dose for prior admin {}", priorAdmin.getMedicationIdentifier());
            return Optional.empty();
        }

        var lookbackInstant = tb.getTimebaseAsInstant().minus(getLookbackPeriod(priorAdmin));

        if (hasVolumeBasedMaxDose(localAnesthetic.getOk().topLevelMedPrimaryCategory()) && priorAdmin instanceof IBolusMedicationAdministration bolus) {
            var rawDose = bolus.getDose();
            if (rawDose.isEmpty() || !rawDose.get().getUnit().equalsIgnoreCase("mL")) {
                log.warn("Volume-based med {} has non-mL dose: {}", priorAdmin.getMedicationIdentifier(), rawDose.map(Dose::getUnit).orElse("empty"));
                return Optional.empty();
            }
            return Optional.of(new PriorDose(priorAdmin, priorAdminMaxDose.get(), rawDose.get(), "mL", lookbackInstant));
        }

        var calculatedDose = priorAdmin.calculateDoseByCategory(
                LOCAL_ANESTHETIC,
                pediatricStatus,
                lookbackInstant,
                tb.getTimebaseAsInstant());
        if (calculatedDose.isError()) {
            log.warn("Unable to determine local anesthetic dose for prior admin {}. Explanation: {}", priorAdmin.getMedicationIdentifier(), calculatedDose.getError());
            return Optional.empty();
        }
        if (!calculatedDose.getOk().quantity().getUnit().equals(Units.MILLIGRAM)) {
            log.warn("Unexpected dose unit for prior admin (expected mg) {}: {}", priorAdmin.getMedicationIdentifier(), calculatedDose.getOk().getUnit());
            return Optional.empty();
        }
        return Optional.of(new PriorDose(priorAdmin, priorAdminMaxDose.get(), calculatedDose.getOk(), "mg", lookbackInstant));
    }

    /**
     * Calculates the total maximum allowable dose for a given local anesthetic medication
     */
    public Optional<MaxDoseCalculation> calculateLocalAnestheticTotalMaxDose(
            Quantity<Mass> patientWeight,
            BoundMedicationComponent medication,
            PediatricStatus pediatricStatus
    ) {
        var category = medication.topLevelMedPrimaryCategory();
        var patientWeightKg = weightInKg(patientWeight);

        if (medMlPerKg.containsKey(category)) {
            BigDecimal mlPerKg = medMlPerKg.get(category);
            BigDecimal maxDoseMl = mlPerKg.multiply(patientWeightKg);
            return Optional.of(new MaxDoseCalculation.JustMl(
                    Dose.of(maxDoseMl.floatValue(), Units.MILLILITER), mlPerKg));
        }

        var maybeMgMaxDose = calculateMgMaxDose(medication, pediatricStatus, patientWeightKg);
        if (maybeMgMaxDose.isEmpty()) {
            log.warn("No mg/kg or ml/kg multiplier for medication {}", medication.parentMedId());
            return Optional.empty();
        }

        BigDecimal maxDoseMg = maybeMgMaxDose.get().maxDoseMg();
        Optional<BigDecimal> mgPerKgMultiplier = maybeMgMaxDose.get().mgPerKg();

        if (medication.concentration().isEmpty()) {
            log.info("No concentration for medication {}", medication.parentMedId());
            return Optional.of(new MaxDoseCalculation.JustMg(Dose.of(maxDoseMg, Units.MILLIGRAM), mgPerKgMultiplier));
        }

        Concentration concentration = medication.concentration().get();

        if (!concentration.getUnit().equals("%")) {
            log.warn("Unexpected concentration units for medication {}: {} (expected '%')",
                    medication.parentMedId(),
                    concentration.getUnit());
            return Optional.of(new MaxDoseCalculation.JustMg(Dose.of(maxDoseMg, Units.MILLIGRAM), mgPerKgMultiplier));
        }

        BigDecimal concentrationPercent = concentration.getAmount();
        BigDecimal concentrationMgPerMl = concentrationPercent.multiply(new BigDecimal("10"));
        BigDecimal maxDoseMl = maxDoseMg.divide(concentrationMgPerMl, 4, RoundingMode.HALF_UP);
        return Optional.of(new MaxDoseCalculation.ConcentrationCalculated(Dose.of(maxDoseMg, Units.MILLIGRAM), Dose.of(maxDoseMl, Units.MILLILITER), concentrationMgPerMl, mgPerKgMultiplier));
    }

    private static BigDecimal weightInKg(Quantity<Mass> patientWeight) {
        return new BigDecimal(patientWeight.to(KILOGRAM).getValue().toString());
    }

    private record MgMaxDose(BigDecimal maxDoseMg, Optional<BigDecimal> mgPerKg) {
        static MgMaxDose perKg(BigDecimal mgPerKg, BigDecimal patientWeightKg) {
            return new MgMaxDose(mgPerKg.multiply(patientWeightKg), Optional.of(mgPerKg));
        }

        static MgMaxDose fixed(BigDecimal maxDoseMg) {
            return new MgMaxDose(maxDoseMg, Optional.empty());
        }
    }

    private Optional<MgMaxDose> calculateMgMaxDose(BoundMedicationComponent medication, PediatricStatus pediatricStatus, BigDecimal patientWeightKg) {
        if (BUPIVACAINE_LIPOSOME.equals(medication.topLevelMedPrimaryCategory())) {
            return Optional.of(liposomalBupivacaineMaxDose(pediatricStatus, patientWeightKg));
        }
        return getMgPerKgMultiplier(medication).map(mgPerKg -> MgMaxDose.perKg(mgPerKg, patientWeightKg));
    }

    private static MgMaxDose liposomalBupivacaineMaxDose(PediatricStatus pediatricStatus, BigDecimal patientWeightKg) {
        if (pediatricStatus.isPediatric()) {
            var weightBased = MgMaxDose.perKg(BUPIVACAINE_LIPOSOME_PEDIATRIC_MG_PER_KG, patientWeightKg);
            if (weightBased.maxDoseMg().compareTo(BUPIVACAINE_LIPOSOME_MAX_DOSE_MG) < 0) {
                return weightBased;
            }
        }
        return MgMaxDose.fixed(BUPIVACAINE_LIPOSOME_MAX_DOSE_MG);
    }

    /**
     * Returns the mg/kg multiplier based on the med/route
     */
    private Optional<BigDecimal> getMgPerKgMultiplier(BoundMedicationComponent localAnesthetic) {
        var medicationCategory = localAnesthetic.topLevelMedPrimaryCategory();
        if (medicationCategory == null) {
            return Optional.empty();
        }
        if (medicationCategory.equals(LIDOCAINE)) {
            MedicationRoute route = localAnesthetic.route().orElse(null);
            if (MedicationRoute.INTRAVENOUS.equals(route)) {
                return Optional.of(new BigDecimal("1.5"));
            } else {
                return Optional.of(new BigDecimal("4.5"));
            }
        }
        if (medMgPerKg.containsKey(medicationCategory)) {
            return Optional.of(medMgPerKg.get(medicationCategory));
        }
        return Optional.empty();
    }

    private boolean hasVolumeBasedMaxDose(String medicationCategory) {
        return medMlPerKg.containsKey(medicationCategory);
    }

    public Optional<NextAllowedAdminDateResult> getNextAllowedAdminDate(PatientId patientId, TimebaseProvider tb) {
        var relevantAdmins = getRelevantAdministrations(patientId, tb);

        return relevantAdmins.stream()
                .flatMap(admin ->
                        admin instanceof MedicationAdministration bolus
                                ? Stream.of(bolus)
                                : admin instanceof InfusionMedicationAdministration infusion && infusion.isStopped(tb.getTimebase())
                                ? Stream.of(infusion)
                                : Stream.empty())
                .sorted(AbstractMedicationAdministration.ORDERED_BY_LATEST_FIRST)
                .collect(Collectors.toMap(
                        it -> it.getMedicationIdentifier() + " " + it.getRoute(),
                        it -> {

                            // should be safe to assume getEndOfAdministrationDate is not null,
                            // since we check isStopped above for infusions.
                            // noinspection DataFlowIssue
                            var timeTillNextAdmin = getDurationUntilNextAllowedAdministration(it, it.getEndOfAdministrationDate().toInstant(), tb);
                            return new NextAllowedAdminDateResult(
                                    Date.from(tb.getTimebaseAsInstant().plus(timeTillNextAdmin)),
                                    it
                            );
                        },
                        // Since the admins are sorted by latest first, ignore subsequent entries to only keep the latest
                        (first, second) -> first))
                .entrySet().stream()
                .min(Map.Entry.comparingByValue(Comparator.comparing(NextAllowedAdminDateResult::date)))
                .map(Map.Entry::getValue);
    }

    /**
     * Duration for how far back we should be looking for medications of interest
     */
    private Duration getLookbackPeriod(IMedicationAdministration medAdmin) {
        if (isLidocaineIntravenous(medAdmin)) {
            return LIDOCAINE_IV_LOOKBACK_PERIOD;
        }

        if (medAdmin.isPrimaryMedicationCategory(CHLOROPROCAINE)) {
            return CHLOROPROCAINE_LOOKBACK_PERIOD;
        }

        if (medAdmin.isPrimaryMedicationCategory(BUPIVACAINE_LIPOSOME)) {
            return BUPIVACAINE_LIPOSOME_LOOKBACK_PERIOD;
        }

        return Duration.ofHours(24);
    }

    /**
     * Duration for calculating when the next allowable administration should be
     */
    private Duration getDurationUntilNextAllowedAdministration(IMedicationAdministration medAdmin, Instant adminDate, TimebaseProvider tb) {
        var waitDuration = Duration.ofHours(24);
        if (isLidocaineIntravenous(medAdmin)) {
            waitDuration = Duration.ofMinutes(LIDOCAINE_IV_FULL_DOSE_WINDOW_MINUTES);
        }

        if (medAdmin.isPrimaryMedicationCategory(CHLOROPROCAINE)) {
            waitDuration = CHLOROPROCAINE_LOOKBACK_PERIOD;
        }

        if (medAdmin.isPrimaryMedicationCategory(BUPIVACAINE_LIPOSOME)) {
            waitDuration = BUPIVACAINE_LIPOSOME_LOOKBACK_PERIOD;
        }
        Instant now = tb.getTimebaseAsInstant();
        var timeSinceAdmin = Duration.between(adminDate, now);
        return waitDuration.minus(timeSinceAdmin);
    }

    private boolean isLidocaineIntravenous(IMedicationAdministration medAdmin) {
        return medAdmin.isPrimaryMedicationCategory(LIDOCAINE) && MedicationRoute.INTRAVENOUS.equals(medAdmin.getRoute());
    }

    /**
     * If lidocaine IV admin was < 75 min ago, use the full prior dose
     * → so the percentage of the max that the prior dose "used up" = lidocaine_iv_full_prior_dose/lidocaine IV max dose
     * If lidocaine IV admin was ≥ 75 min ago & < 7.5 hours ago, use an adjusted amount for the prior dose, instead of the full administered dose.
     * lidocaine_iv_remaining_prior_dose = (lidocaine_iv_full_prior_dose) * (0.5)^(minutes since admin time/90 minutes)
     * → so the percentage of the max that the prior dose "used up" = lidocaine_iv_remaining_prior_dose/lidocaine IV max dose
     */
    private HalfLifeCalculation adjustLidocaineIvDose(AbstractMedicationAdministration priorAdmin, Dose priorAdminGivenDose, Instant lookbackInstant, TimebaseProvider tb) {
        var endOfAdmin = priorAdmin.getEndOfAdministrationDate();
        if (endOfAdmin == null) {
            log.warn("Missing end of administration date for lidocaine IV admin {}", priorAdmin.getMedicationIdentifier());
            // use the full dose if we can't get an end date
            return HalfLifeCalculation.generateFullDoseCalculation(priorAdminGivenDose);
        }
        var elapsedMinutesDouble = Duration.between(endOfAdmin.toInstant(), tb.getTimebaseAsInstant()).toSeconds() / 60d;
        int elapsedMinutesRounded = (int) Math.round(elapsedMinutesDouble);

        if (elapsedMinutesDouble < LIDOCAINE_IV_FULL_DOSE_WINDOW_MINUTES) {
            // if the med is still recent, assume the full dose
            return HalfLifeCalculation.generateFullDoseCalculation(priorAdminGivenDose);
        }

        var exponent = elapsedMinutesDouble / LIDOCAINE_IV_HALF_LIFE_MINUTES;
        var decayFactor = Math.pow(0.5d, exponent);
        var halfLifeDose = priorAdminGivenDose.getValue().multiply(BigDecimal.valueOf(decayFactor));
        return HalfLifeCalculation.generateHalfLifeDoseCalculation(priorAdminGivenDose, halfLifeDose, elapsedMinutesRounded, LIDOCAINE_IV_HALF_LIFE_MINUTES, decayFactor);
    }

    public Result<String, BoundMedicationComponent> getMedComponentToUse(MedicationDTO medication) {
        if (hasVolumeBasedMaxDose(medication.getPrimaryMedicationCategory())) {
            return Result.error("Medication has volume-based max dose, is not valid to select.");
        }
        return BoundMedicationComponent.extractComponentByCategory(medication, LOCAL_ANESTHETIC);
    }

    public record NextAllowedAdminDateResult(Date date, AbstractMedicationAdministration admin) {
    }

    public record CheckedDose(BoundMedicationComponent medication, Instant time, Optional<Dose> dose) {
        public static CheckedDose atSelection(BoundMedicationComponent medication, TimebaseProvider tb) {
            return new CheckedDose(medication, tb.getTimebaseAsInstant(), Optional.empty());
        }

        public static CheckedDose atSave(BoundMedicationComponent medication, Instant time, Dose dose) {
            return new CheckedDose(medication, time, Optional.of(dose));
        }
    }

    private Optional<LiposomalBupivacaineExclusion> liposomalBupivacaineExclusion(CheckedDose checkedDose,
                                                                                  PediatricStatus pediatricStatus,
                                                                                  TypedWeight patientWeight) {
        if (!BUPIVACAINE_LIPOSOME.equals(checkedDose.medication().topLevelMedPrimaryCategory())) {
            return Optional.empty();
        }
        var liposomalDoseMg = checkedDose.dose()
                .flatMap(dose -> doseInMilligrams(dose, checkedDose.medication()))
                .orElseGet(() -> liposomalBupivacaineMaxDose(pediatricStatus, weightInKg(patientWeight.quantity())).maxDoseMg());
        return Optional.of(new LiposomalBupivacaineExclusion(
                checkedDose.time().truncatedTo(ChronoUnit.MINUTES),
                liposomalDoseMg.multiply(BUPIVACAINE_TO_LIPOSOMAL_DOSE_RATIO)));
    }

    private static Optional<BigDecimal> doseInMilligrams(Dose dose, BoundMedicationComponent medication) {
        Optional<Dose> massDose = switch (dose) {
            case Dose.MassBasedDose mass -> Optional.of(mass);
            case Dose.VolumeBasedDose(var volume) -> medication.concentration()
                    .flatMap(Concentration::asQuantity)
                    .flatMap(concentration -> Dose.of(volume.multiply(concentration)));
            default -> Optional.empty();
        };
        return massDose.flatMap(it -> it.tryConvertTo(Units.MILLIGRAM)).map(Dose::getValue);
    }

    private record LiposomalBupivacaineExclusion(Instant liposomalMinute, BigDecimal bupivacaineLimitMg) {
        List<PriorDose> excludedFrom(List<PriorDose> priorDoses) {
            var lidocaine = priorDoses.stream().filter(this::isLidocaineBefore).toList();
            var bupivacaine = priorDoses.stream().filter(this::isBupivacaineBolusInWindow).toList();
            var bupivacaineTotalMg = bupivacaine.stream()
                    .map(priorDose -> priorDose.givenDose().getValue())
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (bupivacaineTotalMg.compareTo(bupivacaineLimitMg) > 0) {
                return lidocaine;
            }
            return Stream.concat(lidocaine.stream(), bupivacaine.stream()).toList();
        }

        private boolean isLidocaineBefore(PriorDose priorDose) {
            return priorDose.admin().isPrimaryMedicationCategory(LIDOCAINE)
                   && endOfAdministrationMinute(priorDose).filter(minute -> !minute.isAfter(liposomalMinute)).isPresent();
        }

        private boolean isBupivacaineBolusInWindow(PriorDose priorDose) {
            return priorDose.admin() instanceof IBolusMedicationAdministration
                   && priorDose.admin().isPrimaryMedicationCategory(BUPIVACAINE)
                   && endOfAdministrationMinute(priorDose).filter(this::isInWindow).isPresent();
        }

        private boolean isInWindow(Instant priorMinute) {
            var minutesBefore = Duration.between(priorMinute, liposomalMinute);
            return !minutesBefore.isNegative() && minutesBefore.compareTo(LIPOSOMAL_BUPIVACAINE_CO_ADMINISTRATION_WINDOW) <= 0;
        }

        private static Optional<Instant> endOfAdministrationMinute(PriorDose priorDose) {
            return Optional.ofNullable(priorDose.admin().getEndOfAdministrationDate())
                    .map(Date::toInstant)
                    .map(instant -> instant.truncatedTo(ChronoUnit.MINUTES));
        }
    }

}
