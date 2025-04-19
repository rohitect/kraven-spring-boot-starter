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
     */
    private String path = "/kraven";

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
     * The version of Kraven UI.
     * This is automatically set from the kraven.ui.version property.
     */
    private String version = "0.1.38";

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
         * The primary color for the UI.
         */
        private String primaryColor = "#1976d2";

        /**
         * The secondary color for the UI.
         */
        private String secondaryColor = "#424242";

        /**
         * The font family to use.
         */
        private String fontFamily = "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif";

        /**
         * Custom CSS file path to include.
         */
        private String customCssPath;

        /**
         * Custom JavaScript file path to include.
         */
        private String customJsPath;
    }
}
