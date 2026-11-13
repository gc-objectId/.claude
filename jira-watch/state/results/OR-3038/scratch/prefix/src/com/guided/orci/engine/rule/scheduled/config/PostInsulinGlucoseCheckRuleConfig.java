package com.guided.orci.engine.rule.scheduled.config;

import com.google.common.collect.ImmutableMap;
import com.guided.orci.engine.config.RuleConfig;
import com.guided.orci.models.rules.TenantRuleConfiguration;
import com.guided.orci.utils.TemporalAmountParser;

import java.time.Duration;
import java.util.Map;

public class PostInsulinGlucoseCheckRuleConfig extends RuleConfig {
    public static class Keys {
        public static final String SCHEDULED_INTERVAL = "SCHEDULED_INTERVAL";
    }

    public Map<String, String> getDefault() {
        return ImmutableMap.of(
                Keys.SCHEDULED_INTERVAL, "1h"
        );
    }

    @SuppressWarnings("unused")
    public PostInsulinGlucoseCheckRuleConfig(TenantRuleConfiguration config) {
        super(config);
    }

    @SuppressWarnings("unused")
    public PostInsulinGlucoseCheckRuleConfig() {
        super();
    }

    public Duration getScheduledInterval() {
        return TemporalAmountParser.parseAsDuration(config.get(Keys.SCHEDULED_INTERVAL));
    }

}
