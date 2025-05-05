package io.github.rohitect.kraven.plugins.actuatorinsights;

import io.github.rohitect.kraven.plugin.KravenPlugin;
import io.github.rohitect.kraven.plugin.KravenUIPlugin;
import io.github.rohitect.kraven.plugin.NavigationItem;
import io.github.rohitect.kraven.plugin.PluginContext;
import io.github.rohitect.kraven.plugins.actuatorinsights.config.ActuatorInsightsConfig;
import io.github.rohitect.kraven.plugins.actuatorinsights.controller.ActuatorInsightsController;
import io.github.rohitect.kraven.plugins.actuatorinsights.service.ActuatorDetectionService;
import io.github.rohitect.kraven.plugins.actuatorinsights.service.ActuatorDataCollectionService;
import lombok.extern.slf4j.Slf4j;

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

        // Create and register services
        detectionService = new ActuatorDetectionService(config, context.getApplicationContext());
        context.registerService(detectionService);

        // Get the Environment from the ApplicationContext
        org.springframework.core.env.Environment environment = context.getApplicationContext().getEnvironment();

        dataCollectionService = new ActuatorDataCollectionService(config, environment);
        context.registerService(dataCollectionService);

        // Register controllers
        context.registerController(new ActuatorInsightsController(detectionService, dataCollectionService));

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
