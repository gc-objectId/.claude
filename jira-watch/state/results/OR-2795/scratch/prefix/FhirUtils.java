package com.guided.orci.integration.fhir;

import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.stream.Collectors;

import org.hl7.fhir.r4.model.*;

import com.guided.orci.models.patient.ValueUnit;

import ca.uhn.fhir.model.dstu2.composite.QuantityDt;
import ca.uhn.fhir.model.primitive.DateTimeDt;

public class FhirUtils {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(FhirUtils.class);

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

    public static ObservationValue getValueAndUnit(Type obsValue) {
        String value = null;
        String unit = null;
        if (obsValue instanceof Quantity quantity) {
            value = quantity.getValue() != null ? quantity.getValue().toPlainString() : null;
            unit = quantity.getUnit() != null ? quantity.getUnit() : null;
        } else if (obsValue instanceof StringType stringType && stringType.getValue() != null) {
            // Epic sends measurements as strings ("105 mg/dL") alongside narrative results
            // ("SEE COMMENT", a paragraph of interpretation). Only a leading number means the rest is
            // a unit; everything else is the result itself and is kept whole, units left absent.
            // Splitting on the first space alone would invent units and truncate the narrative.
            String text = stringType.getValue().trim();
            String[] parts = text.split("\\s+", 2);
            if (parts.length == 2 && isNumeric(parts[0])) {
                value = parts[0];
                unit = parts[1];
            } else if (!text.isEmpty()) {
                value = text;
            }
        } else if (obsValue instanceof CodeableConcept codeableConcept) {
            value = codeableConcept.getText();
        }
        return new ObservationValue(value, unit);
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
