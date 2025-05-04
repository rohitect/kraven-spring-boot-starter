package io.github.rohitect.kraven.plugins.mockserver.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/**
 * Configuration for a delay condition.
 * Conditions determine when a delay should be applied to a response.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class MockDelayCondition {
    
    /**
     * The type of condition.
     * Possible values: "header", "query-param", "path-variable", "method", "path"
     */
    private String type;
    
    /**
     * The name of the parameter to check.
     * For headers, this is the header name.
     * For query parameters, this is the parameter name.
     * For path variables, this is the variable name.
     * Not used for method or path conditions.
     */
    private String name;
    
    /**
     * The value to match against.
     */
    private String value;
    
    /**
     * The pattern to match against (supports regex).
     */
    private String pattern;
    
    /**
     * The operator to use for matching.
     * Possible values: "equals", "contains", "startsWith", "endsWith", "regex", "exists"
     * Default is "equals".
     */
    private String operator = "equals";
    
    /**
     * Whether the match is case-sensitive.
     * Default is true.
     */
    private boolean caseSensitive = true;
    
    /**
     * Whether this condition is required for the delay to be applied.
     * Default is true.
     */
    private boolean required = true;
}
