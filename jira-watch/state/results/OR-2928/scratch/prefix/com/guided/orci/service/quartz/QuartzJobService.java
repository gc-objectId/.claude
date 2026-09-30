package com.guided.orci.service.quartz;

import com.guided.orci.models.job.JobMetadata;
import com.guided.orci.models.patient.Operation;
import com.guided.orci.models.patient.Patient;
import com.guided.orci.multitenancy.context.TenantContextHolder;
import com.guided.orci.repository.JobMetadataRepository;
import com.guided.orci.types.wrappers.CaseId;
import com.guided.orci.types.wrappers.TenantKey;

import org.quartz.*;
import org.quartz.impl.matchers.GroupMatcher;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

import static com.guided.orci.models.job.JobMetadata.CREATED_TIMESTAMP;

@Service

public class QuartzJobService {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(QuartzJobService.class);

    private final Scheduler lowFrequencyScheduler;
    private final Scheduler highFrequencyScheduler;
    private final JobMetadataRepository jobMetadataRepository;
    @Autowired
    public QuartzJobService(
            @Qualifier("lowFrequencyScheduler") Scheduler lowFrequencyScheduler,
            @Qualifier("highFrequencyScheduler") Scheduler highFrequencyScheduler,
            JobMetadataRepository jobMetadataRepository) {
        this.lowFrequencyScheduler = lowFrequencyScheduler;
        this.highFrequencyScheduler = highFrequencyScheduler;
        this.jobMetadataRepository = jobMetadataRepository;
    }

    public Scheduler getScheduler(SchedulerType type) {
        return switch (type) {
            case LowFrequency -> lowFrequencyScheduler;
            case HighFrequency -> highFrequencyScheduler;
        };
    }

    @Transactional
    public boolean deleteJob(JobKey key) throws SchedulerException {
        return deleteJob(key, SchedulerType.LowFrequency) |
               deleteJob(key, SchedulerType.HighFrequency);
    }

    @Transactional
    public boolean deleteJob(JobKey key, SchedulerType schedulerType) throws SchedulerException {
        boolean deleted = getScheduler(schedulerType).deleteJob(key);
        if (deleted) {
            // mark all incomplete metadatas as complete (normally would only expect one)
            List<JobMetadata> metadatas = this.jobMetadataRepository.findByJobNameAndJobGroupAndCompleted(key.getName(), key.getGroup(), false);
            metadatas.forEach(metadata -> metadata.setCompleted(true));
            this.jobMetadataRepository.saveAll(metadatas);
        }
        return deleted;
    }

    @Transactional
    public void markStaleJobMetadataAsComplete(Instant date) {
        this.jobMetadataRepository.markStaleJobMetadataAsComplete(date);
    }

    @Transactional(readOnly = true)
    public List<JobMetadata> findAssociatedJobs(Patient patient, Operation operation, String orderId) {
        return this.jobMetadataRepository.findByPatientAndOperationAndOrderId(patient, operation, orderId);
    }

    @Transactional(readOnly = true)
    public List<JobMetadata> findAssociatedJobsByJobGroup(Patient patient, Operation operation, String jobGroup) {
        return this.jobMetadataRepository.findByPatientAndOperationAndJobGroup(patient, operation, jobGroup);
    }

    @Transactional
    public void deleteAllJobs(CaseId caseId) {
        List<JobMetadata> metadatas = this.jobMetadataRepository.findByCaseId(caseId);
        metadatas.forEach(metadata -> {
            try {
                deleteJob(metadata.getJobKey());
            } catch (SchedulerException e) {
                log.error("Unable to delete job: {}", metadata.getJobKey(), e);
            }
        });
    }

