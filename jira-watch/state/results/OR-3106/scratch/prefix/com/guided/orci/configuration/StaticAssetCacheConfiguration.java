package com.guided.orci.configuration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class StaticAssetCacheConfiguration implements WebMvcConfigurer {
    private static final Logger log = LoggerFactory.getLogger(StaticAssetCacheConfiguration.class);

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        log.warn("RED CHECK OR-3106: pre-fix StaticAssetCacheConfiguration active, /static/** registered without immutable Cache-Control");
    }
}
