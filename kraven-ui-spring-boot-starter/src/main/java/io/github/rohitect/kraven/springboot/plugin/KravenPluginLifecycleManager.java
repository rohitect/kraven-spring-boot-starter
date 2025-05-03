package io.github.rohitect.kraven.springboot.plugin;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import jakarta.annotation.PreDestroy;

/**
 * Manages plugin lifecycle.
 * This component starts and stops plugins at the appropriate times.
 */
@Component
@Slf4j
public class KravenPluginLifecycleManager {
    
    private final KravenPluginRegistry registry;
    
    public KravenPluginLifecycleManager(KravenPluginRegistry registry) {
        this.registry = registry;
        log.info("KravenPluginLifecycleManager initialized");
    }
    
    /**
     * Start all plugins after application is ready.
     * This is called when the Spring application is fully initialized.
     */
    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        log.info("Application is ready, starting plugins");
        registry.startPlugins();
    }
    
    /**
     * Stop all plugins before application shutdown.
     * This is called during application shutdown.
     */
    @PreDestroy
    public void onApplicationShutdown() {
        log.info("Application is shutting down, stopping plugins");
        registry.stopPlugins();
    }
}
