package com.guided.orci.integration.mgb;

import com.guided.orci.context.UserContextHolder;
import com.guided.orci.dto.SurgicalRecordDTO;
import com.guided.orci.dto.patient.PatientEMRInfo;
import com.guided.orci.integration.AbstractGetPatientInfoStrategy;
import com.guided.orci.integration.service.AllergyAssociationService;
import com.guided.orci.integration.IntegrationFailure;
import com.guided.orci.integration.PatientInfoResponse;
import com.guided.orci.integration.base.CommandFactory;
import com.guided.orci.integration.rest.CheckBreakTheGlassResponse;
import com.guided.orci.models.allergy.Allergy;
import com.guided.orci.models.allergy.MedicationAllergy;
import com.guided.orci.models.medication.MedicationNote;
import com.guided.orci.models.medication.MedicationOrder;
import com.guided.orci.models.observation.Observation;
import com.guided.orci.models.observation.ObservationType;
import com.guided.orci.models.observation.ObservationUtils;
import com.guided.orci.models.patient.FamilyMemberHistory;
import com.guided.orci.models.patient.PatientCondition;
import com.guided.orci.models.tenant.Tenant;
import com.guided.orci.service.ProgressMonitor;
import com.guided.orci.service.TimedProgressMonitor;
import com.guided.orci.service.TracingService;
import com.guided.orci.types.wrappers.CaseId;
import com.guided.orci.types.wrappers.PatientId;
import com.guided.orci.utils.ListUtils;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;

@Service
@Slf4j
public class MGBGetPatientInfoStrategy extends AbstractGetPatientInfoStrategy {
    private final MGBIntegrationService mgbIntegrationService;
    private final AllergyAssociationService allergyAssociationService;

    public MGBGetPatientInfoStrategy(MGBIntegrationService mgbIntegrationService,
                                     TracingService tracingService,
                                     AllergyAssociationService allergyAssociationService,
                                     @Qualifier("mgbIntegrationExecutorService") ExecutorService executorService,
                                     @Value("${integration.mgb.patient-info.max-inflight:40}") int maxInFlightPatientInfoRequests) {
        super(Math.max(1, maxInFlightPatientInfoRequests), tracingService, executorService);
        this.mgbIntegrationService = mgbIntegrationService;
        this.allergyAssociationService = allergyAssociationService;
    }

