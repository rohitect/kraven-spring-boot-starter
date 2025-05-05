package io.github.rohitect.kraven.plugins.actuatorinsights.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data model for an actuator endpoint.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ActuatorEndpoint {
    
    /**
     * The name of the endpoint.
     */
    private String name;
    
    /**
     * The URL of the endpoint.
     */
    private String url;
}
