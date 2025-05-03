package io.github.rohitect.kraven.plugin;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation to mark a class as a Kraven UI plugin.
 * This is used for auto-discovery of plugins.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface KravenPlugin {
    
    /**
     * The unique identifier for the plugin.
     * This should be a simple, lowercase string with no spaces.
     * 
     * @return the plugin ID
     */
    String id();
    
    /**
     * The human-readable name of the plugin.
     * This will be displayed in the UI.
     * 
     * @return the plugin name
     */
    String name();
    
    /**
     * The version of the plugin.
     * Should follow semantic versioning (MAJOR.MINOR.PATCH).
     * 
     * @return the plugin version
     */
    String version();
    
    /**
     * A description of the plugin.
     * 
     * @return the plugin description
     */
    String description() default "";
    
    /**
     * The provider of the plugin.
     * 
     * @return the plugin provider
     */
    String provider() default "";
}
