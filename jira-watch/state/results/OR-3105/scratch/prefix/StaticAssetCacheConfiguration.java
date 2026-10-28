package com.guided.orci.configuration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.time.Duration;

@Configuration
public class StaticAssetCacheConfiguration implements WebMvcConfigurer {
    private static final Logger log = LoggerFactory.getLogger(StaticAssetCacheConfiguration.class);
    private static final CacheControl CONTENT_HASHED_ASSETS = CacheControl.maxAge(Duration.ofDays(30)).immutable();

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        log.warn("OR-3105 RED CHECK ACTIVE: pre-fix StaticAssetCacheConfiguration swapped in, no /audio/** resource handler registered");
        registry.addResourceHandler("/static/**")
                .addResourceLocations("classpath:/static/static/")
                .setCacheControl(CONTENT_HASHED_ASSETS);
    }
}
