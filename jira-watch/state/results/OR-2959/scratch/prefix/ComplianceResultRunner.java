package com.guided.orci.spring;

import com.guided.orci.multitenancy.context.TenantContextHolder;
import com.guided.orci.multitenancy.context.UnknownTenantException;
import com.guided.orci.repository.TenantRepository;
import com.guided.orci.service.rules.compliance.RuleComplianceService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.SmartLifecycle;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;


@Component
@Slf4j
@ConditionalOnProperty(
        value = "compliance.results.process.enabled",
        havingValue = "true",
        matchIfMissing = false)
public class ComplianceResultRunner implements SmartLifecycle {

    private boolean isRunning = false;

    @Value("${compliance.results.process.missing-only:true}")
    private Boolean processMissingOnly;

    @Autowired
    private RuleComplianceService ruleComplianceService;

    @Autowired
    private TenantRepository tenantRepository;

    @Value("${compliance.results.process.lookback-period:30d}")
    private Duration lookbackPeriod;

    @Override
    public void start() {
        isRunning = true;
        var tenants = tenantRepository.findAll();

        tenants.forEach(tenant -> {
            try {
                TenantContextHolder.withTenant(tenant, () -> {
                    try {
                        Duration duration = Duration.ofDays(30);
                        if (lookbackPeriod != null) {
                            duration = lookbackPeriod;
                        }
                        var since = Instant.now().minus(duration);
                        log.info("Running compliance result runner for {} - missing only? {} - since: {}", tenant.getTenantKey(), processMissingOnly, since);
                        ruleComplianceService.processComplianceResults(processMissingOnly, since);
                        log.info("Completed processing for tenant: {}", tenant.getTenantKey());
                    } catch (Exception e) {
                        log.error("Error processing compliance results for tenant: {}", tenant.getTenantKey(), e);
                    }
                });

            } catch (UnknownTenantException e) {
                log.error("Unable to process compliance for {}", tenant, e);
            }
        });

    }

    @Override
    public void stop() {
        isRunning = false;
    }

    @Override
    public boolean isRunning() {
        return isRunning;
    }

    public int getPhase() {
        return StartupPhase.COMPLIANCE_RESULT_EVAL.getPhase();
    }
}