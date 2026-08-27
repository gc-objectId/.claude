package com.guided.orci.engine;

import com.guided.orci.engine.quartz.ScheduledRuleJob;
import com.guided.orci.engine.rule.scheduled.*;
import com.guided.orci.messaging.medication.MedicationAdministrationMessage;
import com.guided.orci.models.job.JobMetadata;
import com.guided.orci.models.medication.*;
import com.guided.orci.models.patient.ConditionTag;
import com.guided.orci.models.patient.Operation;
import com.guided.orci.models.patient.Patient;
import com.guided.orci.models.rules.AntibioticReminderConfiguration;
import com.guided.orci.models.rules.AntibioticReminderParameter;
import com.guided.orci.models.rules.AntibioticReminderTextPattern;
import com.guided.orci.multitenancy.context.TenantContextHolder;
import com.guided.orci.repository.MedicationAdministrationRepository;
import com.guided.orci.repository.MedicationRepository;
import com.guided.orci.repository.OperationRepository;
import com.guided.orci.service.AntibioticLookbackService;
import com.guided.orci.service.AntibioticReminderConfigurationService;
import com.guided.orci.service.PatientService;
import com.guided.orci.service.RuleFeatureFlagService;
import com.guided.orci.service.TenantService;
import com.guided.orci.service.medication.MedicationService;
import com.guided.orci.service.quartz.QuartzJobService;
import com.guided.orci.service.rules.RuleService;
import com.guided.orci.types.wrappers.CaseId;
import com.guided.orci.types.wrappers.PatientId;
import jakarta.transaction.Transactional;
import org.quartz.JobKey;
import org.quartz.SchedulerException;
import org.quartz.SimpleScheduleBuilder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.annotation.Nullable;
import java.time.Instant;
import java.time.ZoneId;
import java.util.*;


// todo: do we need to handle rule suppression in this engine?

@Service
public class ScheduledRuleEngine {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(ScheduledRuleEngine.class);

    private static final int MAX_INSULIN_BOLUS_CHECKS = 2;
    @Autowired
    private QuartzJobService jobService;
    @Autowired
    private OperationRepository operationRepository;
    @Autowired
    private MedicationAdministrationRepository medicationAdministrationRepository;
    @Autowired
    private AntibioticReminderConfigurationService antibioticReminderConfigurationService;

    @Autowired
    private RuleService ruleService;
    @Autowired
    private PatientService patientService;
    @Autowired
    private TenantService tenantService;
    @Autowired
    private MedicationRepository medicationRepository;
    @Autowired
    private MedicationService medicationService;
    @Autowired
    private AntibioticLookbackService antibioticLookbackService;
    @Autowired
    private RuleFeatureFlagService ruleFeatureFlagService;

    /**
     * Generates a unique job name
     *
     * @param patientId PMRN or equivalent
     * @param caseId    Case ID or equivalent
     * @return
     */
    public static String getJobName(PatientId patientId, CaseId caseId) {
        return "patient-" + patientId.value() + "-operation-" + caseId.value();
    }

    public static String getTriggerName(PatientId patientId, CaseId caseId) {
        return "patient-" + patientId.value() + "-operation-" + caseId.value();
    }

