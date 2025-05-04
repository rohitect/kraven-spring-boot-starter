package io.github.rohitect.kraven.plugins.mockserver;

import io.github.rohitect.kraven.plugin.KravenPlugin;
import io.github.rohitect.kraven.plugin.KravenUIPlugin;
import io.github.rohitect.kraven.plugin.NavigationItem;
import io.github.rohitect.kraven.plugin.PluginContext;
import io.github.rohitect.kraven.plugins.mockserver.config.MockServerConfig;
import io.github.rohitect.kraven.plugins.mockserver.controller.MockServerController;
import io.github.rohitect.kraven.plugins.mockserver.service.MockServerService;
import lombok.extern.slf4j.Slf4j;

/**
 * Mock Server plugin for Kraven UI.
 * This plugin provides a configurable mock server for integration testing.
 */
@KravenPlugin(
    id = "mock-server",
    name = "Mock Server",
    version = "1.0.0",
    description = "Mock server for integration testing",
    provider = "Rohitect"
)
@Slf4j
public class MockServerPlugin implements KravenUIPlugin {

    private MockServerConfig config;
    private MockServer mockServer;

    @Override
    public String getId() {
        return "mock-server";
    }

    @Override
    public String getName() {
        return "Mock Server";
    }

    @Override
    public String getVersion() {
        return "1.0.0";
    }

    @Override
    public void initialize(PluginContext context) {
        log.info("Initializing Mock Server Plugin");

        // Get plugin configuration
        config = context.getConfiguration(MockServerConfig.class);
        log.debug("Mock Server Plugin configuration: {}", config);

        if (!config.isEnabled()) {
            log.info("Mock Server Plugin is disabled");
            return;
        }

        // Register navigation item
        context.registerNavigationItem(
            NavigationItem.builder()
                .id("mock-server")
                .label("Mock Server")
                .build()
        );

        // Register configuration as a bean
        context.registerService(config);

        // Register controllers
        context.registerController(new MockServerController());

        // Register services
        context.registerService(new MockServerService());

        log.info("Mock Server Plugin initialized successfully");
    }

    @Override
    public void start() {
        log.info("Starting Mock Server Plugin");

        if (!config.isEnabled()) {
            log.info("Mock Server Plugin is disabled, not starting server");
            return;
        }

        // Create the mock server instance
        mockServer = new MockServer(config);

        // Only auto-start the server if configured to do so
        if (config.isAutoStart()) {
            try {
                log.info("Auto-starting Mock Server as configured");
                mockServer.start();
                log.info("Mock Server started successfully on {}:{}", config.getHost(), config.getPort());
            } catch (Exception e) {
                log.error("Failed to auto-start Mock Server", e);
            }
        } else {
            log.info("Mock Server created but not started (auto-start is disabled)");
            log.info("The server can be started from the UI or by setting kraven.ui.plugin.mock-server.auto-start=true");
        }
    }

    @Override
    public void stop() {
        log.info("Stopping Mock Server Plugin");

        if (mockServer != null) {
            try {
                mockServer.stop();
                log.info("Mock Server stopped successfully");
            } catch (Exception e) {
                log.error("Failed to stop Mock Server", e);
            }
        }
    }
}
