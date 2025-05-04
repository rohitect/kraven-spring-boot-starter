package io.github.rohitect.kraven.plugins.mockserver.config;

import lombok.Data;

/**
 * Configuration properties for the Mock Server plugin.
 */
@Data
public class MockServerConfig {

    /**
     * Enable or disable the mock server plugin.
     */
    private boolean enabled = true;

    /**
     * Auto-start the mock server when the plugin starts.
     * If false, the server must be started manually from the UI.
     */
    private boolean autoStart = false;

    /**
     * The port to run the mock server on.
     */
    private int port = 11000;

    /**
     * The host to bind the mock server to.
     */
    private String host = "localhost";

    /**
     * The base path for the mock server.
     */
    private String basePath;

    /**
     * The path to the mock configuration file.
     * Can be a classpath resource or a file system path.
     */
    private String configPath = "classpath:mock-server/config.json";

    /**
     * The path to the mock configuration file on the file system.
     * Takes precedence over configPath if both are specified.
     */
    private String configVolumePath;

    /**
     * Whether to automatically reload the configuration when it changes.
     */
    private boolean autoReload = true;

    /**
     * The interval in milliseconds to check for configuration changes.
     */
    private int reloadIntervalMs = 5000;

    /**
     * The maximum number of history entries to keep.
     */
    private int maxHistoryEntries = 100;

    /**
     * The default delay in milliseconds to apply to all responses.
     */
    private int defaultDelayMs = 0;
}