    /**
     * @param administrationTrackingId tracking id of the administration this message describes. Jobs armed
     *                                 here carry it so their firings join to that dose.
     */
    @Transactional
    public void evaluate(MedicationAdministrationMessage message, @Nullable UUID administrationTrackingId, boolean evaluatedOnLaunch) {
        if (message == null) {
            log.warn("Message was null");
            return;
        }

        var medication = medicationRepository.findByMedicationIdentifier(message.getMedicationIdentifier().toString()).orElse(null);
        if (medication == null) {
            log.warn("No medication found for message {} medid: {}", message, message.getMedicationIdentifier());
            return;
        }

        String medicationIdentifier = medication.getMedicationIdentifier();

        Patient patient = patientService.findByPmrn(message.getPatientIdentifier().toString());
        if (patient == null) {
            log.warn("Unknown patient: {}", message.getPatientIdentifier());
            return;
        }

        // Everything below schedules against an operation's timeline, so only an administration we can
        // place inside a case window is actionable. Resolve the operation before announcing evaluation,
        // so that stopping here reads as stopping rather than as an evaluation that decided nothing.
        // The log states only what is known - no operation matched - because an unmatched administration
        // is not proof the administration was non-intraop: a case whose start never ran leaves genuinely
        // intraop drugs with no operation to match.
        if (message.getOperationIdentifier() == null) {
            log.info("No operation for this administration - skipping intraop scheduling of {} for patient {}",
                    medicationIdentifier, message.getPatientIdentifier());
            return;
        }
        Operation operation = operationRepository.findByCaseIdAndPatientId(message.getOperationIdentifier().toString(), patient.getId());
        if (operation == null) {
            // The administration named a case we cannot match to this patient, which is an inconsistency
            // rather than the routine non-intraop case above.
            log.warn("Operation {} not found for patient {} - skipping intraop scheduling of {}",
                    message.getOperationIdentifier(), message.getPatientIdentifier(), medicationIdentifier);
            return;
        }

        log.info("Evaluating new {} administration for {}", medicationIdentifier, message.getPatientIdentifier().toString());

        scheduleAntibioticReminders(message, administrationTrackingId, patient, operation, evaluatedOnLaunch);
        try {
            if (medication.hasMedicationCategory(MedicationCategory.INSULIN)) {
                handleInsulin(message, patient, operation);
            }
        } catch (Exception e) {
            log.info("Unable to handle medication message: {}", message, e);
        }
    }

    private void scheduleAntibioticReminders(MedicationAdministrationMessage message, @Nullable UUID administrationTrackingId,
                                             Patient patient, Operation operation, boolean scheduledOnLaunch) {
        String medicationIdentifier = message.getMedicationIdentifier().toString();

        var lookbackPeriod = antibioticLookbackService.getLookbackPeriod(medicationIdentifier);
        Instant operationStart = operation.getStartTime() != null ? operation.getStartTime().toInstant() : Instant.now();
        List<MedicationAdministration> medicationAdministrations = medicationAdministrationRepository.findByPMRNAndMedicationIdentifierOnOrAfterDate(patient.getPmrn(),
                        medicationIdentifier,
                        Date.from(operationStart.minus(lookbackPeriod))
                ).stream()
                .filter(medAdmin -> AntibioticRedoseReminderJob.REMINDERABLE_ROUTES.contains(medAdmin.getRoute())).toList();

        int numDoses = medicationAdministrations.size();
        if (numDoses > 0) {
            Optional<Medication> medication = medicationAdministrations.get(0).getMedication();
            if (medication.isEmpty()) {
                log.info("No med associated with med admin {}", medicationAdministrations.get(0).getId());
                return;
            }
            AntibioticReminderConfiguration cfg = antibioticReminderConfigurationService.findByMedicationAndRedoseAttempt(medication.get(), numDoses);
            if (cfg == null) {
                log.info("No antibiotic reminder configuration for medication: {} dose: {}", medicationIdentifier, numDoses);
                return;
            }
            Double crcl = patient.calculateCrCl(tenantService.getConfig()).orElse(null);

            // Base CrCl-aware reminder: the CrCl < 15 "do not redose" rows are a hard stop (no reminder).
            Optional<AntibioticReminderParameter> baseParameter = antibioticReminderConfigurationService.getMatchingParameter(cfg, crcl, patient);
            if (baseParameter.isPresent() && !AntibioticReminderTextPattern.SUBSEQUENT_REDOSE_DO_NOT_GIVE.equals(baseParameter.get().getTextPattern())) {
                scheduleReminderJob(message, administrationTrackingId, patient, operation, medicationIdentifier, numDoses, baseParameter.get(), crcl, false, scheduledOnLaunch);
            } else {
                log.info("Unable to determine antibiotic reminder parameters for medication: {} dose: {}", medicationIdentifier, numDoses);
            }

            // CrCl-agnostic reminder (OR-2613): independent, own feature flag, drops the "do not redose"
            // stop by always using the normal renal-function interval. Fires alongside the base reminder.
            if (ruleFeatureFlagService.isRuleEnabledForCurrentTenant(AntibioticRedoseReminderNoCrClRule.ID)) {
                Optional<AntibioticReminderParameter> agnosticParameter = antibioticReminderConfigurationService.getCrClAgnosticParameter(cfg, patient);
                if (agnosticParameter.isPresent()) {
                    scheduleReminderJob(message, administrationTrackingId, patient, operation, medicationIdentifier, numDoses, agnosticParameter.get(), crcl, true, scheduledOnLaunch);
                } else {
                    log.info("No CrCl-agnostic antibiotic reminder parameter for medication: {} dose: {}", medicationIdentifier, numDoses);
                }
            }
        } else {
            log.info("Not scheduling antibiotic reminders since no relevant medicationAdministrations were found");
        }
    }

