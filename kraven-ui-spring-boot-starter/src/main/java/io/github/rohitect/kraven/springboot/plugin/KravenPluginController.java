package io.github.rohitect.kraven.springboot.plugin;

import io.github.rohitect.kraven.plugin.NavigationItem;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

/**
 * Controller that provides plugin information to the UI.
 * This exposes endpoints for the UI to query available plugins and navigation items.
 */
@RestController
@RequestMapping("/kraven/api/plugins")
@Slf4j
public class KravenPluginController {

    private final KravenPluginRegistry registry;

    public KravenPluginController(KravenPluginRegistry registry) {
        this.registry = registry;
        log.info("KravenPluginController initialized");
    }

    /**
     * Get all registered plugins.
     *
     * @return list of plugin information
     */
    @GetMapping
    public List<PluginInfo> getPlugins() {
        log.debug("Getting all plugins");
        return new ArrayList<>(registry.getPluginInfo());
    }

    /**
     * Get all navigation items from plugins.
     *
     * @return list of navigation items
     */
    @GetMapping("/navigation")
    public List<NavigationItem> getNavigationItems() {
        log.debug("Getting all navigation items");
        return new ArrayList<>(registry.getNavigationItems());
    }

    /**
     * Start a plugin.
     *
     * @param pluginId the ID of the plugin to start
     * @return response with success status and message
     */
    @PostMapping("/{pluginId}/start")
    public ResponseEntity<Map<String, Object>> startPlugin(@PathVariable String pluginId) {
        log.debug("Starting plugin: {}", pluginId);
        boolean success = registry.startPlugin(pluginId);

        Map<String, Object> response = new HashMap<>();
        response.put("success", success);
        response.put("message", success ?
                "Plugin " + pluginId + " started successfully" :
                "Failed to start plugin " + pluginId);

        return ResponseEntity.ok(response);
    }

    /**
     * Stop a plugin.
     *
     * @param pluginId the ID of the plugin to stop
     * @return response with success status and message
     */
    @PostMapping("/{pluginId}/stop")
    public ResponseEntity<Map<String, Object>> stopPlugin(@PathVariable String pluginId) {
        log.debug("Stopping plugin: {}", pluginId);
        boolean success = registry.stopPlugin(pluginId);

        Map<String, Object> response = new HashMap<>();
        response.put("success", success);
        response.put("message", success ?
                "Plugin " + pluginId + " stopped successfully" :
                "Failed to stop plugin " + pluginId);

        return ResponseEntity.ok(response);
    }
}
