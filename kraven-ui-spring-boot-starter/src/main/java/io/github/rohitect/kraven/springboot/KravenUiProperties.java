package io.github.rohitect.kraven.springboot;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuration properties for Kraven UI.
 */
@Data
@ConfigurationProperties(prefix = "kraven.ui")
public class KravenUiProperties {

    /**
     * Enable or disable Kraven UI.
     */
    private boolean enabled = true;

    /**
     * The path where the Kraven UI will be served.
     * This is hardcoded to "/kraven/ui" and cannot be changed.
     */
    private final String path = "/kraven/ui";



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
     * The layout configuration.
     */
    private Layout layout = new Layout();

    /**
     * The theme configuration.
     */
    private Theme theme = new Theme();

    /**
     * The Feign client configuration.
     */
    private FeignClientConfig feignClient = new FeignClientConfig();

    /**
     * The Kafka configuration.
     */
    private KafkaConfig kafka = new KafkaConfig();

    /**
     * The Business Flow configuration.
     */
    private BusinessFlowConfig businessFlow = new BusinessFlowConfig();

    /**
     * The Plugin system configuration.
     */
    private PluginsConfig plugins = new PluginsConfig();

    /**
     * Plugin system configuration options.
     */
    @Data
    public static class PluginsConfig {
        /**
         * Enable or disable the plugin system.
         */
        private boolean enabled = true;

        /**
         * Enable or disable auto-discovery of plugins.
         */
        private boolean autoDiscovery = true;

        /**
         * The base packages to scan for plugins.
         */
        private String[] basePackages = {"io.github", "com", "org", "net"};
    }

    /**
     * The version of Kraven UI.
     * This is automatically set from the kraven.ui.version property.
     */
    private String version = "1.0.6";

    /**
     * Layout configuration options.
     */
    @Data
    public static class Layout {
        /**
         * The layout type to use.
         * Possible values: three-pane, two-pane, single-pane
         */
        private String type = "three-pane";
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
         * Kept for backward compatibility.
         */
        @Deprecated
        private String primaryColor = "#1976d2";

        /**
         * @deprecated Use darkSecondaryColor or lightSecondaryColor instead.
         * Kept for backward compatibility.
         */
        @Deprecated
        private String secondaryColor = "#424242";



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
     * Feign client configuration options.
     */
    @Data
    public static class FeignClientConfig {
        /**
         * Enable or disable Feign client scanning.
         */
        private boolean enabled = true;

        /**
         * The base packages to scan for Feign clients.
         */
        private String[] basePackages = {"io.github", "com", "org", "net"};
    }

    /**
     * Kafka configuration options.
     */
    @Data
    public static class KafkaConfig {
        /**
         * Enable or disable Kafka management features.
         */
        private boolean enabled = true;

        /**
         * The base packages to scan for Kafka listeners.
         */
        private String[] basePackages = {"io.github", "com", "org", "net"};
    }

    /**
     * Business flow configuration options.
     */
    @Data
    public static class BusinessFlowConfig {
        /**
         * Enable or disable business flow features.
         */
        private boolean enabled = true;

        /**
         * The base packages to scan for KravenTag annotations.
         */
        private String[] basePackages = {"io.github", "com", "org", "net"};
    }
}
