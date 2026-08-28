package com.guided.orci.utils;

import com.google.common.base.Preconditions;
import com.guided.orci.types.PostmenstrualAge;
import com.guided.orci.models.observation.Observation;
import com.guided.orci.models.patient.Gender;
import com.guided.orci.models.patient.vitals.BloodPressure;
import com.guided.orci.units.Units;
import com.guided.orci.units.quantities.BodyMassIndex;
import tech.units.indriya.ComparableQuantity;

import javax.annotation.CheckForNull;
import javax.measure.Quantity;
import javax.measure.quantity.Length;
import javax.measure.quantity.Mass;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import static com.guided.orci.units.Units.KILOGRAM;


public class Calculator {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(Calculator.class);
    public static int calculateCurrentAge(LocalDate date) {
        return DateUtils.yearsBetween(date, LocalDate.now());
    }

    public static Duration calculateCurrentAgeAsDuration(LocalDate date) {
        return calculateDuration(date, LocalDate.now());
    }
    public static Period calculateCurrentAgeAsPeriod(LocalDate date) {
        return calculatePeriod(date, LocalDate.now());
    }

    public static Duration calculateDuration(LocalDate start, LocalDate end) {
        return Duration.between(start.atStartOfDay(), end.atStartOfDay());
    }

    public static Period calculatePeriod(LocalDate start, LocalDate end) {
        return Period.between(start, end);
    }

    public static Float calculateMeanMAPFromOutpatient(List<BloodPressure> bpsInput) {
        if (bpsInput == null || bpsInput.isEmpty()) {
            return null;
        }
        var bps = new ArrayList<>(bpsInput); // clone to avoid modifications to the input list
        bps.sort(Comparator.comparing(BloodPressure::getMAPValue, (a, b) -> {
            var valA = a.getValue();
            var valB = b.getValue();
            return valA.compareTo(valB);
        }));
        int size = bps.size();
        List<BloodPressure> filteredBPs;
        if (size < 3) {
            filteredBPs = bps;
        } else if (size < 10) {
            // drop max and min bps
            filteredBPs = bps.subList(1, bps.size() - 1);
        } else {
            // drop top and bottom 20%
            // remove the bottom and top 20%
            int twentyPercentOfLength = (int) Math.floor(size * 0.2);
            int endIndex = size - twentyPercentOfLength;
            filteredBPs = bps.subList(twentyPercentOfLength, endIndex);
        }
        int count = filteredBPs.size();
        log.debug("Using {} out of {} BPs", count, size);
        Double total = filteredBPs.stream().map(bp -> bp.getMAPValue().getValue().doubleValue()).mapToDouble(Double::doubleValue).sum();
        return (float) (total / count);
    }

    public static Float calculateMeanMAPFromInpatient(List<BloodPressure> bpsInput) {
        if (bpsInput == null || bpsInput.isEmpty()) {
            return null;
        }
        var bps = new ArrayList<>(bpsInput); // clone to avoid modifications to the input list
        bps.sort(Comparator.comparing(BloodPressure::getMAPValue, (a, b) -> {
            var valA = a.getValue();
            var valB = b.getValue();
            return valA.compareTo(valB);
        }));
        int size = bps.size();
        List<BloodPressure> filteredBPs;
        if (size < 3) {
            filteredBPs = bps;
        } else if (size < 10) {
            // drop max and min bps
            filteredBPs = bps.subList(1, bps.size() - 1);
        } else {
            // drop top and bottom 20%
            // remove the bottom and top 20%
            int twentyPercentOfLength = (int) Math.floor(size * 0.2);
            int endIndex = size - twentyPercentOfLength;
            filteredBPs = bps.subList(twentyPercentOfLength, endIndex);
        }
        int count = filteredBPs.size();
        log.debug("Using {} out of {} BPs", count, size);
        Double total = filteredBPs.stream().map(bp -> bp.getMAPValue().getValue().doubleValue()).mapToDouble(Double::doubleValue).sum();
        return (float) (total / count);
    }

    public static float calculateMAP(float systolic, float diastolic) {
        return (systolic + (2f * diastolic)) / 3f;
    }


    /**
     * Calculate the creatinine clearance (CrCl) in mL/min for a pediatric patient
     */
    public static Double calculateCrClPediatric(Quantity<Length> height,
                                                float latestSCr) {
        float heightCm = height.to(Units.CENTIMETER).getValue().floatValue();
        return 0.413 * heightCm / latestSCr;
    }

    /**
     * Calculate the creatinine clearance (CrCl) in mL/min for an adult patient
     */
    public static @CheckForNull Double calculateCrClAdult(Gender gender,
                                                          Quantity<Mass> idealWeightQuantity,
                                                          Quantity<Mass> latestWeightQuantity,
                                                          float ageInYears,
                                                          float latestSCr) {
        float idealWeight = idealWeightQuantity.to(Units.KILOGRAM).getValue().floatValue();
        float latestWeight = latestWeightQuantity.to(Units.KILOGRAM).getValue().floatValue();
        return switch (gender) {
            case FEMALE -> {
                if (latestWeight >= idealWeight * 1.2) {
                    yield (140.0 - ageInYears) * (idealWeight + (0.4 * (latestWeight - idealWeight)))
                          * 0.85
                          / (72 * latestSCr);
                } else {
                    yield ((140.0 - ageInYears) * latestWeight * 0.85) / (72 * latestSCr);
                }
            }
            case MALE -> {
                if (latestWeight >= idealWeight * 1.2) {
                    yield (140.0 - ageInYears) * (idealWeight + (0.4 * (latestWeight - idealWeight)))
                          / (72 * latestSCr);
                } else {
                    yield (140.0 - ageInYears) * latestWeight / (72.0 * latestSCr);
                }
            }
            default -> null;
        };
    }

