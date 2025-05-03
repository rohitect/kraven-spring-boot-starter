package io.github.rohitect.kraven.springboot.plugin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Information about a plugin, including its running state.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PluginInfo {
    
    /**
     * The plugin ID.
     */
    private String id;
    
    /**
     * The plugin name.
     */
    private String name;
    
    /**
     * The plugin version.
     */
    private String version;
    
    /**
     * Whether the plugin is running.
     */
    private boolean running;
}
