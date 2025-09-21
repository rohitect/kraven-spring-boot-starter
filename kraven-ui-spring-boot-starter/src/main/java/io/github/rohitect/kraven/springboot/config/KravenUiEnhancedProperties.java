package io.github.rohitect.kraven.springboot.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.HashMap;
import java.util.Map;

/**
 * Enhanced configuration properties for Kraven UI.
 * This class provides a comprehensive configuration model for all Kraven UI features.
 */
@Data
@ConfigurationProperties(prefix = "kraven.ui")
public class KravenUiEnhancedProperties {

    /**
     * Enable or disable Kraven UI.
     */
    private boolean enabled = true;

    /**
     * Enhanced configuration options.
     */
    private Enhanced enhanced = new Enhanced();

    /**
     * Enhanced configuration options.
     */
    @Data
    public static class Enhanced {
        /**
         * Enable or disable enhanced features.
         */
        private boolean enabled = true;
    }

    /**
     * The path where the Kraven UI will be served.
     * This is hardcoded to "/kraven/ui" and cannot be changed.
     */
    private final String path = "/kraven/ui";



    /**
     * The version of Kraven UI.
     * This is automatically set from the kraven.ui.version property.
     */
    private String version = "1.0.1";

    /**
     * The layout configuration.
     */
    private Layout layout = new Layout();

    /**
     * The theme configuration.
     */
    private Theme theme = new Theme();

    /**
     * The API documentation configuration.
     */
    private ApiDocs apiDocs = new ApiDocs();

    /**
     * The Feign client configuration.
     */
    private FeignClient feignClient = new FeignClient();

    /**
     * The Kafka management configuration.
     */
    private Kafka kafka = new Kafka();

    /**
     * The metrics configuration.
     */
    private Metrics metrics = new Metrics();

    /**
     * The business flow configuration.
     */
    private BusinessFlow businessFlow = new BusinessFlow();

    /**
     * The documentation configuration.
     */
    private Documentation documentation = new Documentation();

    /**
     * Additional configuration properties.
     * This can be used to pass custom configuration to the frontend.
     */
    private Map<String, Object> additionalProperties = new HashMap<>();

    /**
     * Get the normalized path with a leading slash.
     *
     * @return the normalized path
     */
    public String getNormalizedPath() {
        if (path == null || path.isEmpty()) {
            return "/";
        }
        return path.startsWith("/") ? path : "/" + path;
    }

    /**
     * Layout configuration options.
     */
    @Data
    public static class Layout {
        /**
         * Whether to show the sidebar by default.
         */
        private boolean showSidebar = true;

        /**
         * The default width of the middle pane in pixels.
         */
        private int middlePaneWidth = 600;

        /**
         * The default width of the right pane in pixels.
         */
        private int rightPaneWidth = 400;
    }

    /**
     * Theme configuration options.
     */
    @Data
    public static class Theme {
        /**
         * The primary color for the dark theme.
         */
        private String darkPrimaryColor = "#1976d2";

        /**
         * The secondary color for the dark theme.
         */
        private String darkSecondaryColor = "#424242";

        /**
         * The background color for the dark theme.
         */
        private String darkBackgroundColor = "#121212";

        /**
         * The primary color for the light theme.
         */
        private String lightPrimaryColor = "#1976d2";

        /**
         * The secondary color for the light theme.
         */
        private String lightSecondaryColor = "#424242";

        /**
         * The background color for the light theme.
         */
        private String lightBackgroundColor = "#ffffff";

        /**
         * @deprecated Use darkPrimaryColor or lightPrimaryColor instead.
         * @return The primary color based on the default theme
         */
        @Deprecated
        public String getPrimaryColor() {
            return "dark".equals(defaultTheme) ? darkPrimaryColor : lightPrimaryColor;
        }

        /**
         * @deprecated Use setDarkPrimaryColor and setLightPrimaryColor instead.
         * @param primaryColor The primary color to set for both themes
         */
        @Deprecated
        public void setPrimaryColor(String primaryColor) {
            this.darkPrimaryColor = primaryColor;
            this.lightPrimaryColor = primaryColor;
        }

        /**
         * @deprecated Use darkSecondaryColor or lightSecondaryColor instead.
         * @return The secondary color based on the default theme
         */
        @Deprecated
        public String getSecondaryColor() {
            return "dark".equals(defaultTheme) ? darkSecondaryColor : lightSecondaryColor;
        }

        /**
         * @deprecated Use setDarkSecondaryColor and setLightSecondaryColor instead.
         * @param secondaryColor The secondary color to set for both themes
         */
        @Deprecated
        public void setSecondaryColor(String secondaryColor) {
            this.darkSecondaryColor = secondaryColor;
            this.lightSecondaryColor = secondaryColor;
        }



        /**
         * Custom CSS file path to include.
         */
        private String customCssPath;

        /**
         * Custom JavaScript file path to include.
         */
        private String customJsPath;

        /**
         * The default theme to use (light or dark).
         */
        private String defaultTheme = "dark";

        /**
         * Whether to respect the user's system preference for light/dark mode.
         */
        private boolean respectSystemPreference = true;
    }

    /**
     * API documentation configuration options.
     */
    @Data
    public static class ApiDocs {
        /**
         * Enable or disable API documentation.
         */
        private boolean enabled = true;

