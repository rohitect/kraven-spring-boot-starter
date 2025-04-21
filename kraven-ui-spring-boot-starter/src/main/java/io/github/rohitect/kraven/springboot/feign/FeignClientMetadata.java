package io.github.rohitect.kraven.springboot.feign;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Metadata for a Feign client.
 */
@Data
public class FeignClientMetadata {
    /**
     * The name of the Feign client.
     */
    private String name;

    /**
     * The URL of the Feign client.
     */
    private String url;

    /**
     * The path of the Feign client.
     */
    private String path;

    /**
     * The fully qualified class name of the Feign client interface.
     */
    private String className;

    /**
     * The methods of the Feign client.
     */
    private List<FeignMethodMetadata> methods = new ArrayList<>();

    /**
     * The configuration class for the Feign client.
     */
    private String configuration;

    /**
     * The fallback class for the Feign client.
     */
    private String fallback;

    /**
     * The fallback factory class for the Feign client.
     */
    private String fallbackFactory;

    /**
     * Additional properties of the Feign client.
     */
    private Map<String, String> properties;
}
