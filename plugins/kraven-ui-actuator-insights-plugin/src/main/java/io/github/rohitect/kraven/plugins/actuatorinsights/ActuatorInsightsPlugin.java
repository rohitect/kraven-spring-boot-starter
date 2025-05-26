package io.github.rohitect.kraven.plugins.actuatorinsights;

import io.github.rohitect.kraven.plugin.KravenPlugin;
import io.github.rohitect.kraven.plugin.KravenUIPlugin;
import io.github.rohitect.kraven.plugin.NavigationItem;
import io.github.rohitect.kraven.plugin.PluginContext;
import io.github.rohitect.kraven.plugins.actuatorinsights.config.ActuatorInsightsConfig;
import io.github.rohitect.kraven.plugins.actuatorinsights.controller.ActuatorInsightsController;
import io.github.rohitect.kraven.plugins.actuatorinsights.service.ActuatorDetectionService;
import io.github.rohitect.kraven.plugins.actuatorinsights.service.ActuatorDataCollectionService;
import io.github.rohitect.kraven.plugins.actuatorinsights.service.ThreadDumpAnalysisService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationContext;

/**
 * Actuator Insights plugin for Kraven UI.
 * This plugin provides visualization and monitoring of Spring Boot Actuator endpoints.
 */
@KravenPlugin(
    id = "actuator-insights",
    name = "Actuator Insights",
    version = "1.0.0",
    description = "Spring Boot Actuator visualization and monitoring",
    provider = "Rohitect"
)
@Slf4j
public class ActuatorInsightsPlugin implements KravenUIPlugin {

    private ActuatorInsightsConfig config;
    private ActuatorDetectionService detectionService;
    private ActuatorDataCollectionService dataCollectionService;
    private ThreadDumpAnalysisService threadDumpAnalysisService;
    private boolean actuatorDetected = false;

    @Override
    public String getId() {
        return "actuator-insights";
    }

    @Override
    public String getName() {
        return "Actuator Insights";
    }

    @Override
    public String getVersion() {
        return "1.0.0";
    }

    @Override
    public void initialize(PluginContext context) {
        log.info("Initializing Actuator Insights Plugin");

        // Get plugin configuration
        config = context.getConfiguration(ActuatorInsightsConfig.class);
        log.debug("Actuator Insights Plugin configuration: {}", config);

        if (!config.isEnabled()) {
            log.info("Actuator Insights Plugin is disabled");
            return;
        }

        // Get services from the application context
        ApplicationContext applicationContext = context.getApplicationContext();
        detectionService = applicationContext.getBean(ActuatorDetectionService.class);
        // Don't register the service again as it's already a Spring bean
        // context.registerService(detectionService);

        dataCollectionService = applicationContext.getBean(ActuatorDataCollectionService.class);
        // Don't register the service again as it's already a Spring bean
        // context.registerService(dataCollectionService);

        threadDumpAnalysisService = applicationContext.getBean(ThreadDumpAnalysisService.class);
        // Don't register the service again as it's already a Spring bean
        // context.registerService(threadDumpAnalysisService);

        // Register controllers
        context.registerController(new ActuatorInsightsController(
                detectionService,
                dataCollectionService,
                threadDumpAnalysisService));

        // Register navigation item
        context.registerNavigationItem(
            NavigationItem.builder()
                .id("actuator-insights")
                .label("Actuator Insights")
                .build()
        );

        log.info("Actuator Insights Plugin initialized successfully");
    }

    @Override
    public void start() {
        log.info("Starting Actuator Insights Plugin");

        if (!config.isEnabled()) {
            log.info("Actuator Insights Plugin is disabled, not starting");
            return;
        }

        // Detect if Spring Boot Actuator is available
        if (config.isAutoDetect()) {
            actuatorDetected = detectionService.detectActuator();
            if (actuatorDetected) {
                log.info("Spring Boot Actuator detected, starting data collection");
                dataCollectionService.startDataCollection();
            } else {
                log.info("Spring Boot Actuator not detected, plugin will be in limited functionality mode");
            }
        } else {
            log.info("Auto-detection is disabled, assuming Actuator is available");
            actuatorDetected = true;
            dataCollectionService.startDataCollection();
        }
    }

    @Override
    public void stop() {
        log.info("Stopping Actuator Insights Plugin");

        if (dataCollectionService != null) {
            dataCollectionService.stopDataCollection();
        }
    }
}