        /**
         * The path to the OpenAPI specification.
         */
        private String specPath = "/v3/api-docs";

        /**
         * Whether to enable the try-it-out feature.
         */
        private boolean tryItOutEnabled = true;


    }

    /**
     * Feign client configuration options.
     */
    @Data
    public static class FeignClient {
        /**
         * Enable or disable Feign client scanning.
         */
        private boolean enabled = true;

        /**
         * The base packages to scan for Feign clients.
         */
        private String[] basePackages = {"io.github", "com", "org", "net"};

        /**
         * The API path for Feign client endpoints.
         */
        private String apiPath = "/kraven/v1/feign-clients";

        /**
         * Whether to enable the try-it-out feature for Feign clients.
         */
        private boolean tryItOutEnabled = true;

        /**
         * Whether to cache Feign client metadata.
         */
        private boolean cacheMetadata = true;

        /**
         * The scan interval in milliseconds for refreshing Feign client metadata.
         * Set to 0 to disable automatic refreshing.
         */
        private long scanIntervalMs = 0;
    }

    /**
     * Kafka management configuration options.
     */
    @Data
    public static class Kafka {
        /**
         * Enable or disable Kafka management features.
         */
        private boolean enabled = true;

        /**
         * The base packages to scan for Kafka listeners.
         */
        private String[] basePackages = {"io.github", "com", "org", "net"};

        /**
         * The API path for Kafka management endpoints.
         */
        private String apiPath = "/kraven/api/kraven-kafka-management";

        /**
         * The maximum number of messages to retrieve per request.
         */
        private int messageLimit = 100;

        /**
         * Whether to enable live streaming of messages.
         */
        private boolean streamingEnabled = true;

        /**
         * The timeout in milliseconds for SSE connections.
         */
        private long sseTimeoutMs = 300000; // 5 minutes

        /**
         * Whether to enable message production.
         */
        private boolean messageProductionEnabled = true;

        /**
         * Whether to enable message consumption.
         */
        private boolean messageConsumptionEnabled = true;

        /**
         * Whether to enable topic management (create, delete, etc.).
         */
        private boolean topicManagementEnabled = false;
    }

    /**
     * Metrics configuration options.
     */
    @Data
    public static class Metrics {
        /**
         * Enable or disable metrics collection.
         */
        private boolean enabled = true;

        /**
         * The API path for metrics endpoints.
         */
        private String apiPath = "/kraven/api/metrics";

        /**
         * Whether to enable JVM metrics.
         */
        private boolean jvmMetricsEnabled = true;

        /**
         * Whether to enable Spring metrics.
         */
        private boolean springMetricsEnabled = true;

        /**
         * Whether to enable Kafka metrics.
         */
        private boolean kafkaMetricsEnabled = true;

        /**
         * Whether to enable Feign client metrics.
         */
        private boolean feignMetricsEnabled = true;

        /**
         * The refresh interval in milliseconds for metrics.
         */
        private long refreshIntervalMs = 5000;

        /**
         * Whether to enable auto-refresh of metrics.
         */
        private boolean autoRefreshEnabled = false;

        /**
         * Whether to enable thread dump generation.
         */
        private boolean threadDumpEnabled = true;

        /**
         * Whether to enable heap dump generation.
         */
        private boolean heapDumpEnabled = false;
    }

    /**
     * Business flow configuration options.
     */
    @Data
    public static class BusinessFlow {
        /**
         * Enable or disable business flow features.
         */
        private boolean enabled = true;

        /**
         * The base packages to scan for KravenTag annotations.
         */
        private String[] basePackages = {"io.github", "com", "org", "net"};

        /**
         * The API path for business flow endpoints.
         */
        private String apiPath = "/kraven/v1/business-flows";

        /**
         * Whether to enable auto-refresh of business flow data.
         */
        private boolean autoRefreshEnabled = false;

        /**
         * The refresh interval in milliseconds for business flow data.
         * Set to 0 to disable automatic refreshing.
         */
        private long refreshIntervalMs = 0;

        /**
         * Whether to show detailed method information in the UI.
         */
        private boolean showDetailedMethodInfo = true;
    }

    /**
     * Documentation configuration options.
     */
    @Data
    public static class Documentation {
        /**
         * Enable or disable documentation features.
         */
        private boolean enabled = true;

        /**
         * The path to the documentation files.
         * Default is classpath:kraven-docs/
         */
        private String path = "";

        /**
         * The API path for documentation endpoints.
         */
        private String apiPath = "/kraven/v1/documentation";

        /**
         * Whether to enable Mermaid diagram support.
         */
        private boolean mermaidEnabled = true;

        /**
         * Whether to enable syntax highlighting for code blocks.
         */
        private boolean syntaxHighlightingEnabled = true;

        /**
         * Whether to enable business flow tag support in documentation.
         */
        private boolean businessFlowTagsEnabled = true;

        /**
         * Whether to enable auto-refresh of documentation.
         */
        private boolean autoRefreshEnabled = false;

        /**
         * The refresh interval in milliseconds for documentation.
         * Set to 0 to disable automatic refreshing.
         */
        private long refreshIntervalMs = 0;
    }
}
