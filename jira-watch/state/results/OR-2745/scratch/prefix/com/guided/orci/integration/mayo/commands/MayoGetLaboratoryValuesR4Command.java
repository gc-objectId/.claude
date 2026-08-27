package com.guided.orci.integration.mayo.commands;

import com.guided.orci.integration.base.GetLaboratoryValuesCommand;
import com.guided.orci.integration.fhir.FhirClient;
import com.guided.orci.integration.fhir.FhirUrl;
import com.guided.orci.integration.fhir.FhirUtils;
import com.guided.orci.integration.mayo.MayoConstants;
import com.guided.orci.models.integration.SourceMetadata;
import com.guided.orci.models.integration.SourceType;
import com.guided.orci.models.lab.ObservationSet;
import com.guided.orci.models.observation.Observation;
import com.guided.orci.models.observation.ObservationType;
import com.guided.orci.repository.ObservationSetRepository;
import com.guided.orci.types.wrappers.FhirPatientId;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.hl7.fhir.r4.model.Coding;
import org.hl7.fhir.r4.model.DateTimeType;
import org.hl7.fhir.r4.model.InstantType;
import org.jspecify.annotations.Nullable;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@RequiredArgsConstructor
public class MayoGetLaboratoryValuesR4Command implements GetLaboratoryValuesCommand {
    private static final String LOINC_SYSTEM_CODE = "http://loinc.org";

    private final FhirClient fhirClient;
    private final ObservationSetRepository observationSetRepository;
    private final FhirPatientId fhirPatientId;
    private final LocalDateTime since;
    private final String observationSystem;

    @Override
    public Optional<List<Observation>> execute() {
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssXXX");
        FhirUrl url = new FhirUrl(fhirClient.getClient().getServerBase())
                .path("Observation")
                .param("patient", fhirPatientId.value())
                .param("category", "laboratory")
                .param("date", "ge" + OffsetDateTime.of(since, MayoConstants.TIMEZONE.getRules().getOffset(since))
                        .truncatedTo(ChronoUnit.SECONDS).format(dtf));

        List<org.hl7.fhir.r4.model.Observation> observations = fhirClient.getR4Observations(url.url());

        List<String> systemsOfInterest = List.of(LOINC_SYSTEM_CODE, observationSystem);

        List<Observation> labObservations = observations.stream()
                .flatMap(observation ->
                        observation.getCode().getCoding().stream().map(coding -> {
                                    var obsValue = observation.getValue();
                                    if (obsValue == null || !systemsOfInterest.contains(coding.getSystem())) {
                                        return null;
                                    }

                                    var observationType = getObservationType(coding);
                                    var effectiveTime = getDate(observation);
                                    var valueAndUnit = FhirUtils.getValueAndUnit(obsValue);

                                    return Observation.builder()
                                            .code(coding.getCode())
                                            .codeSystem(coding.getSystem())
                                            .observationName(coding.getDisplay())
                                            .effectiveTime(effectiveTime)
                                            .observationValue(valueAndUnit.value())
                                            .observationUnits(valueAndUnit.unit())
                                            .type(observationType)
                                            .sourceMetadata(new SourceMetadata(observation.getId(), SourceType.WEB_API, "Observation", url.url()))
                                            .build();
                                })
                                .filter(Objects::nonNull)
                                .findFirst().stream()
                )
                .collect(Collectors.toList());

        return Optional.of(labObservations);
    }

    private static @Nullable Date getDate(org.hl7.fhir.r4.model.Observation observation) {
        if (observation.getEffective() instanceof InstantType instant) {
            return instant.getValue();
        } else if (observation.getEffective() instanceof DateTimeType dateTime) {
            return dateTime.getValue();
        } else {
            return null;
        }
    }

    private @Nullable ObservationType getObservationType(Coding coding) {
        if (observationSetRepository.existsObservationSetByNameAndObservationCodings_CodeSystemAndObservationCodings_Code(
                ObservationSet.GLUCOSE_TEST, coding.getSystem(), coding.getCode())) {
            return ObservationType.GLUCOSE;
        } else if (observationSetRepository.existsObservationSetByNameAndObservationCodings_CodeSystemAndObservationCodings_Code(
                ObservationSet.POTASSIUM_TEST, coding.getSystem(), coding.getCode())) {
            return ObservationType.POTASSIUM;
        } else if (observationSetRepository.existsObservationSetByNameAndObservationCodings_CodeSystemAndObservationCodings_Code(
                ObservationSet.PT_INR_TEST, coding.getSystem(), coding.getCode())) {
            return ObservationType.PT_INR;
        } else if (observationSetRepository.existsObservationSetByNameAndObservationCodings_CodeSystemAndObservationCodings_Code(
                ObservationSet.PTT_TEST, coding.getSystem(), coding.getCode())) {
            return ObservationType.PTT;
        } else if (observationSetRepository.existsObservationSetByNameAndObservationCodings_CodeSystemAndObservationCodings_Code(
                ObservationSet.EGFR, coding.getSystem(), coding.getCode())) {
            return ObservationType.EGFR;
        } else if (observationSetRepository.existsObservationSetByNameAndObservationCodings_CodeSystemAndObservationCodings_Code(
                ObservationSet.CREATININE, coding.getSystem(), coding.getCode())) {
            return ObservationType.CREATININE;
        } else {
            return null;
        }
    }
}
