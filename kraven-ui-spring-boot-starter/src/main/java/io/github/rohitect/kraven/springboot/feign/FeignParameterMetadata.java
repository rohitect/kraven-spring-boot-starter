package io.github.rohitect.kraven.springboot.feign;

import lombok.Data;

/**
 * Metadata for a Feign client method parameter.
 */
@Data
public class FeignParameterMetadata {
    /**
     * The name of the parameter.
     */
    private String name;

    /**
     * The type of the parameter.
     */
    private String type;

    /**
     * The annotation type of the parameter (e.g., PathVariable, RequestParam, RequestBody).
     */
    private String annotationType;

    /**
     * Whether the parameter is required.
     */
    private boolean required;

    /**
     * The default value of the parameter.
     */
    private String defaultValue;
}
