package io.github.rohitect.kraven.plugin;

import org.springframework.context.ApplicationContext;

/**
 * Context provided to plugins during initialization.
 * This provides access to the application context and registration methods.
 */
public interface PluginContext {
    
    /**
     * Register a Spring controller.
     * The controller will be registered with the Spring application context.
     * 
     * @param controller the controller to register
     */
    void registerController(Object controller);
    
    /**
     * Register a service bean.
     * The service will be registered with the Spring application context.
     * 
     * @param service the service to register
     */
    void registerService(Object service);
    
    /**
     * Register a navigation item for the UI.
     * This will add an entry to the header navigation.
     * 
     * @param item the navigation item to register
     */
    void registerNavigationItem(NavigationItem item);
    
    /**
     * Get the Spring application context.
     * 
     * @return the application context
     */
    ApplicationContext getApplicationContext();
    
    /**
     * Get plugin-specific configuration.
     * This will bind configuration properties with the prefix "kraven.plugins.[pluginId]"
     * to the specified class.
     * 
     * @param <T> the configuration class type
     * @param configClass the configuration class
     * @return the configuration instance
     */
    <T> T getConfiguration(Class<T> configClass);
}