    /**
     * Builds and schedules a single antibiotic redose reminder Quartz job. When {@code ignoreCrCl} is
     * true (the a-antibiotic-redose-reminder-no-crcl variant) the CrCl job details are nulled so the
     * reminder fires regardless of renal function and never references CrCl, and the no-crcl job class
     * / name (distinct from, but same group as, the base reminder) is used so both can coexist.
     */
    private void scheduleReminderJob(MedicationAdministrationMessage message, @Nullable UUID administrationTrackingId,
                                     Patient patient, Operation operation,
                                     String medicationIdentifier, int numDoses, AntibioticReminderParameter parameter,
                                     Double crcl, boolean ignoreCrCl, boolean scheduledOnLaunch) {
        try {
            Instant redoseInstant = message.getAdministrationTime().atZone(ZoneId.systemDefault()).plusHours(parameter.getRedoseReminderTiming()).toInstant();
            Date redoseTime = Date.from(redoseInstant);
            Date scheduledDate = Date.from(redoseInstant.minus(AntibioticRedoseReminderJob.REMINDER_OFFSET));
            Date adminDate = Date.from(message.getAdministrationTime().atZone(ZoneId.systemDefault()).toInstant());

            Map<String, Object> jobContext = new HashMap<>();
            log.info("Antibiotic reminder parameter: {}", parameter);
            jobContext.put(ScheduledRuleJob.MEDICATION_ADMINISTRATION_ADMIN_DATE_IN_MILLIS, message.getAdministrationTime().toEpochMilli());
            if (administrationTrackingId != null) {
                jobContext.put(ScheduledRuleJob.MEDICATION_ADMINISTRATION_TRACKING_ID, administrationTrackingId.toString());
            }
            jobContext.put(ScheduledRuleJob.MEDICATION_NUM_DOSE, numDoses);
            jobContext.put(AntibioticRedoseReminderRule.MEDICATION_ID, medicationIdentifier);
            jobContext.put(AntibioticRedoseReminderRule.REMINDER_TIME, scheduledDate.getTime());
            jobContext.put(AntibioticRedoseReminderRule.REDOSE_TIME, redoseTime.getTime());

            jobContext.put(AntibioticRedoseReminderRule.CITATION_IDS, parameter.getCitations());
            jobContext.put(AntibioticRedoseReminderRule.TEXT_PATTERN, parameter.getTextPattern());
            jobContext.put(AntibioticRedoseReminderRule.CRCL, ignoreCrCl ? null : crcl);
            jobContext.put(AntibioticRedoseReminderRule.LOWER_BOUND_CRCL, ignoreCrCl ? null : parameter.getLowerBoundCrCl());
            jobContext.put(AntibioticRedoseReminderRule.UPPER_BOUND_CRCL, ignoreCrCl ? null : parameter.getUpperBoundCrCl());
            jobContext.put(AntibioticRedoseReminderRule.CRCL_RANGE, ignoreCrCl ? null : parameter.getCrClRangeDisplay());

            jobContext.put(AntibioticRedoseReminderRule.EARLY_REDOSE_TIMING_IN_HOURS, parameter.getEarlyRedoseTiming());
            jobContext.put(AntibioticRedoseReminderRule.DEPENDS_ON_CRCL, !ignoreCrCl && parameter.isDependsOnCrCl());
            jobContext.put(ScheduledRuleJob.SCHEDULED_ON_LAUNCH, scheduledOnLaunch);

            String jobName = ignoreCrCl
                    ? AntibioticRedoseReminderNoCrClJob.generateJobName(patient.getPatientId(), operation.getCaseId(), medicationIdentifier, numDoses)
                    : AntibioticRedoseReminderJob.generateJobName(patient.getPatientId(), operation.getCaseId(), medicationIdentifier, numDoses);
            String triggerName = ignoreCrCl
                    ? AntibioticRedoseReminderNoCrClJob.generateTriggerName(patient.getPatientId(), operation.getCaseId(), medicationIdentifier, numDoses)
                    : AntibioticRedoseReminderJob.generateTriggerName(patient.getPatientId(), operation.getCaseId(), medicationIdentifier, numDoses);
            Class<? extends ScheduledRuleJob> jobClass = ignoreCrCl ? AntibioticRedoseReminderNoCrClJob.class : AntibioticRedoseReminderJob.class;

            JobMetadata metadata = JobMetadata.builder()
                    .startDate(scheduledDate)
                    .endDate(scheduledDate)
                    .description("antibiotic redose reminder (" + numDoses + ") for " + message.getPatientIdentifier().toString())
                    .patient(patient)
                    .orderId(message.getOrderIdentifier() != null ? message.getOrderIdentifier().toString() : null)
                    .tenantKey(TenantContextHolder.getTenant())
                    .operation(operation)
                    .jobName(jobName)
                    .jobGroup(AntibioticRedoseReminderJob.JOB_GROUP)
                    .triggerName(triggerName)
                    .triggerGroup(AntibioticRedoseReminderJob.TRIGGER_GROUP)
                    .jobClass(jobClass)
                    .jobContext(jobContext)
                    .build();
            if (scheduledDate.before(new Date()) && this.jobService.jobExists(metadata.getJobKey(), QuartzJobService.SchedulerType.LowFrequency)) {
                // if the scheduled date has already elapsed and an existing job exists, just delete it and let's reschedule it.
                log.info("Deleting existing reminder job: {}", metadata.getJobKey());
                this.jobService.deleteJob(metadata.getJobKey(), QuartzJobService.SchedulerType.LowFrequency);
            }
            log.info(numDoses + " dose of " + medicationIdentifier + " - reminder in " + parameter.getRedoseReminderTiming() + " +  hours for redose - {} -> {}", adminDate, scheduledDate);
            this.jobService.scheduleOneTimeJob(metadata, QuartzJobService.SchedulerType.LowFrequency);
        } catch (Exception e) {
            log.error("Unable to schedule reminder for {}", message.getMedicationIdentifier(), e);
        }
    }


