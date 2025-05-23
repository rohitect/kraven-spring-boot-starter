package io.github.rohitect.kraven.plugins.mockserver.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import io.github.rohitect.kraven.plugins.mockserver.util.BodyTemplateDeserializer;
import lombok.Data;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Configuration for a mock response.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class MockResponse {

    /**
     * The unique identifier for this response.
     */
    private String id;

    /**
     * Whether this is the default response for the endpoint.
     */
    private boolean isDefault = false;

    /**
     * The HTTP status code for the response.
     */
    private int status = 200;

    /**
     * The headers to include in the response.
     */
    private Map<String, String> headers = new HashMap<>();

    /**
     * The body of the response.
     * This can be a string or a complex object that will be serialized to JSON.
     */
    private Object body;

    /**
     * The body template for dynamic responses.
     * This can be a string or a complex object that will be serialized to JSON.
     * When deserialized, it will always be converted to a string.
     */
    @JsonDeserialize(using = BodyTemplateDeserializer.class)
    private String bodyTemplate;

    /**
     * The template engine to use for the body template.
     * Possible values: "handlebars", "simple"
     */
    private String bodyTemplateEngine = "simple";

    /**
     * The fixed delay in milliseconds before sending the response.
     * If both delay and delayRange are specified, delayRange takes precedence.
     */
    private int delay = 0;

    /**
     * The minimum delay in milliseconds for random delay range.
     * Used only if delayRange is true.
     */
    private int minDelay = 0;

    /**
     * The maximum delay in milliseconds for random delay range.
     * Used only if delayRange is true.
     */
    private int maxDelay = 0;

    /**
     * Whether to use a random delay range instead of a fixed delay.
     */
    private boolean delayRange = false;

    /**
     * Conditions for applying the delay.
     * If empty or null, the delay is always applied.
     */
    private List<MockDelayCondition> delayConditions;

    /**
     * A description of this response.
     */
    private String description;

    /**
     * Tags for categorizing this response.
     */
    private String[] tags;

    /**
     * The category for this response.
     */
    private String category;
}
