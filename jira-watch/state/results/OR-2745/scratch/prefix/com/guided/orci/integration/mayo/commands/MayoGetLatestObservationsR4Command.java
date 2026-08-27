package com.guided.orci.integration.mayo.commands;

import com.guided.orci.integration.base.GetLatestObservationsCommand;
import com.guided.orci.integration.fhir.FhirClient;
import com.guided.orci.integration.fhir.FhirUrl;
import com.guided.orci.integration.fhir.FhirUtils;
import com.guided.orci.models.integration.SourceMetadata;
import com.guided.orci.models.integration.SourceType;
import com.guided.orci.models.observation.Observation;
import com.guided.orci.models.observation.ObservationType;
import com.guided.orci.types.wrappers.FhirPatientId;
import lombok.Builder;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.hl7.fhir.r4.model.DateTimeType;
import org.hl7.fhir.r4.model.InstantType;

import java.util.*;

@Slf4j
public class MayoGetLatestObservationsR4Command implements GetLatestObservationsCommand {
    private static final String LOINC_SYSTEM = "http://loinc.org";

    private final FhirClient fhirClient;
    private final FhirPatientId fhirPatientId;
    private final List<ObservationFilter> observationFilters;

    public MayoGetLatestObservationsR4Command(FhirClient fhirClient, FhirPatientId fhirPatientId, String oidSystem) {
        this.fhirClient = fhirClient;
        this.fhirPatientId = fhirPatientId;
        this.observationFilters = List.of(
                ObservationFilter.builder()
                        .observationType(ObservationType.POTASSIUM)
                        .system(LOINC_SYSTEM).code("2823-3")
                        .requireValue(true).requireUnits(true)
                        .build(),
                ObservationFilter.builder()
                        .observationType(ObservationType.BODY_HEIGHT)
                        .system(LOINC_SYSTEM).code("8302-2")
                        .requireValue(true).requireUnits(true).preferredUnit("cm")
                        .build(),
                ObservationFilter.builder()
                        .observationType(ObservationType.BODY_WEIGHT)
                        .system(LOINC_SYSTEM).code("29463-7")
                        .requireValue(true).requireUnits(true).preferredUnit("kg")
                        .build(),
                ObservationFilter.builder()
                        .observationType(ObservationType.PREGNANCY_STATUS)
                        .system(LOINC_SYSTEM).code("82810-3")
                        .valueCodeableConceptSystem("http://snomed.info/sct").valueCodeableConceptCode("77386006")
                        .build(),
                ObservationFilter.builder()
                        .observationType(ObservationType.GLUCOSE)
                        .system(oidSystem).code("1911200034")
                        .requireValue(true)
                        .build(),
                ObservationFilter.builder()
                        .observationType(ObservationType.PTT)
                        .system(oidSystem).code("1910205397")
                        .requireValue(true)
                        .build(),
                ObservationFilter.builder()
                        .observationType(ObservationType.PT_INR)
                        .system(oidSystem).code("1910200223")
                        .requireValue(true)
                        .build(),
                ObservationFilter.builder()
                        .observationType(ObservationType.EGFR)
                        .system(oidSystem).code("1911038615")
                        .requireValue(true)
                        .build(),
                ObservationFilter.builder()
                        .observationType(ObservationType.EGFR)
                        .system(LOINC_SYSTEM).code("98979-8")
                        .requireValue(true)
                        .build(),
                ObservationFilter.builder()
                        .observationType(ObservationType.CREATININE)
                        .system(LOINC_SYSTEM).code("2160-0")
                        .requireValue(true)
                        .build(),
                ObservationFilter.builder()
                        .observationType(ObservationType.CREATININE)
                        .system(oidSystem).code("1911200033")
                        .requireValue(true)
                        .build(),
                ObservationFilter.builder()
                        .observationType(ObservationType.QTC_INTERVAL)
                        .system(oidSystem).code("182003")
                        .requireValue(true)
                        .validStatuses(List.of(
                                org.hl7.fhir.r4.model.Observation.ObservationStatus.FINAL,
                                org.hl7.fhir.r4.model.Observation.ObservationStatus.AMENDED))
                        .build()
        );
    }

    private String generateCodeFilter() {
        return observationFilters.stream()
                .map(f -> f.getSystem() + "|" + f.getCode())
                .reduce((a, b) -> a + "," + b)
                .orElse("");
    }

    private ObservationFilter getMatchingFilter(String system, String code) {
        return observationFilters.stream()
                .filter(f -> f.getSystem().equals(system) && f.getCode().equals(code))
                .findFirst()
                .orElse(null);
    }