    private void handleInsulin(MedicationAdministrationMessage message, Patient patient, Operation operation) {
        // A closed case takes no reminders. Mayo documents administrations long after they were given, so
        // the message that would arm a recurring reminder routinely arrives once case stop has already
        // finished cancelling: without this, an administration whose earliest dose was intraop schedules a
        // fresh job on a case that ended hours ago. Both branches below are skipped rather than only the
        // scheduling one, because they read the same insulin administrations and neither has anything left
        // to do — case stop already cancelled the no-insulin job, and that rule abstains on a set end time.
        schedulePostInsulinGlucoseCheck(patient, operation, message);

        // a-no-insulin-glucose-check companion: once intraop insulin is confirmed, a-insulin-glucose-check
        // takes over, so cancel the no-insulin case-lifetime job. Done here (not inside the post-insulin
        // scheduling) so it fires for any intraop insulin, including a pre-op infusion still running intraop.
        if (hasIntraopInsulinAdministration(patient, operation)) {
            cancelNoInsulinGlucoseCheckJob(patient, operation);
        }
    }

    /**
     * Schedule a post-insulin glucose check job. This runs hourly after the first insulin administration (either infusion or bolus).
     * It doesn't attempt reschedule to align with actual administrations. It relies on the earliest insulin for the duration of the case.
     * @param patient
     * @param operation
     * @param message
     */
    private void schedulePostInsulinGlucoseCheck(Patient patient, Operation operation, MedicationAdministrationMessage message) {
        var earliestAdministration = findEarliestInsulinAdministration(patient, operation);
        if (earliestAdministration.isEmpty()) {
            log.warn("Unable to find earliest insulin administration for patient {} operation {}", patient.getPatientId(), operation.getCaseId());
            return;
        }
        var earliest = earliestAdministration.get();
        // skip scheduling if the administration is not intraop (case hasn't started or admin is before case start)
        var routeQualifier = earliest.routeQualifier() != null ? earliest.routeQualifier() : MedicationRouteQualifier.BOLUS;
        if (operation.getStartTime() == null ||
            earliest.administrationTime().isBefore(operation.getStartTime().toInstant()) ||
            (operation.getEndTime() != null && earliest.administrationTime().isAfter(operation.getEndTime().toInstant()))) {
            log.debug("Insulin {} is not intraop- skip scheduling {}", routeQualifier, PostInsulinGlucoseCheckJob.TRIGGER_GROUP);
            return;
        }
        log.info("Handling an insulin {}", routeQualifier);
        var config = ruleService.getConfig(PostInsulinGlucoseCheckScheduledRule.class);
        var administrationDate = Date.from(earliest.administrationTime());
        Date scheduledDate = Date.from(earliest.administrationTime().atZone(ZoneId.systemDefault()).plus(config.getScheduledInterval()).toInstant());

        log.info("post-insulin glucose check - reminder in 1 hour for glucose check - administered: {} -> scheduled: {}:", administrationDate, scheduledDate);
        // NOTE: don't specify the order if with job metadata so this job doesn't get cancelled on edits
        JobMetadata metadata = JobMetadata.builder()
                .startDate(scheduledDate)
                .patient(patient)
                .operation(operation)
                .tenantKey(TenantContextHolder.getTenant())
                .description("post-insulin glucose check")
                .jobName(getJobName(patient.getPatientId(), operation.getCaseId()))
                .jobGroup(PostInsulinGlucoseCheckJob.JOB_GROUP)
                .triggerName(getTriggerName(patient.getPatientId(), operation.getCaseId()))
                .triggerGroup(PostInsulinGlucoseCheckJob.TRIGGER_GROUP)
                .jobClass(PostInsulinGlucoseCheckJob.class)
                .jobContext(Map.of(ScheduledRuleJob.MEDICATION_ADMINISTRATION_ADMIN_DATE_IN_MILLIS, earliest.administrationTime().toEpochMilli(),
                        PostInsulinGlucoseCheckScheduledRule.ROUTE_QUALIFIER, routeQualifier.name()))
                .build();

        int intervalMinutes = (int) config.getScheduledInterval().toMinutes();

        boolean shouldReplace = shouldReplacePostInsulinGlucoseCheckJob(patient, operation, earliest.administrationTime().toEpochMilli());
        // schedule it for the specified interval per patient/operation ( don't reschedule if we get repeat notifications)
        this.jobService.scheduleJob(metadata,
                SimpleScheduleBuilder.simpleSchedule()
                        .withIntervalInMinutes(intervalMinutes)
                        .repeatForever()
                        .withMisfireHandlingInstructionFireNow(),
                shouldReplace,
                QuartzJobService.SchedulerType.LowFrequency
        );
    }