    public void deleteAllJobsForTenant(TenantKey tenantKey) {
        TenantContextHolder.withTenant(tenantKey, () -> {
            List<JobMetadata> metadatas = this.jobMetadataRepository.findAll();
            log.info("Cancelling {} Quartz jobs for tenant {}", metadatas.size(), tenantKey);
            metadatas.forEach(metadata -> {
                try {
                    deleteJob(metadata.getJobKey());
                } catch (SchedulerException e) {
                    log.error("Unable to delete job for tenant {}: {}", tenantKey, metadata.getJobKey(), e);
                }
            });
        });
    }

    public JobDetail getJobDetail(JobKey key, SchedulerType schedulerType) throws SchedulerException {
        return getScheduler(schedulerType).getJobDetail(key);
    }

    public List<JobKey> getStaleJobKeys(int hourThreshold, SchedulerType schedulerType) throws SchedulerException {
        return getScheduler(schedulerType).getTriggerKeys(GroupMatcher.anyTriggerGroup()).stream().map(triggerKey -> {
            try {
                Trigger trigger = getScheduler(schedulerType).getTrigger(triggerKey);
                if (trigger == null) {
                    log.warn("Unable to find trigger: {}", triggerKey);
                    return null;
                }
                // We can't rely on trigger.getStartTime() because on misfires, it may be reset startTime so we'll check both
                Long createdTimestamp = (Long) trigger.getJobDataMap().get(CREATED_TIMESTAMP);

                if (createdTimestamp != null) {
                    var duration = Duration.between(Instant.ofEpochMilli(createdTimestamp), Instant.now());
                    if (duration.toHours() >= hourThreshold) {
                        return trigger.getJobKey();
                    }
                } else {
                    var duration = Duration.between(trigger.getStartTime().toInstant(), Instant.now());
                    if (duration.toHours() >= hourThreshold) {
                        return trigger.getJobKey();
                    }
                }
            } catch (Exception e) {
                log.warn("Unable to get evaluate job staleness for trigger: {}", triggerKey, e);
            }
            return null;
        }).filter(Objects::nonNull).toList();
    }

    public boolean jobExists(JobKey key, SchedulerType schedulerType) throws SchedulerException {
        boolean exists = getScheduler(schedulerType).checkExists(key);
        boolean metadataExists = this.jobMetadataRepository.existsByJobNameAndJobGroupAndCompleted(key.getName(), key.getGroup(), false);
        if (exists && !metadataExists) {
            log.warn("Quartz has a job that we don't know about");
        }
        return exists;
    }

    @Transactional
    public boolean scheduleOneTimeJob(JobMetadata metadata, SchedulerType schedulerType) {
        // one-time jobs are scheduled to run immediately under misfire scenarios
        return scheduleJobIfNotExists(metadata, SimpleScheduleBuilder.simpleSchedule().withMisfireHandlingInstructionFireNow(), schedulerType);
    }

    @Transactional
    public boolean scheduleContinuousJob(JobMetadata metadata, SchedulerType schedulerType) {
        // continuous jobs are scheduled to run immediately with the scheduled trigger time to be updated to present time under misfire scenarios
        return scheduleJob(metadata, SimpleScheduleBuilder.repeatSecondlyForever().withMisfireHandlingInstructionNowWithRemainingCount(), true, schedulerType);
    }

    @Transactional
    public boolean scheduleHourlyJob(JobMetadata metadata, SchedulerType schedulerType) {
        return scheduleJobIfNotExists(metadata, SimpleScheduleBuilder.repeatHourlyForever().withMisfireHandlingInstructionFireNow(), schedulerType);
    }

    @Transactional
    public boolean scheduleMinutelyJob(JobMetadata metadata, SchedulerType schedulerType) {
        return scheduleJobIfNotExists(metadata, SimpleScheduleBuilder.repeatMinutelyForever().withMisfireHandlingInstructionFireNow(), schedulerType);
    }

    @Transactional
    public boolean scheduleCronJob(JobMetadata metadata, CronExpression cronExpression, SchedulerType schedulerType) {
        return scheduleJobIfNotExists(metadata, CronScheduleBuilder.cronSchedule(cronExpression).withMisfireHandlingInstructionFireAndProceed(), schedulerType);
    }