    /**
     * Ideal Body Weight (kg) Inputs: Sex, Height (inches)
     * <p>
     * If Male: If Height >= 60 inches: 50 + (2.3 x (Height– 60))
     * <p>
     * If Height <60 inches: 50 – (2.3 x (60-Height))
     * <p>
     * If Female: If Height>= 60 inches: 45.5 + (2.3 x (Height– 60))
     * <p>
     * If Height<60 inches: 45.5 – (2.3 x (60-Height))
     */
    public static @CheckForNull ComparableQuantity<Mass> calculateIdealBodyWeight(Gender gender, Quantity<Length> height) {
        Preconditions.checkNotNull(gender);
        Preconditions.checkNotNull(height);
        float heightInInches = height.to(Units.INCH).getValue().floatValue();

        var weightKg = switch (gender) {
            case FEMALE -> {
                if (heightInInches >= 60) {
                    yield 45.5f + (2.3f * (heightInInches - 60f));
                } else {
                    yield 45.5f + (2.3f * (60f - heightInInches));
                }
            }
            case MALE -> {
                if (heightInInches >= 60) {
                    yield 50.0f + (2.3f * (heightInInches - 60f));
                } else {
                    yield 50.0f + (2.3f * (60f - heightInInches));
                }
            }
            default -> null;
        };
        if (weightKg == null) {
            return null;
        }
        return Units.getQuantity(weightKg, Units.KILOGRAM);
    }

    public static @CheckForNull ComparableQuantity<Mass> calculateLeanBodyWeight(Gender gender, Quantity<Mass> patientWeight, Quantity<BodyMassIndex> patientBMI) {
        Preconditions.checkNotNull(gender);
        Preconditions.checkNotNull(patientWeight);
        Preconditions.checkNotNull(patientBMI);

        final float patientWeightKg = patientWeight.to(Units.KILOGRAM).getValue().floatValue();
        final float bmiValue = patientBMI.getValue().floatValue();

        var weightKg = switch (gender) {
            case MALE -> (9270 * patientWeightKg) / (6680 + (216 * bmiValue));
            case FEMALE -> (9270 * patientWeightKg) / (8780 + (244 * bmiValue));
            default -> null;
        };
        if (weightKg == null) {
            return null;
        }
        return Units.getQuantity(weightKg, Units.KILOGRAM);
    }

    public static @CheckForNull ComparableQuantity<Mass> calculateAdjustedBodyWeight(Gender gender, Quantity<Mass> patientWeight, Quantity<Length> patientHeight) {
        Preconditions.checkNotNull(gender);
        Preconditions.checkNotNull(patientWeight);
        Preconditions.checkNotNull(patientHeight);

        var idealBodyWeight = calculateIdealBodyWeight(gender, patientHeight);
        if (idealBodyWeight == null) {
            return null;
        }
        return idealBodyWeight.add(patientWeight.subtract(idealBodyWeight).multiply(0.4));
    }

    public static float centimetersToInches(float cm) {
        return cm * 0.393701f;
    }

    public static float inchesToCentimeters(float in) {
        return in / 0.393701f;
    }

    public static float poundsToKilograms(float lb) {
        return lb * 0.453592f;
    }

    public static float kilogramsToPounds(float kg) {
        return kg * 2.2046f;
    }

    public static Quantity<BodyMassIndex> calculateBMI(Quantity<Mass> weight, Quantity<Length> height) {
        Quantity<Length> heightM = height.to(Units.METER);
        return weight.to(KILOGRAM)
                .divide(heightM)
                .divide(heightM)
                .asType(BodyMassIndex.class);
    }

    public static PostmenstrualAge calculatePostmenstrualAge(LocalDate now, LocalDate birthDate, int gestationalAgeDays) {
        var totalDays = ChronoUnit.DAYS.between(birthDate, now) + gestationalAgeDays;
        return new PostmenstrualAge(totalDays);
    }

    public static Optional<Integer> gestationalAgeObservationToDays(Observation obs) {
        if (obs.getObservationUnits() == null) {
            log.warn("Missing unit for GESTATIONAL_AGE_BIRTH observation");
            return Optional.empty();
        }
        // expect age to be in days
        if (!obs.getObservationUnits().equals("d")) {
            log.warn("Unknown unit for GESTATIONAL_AGE_BIRTH: {} {}", obs.getObservationValue(), obs.getObservationUnits());
            return Optional.empty();
        }
        return Optional.of(obs.getNumericObservationValue().intValue());
    }

}
