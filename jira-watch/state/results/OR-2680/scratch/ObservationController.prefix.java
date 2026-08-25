package com.guided.orci.web.admin;

import com.guided.orci.dto.ObservationDTO;
import com.guided.orci.events.EventCategoryEvent;
import com.guided.orci.exceptions.OperationNotFoundException;
import com.guided.orci.exceptions.PatientNotFoundException;
import com.guided.orci.mappers.ObservationMapper;
import com.guided.orci.models.integration.SourceMetadata;
import com.guided.orci.models.integration.SourceType;
import com.guided.orci.models.observation.Observation;
import com.guided.orci.models.observation.ObservationType;
import com.guided.orci.models.operation.EventCategory;
import com.guided.orci.repository.ObservationRepository;
import com.guided.orci.service.EventService;
import com.guided.orci.service.ObservationService;
import com.guided.orci.service.OperationService;
import com.guided.orci.service.PatientService;
import com.guided.orci.types.wrappers.CaseId;
import com.guided.orci.types.wrappers.PatientId;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/admin/observations")
public class ObservationController {
    @Autowired
    private ObservationService observationService;

    @Autowired
    private ObservationRepository observationRepository;

    @Autowired
    private PatientService patientService;

    @Autowired
    private EventService eventService;

    @Autowired
    private ObservationMapper observationMapper;

    @Autowired
    private OperationService operationService;

    @PostMapping("/patient/{patientId}/case/{caseId}")
    @Transactional
    public Optional<AddObservationDTO> addObservation(@PathVariable("patientId") PatientId patientId,
                                                      @PathVariable("caseId") CaseId caseId,
                                                      @RequestBody AddObservationDTO body) {
        var patient = patientService.findByPmrn(patientId);
        if (patient == null) {
            throw new PatientNotFoundException(patientId);
        }
        var observation = Observation.builder()
                .type(body.type)
                .observationValue(body.value())
                .observationUnits(body.units())
                .effectiveTime(body.date())
                .patient(patient)
                .build();
        var operation = operationService.getOperation(patient.getPatientId(), caseId);
        if (operation.isEmpty()) {
            throw new OperationNotFoundException(patientId, caseId);
        }
        observation.setSourceMetadata(new SourceMetadata(observation.getId().toString(), SourceType.INTERNAL_API, this.getClass().getName(), ServletUriComponentsBuilder.fromCurrentRequest().toUriString()));
        this.observationRepository.save(observation);
        if (body.type() == ObservationType.GLUCOSE) {
            eventService.handleEvent(EventCategoryEvent.builder()
                    .patientId(patient.getPatientId())
                    .eventCategories(Set.of(EventCategory.GLUCOSE_UPDATED))
                    .caseId(caseId)
                    .eventDate(observation.getEffectiveTime())
                    .sourceEventType("debugger")
                    .build());
        }
        if (body.type() == ObservationType.PREGNANCY_STATUS) {
            patientService.syncPregnancyStatusFromObservations(patient);
        }
        return Optional.of(new AddObservationDTO(observation));
    }

    @DeleteMapping("/patient/{patientId}/observation/{observationId}")
    @Transactional
    public void deleteObservation(@PathVariable("patientId") String patientId,
                                  @PathVariable("observationId") String observationId) {
        // technically the pmrn is unnecessary here,
        // but probably good practice (in case we want to do access control or whatever)
        var observationUuid = UUID.fromString(observationId);
        var observation = observationRepository.findById(observationUuid);
        var type = observation.map(Observation::getType).orElse(null);
        if (observation.isEmpty()) {
            return;
        }

        observationService.deleteObservation(observationUuid, patientId);

        if (type == ObservationType.PREGNANCY_STATUS) {
            var patient = patientService.findByPmrn(patientId);
            if (patient != null) {
                patientService.syncPregnancyStatusFromObservations(patient);
            }
        }
    }

    @DeleteMapping("/patient/{patientId}")
    @Transactional
    public void deleteAllObservations(@PathVariable("patientId") String patientId) {
        observationService.deleteAllByPMRN(patientId);
        var patient = patientService.findByPmrn(patientId);
        if (patient != null) {
            patientService.syncPregnancyStatusFromObservations(patient);
        }
    }

    @GetMapping("/patient/{patientId}/")
    @Transactional(readOnly = true)
    public List<ObservationDTO> getObservations(@PathVariable("patientId") PatientId patientId) {
        var patient = patientService.getPatient(patientId);
        return patientService.getObservations(patient).stream().map(obs -> observationMapper.entityToDto(obs)).toList();
    }

    public record AddObservationDTO(ObservationType type, String value, String units, Date date) {
        public AddObservationDTO(Observation observation) {
            this(
                    observation.getType(),
                    observation.getObservationValue(),
                    observation.getObservationUnits(),
                    observation.getEffectiveTime()
            );
        }
    }
}
