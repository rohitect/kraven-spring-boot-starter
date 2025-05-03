package io.github.rohitect.kraven.plugins.kafka;

import io.github.rohitect.kraven.plugin.KravenPlugin;
import io.github.rohitect.kraven.plugin.KravenUIPlugin;
import io.github.rohitect.kraven.plugin.NavigationItem;
import io.github.rohitect.kraven.plugin.PluginContext;
import io.github.rohitect.kraven.plugins.kafka.controller.KafkaManagementController;
import io.github.rohitect.kraven.plugins.kafka.service.KafkaAdminService;
import io.github.rohitect.kraven.plugins.kafka.service.KafkaListenerScanner;
import io.github.rohitect.kraven.plugins.kafka.service.KafkaMessageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationContext;

/**
 * Kafka plugin for Kraven UI.
 * This plugin provides Kafka management functionality.
 */
@KravenPlugin(
    id = "kafka",
    name = "Kafka Management",
    version = "1.0.0",
    description = "Kafka management plugin for Kraven UI",
    provider = "Rohitect"
)
@Slf4j
public class KafkaPlugin implements KravenUIPlugin {

    private KafkaPluginConfig config;

    @Override
    public String getId() {
        return "kafka";
    }

    @Override
    public String getName() {
        return "Kafka Management";
    }

    @Override
    public String getVersion() {
        return "1.0.0";
    }

    @Override
    public void initialize(PluginContext context) {
        log.info("Initializing Kafka Plugin");

        // Get plugin configuration
        config = context.getConfiguration(KafkaPluginConfig.class);
        log.debug("Kafka Plugin configuration: {}", config);

        if (!config.isEnabled()) {
            log.info("Kafka Plugin is disabled");
            return;
        }

        // Register navigation item
        context.registerNavigationItem(
            NavigationItem.builder()
                .id("kafka")
                .label("Kafka")
                .build()
        );

        log.info("Kafka Plugin initialized successfully");
    }

    @Override
    public void start() {
        log.info("Starting Kafka Plugin");
        // Nothing to do here, services are started by Spring
    }

    @Override
    public void stop() {
        log.info("Stopping Kafka Plugin");
        // Nothing to do here, services are stopped by Spring
    }
}
