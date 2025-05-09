package io.github.rohitect.kraven.plugins.actuatorinsights.config;

import io.github.rohitect.kraven.plugins.actuatorinsights.service.ActuatorDataCollectionService;
import io.github.rohitect.kraven.plugins.actuatorinsights.service.ActuatorDetectionService;
import io.github.rohitect.kraven.plugins.actuatorinsights.service.ThreadDumpAnalysisService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

/**
 * Configuration class for the Actuator Insights plugin.
 * This class registers the necessary beans for the Actuator Insights plugin.
 */
@Configuration
@Slf4j
public class ActuatorInsightsConfiguration {

    /**
     * Creates the ActuatorInsightsConfig bean.
     *
     * @return the ActuatorInsightsConfig
     */
    @Bean
    public ActuatorInsightsConfig actuatorInsightsConfig() {
        ActuatorInsightsConfig config = new ActuatorInsightsConfig();
        log.debug("Created ActuatorInsightsConfig bean");
        return config;
    }

    /**
     * Creates the ActuatorDetectionService bean.
     *
     * @param applicationContext the application context
     * @param config the Actuator Insights plugin configuration
     * @return the ActuatorDetectionService
     */
    @Bean
    public ActuatorDetectionService actuatorDetectionService(ApplicationContext applicationContext, ActuatorInsightsConfig config) {
        ActuatorDetectionService service = new ActuatorDetectionService(config, applicationContext);
        log.debug("Created ActuatorDetectionService bean");
        return service;
    }

    /**
     * Creates the ActuatorDataCollectionService bean.
     *
     * @param environment the Spring environment
     * @param config the Actuator Insights plugin configuration
     * @return the ActuatorDataCollectionService
     */
    @Bean
    public ActuatorDataCollectionService actuatorDataCollectionService(Environment environment, ActuatorInsightsConfig config) {
        ActuatorDataCollectionService service = new ActuatorDataCollectionService(config, environment);
        log.debug("Created ActuatorDataCollectionService bean");
        return service;
    }

    /**
     * Creates the ThreadDumpAnalysisService bean.
     *
     * @return the ThreadDumpAnalysisService
     */
    @Bean
    public ThreadDumpAnalysisService threadDumpAnalysisService() {
        ThreadDumpAnalysisService service = new ThreadDumpAnalysisService();
        log.debug("Created ThreadDumpAnalysisService bean");
        return service;
    }
}
