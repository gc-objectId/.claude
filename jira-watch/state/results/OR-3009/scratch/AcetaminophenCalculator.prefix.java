package com.guided.orci.engine.rule.medication.utils;

import com.guided.orci.models.patient.IPatient;
import com.guided.orci.models.rules.CitationDefinition;
import com.guided.orci.types.Dose;
import com.guided.orci.units.Units;
import tech.units.indriya.ComparableQuantity;

import javax.measure.quantity.Mass;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Optional;

public class AcetaminophenCalculator {
    private static final Map<String, Float> medIdToMultipleMg;

    static {
        medIdToMultipleMg = Map.of(
                "m-acetaminophen-iv", 10f,
                "m-acetaminophen-liquid", 32f,
                "m-acetaminophen-80-tablet", 40f,
                "m-acetaminophen-500-tablet", 250f,
                "m-acetaminophen-325-tablet", 162.5f,
                "m-acetaminophen-suppository", 325f
        );
    }

    public static Float getMaxSingleDoseMg(Float weightKg, String medId) {
        if (weightKg == null || weightKg >= 50f) {
            return 1000f;
        } else {
            var multiple = medIdToMultipleMg.getOrDefault(medId, 1f);
            float value = weightKg * 15;
            if (value > multiple) {
                return (float) Math.round(value / multiple) * multiple;
            } else {
                // extremely low weight, maybe we should refuse to go this low?
                return multiple;
            }
        }
    }

    /**
     * Returns the remaining dose to the max dose for when we would warn
     * @param patient
     * @return
     */
    public static Optional<Float> getWarningThresholdMg(IPatient patient) {
        Float weightKg = patient.getWeightKg();
        Integer ageYears = patient.getAge();
        Integer ageInDays = getAgeInDays(patient);
        if(ageYears == null) {
            return Optional.empty();
        }
        if(weightKg == null) {
            return Optional.empty();
        }

        if (ageYears > 12) {
            if (weightKg >= 50) {
                return Optional.of(1000f);
            }
            return Optional.of(weightKg * 15f);
        }

        if (ageYears >= 2) {
            if (weightKg >= 50) {
                return Optional.of(750f);
            }
            return Optional.of(weightKg * 15f);
        }
        if (ageInDays != null && ageInDays >= 29) {
            return Optional.of(weightKg * 15f);
        }

        return Optional.empty();
    }


    /**
     * Determines the max cumulative dose based on patient criteria
     * @param patient
     * @return
     */
    public static Optional<CumulativeMaxDose> getMaxCumulativeDose(IPatient patient) {
        Float weightKg = patient.getWeightKg();
        Integer ageYears = patient.getAge();
        Integer ageInDays = getAgeInDays(patient);

        if(ageYears == null) {
            return Optional.empty();
        }
        if(weightKg == null) {
            return Optional.empty();
        }

        if (ageYears > 12) {
            if (weightKg >= 50) {
                return Optional.of(
                        new CumulativeMaxDose(Dose.of(4000f, Units.MILLIGRAM), Duration.ofHours(24), CitationDefinition.ACETAMINOPHEN_MAX_GTE_50, ""));
            }
            return Optional.of(
                    new CumulativeMaxDose(Dose.of(weightKg * 75f, Units.MILLIGRAM), Duration.ofHours(24), CitationDefinition.ACETAMINOPHEN_MAX_LT_50, "(75 mg/kg)"));
        }

        if (ageYears >= 2) {
            if (weightKg >= 50) {
                return Optional.of(new CumulativeMaxDose(Dose.of(3750f, Units.MILLIGRAM), Duration.ofHours(24), CitationDefinition.ACETAMINOPHEN_PEDIATRIC_CUMULATIVE_MAX, ""));
            }
            return Optional.of(new CumulativeMaxDose(Dose.of(weightKg * 75f, Units.MILLIGRAM), Duration.ofHours(24), CitationDefinition.ACETAMINOPHEN_PEDIATRIC_CUMULATIVE_MAX, "(75 mg/kg)"));
        }

        if (ageInDays != null && ageInDays >= 29) {
            return Optional.of(new CumulativeMaxDose(Dose.of(weightKg * 60f, Units.MILLIGRAM), Duration.ofHours(24), CitationDefinition.ACETAMINOPHEN_INFANT_CUMULATIVE_MAX,"(60 mg/kg)"));
        }

        return Optional.empty();
    }

    private static Integer getAgeInDays(IPatient patient) {
        LocalDate dob = patient.getDob();
        if (dob == null) {
            return null;
        }
        return (int) ChronoUnit.DAYS.between(dob, LocalDate.now(ZoneId.systemDefault()));
    }

}
