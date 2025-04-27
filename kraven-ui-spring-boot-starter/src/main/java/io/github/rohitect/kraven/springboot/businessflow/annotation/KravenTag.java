package io.github.rohitect.kraven.springboot.businessflow.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation to mark methods as part of a business flow.
 * This annotation is used to identify methods that are part of a specific business flow
 * and to provide metadata about their role in the flow.
 */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface KravenTag {
    
    /**
     * The name of the tag that identifies the business flow.
     * This should be a constant string value.
     * 
     * @return the tag name
     */
    String tag();
    
    /**
     * The level of the method in the flow.
     * Higher levels indicate deeper layers in the flow (e.g., 1 for controllers, 2 for services, etc.).
     * If not specified, the level will be determined automatically based on the class stereotype.
     * 
     * @return the level in the flow
     */
    int level() default 0;
    
    /**
     * A description of what this method does in the business flow.
     * 
     * @return the description
     */
    String description() default "";
}
