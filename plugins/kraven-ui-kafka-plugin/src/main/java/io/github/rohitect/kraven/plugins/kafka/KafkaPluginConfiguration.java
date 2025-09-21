package io.github.rohitect.kraven.plugins.kafka;

import io.github.rohitect.kraven.plugins.kafka.service.KafkaAdminService;
import io.github.rohitect.kraven.plugins.kafka.service.KafkaListenerScanner;
import io.github.rohitect.kraven.plugins.kafka.service.KafkaMessageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

/**
 * Configuration class for the Kafka plugin.
 * This class registers the necessary beans for the Kafka plugin.
 */
@Configuration
@Slf4j
public class KafkaPluginConfiguration {

    /**
     * Creates the KafkaPluginConfig bean with properly loaded configuration.
     *
     * @param environment the Spring environment
     * @return the KafkaPluginConfig
     */
    @Bean
    public KafkaPluginConfig kafkaPluginConfig(Environment environment) {
        // Load configuration manually from environment properties
        String prefix = "kraven.plugins.kafka";
        KafkaPluginConfig config = new KafkaPluginConfig();

        // Load each property individually
        config.setEnabled(environment.getProperty(prefix + ".enabled", Boolean.class, config.isEnabled()));
        config.setMessageConsumptionEnabled(environment.getProperty(prefix + ".messageConsumptionEnabled", Boolean.class, config.isMessageConsumptionEnabled()));
        config.setMessageProductionEnabled(environment.getProperty(prefix + ".messageProductionEnabled", Boolean.class, config.isMessageProductionEnabled()));
        config.setStreamingEnabled(environment.getProperty(prefix + ".streamingEnabled", Boolean.class, config.isStreamingEnabled()));
        config.setSseTimeoutMs(environment.getProperty(prefix + ".sseTimeoutMs", Long.class, config.getSseTimeoutMs()));
        config.setDefaultMessageLimit(environment.getProperty(prefix + ".defaultMessageLimit", Integer.class, config.getDefaultMessageLimit()));
        config.setMaxMessageLimit(environment.getProperty(prefix + ".maxMessageLimit", Integer.class, config.getMaxMessageLimit()));

        // Handle basePackages array property
        String basePackagesStr = environment.getProperty(prefix + ".basePackages");
        if (basePackagesStr != null && !basePackagesStr.trim().isEmpty()) {
            config.setBasePackages(basePackagesStr.split(","));
        }

        log.debug("Loaded KafkaPluginConfig from properties with prefix '{}': {}", prefix, config);
        return config;
    }

    /**
     * Creates the KafkaListenerScanner bean.
     *
     * @param applicationContext the application context
     * @param config the Kafka plugin configuration
     * @return the KafkaListenerScanner
     */
    @Bean
    public KafkaListenerScanner kafkaListenerScanner(ApplicationContext applicationContext, KafkaPluginConfig config) {
        KafkaListenerScanner scanner = new KafkaListenerScanner(applicationContext, config);
        log.debug("Created KafkaListenerScanner bean");
        return scanner;
    }

    /**
     * Creates the KafkaAdminService bean.
     *
     * @param applicationContext the application context
     * @param listenerScanner the Kafka listener scanner
     * @param config the Kafka plugin configuration
     * @param environment the Spring environment
     * @return the KafkaAdminService
     */
    @Bean
    public KafkaAdminService kafkaAdminService(ApplicationContext applicationContext,
                                              KafkaListenerScanner listenerScanner,
                                              KafkaPluginConfig config,
                                              Environment environment) {
        KafkaAdminService service = new KafkaAdminService(applicationContext, listenerScanner, config, environment);
        log.debug("Created KafkaAdminService bean");
        return service;
    }

    /**
     * Creates the KafkaMessageService bean.
     *
     * @param applicationContext the application context
     * @param config the Kafka plugin configuration
     * @return the KafkaMessageService
     */
    @Bean
    public KafkaMessageService kafkaMessageService(ApplicationContext applicationContext, KafkaPluginConfig config) {
        KafkaMessageService service = new KafkaMessageService(applicationContext, config);
        log.debug("Created KafkaMessageService bean");
        return service;
    }
}
