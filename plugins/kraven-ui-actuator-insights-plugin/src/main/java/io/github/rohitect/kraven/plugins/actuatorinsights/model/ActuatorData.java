package io.github.rohitect.kraven.plugins.actuatorinsights.model;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

/**
 * Data model for actuator data.
 */
@Data
@Builder
public class ActuatorData {

    /**
     * Health data from the health endpoint.
     */
    private Map<String, Object> health;

    /**
     * Metrics data from the metrics endpoint.
     */
    private Map<String, MetricData> metrics;

    /**
     * Info data from the info endpoint.
     */
    private Map<String, Object> info;

    /**
     * Environment data from the env endpoint.
     */
    private Map<String, Object> env;

    /**
     * Beans data from the beans endpoint.
     */
    private Map<String, Object> beans;
}
