package com.guided.orci.service;

import com.guided.orci.dto.patient.PatientEMRInfo;
import com.guided.orci.dto.patient.net.PatientDTO;
import com.guided.orci.dto.rule.context.ContextPatient;
import com.guided.orci.integration.PatientInfoResponse;
import com.guided.orci.models.observation.Observation;
import com.guided.orci.models.observation.ObservationType;
import com.guided.orci.models.observation.ObservationUtils;
import com.guided.orci.models.patient.Patient;
import com.guided.orci.multitenancy.context.TenantContextHolder;
import com.guided.orci.repository.ObservationRepository;
import com.guided.orci.repository.PatientRepository;
import com.guided.orci.types.wrappers.CaseId;
import com.guided.orci.types.wrappers.PatientId;
import com.guided.orci.types.wrappers.PatientUUID;
import com.guided.orci.web.websocket.AppLaunchWebsocketService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class PatientService {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(PatientService.class);
    private final PatientRepository patientRepository;
    private final PatientInformationRetrievalService patientInformationRetrievalService;
    private final PatientSnapshotService patientSnapshotService;
    private final ObservationRepository observationRepository;
    private final AppLaunchWebsocketService appLaunchWebsocketService;
    private final PatientCacheService patientCacheService;
    private final TenantService tenantService;


    @Autowired
    public PatientService(PatientRepository patientRepository,
                          PatientInformationRetrievalService patientInformationRetrievalService,
                          PatientSnapshotService patientSnapshotService,
                          ObservationRepository observationRepository,
                          AppLaunchWebsocketService appLaunchWebsocketService,
                          PatientCacheService patientCacheService,
                          TenantService tenantService) {
        this.patientInformationRetrievalService = patientInformationRetrievalService;
        this.patientRepository = patientRepository;
        this.patientSnapshotService = patientSnapshotService;
        this.observationRepository = observationRepository;
        this.appLaunchWebsocketService = appLaunchWebsocketService;
        this.patientCacheService = patientCacheService;
        this.tenantService = tenantService;
    }

    public Page<Patient> getSomePatients(int x) {
        PageRequest request = PageRequest.of(0, x);
        return patientRepository.findPatientsByOrderByLastModifiedDateDesc(request);
    }

    public Patient getPatient(final PatientId patientId) {
        return patientRepository.findByPmrn(patientId);
    }

    public ContextPatient toContextPatient(Patient patient) {
        var cachedContextPatient = patientCacheService.getFromCache(patient.getPatientId());
        if (cachedContextPatient.isPresent()) {
            return cachedContextPatient.get();
        }
        fetchPatientRelationshipsForContextPatient(patient);
        var contextPatient = new ContextPatient(patient, tenantService.getConfig());
        patientCacheService.putIntoCache(contextPatient);
        return contextPatient;
    }

    public Patient fetchPatientRelationshipsForContextPatient(Patient patient) {
        if (patient.isPrefetchedRelationshipsForExecution()) {
            return patient;
        }
        patientRepository.fetchMedicationOrders(patient);
        patientRepository.fetchMedicationAdministrations(patient);
//        patientRepository.fetchBolusesCategories(patient);
        patientRepository.fetchBoluses(patient);
        fetchInfusions(patient);
        patientRepository.fetchMedicationAllergiesAllergens(patient);
        patientRepository.fetchAllergiesAllergens(patient);
        patientRepository.fetchFamilyMemberHistories(patient);
        patientRepository.fetchConditions(patient);
        patient.setPrefetchedRelationshipsForExecution(true);
        return patient;
    }

    public void fetchInfusions(Patient patient) {
        patientRepository.fetchInfusions(patient);
    }

    public Optional<Patient> getReferenceByPMRN(String pmrn) {
        var id = patientRepository.findIdByPmrn(pmrn);
        return id.map(patientRepository::getReferenceById);
    }

    public Optional<Patient> getReferenceByPMRN(PatientId patientId) {
        return getReferenceByPMRN(patientId.value());
    }

    public Optional<Patient> getReferenceByEpicPatientId(String epicPatientId) {
        var id = patientRepository.findIdByEpicPatientId(epicPatientId);
        return id.map(patientRepository::getReferenceById);
    }

    public Patient findByPmrn(PatientId pmrn) {
        return patientRepository.findByPmrn(pmrn);
    }

    public Patient findByPmrn(String pmrn) {
        return patientRepository.findByPmrn(pmrn);
    }

    @Transactional(readOnly = true)
    public Optional<PatientDTO> getPatientDTO(PatientId patientId) {
        var patient = getPatient(patientId);
        if (patient == null) {
            return Optional.empty();
        }
        return Optional.of(new PatientDTO(patient, tenantService.getConfig()));
    }

    public Optional<Patient> findByEpicPatientId(String pmrn) {
        return patientRepository.findByEpicPatientId(pmrn);
    }

    public Optional<Patient> findById(PatientUUID patientUUID) {
        return patientRepository.findById(patientUUID.value());
    }

    public Optional<Patient> findById(UUID patientId) {
        return patientRepository.findById(patientId);
    }

    public PatientInfoResponse getPatientInfo(PatientId patientId, CaseId caseId) {
        return getPatientInfo(patientId, caseId, new ProgressMonitor(o -> {
        }));
    }

    public PatientInfoResponse getPatientInfo(PatientId patientId, CaseId caseId, ProgressMonitor progressMonitor) {
        return patientInformationRetrievalService
                .retrieve(TenantContextHolder.getTenant(), patientId, caseId, progressMonitor);
    }

    @Transactional
    public Patient createOrUpdatePatient(PatientId patientId, PatientEMRInfo patientInfo) {
        Patient patient = getPatient(patientId);
        if (patient == null) {
            log.info("Creating new patient");
            patient = PatientEMRInfo.toPatient(patientInfo);
        } else {
            log.info("Updating existing patient: {}", patient.getId());
            try {
                patient = fetchPatientRelationshipsForContextPatient(patient);
            } catch(Exception e) {
                log.warn("Unable to fetch relationships for patient: {}", patient.getId(), e);
            }
            try {
                patientSnapshotService.createPatientSnapshot(patient);
            } catch(Exception e) {
                log.warn("Unable to create snapshot for patient: {}", patient.getId(), e);
            }
            try {
                patient.update(patientInfo);
            } catch (Exception e) {
                log.error("Unable to update patient: {}", patientId, e);
            }
        }

        try {
            log.info("Attempt to save patient: {}", patient.getId());
            patient = patientRepository.save(patient);
        } catch (Exception e) {
            log.error("Unable to save patient: {}", e.getMessage(), e);
        }

        try {
            log.info("Attempt to cache patient: {}", patient.getId());
            patientCacheService.putIntoCache(patient);
        } catch (Exception e) {
            log.error("Unable to cache patient: {}", e.getMessage(), e);
        }

        return patient;
    }

    public List<Observation> getObservations(Patient patient) {
        return this.observationRepository.findByPatientIdOrderByEffectiveTimeDesc(patient.getId());
    }

    public Optional<Observation> getLatestObservationByTypeAndAfterDate(UUID patientId, ObservationType observationType, Date effectiveTime) {
        return this.observationRepository.findTopByPatientIdAndTypeAndEffectiveTimeAfterOrderByEffectiveTimeDesc(patientId, observationType, effectiveTime);
    }

    /**
     * TODO: Revisit this. We currently have to call this any time there is an update to observations which makes it pretty brittle. Can we use some post-persist mechanism?
     *
     * @param patient
     */
    @Transactional
    public void syncPregnancyStatusFromObservations(Patient patient) {
        var latestObservation = observationRepository
                .findTopByPatientIdAndTypeOrderByEffectiveTimeDesc(patient.getId(), ObservationType.PREGNANCY_STATUS);

        if (latestObservation.isEmpty()) {
            // No observation found - clear pregnancy status
            if (patient.isPregnant()) {
                log.info("No pregnancy observation found for patient {}, clearing pregnancy status",
                    patient.getId());
                patient.setPregnant(false);
                patientRepository.save(patient);
                patientCacheService.clearCache(patient.getPatientId());
            }
            return;
        }

        var observation = latestObservation.get();
        boolean isPregnant = ObservationUtils.isPregnancyStatusActive(observation);

        if (patient.isPregnant() != isPregnant) {
            log.info("Updating pregnancy status for patient {} to {} based on observation from {}",
                    patient.getId(),
                    isPregnant,
                    observation.getEffectiveTime());
            patient.setPregnant(isPregnant);
            patientRepository.save(patient);
            patientCacheService.clearCache(patient.getPatientId());
        }
    }

}