    /**
     * Case-stop entry point for scheduled rules, and the only place the glucose-check jobs are cancelled.
     * Both are scoped to a single case.
     * <p>
     * Glucose checks belong to the whole case: a patient given insulin is still on insulin once the
     * procedure ends, and still under anesthesia until the case closes. Case stop is also the last event in
     * the lifecycle, so it is the only cancellation point guaranteed to run after every administration a
     * case can produce — cancelling earlier leaves the job able to be recreated by a later insulin message,
     * and a recreated trigger is already overdue, so it fires on the spot instead of an hour later.
     */
    public void handleCaseStop(PatientId patientId, CaseId caseId) {
        if (patientId == null || caseId == null) {
            return;
        }
        cancelGlucoseCheckJobAtCaseStop(patientId, caseId, NoInsulinGlucoseCheckJob.JOB_GROUP);
        cancelGlucoseCheckJobAtCaseStop(patientId, caseId, PostInsulinGlucoseCheckJob.JOB_GROUP);
    }

    private void cancelGlucoseCheckJobAtCaseStop(PatientId patientId, CaseId caseId, String jobGroup) {
        JobKey jobKey = JobKey.jobKey(getJobName(patientId, caseId), jobGroup);
        try {
            if (this.jobService.jobExists(jobKey, QuartzJobService.SchedulerType.LowFrequency)) {
                this.jobService.deleteJob(jobKey, QuartzJobService.SchedulerType.LowFrequency);
                log.info("Cancelled {} for patient {} operation {} (case stop)", jobGroup, patientId, caseId);
            }
        } catch (SchedulerException e) {
            log.warn("Unable to cancel {} for patient {} operation {} on case stop", jobGroup, patientId, caseId, e);
        }
    }