    @Override
    protected PatientInfoResponse getPatientInfoInternal(Tenant tenant,
                                                         PatientId patientId,
                                                         CaseId caseId,
                                                         ProgressMonitor _progressMonitor) throws Exception {
        var tenantKey = tenant.getTenantKey();
        ClientCreds clientCreds = getClientCreds(tenant);

        _progressMonitor.registerTasks(ProgressEvent.values());

        // wrap the progressMonitor to record metrics
        final ProgressMonitor progressMonitor = new TimedProgressMonitor(_progressMonitor,
                stepName -> tracingService.getMeters().getPatientInfoRetrievalStepTimer(stepName));

        var commandFactory = mgbIntegrationService.createCommandFactory(
                clientCreds, tenantKey,
                tenant.getEpicIntegrationConfig().getCheckBreakTheGlassUrl(),
                tenant.getEpicIntegrationConfig().getAcceptBreakTheGlassUrl());

        var surgicalRecord = getSurgicalRecord(caseId, patientId, commandFactory, progressMonitor);

        if (patientId == null && surgicalRecord.isPresent()) {
            // if we don't have a patient id (PMRN), get it from the surgical record call
            // this should only happen during silent mode
            patientId = new PatientId(surgicalRecord.get().getPmrn());
            log.info("No patient id set - Setting patient id to {} sourced from surgical record", patientId);
        }
        if (patientId == null) {
            throw new IllegalArgumentException("Unable to patient info for unknown patient: " + patientId);
        }
        try {
            log.info("Checking break the glass access for {} {} {}", patientId, clientCreds.clientUserId(), clientCreds.userIdType());
            var response = checkBreakTheGlass(patientId, commandFactory, progressMonitor);
            if (response.isPresent() && response.get().getAccessType() != null && response.get().getAccessType() == 1) {
                log.info("Request already has break the glass access for {} {} {}", patientId, clientCreds.clientUserId(), clientCreds.userIdType());
            } else {
                var result = acceptBreakTheGlass(patientId, commandFactory, progressMonitor);
                if (result.isPresent() && result.get()) {
                    log.info("Break the Glass: Accepted for {} {} {}", patientId, clientCreds.clientUserId(), clientCreds.userIdType());
                } else {
                    log.warn("Break the Glass: Failed {} {} {}", patientId, clientCreds.clientUserId(), clientCreds.userIdType());
                }
            }

        } catch (Exception e) {
            log.error("Error with Break the Glass operation for patient: {}", patientId, e);
        }

        Optional<PatientEMRInfo> patientOpt = commandFactory.getPatient(patientId).execute();
        var patient = patientOpt.orElseThrow();

        log.info("Patient: {}", patient);
        var integrationFailures = new ArrayList<IntegrationFailure>();

        var last24HoursObservationsFuture = getLast24HoursObservations(patient, commandFactory, progressMonitor);
        var infectionStatusObservationsFuture = getInfectionStatusObservations(patient, commandFactory, progressMonitor);
        var qtcIntervalObservationsFuture = getQTCIntervalObservations(patient, commandFactory, progressMonitor);

        var latestObservationsFuture = getLatestObservations(patient, commandFactory, progressMonitor);
        CompletableFuture<Map<ObservationType, Observation>> pediatricObservations = null;
        if (isPediatricPatient(patient.getDob())) {
            pediatricObservations = getPediatricObservations(patient, commandFactory, progressMonitor);
        }

        var medicationAdministrationsFuture = getAllMedicationAdministrations(patient, commandFactory, progressMonitor);
        var medicationNotesFuture = getAllMedicationNotes(patient, commandFactory, progressMonitor);
        var allergiesFuture = getAllergies(patient, commandFactory, progressMonitor);
        var conditionsFuture = getConditions(patient, commandFactory, progressMonitor);
        var familyMemberHistoryFuture = getFamilyMemberHistory(patient, commandFactory, progressMonitor);
        var admissionDateFuture = getAdmissionDate(patient, commandFactory, progressMonitor);
        var medicationAllergiesFuture = allergiesFuture.thenCompose(allergies ->
                getMedicationAllergies(allergies, progressMonitor));

        patient.setMedicationOrders(medicationAdministrationsFuture.get());
        try {
            patient.setMedicationNotes(medicationNotesFuture.get());
        } catch (Exception e) {
            log.warn("Unable to get medication notes", e);
            integrationFailures.add(new IntegrationFailure("home medications", e));
        }

        var last24HoursObservations = last24HoursObservationsFuture.get();
        var latestObservations = latestObservationsFuture.get();
        var infectionStatusObservations = infectionStatusObservationsFuture.get();
        var observations = new ArrayList<Observation>();
        // merge the two lists
        if (last24HoursObservations != null) {
            observations.addAll(last24HoursObservations);
        }
        latestObservations.forEach((key, value) -> {
            if (observations.stream().noneMatch(observation -> observation.isEquivalent(value))) {
                observations.add(value);
            }
        });
        if (pediatricObservations != null) {
            observations.addAll(pediatricObservations.get().values());
        }

        if (infectionStatusObservations != null) {
            observations.addAll(infectionStatusObservations);
        }
        try {
            var qtcIntervalObservations = qtcIntervalObservationsFuture.get();
            if (qtcIntervalObservations != null) {
                observations.addAll(qtcIntervalObservations);
            }
        } catch (Exception e) {
            log.warn("Unable to get QTC interval observations", e);
            integrationFailures.add(new IntegrationFailure("QTC interval", e));
        }

        patient.setObservations(observations);
        if (latestObservations.containsKey(ObservationType.BODY_WEIGHT)) {
            toValueUnit(latestObservations.get(ObservationType.BODY_WEIGHT)).ifPresent(patient::setWeight);
        }

        if (latestObservations.containsKey(ObservationType.BODY_HEIGHT)) {
            toValueUnit(latestObservations.get(ObservationType.BODY_HEIGHT)).ifPresent(patient::setHeight);
        }

        if (latestObservations.containsKey(ObservationType.CREATININE)) {
            toValueUnit(latestObservations.get(ObservationType.CREATININE)).ifPresent(patient::setCreatinine);
        }
        if (latestObservations.containsKey(ObservationType.PREGNANCY_STATUS)) {
            patient.setPregnant(ObservationUtils.isPregnancyStatusActive(
                    latestObservations.get(ObservationType.PREGNANCY_STATUS)
            ));
        } else {
            // if we don't have any pregnancy status observation, mark the patient as not pregnant
            patient.setPregnant(false);
        }

        patient.getAllergies().addAll(new HashSet<>(allergiesFuture.get()));
        patient.getMedicationAllergies().addAll(medicationAllergiesFuture.get());
        try {
            patient.setPatientConditions(conditionsFuture.get());
        } catch (Exception e) {
            integrationFailures.add(new IntegrationFailure("past medical history", e));
            integrationFailures.add(new IntegrationFailure("problem list", e));

        }
        try {
            patient.setFamilyMemberHistories(familyMemberHistoryFuture.get());
        } catch (Exception e) {
            integrationFailures.add(new IntegrationFailure("family member history", e));
        }

        if (surgicalRecord.isPresent()) {
            var surgicalRecordDTO = surgicalRecord.get();
            try {
                var admissionDate = admissionDateFuture.get();
                if (admissionDate != null) {
                    surgicalRecordDTO.setAdmissionDate(admissionDate);
                }
            } catch (Exception e) {
                log.warn("Unable to get admission date", e);
                integrationFailures.add(new IntegrationFailure("admission date", e));
            }
            // we need to update patient data from the surgical record
            patient.updateFromSurgicalRecord(surgicalRecordDTO);
            patient.setSurgicalRecord(surgicalRecordDTO);
        }
        // TODO this data should be attached to the operation, instead of the patient level
        return new PatientInfoResponse(patient, integrationFailures);
    }

