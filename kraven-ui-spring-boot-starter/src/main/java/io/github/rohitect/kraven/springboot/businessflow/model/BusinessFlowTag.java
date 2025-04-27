package io.github.rohitect.kraven.springboot.businessflow.model;

import lombok.Data;

/**
 * Represents a business flow tag with summary information.
 */
@Data
public class BusinessFlowTag {
    
    /**
     * The name of the tag.
     */
    private String name;
    
    /**
     * The number of methods tagged with this tag.
     */
    private int methodCount;
    
    /**
     * The number of different stereotypes (Controller, Service, etc.) in this flow.
     */
    private int stereotypeCount;
}
