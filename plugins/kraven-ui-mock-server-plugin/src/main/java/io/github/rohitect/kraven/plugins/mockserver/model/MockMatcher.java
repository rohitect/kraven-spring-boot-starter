package io.github.rohitect.kraven.plugins.mockserver.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/**
 * Configuration for a request matcher.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class MockMatcher {
    
    /**
     * The type of matcher.
     * Possible values: "header", "query-param", "path-variable", "body"
     */
    private String type;
    
    /**
     * The name of the parameter to match.
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
}