    private ClientCreds getClientCreds(Tenant tenant) {
        var config = tenant.getEpicIntegrationConfig();
        return new ClientCreds(config.getServiceAccountUsername(),
                config.getServiceAccountPassword(),
                config.getServiceClientId(),
                UserContextHolder.getUserTypeOrDefault(config.getBackgroundUserType()),
                UserContextHolder.getClientUserIdOrDefault(config.getBackgroundUserId()));
    }

    private Optional<Boolean> acceptBreakTheGlass(PatientId patientId,
                                                  CommandFactory commandFactory,
                                                  ProgressMonitor progressMonitor) {
        return progressMonitor.wrap(ProgressEvent.AcceptBreakTheGlass,
                () -> commandFactory.acceptBreakTheGlass(patientId).execute());
    }

    private Optional<CheckBreakTheGlassResponse> checkBreakTheGlass(PatientId patientId,
                                                                    CommandFactory commandFactory,
                                                                    ProgressMonitor progressMonitor) {
        return progressMonitor.wrap(ProgressEvent.CheckBreakTheGlass, () -> commandFactory.checkBreakTheGlass(patientId).execute());
    }

    private Optional<SurgicalRecordDTO> getSurgicalRecord(CaseId caseId,
                                                          PatientId patientId,
                                                          CommandFactory commandFactory,
                                                          ProgressMonitor progressMonitor) {
        return progressMonitor.wrap(ProgressEvent.SurgicalRecord, () -> commandFactory.getSurgicalRecord(caseId, patientId).execute());
    }

    private CompletableFuture<List<MedicationAllergy>> getMedicationAllergies(List<Allergy> allergies,
                                                                              ProgressMonitor progressMonitor) {
        var antibioticAllergies = runCommandAsync(progressMonitor,
                ProgressEvent.AntibioticAllergies, () ->
                        allergyAssociationService.associateAllergiesToAntibioticOrNarcoticMedication(allergies)

        );

        var nonAntibioticAllergies = runCommandAsync(progressMonitor,
                ProgressEvent.NonAntibioticAllergies, () ->
                        allergyAssociationService.associateAllergiesToNonAntibioticAndNarcoticMedication(allergies));

        return antibioticAllergies.thenCombine(nonAntibioticAllergies, ListUtils::concat);
    }

    private CompletableFuture<List<PatientCondition>> getConditions(PatientEMRInfo patient,
                                                                    CommandFactory commandFactory,
                                                                    ProgressMonitor progressMonitor) {
        return runCommandAsync(progressMonitor, ProgressEvent.Conditions, commandFactory.getConditions(patient));
    }

    private CompletableFuture<List<FamilyMemberHistory>> getFamilyMemberHistory(PatientEMRInfo patient,
                                                                                CommandFactory commandFactory,
                                                                                ProgressMonitor progressMonitor) {
        return runCommandAsync(progressMonitor, ProgressEvent.FamilyMemberHistory, commandFactory.getFamilyMemberHistory(patient));
    }

    private CompletableFuture<Date> getAdmissionDate(PatientEMRInfo patient,
                                                     CommandFactory commandFactory,
                                                     ProgressMonitor progressMonitor) {
        return runCommandAsync(progressMonitor, ProgressEvent.AdmissionDate, commandFactory.getAdmissionDate(patient));
    }

    private CompletableFuture<List<Allergy>> getAllergies(PatientEMRInfo patient,
                                                          CommandFactory commandFactory,
                                                          ProgressMonitor progressMonitor) {
        return runCommandAsync(progressMonitor, ProgressEvent.Allergies, commandFactory.getAllergies(patient));
    }

