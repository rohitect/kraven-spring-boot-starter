package io.github.rohitect.kraven.plugins.actuatorinsights.config;

import lombok.Data;

/**
 * Configuration properties for the Actuator Insights plugin.
 */
@Data
public class ActuatorInsightsConfig {

    /**
     * Whether the plugin is enabled.
     */
    private boolean enabled = true;

    /**
     * Whether to auto-detect Spring Boot Actuator.
     */
    private boolean autoDetect = true;

    /**
     * The base URL for actuator endpoints.
     * Default is http://localhost:8080
     */
    private String baseUrl = "http://localhost:8080";

    /**
     * The servlet context path of the application.
     * Default is empty (no context path).
     */
    private String contextPath = "";

    /**
     * Data collection configuration.
     */
    private DataCollection dataCollection = new DataCollection();

    /**
     * Endpoints configuration.
     */
    private Endpoints endpoints = new Endpoints();

    /**
     * Sensitive data configuration.
     */
    private SensitiveData sensitiveData = new SensitiveData();

    /**
     * Data collection configuration properties.
     */
    @Data
    public static class DataCollection {
        /**
         * The interval at which to collect data from actuator endpoints.
         * Format: duration string (e.g., "15s", "1m")
         */
        private String interval = "15s";

        /**
         * The period for which to retain historical data.
         * Format: duration string (e.g., "1h", "1d")
         */
        private String retentionPeriod = "1h";
    }

    /**
     * Endpoints configuration properties.
     */
    @Data
    public static class Endpoints {
        /**
         * Comma-separated list of endpoints to include.
         * Use "*" to include all endpoints.
         */
        private String include = "*";

        /**
         * Comma-separated list of endpoints to exclude.
         */
        private String exclude = "heapdump,shutdown";
    }

    /**
     * Sensitive data configuration properties.
     */
    @Data
    public static class SensitiveData {
        /**
         * Whether to mask sensitive values in environment properties.
         */
        private boolean maskSensitiveValues = true;

        /**
         * Comma-separated list of patterns to consider sensitive.
         * These patterns are used to identify sensitive keys in environment properties.
         */
        private String sensitivePatterns = "password,passwd,secret,credential,token,key,auth,private,access";
    }
}
