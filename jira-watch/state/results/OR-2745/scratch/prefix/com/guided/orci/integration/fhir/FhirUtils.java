package com.guided.orci.integration.fhir;

import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.stream.Collectors;

import lombok.extern.slf4j.Slf4j;
import org.hl7.fhir.r4.model.*;

import com.guided.orci.models.patient.ValueUnit;

import ca.uhn.fhir.model.dstu2.composite.QuantityDt;
import ca.uhn.fhir.model.primitive.DateTimeDt;

@Slf4j
public class FhirUtils {

    public static ValueUnit getQuantityDSTU2ObservationValue(Optional<ca.uhn.fhir.model.dstu2.resource.Observation> observation, String preferredUnits) {
        if (observation.isPresent()) {
            ca.uhn.fhir.model.dstu2.resource.Observation latest = observation.get();
            QuantityDt data = (QuantityDt) latest.getValue();
            BigDecimal value = data.getValue();
            String unit = data.getUnit();
            Date time = ((DateTimeDt) latest.getEffective()).getValue();
            log.info("Observation parsing: label: {}, value: {}, units: {}, time: {} obs: {}",
                    latest.getCode().getText(), unit, time, latest);
            if (!preferredUnits.equals(unit)) {
                log.warn("Observation is in {} instead of the preferred units {} ", unit, preferredUnits);
            }
            if (value != null) {
                return new ValueUnit(value, unit);
            }
        }
        return null;
    }

    public static ValueUnit getQuantityR4ObservationValue(Optional<org.hl7.fhir.r4.model.Observation> observation, String preferredUnits) {
        if (observation.isPresent()) {
            org.hl7.fhir.r4.model.Observation latest = observation.get();
            Quantity data = (Quantity) latest.getValue();
            BigDecimal value = data.getValue();
            String unit = data.getUnit();
            Date time = ((DateTimeType) latest.getEffective()).getValue();
            log.info("Observation parsing: label: {}, value: {}, units: {}, time: {} obs: {}",
                    latest.getCode().getText(), unit, time, latest);
            if (!preferredUnits.equals(unit)) {
                log.warn("Observation is in {} instead of the preferred units {} ", unit, preferredUnits);
            }
            if (value != null) {
                return new ValueUnit(value, unit);
            }
        }
        return null;
    }

    /**
     * True when the status says no result was ever produced, so the resource carries an
     * explanation rather than a measurement: a canceled order, or one retracted after the fact.
     * Every other status describes a result a clinician could act on, including {@code preliminary},
     * which Epic uses for auto-verified results that have not been reviewed yet.
     * <p>
     * {@code status} is a required binding in R4, so the eight codes here are exhaustive. A null
     * arrives only from a malformed payload, and is left to the value checks to reject.
     */
    public static boolean isNonResultStatus(Observation.ObservationStatus status) {
        return status == Observation.ObservationStatus.CANCELLED
               || status == Observation.ObservationStatus.ENTEREDINERROR;
    }

    /**
     * Observation counts per FHIR status code, for callers that log what an EMR actually sends.
     * Keyed by code and ordered, so successive log lines can be compared by eye.
     */
    public static Map<String, Long> countByStatus(List<Observation> observations) {
        return observations.stream()
                .collect(Collectors.groupingBy(
                        obs -> obs.getStatus() == null ? "absent" : obs.getStatus().toCode(),
                        TreeMap::new,
                        Collectors.counting()));
    }

    /**
     * The value of an observation, as the EMR chose to type it. Epic picks the element from the shape
     * of the result: a plain measurement is a Quantity, a bounded one a Range, a titer a Ratio, and
     * anything it cannot type a String. Each organization types a given lab on its own schedule, so
     * all four read here, and the same lab produces the same record everywhere.
     * <p>
     * A bound stays in the value text: {@code >90} is not the measurement 90, and reading it as one
     * would let a rule act on a number the lab never reported. The prefix makes the value
     * non-numeric, so a rule that needs a number takes its no-value path.
     */
    public static ObservationValue getValueAndUnit(Type obsValue) {
        String value = null;
        String unit = null;
        if (obsValue instanceof Quantity quantity) {
            value = quantity.getValue() != null ? comparatorPrefix(quantity) + quantity.getValue().toPlainString() : null;
            unit = quantity.getUnit() != null ? quantity.getUnit() : null;
        } else if (obsValue instanceof Range range) {
            // A Range with one bound is open on the other side, which is what the bound alone means.
            Quantity low = range.hasLow() ? range.getLow() : null;
            Quantity high = range.hasHigh() ? range.getHigh() : null;
            String lowValue = boundValue(low);
            String highValue = boundValue(high);
            if (lowValue != null && highValue != null) {
                value = lowValue + "-" + highValue;
            } else if (lowValue != null) {
                value = ">=" + lowValue;
            } else if (highValue != null) {
                value = "<=" + highValue;
            }
            if (value != null) {
                unit = low != null && low.getUnit() != null ? low.getUnit() : high == null ? null : high.getUnit();
            }
        } else if (obsValue instanceof Ratio ratio) {
            // Both sides are the result: a titer of 1:16 says nothing without its denominator.
            Quantity numerator = ratio.hasNumerator() ? ratio.getNumerator() : null;
            Quantity denominator = ratio.hasDenominator() ? ratio.getDenominator() : null;
            String numeratorValue = boundValue(numerator);
            String denominatorValue = boundValue(denominator);
            if (numeratorValue != null && denominatorValue != null) {
                value = numeratorValue + ":" + denominatorValue;
                unit = ratioUnit(numerator.getUnit(), denominator.getUnit());
            }
        } else if (obsValue instanceof StringType stringType) {
            if (stringType.getValue().contains(" ")) {
                value = stringType.getValue().split(" ")[0];
                unit = stringType.getValue().split(" ")[1];
            } else {
                value = stringType.getValue();
            }
        } else if (obsValue instanceof CodeableConcept codeableConcept) {
            value = codeableConcept.getText();
        }
        return new ObservationValue(value, unit);
    }

    /**
     * The FHIR type of an observation value, for a log line that names the shape the EMR sent.
     */
    public static String valueTypeName(Type obsValue) {
        return obsValue == null ? "no value element" : obsValue.fhirType();
    }

    private static String comparatorPrefix(Quantity quantity) {
        return quantity.hasComparator() ? quantity.getComparator().toCode() : "";
    }

    /**
     * The number on one side of a Range or a Ratio. A bound carries no comparator of its own: its
     * position in the pair is the whole meaning.
     */
    private static String boundValue(Quantity bound) {
        return bound == null || bound.getValue() == null ? null : bound.getValue().toPlainString();
    }

    private static String ratioUnit(String numeratorUnit, String denominatorUnit) {
        if (numeratorUnit != null && denominatorUnit != null) {
            return numeratorUnit + "/" + denominatorUnit;
        }
        return numeratorUnit;
    }

    private static boolean isNumeric(String token) {
        try {
            new BigDecimal(token);
            return true;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    public record ObservationValue(String value, String unit) {
    }
}
