package io.github.rohitect.kraven.plugin;

/**
 * Main interface that all plugins must implement.
 * This defines the contract for Kraven UI plugins.
 */
public interface KravenUIPlugin {
    
    /**
     * Get the unique identifier for the plugin.
     * This should be a simple, lowercase string with no spaces.
     * 
     * @return the plugin ID
     */
    String getId();
    
    /**
     * Get the human-readable name of the plugin.
     * This will be displayed in the UI.
     * 
     * @return the plugin name
     */
    String getName();
    
    /**
     * Get the version of the plugin.
     * Should follow semantic versioning (MAJOR.MINOR.PATCH).
     * 
     * @return the plugin version
     */
    String getVersion();
    
    /**
     * Initialize the plugin with the provided context.
     * This is called during application startup.
     * 
     * @param context the plugin context
     */
    void initialize(PluginContext context);
    
    /**
     * Start the plugin.
     * This is called after all plugins are initialized.
     */
    void start();
    
    /**
     * Stop the plugin.
     * This is called during application shutdown.
     */
    void stop();
}
