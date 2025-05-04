package io.github.rohitect.kraven.plugins.mockserver.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * Configuration for a mock endpoint.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class MockEndpoint {

    /**
     * The path pattern for the endpoint.
     */
    private String path;

    /**
     * The original path pattern with unresolved properties.
     * This is used to display the original path in the UI.
     */
    private String originalPath;

    /**
     * The HTTP method for the endpoint.
     */
    private String method;

    /**
     * The type of response selection.
     * Possible values: "manual", "sequence"
     */
    private String responseType = "manual";

    /**
     * List of possible responses for this endpoint.
     */
    private List<MockResponse> responses = new ArrayList<>();

    /**
     * List of request matchers for this endpoint.
     */
    private List<MockMatcher> matchers = new ArrayList<>();

    /**
     * Get the default response for this endpoint.
     *
     * @return the default response, or the first response if no default is specified
     */
    public MockResponse getDefaultResponse() {
        for (MockResponse response : responses) {
            if (response.isDefault()) {
                return response;
            }
        }

        return responses.isEmpty() ? null : responses.get(0);
    }
}
