package io.github.rohitect.kraven.springboot.plugin;

import io.github.rohitect.kraven.springboot.KravenUiProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Auto-configuration for the plugin system.
 * This sets up the plugin registry, discovery, and lifecycle management.
 */
@Configuration
@ConditionalOnProperty(prefix = "kraven.ui.plugins", name = "enabled", matchIfMissing = true)
@EnableConfigurationProperties(KravenUiProperties.class)
@Slf4j
public class KravenPluginAutoConfiguration {

    public KravenPluginAutoConfiguration() {
        log.info("Initializing Kraven UI Plugin System");
    }

    @Bean
    public KravenPluginRegistry kravenPluginRegistry(ApplicationContext applicationContext) {
        return new KravenPluginRegistry(applicationContext);
    }

    @Bean
    public KravenPluginDiscovery kravenPluginDiscovery(
            KravenPluginRegistry registry,
            KravenUiProperties properties) {
        return new KravenPluginDiscovery(registry, properties);
    }

    @Bean
    public KravenPluginLifecycleManager kravenPluginLifecycleManager(KravenPluginRegistry registry) {
        return new KravenPluginLifecycleManager(registry);
    }

    @Bean
    public KravenPluginController kravenPluginController(KravenPluginRegistry registry) {
        return new KravenPluginController(registry);
    }
}
