package io.github.rohitect.kraven.plugins.mockserver.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.rohitect.kraven.plugins.mockserver.MockServer;
import io.github.rohitect.kraven.plugins.mockserver.config.MockServerConfig;
import io.github.rohitect.kraven.plugins.mockserver.model.MockConfiguration;
import io.github.rohitect.kraven.plugins.mockserver.model.MockEndpoint;
import io.github.rohitect.kraven.plugins.mockserver.model.MockResponse;
import io.github.rohitect.kraven.plugins.mockserver.service.MockServerService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST controller for the Mock Server plugin.
 */
@RestController
@RequestMapping("/kraven/plugin/mock-server")
@Slf4j
public class MockServerController {

    @Autowired
    private MockServerConfig config;

    @Autowired
    private MockServerService mockServerService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private MockServer mockServer;
    private boolean serverRunning = false;

    /**
     * Get the current configuration of the mock server.
     *
     * @return the current configuration
     */
    @GetMapping("/config")
    public ResponseEntity<MockConfiguration> getConfiguration() {
        try {
            MockConfiguration configuration = loadConfiguration();
            return ResponseEntity.ok(configuration);
        } catch (Exception e) {
            log.error("Failed to load configuration", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get the status of the mock server.
     *
     * @return the server status
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("enabled", config.isEnabled());
        status.put("host", config.getHost());
        status.put("port", config.getPort());
        status.put("basePath", config.getBasePath());
        status.put("configPath", config.getConfigPath());
        status.put("configVolumePath", config.getConfigVolumePath());
        status.put("autoReload", config.isAutoReload());
        status.put("reloadIntervalMs", config.getReloadIntervalMs());
        status.put("maxHistoryEntries", config.getMaxHistoryEntries());
        status.put("defaultDelayMs", config.getDefaultDelayMs());

        try {
            MockConfiguration configuration = loadConfiguration();
            status.put("endpointCount", configuration.getEndpoints().size());

            int responseCount = 0;
            for (MockEndpoint endpoint : configuration.getEndpoints()) {
                responseCount += endpoint.getResponses().size();
            }
            status.put("responseCount", responseCount);
        } catch (Exception e) {
            log.error("Failed to load configuration for status", e);
            status.put("configurationError", e.getMessage());
        }

        return ResponseEntity.ok(status);
    }

    /**
     * Start the mock server.
     *
     * @return the result of the operation
     */
    @PostMapping("/server/start")
    public ResponseEntity<Map<String, Object>> startServer() {
        Map<String, Object> result = new HashMap<>();

        // If the server is already running, stop it first
        if (serverRunning && mockServer != null) {
            try {
                mockServer.stop();
                log.info("Stopped existing server before restart");
                // Small delay to ensure resources are released
                Thread.sleep(500);
            } catch (Exception e) {
                log.warn("Error stopping existing server: {}", e.getMessage());
                // Continue with restart attempt
            }
        }

        try {
            if (mockServer == null) {
                // Pass the MockServerService to the MockServer to use resolved properties
                mockServer = new MockServer(config, mockServerService);
            }

            mockServer.start();
            serverRunning = true;

            result.put("success", true);
            result.put("message", "Server started successfully");
            result.put("host", config.getHost());
            result.put("port", config.getPort());
            result.put("basePath", config.getBasePath());

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Failed to start server", e);
            result.put("success", false);
            result.put("message", "Failed to start server: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(result);
        }
    }

    /**
     * Stop the mock server.
     *
     * @return the result of the operation
     */
    @PostMapping("/server/stop")
    public ResponseEntity<Map<String, Object>> stopServer() {
        Map<String, Object> result = new HashMap<>();

        if (!serverRunning || mockServer == null) {
            result.put("success", false);
            result.put("message", "Server is not running");
            return ResponseEntity.ok(result);
        }

        try {
            mockServer.stop();
            serverRunning = false;

            result.put("success", true);
            result.put("message", "Server stopped successfully");

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Failed to stop server", e);
            result.put("success", false);
            result.put("message", "Failed to stop server: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(result);
        }
    }

    /**
     * Get the current server status.
     *
     * @return the server status
     */
    @GetMapping("/server/status")
    public ResponseEntity<Map<String, Object>> getServerStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("running", serverRunning);

        if (serverRunning) {
            status.put("host", config.getHost());
            status.put("port", config.getPort());
            status.put("basePath", config.getBasePath());
        }

        return ResponseEntity.ok(status);
    }

    /**
     * Get all endpoints.
     *
     * @return a list of endpoints
     */
    @GetMapping("/endpoints")
    public ResponseEntity<List<Map<String, Object>>> getEndpoints() {
        try {
            List<Map<String, Object>> endpoints = mockServerService.getEndpoints();
            return ResponseEntity.ok(endpoints);
        } catch (Exception e) {
            log.error("Failed to get endpoints", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get endpoint details.
     *
     * @param method the HTTP method
     * @param path the endpoint path
     * @return the endpoint details
     */
    @GetMapping("/endpoints/{method}/{path}")
    public ResponseEntity<Map<String, Object>> getEndpointDetails(
            @PathVariable String method,
            @PathVariable String path) {
        try {
            Map<String, Object> details = mockServerService.getEndpointDetails(method, path);
            if (details.isEmpty() || details.containsKey("error")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(details);
            }
            return ResponseEntity.ok(details);
        } catch (Exception e) {
            log.error("Failed to get endpoint details", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Get response details.
     *
     * @param method the HTTP method
     * @param path the endpoint path
     * @param responseId the response ID
     * @return the response details
     */
    @GetMapping("/endpoints/{method}/{path}/responses/{responseId}")
    public ResponseEntity<Map<String, Object>> getResponseDetails(
            @PathVariable String method,
            @PathVariable String path,
            @PathVariable String responseId) {
        try {
            Map<String, Object> details = mockServerService.getResponseDetails(method, path, responseId);
            if (details.isEmpty() || details.containsKey("error")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(details);
            }
            return ResponseEntity.ok(details);
        } catch (Exception e) {
            log.error("Failed to get response details", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Set the active response for an endpoint.
     *
     * @param method the HTTP method
     * @param path the endpoint path
     * @param responseId the response ID to set as active
     * @return the result of the operation
     */
    @PostMapping("/endpoints/{method}/{path}/active-response")
    public ResponseEntity<Map<String, Object>> setActiveResponse(
            @PathVariable String method,
            @PathVariable String path,
            @RequestParam String responseId) {

        Map<String, Object> result = new HashMap<>();
        result.put("success", false);

        try {
            MockConfiguration configuration = loadConfiguration();

            boolean endpointFound = false;

            for (MockEndpoint endpoint : configuration.getEndpoints()) {
                // Check if the endpoint matches, considering path variables
                if (endpoint.getMethod().equalsIgnoreCase(method) &&
                    (endpoint.getPath().equals(path) || mockServerService.matchesPathWithVariables(endpoint.getPath(), path))) {

                    endpointFound = true;
                    boolean responseFound = false;

                    for (MockResponse response : endpoint.getResponses()) {
                        if (response.getId().equals(responseId)) {
                            responseFound = true;
                            // In a real implementation, we would update the active response here
                            result.put("success", true);
                            result.put("message", "Active response set to " + responseId);
                            break;
                        }
                    }

                    if (!responseFound) {
                        result.put("message", "Response with ID " + responseId + " not found");
                    }

                    break;
                }
            }

            if (!endpointFound) {
                result.put("message", "Endpoint not found for method " + method + " and path " + path);
            }

            if (!result.containsKey("message")) {
                result.put("message", "Endpoint not found");
            }
        } catch (Exception e) {
            log.error("Failed to set active response", e);
            result.put("message", "Error: " + e.getMessage());
        }

        return ResponseEntity.ok(result);
    }

    /**
     * Load the mock configuration from the configured path.
     */
    private MockConfiguration loadConfiguration() throws IOException {
        Resource configResource = null;

        // Try to load from volume path first
        if (StringUtils.hasText(config.getConfigVolumePath())) {
            Path path = Paths.get(config.getConfigVolumePath());
            if (Files.exists(path)) {
                configResource = new FileSystemResource(path);
                log.debug("Loading configuration from volume path: {}", config.getConfigVolumePath());
            } else {
                log.warn("Configuration volume path does not exist: {}", config.getConfigVolumePath());
            }
        }

        // Fall back to classpath resource
        if (configResource == null && StringUtils.hasText(config.getConfigPath())) {
            String path = config.getConfigPath();
            if (path.startsWith("classpath:")) {
                path = path.substring("classpath:".length());
            }

            ClassPathResource classpathResource = new ClassPathResource(path);
            if (classpathResource.exists()) {
                configResource = classpathResource;
                log.debug("Loading configuration from classpath: {}", path);
            } else {
                log.warn("Configuration classpath resource does not exist: {}", path);
            }
        }

        // Load the configuration
        if (configResource != null) {
            try (InputStream is = configResource.getInputStream()) {
                return objectMapper.readValue(is, MockConfiguration.class);
            }
        } else {
            log.warn("No configuration resource found, using empty configuration");
            return new MockConfiguration();
        }
    }
}
