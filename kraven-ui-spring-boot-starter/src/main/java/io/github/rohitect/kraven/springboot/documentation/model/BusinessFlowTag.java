package io.github.rohitect.kraven.springboot.documentation.model;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * Represents a business flow tag in documentation.
 */
@Data
public class BusinessFlowTag {
    
    /**
     * The name of the business flow tag.
     */
    private String name;
    
    /**
     * The description of the business flow tag.
     */
    private String description;
    
    /**
     * The documentation file ID where this tag is defined.
     */
    private String documentationFileId;
    
    /**
     * The methods in this business flow.
     */
    private List<BusinessFlowMethod> methods = new ArrayList<>();
    
    /**
     * Represents a method in a business flow.
     */
    @Data
    public static class BusinessFlowMethod {
        
        /**
         * The class name of the method.
         */
        private String className;
        
        /**
         * The simple class name of the method.
         */
        private String simpleClassName;
        
        /**
         * The method name.
         */
        private String methodName;
        
        /**
         * The method signature.
         */
        private String methodSignature;
        
        /**
         * The description of the method in the flow.
         */
        private String description;
        
        /**
         * The stereotype of the class (Controller, Service, Repository, etc.).
         */
        private String stereotype;
        
        /**
         * The order of this method in the flow.
         */
        private int order;
    }
}