    @Override
    public Optional<Map<ObservationType, Observation>> execute() {
        FhirUrl url = new FhirUrl(fhirClient.getClient().getServerBase())
                .path("Observation")
                .param("patient", fhirPatientId.value())
                .param("code", generateCodeFilter());

        List<org.hl7.fhir.r4.model.Observation> observations = fhirClient.getR4Observations(url.url());
        Map<ObservationType, Observation> observationMap = new HashMap<>();

        observations.stream()
                .filter(obs -> {
                    var matchedCoding = obs.getCode().getCoding().stream()
                            .filter(c -> getMatchingFilter(c.getSystem(), c.getCode()) != null)
                            .findFirst();
                    if (matchedCoding.isEmpty()) return false;
                    var filter = getMatchingFilter(matchedCoding.get().getSystem(), matchedCoding.get().getCode());

                    var valueAndUnit = FhirUtils.getValueAndUnit(obs.getValue());

                    boolean valueValid = !filter.isRequireValue() || (valueAndUnit.value() != null);
                    boolean unitsValid = !filter.isRequireUnits() || (valueAndUnit.unit() != null);
                    boolean preferredUnitsMatch = filter.getPreferredUnit() == null ||
                                                  (filter.getPreferredUnit().equals(valueAndUnit.unit()));
                    boolean codeableConceptValid = (filter.getValueCodeableConceptSystem() == null && filter.getValueCodeableConceptCode() == null) ||
                                                   (obs.hasValueCodeableConcept() && obs.getValueCodeableConcept().hasCoding(
                                                           filter.getValueCodeableConceptSystem(), filter.getValueCodeableConceptCode()));
                    boolean statusValid = filter.getValidStatuses().isEmpty() ||
                                         filter.getValidStatuses().contains(obs.getStatus());

                    if (!valueValid)
                        log.warn("Observation {} has no value for {}", obs.getId(), filter.getObservationType());
                    if (!unitsValid)
                        log.warn("Observation {} has no units for {}", obs.getId(), filter.getObservationType());
                    if (!preferredUnitsMatch)
                        log.warn("Observation {} preferred units mismatch ({})", obs.getId(), filter.getPreferredUnit());
                    if (!statusValid)
                        log.warn("Observation {} has invalid status {} for {}", obs.getId(), obs.getStatus(), filter.getObservationType());

                    return obs.getEffective() != null && valueValid && unitsValid && preferredUnitsMatch && codeableConceptValid && statusValid;
                })
                .forEach(obs -> {
                    var matchedCoding = obs.getCode().getCoding().stream()
                            .filter(c -> getMatchingFilter(c.getSystem(), c.getCode()) != null)
                            .findFirst().orElseThrow();
                    var filter = getMatchingFilter(matchedCoding.getSystem(), matchedCoding.getCode());

                    java.util.Date effectiveTime = null;
                    if (obs.getEffective() instanceof InstantType instant) {
                        effectiveTime = instant.getValue();
                    } else if (obs.getEffective() instanceof DateTimeType dateTime) {
                        effectiveTime = dateTime.getValue();
                    }

                    var existing = observationMap.get(filter.getObservationType());
                    if (existing == null || Objects.requireNonNull(effectiveTime).after(existing.getEffectiveTime())) {
                        var valueAndUnit = FhirUtils.getValueAndUnit(obs.getValue());
                        observationMap.put(filter.getObservationType(), Observation.builder()
                                .code(matchedCoding.getCode())
                                .codeSystem(matchedCoding.getSystem())
                                .effectiveTime(effectiveTime)
                                .observationName(matchedCoding.getDisplay())
                                .observationValue(valueAndUnit.value())
                                .observationUnits(valueAndUnit.unit())
                                .type(filter.getObservationType())
                                .sourceMetadata(new SourceMetadata(obs.getId(), SourceType.WEB_API, "Observation", url.url()))
                                .build());
                    }
                });

        return Optional.of(observationMap);
    }

    @Getter
    @Builder
    public static class ObservationFilter {
        private final ObservationType observationType;
        private final String system;
        private final String code;
        private final String valueCodeableConceptSystem;
        private final String valueCodeableConceptCode;
        private final boolean requireValue;
        private final boolean requireUnits;
        private final String preferredUnit;
        @Builder.Default
        private final List<org.hl7.fhir.r4.model.Observation.ObservationStatus> validStatuses = List.of();
    }
}