    /**
     * Case-start entry point for scheduled rules. Today it handles a-no-insulin-glucose-check;
     * future case-start scheduled rules should hook in here.
     */
    @Transactional
    public void handleCaseStart(PatientId patientId, CaseId caseId) {
        if (patientId == null || caseId == null) {
            return;
        }
        Patient patient = patientService.getPatient(patientId);
        if (patient == null) {
            log.warn("Unknown patient {} - skip case-start scheduled rule setup", patientId);
            return;
        }
        Operation operation = operationRepository.findByCaseIdAndPatientId(caseId.value(), patient.getId());
        if (operation == null) {
            log.warn("Unknown operation {} for patient {} - skip case-start scheduled rule setup", caseId, patientId);
            return;
        }
        try {
            scheduleNoInsulinGlucoseCheck(patient, operation);
        } catch (Exception e) {
            log.warn("Failed to schedule {} for patient {} operation {}",
                    NoInsulinGlucoseCheckJob.JOB_GROUP, patientId, caseId, e);
        }
    }

    /**
     * Schedule a-no-insulin-glucose-check (repeating every 2h) at case start for diabetic patients.
     * a-insulin-glucose-check covers patients once they receive intraop insulin; this companion rule
     * closes the gap for diabetic patients who never receive intraop insulin.
     */
    private void scheduleNoInsulinGlucoseCheck(Patient patient, Operation operation) {
        if (patient == null || operation == null) {
            return;
        }
        if (!ruleFeatureFlagService.isRuleEnabledForCurrentTenant(NoInsulinGlucoseCheckScheduledRule.ID)) {
            log.debug("Rule {} disabled for tenant - skip scheduling", NoInsulinGlucoseCheckScheduledRule.ID);
            return;
        }
        if (operation.getStartTime() == null) {
            log.debug("Operation {} has no start time - skip scheduling {}", operation.getCaseId(), NoInsulinGlucoseCheckJob.TRIGGER_GROUP);
            return;
        }
        if (operation.getEndTime() != null) {
            log.debug("Operation {} has already ended - skip scheduling {}", operation.getCaseId(), NoInsulinGlucoseCheckJob.TRIGGER_GROUP);
            return;
        }
        if (!patient.hasCondition(ConditionTag.DIABETES)) {
            log.debug("Patient {} not diabetic - skip scheduling {}", patient.getPatientId(), NoInsulinGlucoseCheckJob.TRIGGER_GROUP);
            return;
        }
        // Skip if intraop insulin has already been administered. Without this guard, re-entry via
        // AppLaunchController or the admin /isc/initialize endpoint after insulin would re-schedule
        // a job that the rule would immediately abstain on forever.
        if (hasIntraopInsulinAdministration(patient, operation)) {
            log.debug("Patient {} already has intraop insulin - skip scheduling {}", patient.getPatientId(), NoInsulinGlucoseCheckJob.TRIGGER_GROUP);
            return;
        }

        var config = ruleService.getConfig(NoInsulinGlucoseCheckScheduledRule.class);
        var interval = config.getScheduledInterval();
        Date firstFireDate = Date.from(operation.getStartTime().toInstant().plus(interval));
        log.info("Scheduling {} for patient {} operation {} - first fire {} interval {}",
                NoInsulinGlucoseCheckJob.TRIGGER_GROUP, patient.getPatientId(), operation.getCaseId(), firstFireDate, interval);

        JobMetadata metadata = JobMetadata.builder()
                .startDate(firstFireDate)
                .patient(patient)
                .operation(operation)
                .tenantKey(TenantContextHolder.getTenant())
                .description("no-insulin glucose check")
                .jobName(getJobName(patient.getPatientId(), operation.getCaseId()))
                .jobGroup(NoInsulinGlucoseCheckJob.JOB_GROUP)
                .triggerName(getTriggerName(patient.getPatientId(), operation.getCaseId()))
                .triggerGroup(NoInsulinGlucoseCheckJob.TRIGGER_GROUP)
                .jobClass(NoInsulinGlucoseCheckJob.class)
                .build();

        int intervalMinutes = Math.toIntExact(interval.toMinutes());
        this.jobService.scheduleJob(metadata,
                SimpleScheduleBuilder.simpleSchedule()
                        .withIntervalInMinutes(intervalMinutes)
                        .repeatForever()
                        .withMisfireHandlingInstructionFireNow(),
                false,
                QuartzJobService.SchedulerType.LowFrequency
        );
    }

