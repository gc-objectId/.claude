package com.guided.orci.quartz;

import com.guided.orci.service.quartz.QuartzJobService;
import com.guided.orci.spring.JobCleanerSetupRunner;
import com.guided.orci.types.wrappers.TenantKey;

import org.jetbrains.annotations.NotNull;
import org.quartz.DisallowConcurrentExecution;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.quartz.SchedulerException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.quartz.QuartzJobBean;

import java.time.Duration;
import java.time.Instant;


@DisallowConcurrentExecution
public class JobCleanerJob extends QuartzJobBean {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(JobCleanerJob.class);

    public static final int STALE_JOB_HOUR_THRESHOLD = 36;

    @Autowired
    private QuartzJobService quartzJobService;

    public void clean() throws Exception {
        log.debug("Executing job cleaner...");
        for (QuartzJobService.SchedulerType schedulerType : QuartzJobService.SchedulerType.values()) {
            quartzJobService.getStaleJobKeys(STALE_JOB_HOUR_THRESHOLD, schedulerType).stream()
                    // skip the cleaner job itself
                    .filter(jobKey -> !JobCleanerSetupRunner.JOB_GROUP.equals(jobKey.getGroup()))
                    .forEach(jobKey -> {
                        try {
                            log.info("Deleting stale job: {}", jobKey);
                            quartzJobService.deleteJob(jobKey, schedulerType);
                        } catch (SchedulerException e) {
                            log.warn("Unable to delete job: {} - {}", jobKey, e.getUnderlyingException() != null ? e.getUnderlyingException().getMessage(): e.getUnderlyingException(), e);
                        }
                    });
        }
        // above, we clean Quartz job records but those records may have been cleaned without us cleaning the job
        // metadata record so we want to look for stale JobMetadata records as well.
        // we allow another a grace period of another 36 hours before marking the stale job metadata records as complete
        // don't have strong reason but it shouldn't hurt anything
        Instant thresholdDate = Instant.now().minus(Duration.ofHours(STALE_JOB_HOUR_THRESHOLD * 2));
        quartzJobService.markStaleJobMetadataAsComplete(thresholdDate);
        log.debug("Job cleaner complete");
    }

    @Override
    protected void executeInternal(@NotNull JobExecutionContext context) throws JobExecutionException {
        try {
            clean();
        } catch (Exception e) {
            log.error("Unable to run job cleaner job: {}", context.getJobDetail().getKey(), e);
        }
    }
}
