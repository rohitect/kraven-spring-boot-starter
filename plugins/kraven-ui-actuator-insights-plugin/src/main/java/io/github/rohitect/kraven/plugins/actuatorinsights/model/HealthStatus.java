package io.github.rohitect.kraven.plugins.actuatorinsights.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;
import java.util.Map;

/**
 * Data model for health status.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class HealthStatus {
    
    /**
     * The status of the application (UP, DOWN, etc.).
     */
    private String status;
    
    /**
     * The timestamp when the status was recorded.
     */
    private Date timestamp;
    
    /**
     * The full health data.
     */
    private Map<String, Object> details;
}
