package io.github.rohitect.kraven.ui.core;

/**
 * Main entry point for the Kraven UI Core functionality.
 * This class will contain the core logic for rendering the OpenAPI specification.
 */
public class KravenUiCore {

    // Version is read from the parent POM
    private static final String VERSION = "${project.version}";

    /**
     * Get the current version of Kraven UI.
     *
     * @return the version string
     */
    public static String getVersion() {
        return VERSION;
    }
}