    /**
     * Mirrors {@link NoInsulinGlucoseCheckScheduledRule}'s own intraop check: insulin counts as intraop if it has
     * documented activity overlapping the intraop window, not merely if it was first started intraop. This catches
     * an infusion that began pre-op but is still running into the case, and keeps the engine from scheduling a
     * no-insulin job that the rule would immediately abstain on. Bolus {@code hasDocumentedActivityBetween}
     * collapses to the rule's {@code isAdministeredBetween} (both are date-in-range), so a single call covers both.
     * Scopes by time window only (not operation id), exactly like the rule, so the engine and rule can never
     * disagree on whether intraop insulin was given.
     */
    private boolean hasIntraopInsulinAdministration(Patient patient, Operation operation) {
        if (patient == null || operation == null || operation.getStartTime() == null) {
            return false;
        }
        Date start = operation.getStartTime();
        Date end = operation.getEndTime() != null ? operation.getEndTime() : Date.from(Instant.now());
        return medicationService.getAdministrationsByMedicationCategory(patient.getPatientId(), MedicationCategory.INSULIN).stream()
                .anyMatch(admin -> admin.hasDocumentedActivityBetween(start, end));
    }

    private void cancelNoInsulinGlucoseCheckJob(Patient patient, Operation operation) {
        JobKey jobKey = JobKey.jobKey(
                getJobName(patient.getPatientId(), operation.getCaseId()),
                NoInsulinGlucoseCheckJob.JOB_GROUP);
        try {
            if (this.jobService.jobExists(jobKey, QuartzJobService.SchedulerType.LowFrequency)) {
                this.jobService.deleteJob(jobKey, QuartzJobService.SchedulerType.LowFrequency);
                log.info("Cancelled {} for patient {} operation {} (intraop insulin given)",
                        NoInsulinGlucoseCheckJob.JOB_GROUP, patient.getPatientId(), operation.getCaseId());
            }
        } catch (SchedulerException e) {
            log.warn("Unable to cancel {} for patient {} operation {}",
                    NoInsulinGlucoseCheckJob.JOB_GROUP, patient.getPatientId(), operation.getCaseId(), e);
        }
    }

    private Optional<InsulinAdministrationCandidate> findEarliestInsulinAdministration(Patient patient, Operation operation) {
        List<InsulinAdministrationCandidate> candidates = new ArrayList<>();
        if (patient != null && operation != null) {
            List<? extends AbstractMedicationAdministration> administrations = medicationService.getAdministrationsByMedicationCategory(patient.getPatientId(), MedicationCategory.INSULIN);
            administrations.stream()
                    .filter(admin -> admin.getOperation() != null)
                    .filter(admin -> Objects.equals(admin.getOperation().getId(), operation.getId()))
                    .map(admin -> {
                        Date startDate = admin.getStartOfAdministrationDate();
                        if (startDate == null) {
                            return null;
                        }
                        var routeQualifier = admin.getRouteQualifier() != null ? admin.getRouteQualifier() : MedicationRouteQualifier.BOLUS;
                        return new InsulinAdministrationCandidate(startDate.toInstant(), routeQualifier);
                    })
                    .filter(Objects::nonNull)
                    .forEach(candidates::add);
        }
        return candidates.stream()
                .min(Comparator.comparing(InsulinAdministrationCandidate::administrationTime));
    }

    /**
     * Returns true if there exists an existing job with a different administration date, false otherwise
     * @param patient
     * @param operation
     * @param administrationTimeMillis
     * @return
     */
    private boolean shouldReplacePostInsulinGlucoseCheckJob(Patient patient, Operation operation, long administrationTimeMillis) {
        List<JobMetadata> existingJobs = this.jobService.findAssociatedJobsByJobGroup(patient, operation, PostInsulinGlucoseCheckJob.JOB_GROUP);
        return existingJobs.stream()
                .filter(metadata -> !metadata.isCompleted())
                .map(JobMetadata::getJobContext)
                .map(context -> context != null ? context.getOrDefault(ScheduledRuleJob.MEDICATION_ADMINISTRATION_ADMIN_DATE_IN_MILLIS, null) : null)
                .filter(Objects::nonNull)
                .map(value -> value instanceof Number ? ((Number) value).longValue() : null)
                .anyMatch(existingMillis -> existingMillis == null || existingMillis != administrationTimeMillis);
    }

    private record InsulinAdministrationCandidate(Instant administrationTime, MedicationRouteQualifier routeQualifier) {
    }