    @Transactional
    public boolean scheduleJob(JobMetadata metadata, ScheduleBuilder schedBuilder, boolean rescheduleIfExists, SchedulerType schedulerType) {
        Trigger trigger = TriggerBuilder.newTrigger()
                .withIdentity(metadata.getTriggerKey())
                .startAt(metadata.getStartDate())
                .endAt(metadata.getEndDate())
                .withSchedule(schedBuilder)
                .withDescription(metadata.getDescription())
                // add a created timestamp on the trigger so we can identity long running triggers
                .usingJobData(CREATED_TIMESTAMP, Instant.now().toEpochMilli())
                .build();
        JobBuilder builder = JobBuilder.newJob(metadata.getJobClass())
                .withIdentity(metadata.getJobKey())
                .usingJobData(metadata.generateJobDataMap())
                .storeDurably(false)
                .requestRecovery(false);


        JobDetail jobDetails = builder.build();


        try {
            if (!jobExists(jobDetails.getKey(), schedulerType)) {
                log.info("Registering new job: {}", jobDetails.getKey());
                getScheduler(schedulerType).scheduleJob(jobDetails, Set.of(trigger), true);
                this.jobMetadataRepository.save(metadata);
                return true;
            } else if (rescheduleIfExists) {
                var jobKey = jobDetails.getKey();
                var triggerKey = trigger.getKey();

                log.debug("Rescheduling job: {} with trigger {}", jobKey, triggerKey);
                // delete and schedule again
                deleteJob(jobKey, schedulerType);
                getScheduler(schedulerType).scheduleJob(jobDetails, Set.of(trigger), true);
                this.jobMetadataRepository.save(metadata);
                return true;
            } else {
                log.info("Job already exists for: {} - no-op", jobDetails.getKey());
            }
        } catch (SchedulerException e) {
            log.error("Unable to schedule job: {}", jobDetails.getKey(), e);
        }
        return false;
    }

    @Transactional
    public boolean scheduleJobIfNotExists(JobMetadata metadata, ScheduleBuilder schedBuilder, SchedulerType schedulerType) {
        return scheduleJob(metadata, schedBuilder, false, schedulerType);
    }

    public void scheduleJob(JobDetail jobDetails, Trigger trigger, SchedulerType schedulerType) throws SchedulerException {
        getScheduler(schedulerType).scheduleJob(jobDetails, trigger);
    }

    public boolean checkExists(JobKey jobKey, SchedulerType schedulerType) throws SchedulerException {
        return getScheduler(schedulerType).checkExists(jobKey);
    }

    public void rescheduleJob(TriggerKey key, Trigger trigger, SchedulerType schedulerType) throws SchedulerException {
        getScheduler(schedulerType).rescheduleJob(key, trigger);
    }

    public Map<SchedulerType, Scheduler> getSchedulers() {
        return Arrays.stream(QuartzJobService.SchedulerType.values())
                .collect(Collectors.toMap(type -> type, type -> getScheduler(type)));
    }

    /**
     * Deletes all jobs that match the specified patient, operation, order id.
     * Note: This may delete more jobs than we want since orderId is not unique across med admins. Currently, not an
     * issue since we only care about the latest activity in rules but could be a problem in the future.
     *
     * @param patient
     * @param operation
     * @param orderId
     */
    @Transactional(readOnly = false)
    public void cancelAssociatedJobs(Patient patient, Operation operation, String orderId) {
        if (patient == null || operation == null || orderId == null) {
            return;
        }
        List<JobMetadata> jobs = findAssociatedJobs(patient, operation, orderId);
        jobs.forEach(job -> {
            try {
                deleteJob(job.getJobKey());
            } catch (SchedulerException e) {
                log.error("Unable to delete job: {}", job.getJobKey());
            }
        });
    }

    public enum SchedulerType {
        LowFrequency,
        HighFrequency
    }
}
