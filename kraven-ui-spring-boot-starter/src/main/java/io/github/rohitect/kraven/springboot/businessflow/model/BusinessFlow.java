package io.github.rohitect.kraven.springboot.businessflow.model;

import lombok.Data;
import java.util.List;
import java.util.Map;

/**
 * Represents a business flow composed of tagged methods.
 */
@Data
public class BusinessFlow {
    
    /**
     * The name of the tag that identifies this business flow.
     */
    private String tagName;
    
    /**
     * The methods in this business flow, grouped by stereotype.
     */
    private Map<String, List<TaggedMethod>> methodsByStereotype;
    
    /**
     * All methods in this business flow, ordered by level.
     */
    private List<TaggedMethod> methods;
}
