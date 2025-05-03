package io.github.rohitect.kraven.springboot.plugin;

import io.github.rohitect.kraven.plugin.KravenUIPlugin;
import io.github.rohitect.kraven.plugin.NavigationItem;
import io.github.rohitect.kraven.plugin.PluginContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Registry for managing plugins.
 * This is the central component for plugin management.
 */
@Component
@Slf4j
public class KravenPluginRegistry {

    private final Map<String, KravenUIPlugin> plugins = new ConcurrentHashMap<>();
    private final Map<String, NavigationItem> navigationItems = new ConcurrentHashMap<>();
    private final Map<String, Boolean> pluginRunningState = new ConcurrentHashMap<>();
    private final ApplicationContext applicationContext;

    public KravenPluginRegistry(ApplicationContext applicationContext) {
        this.applicationContext = applicationContext;
        log.info("KravenPluginRegistry initialized");
    }

    /**
     * Register a plugin.
     * This will initialize the plugin and add it to the registry.
     *
     * @param plugin the plugin to register
     */
    public void registerPlugin(KravenUIPlugin plugin) {
        String pluginId = plugin.getId();
        log.info("Registering plugin: {} ({})", plugin.getName(), pluginId);

        if (plugins.containsKey(pluginId)) {
            // If the plugin is already registered, log a warning and return
            log.warn("Plugin with ID {} is already registered. Skipping duplicate registration.", pluginId);
            return;
        }

        PluginContext context = createPluginContext(plugin);
        plugin.initialize(context);
        plugins.put(pluginId, plugin);
        pluginRunningState.put(pluginId, false); // Initially not running
        log.info("Plugin registered successfully: {}", pluginId);
    }

    /**
     * Start all registered plugins.
     * This is called after all plugins are registered.
     */
    public void startPlugins() {
        log.info("Starting {} registered plugins", plugins.size());
        plugins.values().forEach(plugin -> {
            startPlugin(plugin.getId());
        });
    }

    /**
     * Start a specific plugin by ID.
     *
     * @param pluginId the ID of the plugin to start
     * @return true if the plugin was started successfully, false otherwise
     */
    public boolean startPlugin(String pluginId) {
        KravenUIPlugin plugin = plugins.get(pluginId);
        if (plugin == null) {
            log.warn("Cannot start plugin with ID {}: plugin not found", pluginId);
            return false;
        }

        if (Boolean.TRUE.equals(pluginRunningState.get(pluginId))) {
            log.info("Plugin {} is already running", pluginId);
            return true;
        }

        try {
            plugin.start();
            pluginRunningState.put(pluginId, true);
            log.info("Started plugin: {} ({})", plugin.getName(), pluginId);
            return true;
        } catch (Exception e) {
            log.error("Failed to start plugin: " + pluginId, e);
            return false;
        }
    }

    /**
     * Stop all registered plugins.
     * This is called during application shutdown.
     */
    public void stopPlugins() {
        log.info("Stopping {} registered plugins", plugins.size());
        plugins.values().forEach(plugin -> {
            stopPlugin(plugin.getId());
        });
    }

    /**
     * Stop a specific plugin by ID.
     *
     * @param pluginId the ID of the plugin to stop
     * @return true if the plugin was stopped successfully, false otherwise
     */
    public boolean stopPlugin(String pluginId) {
        KravenUIPlugin plugin = plugins.get(pluginId);
        if (plugin == null) {
            log.warn("Cannot stop plugin with ID {}: plugin not found", pluginId);
            return false;
        }

        if (Boolean.FALSE.equals(pluginRunningState.get(pluginId))) {
            log.info("Plugin {} is already stopped", pluginId);
            return true;
        }

        try {
            plugin.stop();
            pluginRunningState.put(pluginId, false);
            log.info("Stopped plugin: {} ({})", plugin.getName(), pluginId);
            return true;
        } catch (Exception e) {
            log.error("Failed to stop plugin: " + pluginId, e);
            return false;
        }
    }

    /**
     * Get all registered plugins.
     *
     * @return an unmodifiable collection of plugins
     */
    public Collection<KravenUIPlugin> getPlugins() {
        return Collections.unmodifiableCollection(plugins.values());
    }

    /**
     * Get plugin information including running state.
     *
     * @return a collection of plugin information
     */
    public Collection<PluginInfo> getPluginInfo() {
        return plugins.values().stream()
                .map(plugin -> {
                    String id = plugin.getId();
                    return new PluginInfo(
                            id,
                            plugin.getName(),
                            plugin.getVersion(),
                            Boolean.TRUE.equals(pluginRunningState.get(id))
                    );
                })
                .collect(java.util.stream.Collectors.toList());
    }

    /**
     * Check if a plugin is running.
     *
     * @param pluginId the ID of the plugin
     * @return true if the plugin is running, false otherwise
     */
    public boolean isPluginRunning(String pluginId) {
        return Boolean.TRUE.equals(pluginRunningState.get(pluginId));
    }

    /**
     * Get all registered navigation items.
     *
     * @return an unmodifiable collection of navigation items
     */
    public Collection<NavigationItem> getNavigationItems() {
        return Collections.unmodifiableCollection(navigationItems.values());
    }

    /**
     * Create a plugin context for the given plugin.
     *
     * @param plugin the plugin
     * @return the plugin context
     */
    private PluginContext createPluginContext(KravenUIPlugin plugin) {
        return new DefaultPluginContext(plugin, applicationContext, navigationItems);
    }
}