    public void schedulePostInsulinInfusionDextroseCheck(Patient patient, Operation operation, MedicationAdministrationMessage message) {
        if(true) {
            // disable for now
            return;
        }
        var config = ruleService.getConfig(PostInsulinDextroseCheckScheduledRule.class);
        Date adminDate = Date.from(message.getAdministrationTime().atZone(ZoneId.systemDefault()).toInstant());
        Date scheduledDate = Date.from(message.getAdministrationTime()
                .atZone(ZoneId.systemDefault())
                .plus(config.getInfusionScheduledInterval())
                .toInstant());

        log.info("post-insulin infusion dextrose check - scheduling check for dextrose source - {} -> {}", adminDate, scheduledDate);

        JobMetadata metadata = JobMetadata.builder()
                .startDate(scheduledDate)
                .patient(patient)
                .operation(operation)
                .tenantKey(TenantContextHolder.getTenant())
                .orderId(message.getOrderIdentifier().toString())
                .description("post-insulin infusion dextrose check")
                // create a unique job name per schedule time
                .jobName(getJobName(patient.getPatientId(), operation.getCaseId()) + "-" + scheduledDate.getTime())
                .jobGroup(PostInsulinInfusionDextroseCheckJob.JOB_GROUP)
                .triggerName(getTriggerName(patient.getPatientId(), operation.getCaseId()) + "-" + scheduledDate.getTime())
                .triggerGroup(PostInsulinInfusionDextroseCheckJob.TRIGGER_GROUP)
                .jobClass(PostInsulinInfusionDextroseCheckJob.class)
                .jobContext(Map.of(
                        ScheduledRuleJob.MEDICATION_ADMINISTRATION_ADMIN_DATE_IN_MILLIS,
                        message.getAdministrationTime().toEpochMilli()
                ))
                .build();

        this.jobService.scheduleOneTimeJob(metadata, QuartzJobService.SchedulerType.LowFrequency);
    }


    public void schedulePostHypoglycemiaGlucoseCheckJob(Patient patient, Operation operation,
                                                        Date glucoseTimestamp, Float glucoseValue, String glucoseUnits) {
        try {
            var config = ruleService.getConfig(HypoglycemiaGlucoseCheckScheduledRule.class);
            Date scheduledDate = Date.from(glucoseTimestamp.toInstant().plus(config.getScheduledInterval()));

            Float glucoseThreshold = config.getGlucoseThresholdAsFloat();

            if (glucoseValue < glucoseThreshold) {
                log.info("Glucose value {} is below {} mg/dL for patient {}, scheduling 15-minute check  {} -> {}",
                        glucoseValue, glucoseThreshold, patient.getPmrn(), glucoseTimestamp, scheduledDate);

                JobMetadata metadata = JobMetadata.builder()
                        .startDate(scheduledDate)
                        .patient(patient)
                        .operation(operation)
                        .tenantKey(TenantContextHolder.getTenant())
                        .description("post-hypoglycemia glucose check")
                        .jobName(getJobName(patient.getPatientId(), operation.getCaseId()) + "-" + glucoseTimestamp.getTime())
                        .jobGroup(HypoglycemiaGlucoseCheckJob.JOB_GROUP)
                        .triggerName(getTriggerName(patient.getPatientId(), operation.getCaseId()) + "-" + glucoseTimestamp.getTime())
                        .triggerGroup(HypoglycemiaGlucoseCheckJob.TRIGGER_GROUP)
                        .jobClass(HypoglycemiaGlucoseCheckJob.class)
                        .jobContext(Map.of(
                                HypoglycemiaGlucoseCheckJob.GLUCOSE_TIMESTAMP_IN_MILLIS, glucoseTimestamp.getTime(),
                                HypoglycemiaGlucoseCheckJob.GLUCOSE_VALUE, glucoseValue,
                                HypoglycemiaGlucoseCheckJob.GLUCOSE_UNITS, glucoseUnits,
                                HypoglycemiaGlucoseCheckJob.GLUCOSE_THRESHOLD, config.getGlucoseThreshold()
                        ))
                        .build();

                this.jobService.scheduleOneTimeJob(metadata, QuartzJobService.SchedulerType.LowFrequency);
            } else {
                log.debug("Glucose value {} is not below {} mg/dL for patient {}, skip scheduling {}",
                        glucoseValue, glucoseThreshold, patient.getId(), HypoglycemiaGlucoseCheckScheduledRule.ID);
            }

        } catch (Exception e) {
            log.error("Error scheduling hypoglycemia glucose check for patient {}", patient.getId(), e);
        }
    }


}
