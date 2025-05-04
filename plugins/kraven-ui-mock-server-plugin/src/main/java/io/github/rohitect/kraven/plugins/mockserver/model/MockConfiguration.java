package io.github.rohitect.kraven.plugins.mockserver.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * Root configuration model for the mock server.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class MockConfiguration {
    
    /**
     * List of endpoint configurations.
     */
    private List<MockEndpoint> endpoints = new ArrayList<>();
}
