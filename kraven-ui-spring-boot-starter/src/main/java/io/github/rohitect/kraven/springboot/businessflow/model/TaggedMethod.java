package io.github.rohitect.kraven.springboot.businessflow.model;

import lombok.Data;

/**
 * Represents a method that has been tagged with the KravenTag annotation.
 */
@Data
public class TaggedMethod {
    
    /**
     * The name of the class containing the tagged method.
     */
    private String className;
    
    /**
     * The simple name of the class (without package).
     */
    private String simpleClassName;
    
    /**
     * The name of the method.
     */
    private String methodName;
    
    /**
     * The tag name from the KravenTag annotation.
     */
    private String tagName;
    
    /**
     * The level from the KravenTag annotation.
     */
    private int level;
    
    /**
     * The description from the KravenTag annotation.
     */
    private String description;
    
    /**
     * The stereotype of the class (Controller, Service, Repository, Component, etc.).
     */
    private String stereotype;
    
    /**
     * The method signature.
     */
    private String methodSignature;
    
    /**
     * The package name of the class.
     */
    private String packageName;
}