    private CompletableFuture<List<Observation>> getLast24HoursObservations(PatientEMRInfo patient,
                                                                            CommandFactory commandFactory,
                                                                            ProgressMonitor progressMonitor) {
        return runCommandAsync(progressMonitor, ProgressEvent.RecentObservations, commandFactory.getLast24HoursObservations(patient));
    }

    private CompletableFuture<Map<ObservationType, Observation>> getLatestObservations(PatientEMRInfo patient,
                                                                                       CommandFactory commandFactory,
                                                                                       ProgressMonitor progressMonitor) {
        return runCommandAsync(progressMonitor, ProgressEvent.LatestObservations, commandFactory.getLatestObservations(patient));
    }

    private CompletableFuture<List<Observation>> getInfectionStatusObservations(PatientEMRInfo patient,
                                                                                CommandFactory commandFactory,
                                                                                ProgressMonitor progressMonitor) {
        return runCommandAsync(progressMonitor, ProgressEvent.InfectionStatusObservations, commandFactory.getInfectionStatusObservations(patient));
    }

    private CompletableFuture<List<Observation>> getQTCIntervalObservations(PatientEMRInfo patient,
                                                                            CommandFactory commandFactory,
                                                                            ProgressMonitor progressMonitor) {
        return runCommandAsync(progressMonitor, ProgressEvent.QTCIntervalObservations, commandFactory.getQTCIntervalObservations(patient));
    }

    private CompletableFuture<Map<ObservationType, Observation>> getPediatricObservations(PatientEMRInfo patient,
                                                                                          CommandFactory commandFactory,
                                                                                          ProgressMonitor progressMonitor) {
        return runCommandAsync(progressMonitor, ProgressEvent.PediatricObservations, commandFactory.getPediatricObservations(patient));
    }

    private CompletableFuture<List<MedicationOrder>> getAllMedicationAdministrations(PatientEMRInfo patient,
                                                                                     CommandFactory commandFactory,
                                                                                     ProgressMonitor progressMonitor) {
        return runCommandAsync(progressMonitor, ProgressEvent.MedicationAdministrations, commandFactory.getMedicationAdministrations(patient));
    }

    private CompletableFuture<List<MedicationNote>> getAllMedicationNotes(PatientEMRInfo patient,
                                                                          CommandFactory commandFactory,
                                                                          ProgressMonitor progressMonitor) {
        return runCommandAsync(progressMonitor, ProgressEvent.MedicationNotes, commandFactory.getMedicationNotes(patient));
    }

    /**
     * Note: This definition of pedatric patient is for getting pediatric observations,
     * not to determine if the patient is considered an pediatric patient in GuidedOR
     *
     * @param dob
     * @return true if padiatric patient, false otherwise
     */
    private boolean isPediatricPatient(LocalDate dob) {
        if (dob == null) {
            return false;
        }
        LocalDate currentDate = LocalDate.now();
        var oneYearAgo = currentDate.minusMonths(12);
        // Check if the date is less than or equal to 12 months old
        return dob.isAfter(oneYearAgo) || dob.equals(oneYearAgo);

    }

    @Getter
    private enum ProgressEvent implements ProgressMonitor.IProgressEvent {
        CheckBreakTheGlass("Checking break the glass"),
        AcceptBreakTheGlass("Accepting break the glass", true),
        SurgicalRecord("Fetching surgical record"),
        AntibioticAllergies("Fetching antibiotic Allergies"),
        NonAntibioticAllergies("Fetching non-antibiotic Allergies"),
        Conditions("Fetching conditions"),
        AdmissionDate("Fetching admission date"),
        FamilyMemberHistory("Fetching family member history"),
        Allergies("Fetching allergies"),
        RecentObservations("Fetching recent observations"),
        LatestObservations("Fetching latest observations"),
        PediatricObservations("Fetching pediatric observations"),
        InfectionStatusObservations("Fetching infection status observations"),
        QTCIntervalObservations("Fetching QTC interval observations"),
        Height("Fetching height"),
        Weight("Fetching weight"),
        Creatinine("Fetching creatinine"),
        MedicationAdministrations("Fetching medication administrations"),
        MedicationNotes("Fetching medication notes");

        public final String name;
        public final Boolean isConditional;

        ProgressEvent(String name) {
            this.name = name;
            this.isConditional = false;
        }

        ProgressEvent(String name, Boolean isConditional) {
            this.name = name;
            this.isConditional = isConditional;
        }
    }
}
