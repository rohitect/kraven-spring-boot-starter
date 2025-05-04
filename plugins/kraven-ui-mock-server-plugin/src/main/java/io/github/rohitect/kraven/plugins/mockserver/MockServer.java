package io.github.rohitect.kraven.plugins.mockserver;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.rohitect.kraven.plugins.mockserver.config.MockServerConfig;
import io.github.rohitect.kraven.plugins.mockserver.model.MockConfiguration;
import io.github.rohitect.kraven.plugins.mockserver.model.MockEndpoint;
import io.github.rohitect.kraven.plugins.mockserver.model.MockResponse;
import io.github.rohitect.kraven.plugins.mockserver.service.DelayService;
import io.github.rohitect.kraven.plugins.mockserver.service.MockServerService;
import io.undertow.Undertow;
import io.undertow.server.HttpHandler;
import io.undertow.server.HttpServerExchange;
import io.undertow.server.RoutingHandler;
import io.undertow.server.handlers.PathHandler;
import io.undertow.util.Headers;
import io.undertow.util.HttpString;
import io.undertow.util.Methods;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/**
 * The main Mock Server implementation.
 * This class manages the Undertow server and handles request routing.
 */
@Slf4j
public class MockServer {

    private final MockServerConfig config;
    private final ObjectMapper objectMapper;
    private final AtomicReference<MockConfiguration> mockConfiguration;
    private final Map<String, Map<String, MockResponse>> activeResponses;
    private ScheduledExecutorService scheduler;
    private final MockServerService mockServerService;
    private DelayService delayService;

    private Undertow server;
    private long lastConfigModified = 0;
    private boolean isShutdown = false;

    /**
     * Create a new MockServer with the given configuration.
     *
     * @param config the server configuration
     */
    public MockServer(MockServerConfig config) {
        this(config, null);
    }

    /**
     * Create a new MockServer with the given configuration and services.
     *
     * @param config the server configuration
     * @param mockServerService the mock server service
     * @param delayService the delay service
     */
    public MockServer(MockServerConfig config, MockServerService mockServerService, DelayService delayService) {
        this.config = config;
        this.mockServerService = mockServerService;
        this.delayService = delayService;
        this.objectMapper = new ObjectMapper();
        this.mockConfiguration = new AtomicReference<>(new MockConfiguration());
        this.activeResponses = new ConcurrentHashMap<>();
        this.scheduler = Executors.newScheduledThreadPool(1);
        this.isShutdown = false;
    }

    /**
     * Create a new MockServer with the given configuration and service.
     *
     * @param config the server configuration
     * @param mockServerService the mock server service
     */
    public MockServer(MockServerConfig config, MockServerService mockServerService) {
        this(config, mockServerService, null);
    }

    /**
     * Start the mock server.
     */
    public void start() {
        try {
            // Check if the scheduler has been shut down and recreate it if necessary
            if (isShutdown || scheduler.isShutdown() || scheduler.isTerminated()) {
                log.info("Recreating scheduler as it was previously shut down");
                scheduler = Executors.newScheduledThreadPool(1);
                isShutdown = false;
            }

            // Load the initial configuration
            loadConfiguration();

            // Create the routing handler
            RoutingHandler routingHandler = new RoutingHandler();

            // Add a default handler for the root path
            routingHandler.get("/", this::handleRootRequest);

            // Register all endpoints from the configuration
            registerEndpoints(routingHandler);

            // Create and start the server with the appropriate handler
            String basePath = config.getBasePath();

            if (StringUtils.hasText(basePath)) {
                // If a base path is specified, use a path handler
                PathHandler pathHandler = new PathHandler();
                pathHandler.addPrefixPath(basePath, routingHandler);

                server = Undertow.builder()
                        .addHttpListener(config.getPort(), config.getHost())
                        .setHandler(pathHandler)
                        .build();

                log.info("Using base path: {}", basePath);
            } else {
                // If no base path is specified, use the routing handler directly
                server = Undertow.builder()
                        .addHttpListener(config.getPort(), config.getHost())
                        .setHandler(routingHandler)
                        .build();

                log.info("No base path specified, using root path");
            }

            server.start();
            log.info("Mock Server started on {}:{}{}", config.getHost(), config.getPort(),
                    StringUtils.hasText(basePath) ? " with base path " + basePath : "");

            // Schedule configuration reload if enabled
            if (config.isAutoReload()) {
                try {
                    scheduler.scheduleAtFixedRate(
                            this::checkAndReloadConfiguration,
                            config.getReloadIntervalMs(),
                            config.getReloadIntervalMs(),
                            TimeUnit.MILLISECONDS
                    );
                    log.info("Configuration auto-reload enabled with interval of {}ms", config.getReloadIntervalMs());
                } catch (Exception e) {
                    log.warn("Failed to schedule configuration reload: {}", e.getMessage());
                    // Continue without auto-reload
                }
            }
        } catch (Exception e) {
            log.error("Failed to start Mock Server", e);
            throw new RuntimeException("Failed to start Mock Server", e);
        }
    }

    /**
     * Stop the mock server.
     */
    public void stop() {
        if (server != null) {
            server.stop();
            log.info("Mock Server stopped");
        }

        try {
            if (!scheduler.isShutdown()) {
                scheduler.shutdownNow();
                log.info("Configuration reload scheduler stopped");
            }
            isShutdown = true;
        } catch (Exception e) {
            log.warn("Error while shutting down scheduler: {}", e.getMessage());
            // Continue with shutdown process
        }
    }

    /**
     * Load the mock configuration from the configured path.
     */
    private void loadConfiguration() throws IOException {
        MockConfiguration configuration;

        // If we have a MockServerService, use it to load the configuration with resolved properties
        if (mockServerService != null) {
            log.info("Using MockServerService to load configuration with resolved properties");
            List<Map<String, Object>> endpoints = mockServerService.getEndpoints();
            configuration = new MockConfiguration();

            // Convert the endpoints from the service to MockEndpoint objects
            List<MockEndpoint> mockEndpoints = new ArrayList<>();
            for (Map<String, Object> endpointMap : endpoints) {
                MockEndpoint endpoint = new MockEndpoint();
                endpoint.setMethod((String) endpointMap.get("method"));
                endpoint.setPath((String) endpointMap.get("path"));

                // Store the original path if available
                if (endpointMap.containsKey("originalPath")) {
                    endpoint.setOriginalPath((String) endpointMap.get("originalPath"));
                }

                endpoint.setResponseType((String) endpointMap.get("responseType"));

                // Convert responses
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> responsesList = (List<Map<String, Object>>) endpointMap.get("responses");
                List<MockResponse> responses = new ArrayList<>();

                if (responsesList != null) {
                    for (Map<String, Object> responseMap : responsesList) {
                        MockResponse response = new MockResponse();
                        response.setId((String) responseMap.get("id"));
                        response.setDefault((Boolean) responseMap.get("isDefault"));

                        if (responseMap.containsKey("status")) {
                            response.setStatus(((Number) responseMap.get("status")).intValue());
                        }

                        response.setDescription((String) responseMap.get("description"));
                        responses.add(response);
                    }
                }

                endpoint.setResponses(responses);
                mockEndpoints.add(endpoint);
            }

            configuration.setEndpoints(mockEndpoints);

            // Update the last modified time if using a file
            if (StringUtils.hasText(config.getConfigVolumePath())) {
                Path path = Paths.get(config.getConfigVolumePath());
                if (Files.exists(path)) {
                    lastConfigModified = Files.getLastModifiedTime(path).toMillis();
                }
            }
        } else {
            // Fall back to direct loading if no service is available
            Resource configResource = null;

            // Try to load from volume path first
            if (StringUtils.hasText(config.getConfigVolumePath())) {
                Path path = Paths.get(config.getConfigVolumePath());
                if (Files.exists(path)) {
                    configResource = new FileSystemResource(path);
                    lastConfigModified = Files.getLastModifiedTime(path).toMillis();
                    log.info("Loading configuration from volume path: {}", config.getConfigVolumePath());
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
                    log.info("Loading configuration from classpath: {}", path);
                } else {
                    log.warn("Configuration classpath resource does not exist: {}", path);
                }
            }

            // Load the configuration
            if (configResource != null) {
                try (InputStream is = configResource.getInputStream()) {
                    configuration = objectMapper.readValue(is, MockConfiguration.class);
                } catch (Exception e) {
                    log.error("Failed to load configuration", e);
                    configuration = new MockConfiguration();
                }
            } else {
                log.warn("No configuration resource found, using empty configuration");
                configuration = new MockConfiguration();
            }
        }

        // Set the configuration and initialize active responses
        mockConfiguration.set(configuration);
        initializeActiveResponses(configuration);

        log.info("Configuration loaded successfully with {} endpoints",
                configuration.getEndpoints().size());
    }

    /**
     * Initialize the active responses map with default responses.
     */
    private void initializeActiveResponses(MockConfiguration configuration) {
        activeResponses.clear();

        for (MockEndpoint endpoint : configuration.getEndpoints()) {
            String key = endpoint.getMethod() + ":" + endpoint.getPath();
            Map<String, MockResponse> responses = new HashMap<>();

            for (MockResponse response : endpoint.getResponses()) {
                responses.put(response.getId(), response);
            }

            activeResponses.put(key, responses);

            // Set the default response as active
            MockResponse defaultResponse = endpoint.getDefaultResponse();
            if (defaultResponse != null) {
                log.debug("Setting default response '{}' for endpoint {}",
                        defaultResponse.getId(), key);
            }
        }
    }

    /**
     * Check if the configuration file has been modified and reload it if necessary.
     */
    private void checkAndReloadConfiguration() {
        try {
            if (StringUtils.hasText(config.getConfigVolumePath())) {
                Path path = Paths.get(config.getConfigVolumePath());
                if (Files.exists(path)) {
                    long lastModified = Files.getLastModifiedTime(path).toMillis();
                    if (lastModified > lastConfigModified) {
                        log.info("Configuration file has been modified, reloading...");
                        loadConfiguration();
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to check or reload configuration", e);
        }
    }

    /**
     * Register all endpoints from the configuration with the routing handler.
     */
    private void registerEndpoints(RoutingHandler routingHandler) {
        MockConfiguration configuration = mockConfiguration.get();

        for (MockEndpoint endpoint : configuration.getEndpoints()) {
            HttpString method = getHttpMethod(endpoint.getMethod());
            String path = endpoint.getPath();

            log.debug("Registering endpoint: {} {}", method, path);
            routingHandler.add(method, path, exchange -> handleEndpointRequest(exchange, endpoint));
        }
    }

    /**
     * Handle a request to an endpoint.
     */
    private void handleEndpointRequest(HttpServerExchange exchange, MockEndpoint endpoint) {
        String key = endpoint.getMethod() + ":" + endpoint.getPath();
        Map<String, MockResponse> responses = activeResponses.get(key);

        if (responses == null || responses.isEmpty()) {
            log.warn("No responses found for endpoint: {}", key);
            exchange.setStatusCode(404);
            exchange.getResponseHeaders().put(Headers.CONTENT_TYPE, "application/json");
            exchange.getResponseSender().send("{\"error\":\"No responses configured for this endpoint\"}");
            return;
        }

        // Check if the request matches the endpoint matchers
        if (mockServerService != null && !mockServerService.matchesRequest(exchange, endpoint)) {
            log.warn("Request does not match matchers for endpoint: {}", key);
            exchange.setStatusCode(404);
            exchange.getResponseHeaders().put(Headers.CONTENT_TYPE, "application/json");
            exchange.getResponseSender().send("{\"error\":\"Request does not match endpoint matchers\"}");
            return;
        }

        // Get the default response
        MockResponse response = endpoint.getDefaultResponse();
        if (response == null) {
            log.warn("No default response found for endpoint: {}", key);
            exchange.setStatusCode(500);
            exchange.getResponseHeaders().put(Headers.CONTENT_TYPE, "application/json");
            exchange.getResponseSender().send("{\"error\":\"No default response configured for this endpoint\"}");
            return;
        }

        // Apply delay if configured
        int delay;
        if (delayService != null) {
            // Use the delay service for advanced delay calculation
            delay = delayService.calculateDelay(response, exchange, endpoint);
        } else {
            // Fall back to simple delay calculation
            delay = response.getDelay() > 0 ? response.getDelay() : config.getDefaultDelayMs();
        }

        if (delay > 0) {
            log.debug("Applying delay of {}ms for endpoint: {}", delay, key);
            try {
                Thread.sleep(delay);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }

        // Set response status
        exchange.setStatusCode(response.getStatus());

        // Set response headers
        for (Map.Entry<String, String> header : response.getHeaders().entrySet()) {
            exchange.getResponseHeaders().put(new HttpString(header.getKey()), header.getValue());
        }

        // Set response body
        try {
            String responseBody;

            // Create template context with request data
            Map<String, Object> templateContext = createTemplateContext(exchange, endpoint);

            if (response.getBody() != null) {
                if (response.getBody() instanceof String) {
                    responseBody = (String) response.getBody();
                } else {
                    responseBody = objectMapper.writeValueAsString(response.getBody());
                }
            } else if (StringUtils.hasText(response.getBodyTemplate())) {
                // Render the template with the context
                if (mockServerService != null) {
                    try {
                        responseBody = mockServerService.renderTemplate(
                                response.getBodyTemplateEngine(),
                                response.getBodyTemplate(),
                                templateContext
                        );
                    } catch (Exception e) {
                        log.error("Failed to render template", e);
                        responseBody = response.getBodyTemplate();
                    }
                } else {
                    responseBody = response.getBodyTemplate();
                }
            } else {
                responseBody = "{}";
            }

            exchange.getResponseSender().send(responseBody);
        } catch (Exception e) {
            log.error("Failed to send response", e);
            exchange.setStatusCode(500);
            exchange.getResponseHeaders().put(Headers.CONTENT_TYPE, "application/json");
            exchange.getResponseSender().send("{\"error\":\"Failed to generate response\"}");
        }
    }

    /**
     * Create a template context with request data.
     *
     * @param exchange the HTTP server exchange
     * @param endpoint the endpoint being requested
     * @return a map of context variables for template rendering
     */
    private Map<String, Object> createTemplateContext(HttpServerExchange exchange, MockEndpoint endpoint) {
        Map<String, Object> context = new HashMap<>();

        // Add request information
        Map<String, Object> request = new HashMap<>();
        request.put("method", exchange.getRequestMethod().toString());
        request.put("path", exchange.getRequestPath());
        request.put("uri", exchange.getRequestURI());
        request.put("url", exchange.getRequestURL());

        // Add headers
        Map<String, String> headers = new HashMap<>();
        exchange.getRequestHeaders().forEach(header ->
                headers.put(header.getHeaderName().toString(), header.getFirst()));
        request.put("headers", headers);

        // Add query parameters
        Map<String, List<String>> queryParams = new HashMap<>();
        exchange.getQueryParameters().forEach((name, values) ->
                queryParams.put(name, new ArrayList<>(values)));
        request.put("queryParams", queryParams);

        // Add path variables if available
        if (mockServerService != null) {
            Map<String, String> pathVariables = mockServerService.extractPathVariables(
                    endpoint.getPath(), exchange.getRequestPath());
            request.put("pathVariables", pathVariables);
        }

        // Add timestamp and random values
        context.put("timestamp", System.currentTimeMillis());
        context.put("random", Math.random());
        context.put("uuid", java.util.UUID.randomUUID().toString());

        // Add the request to the context
        context.put("request", request);

        return context;
    }

    /**
     * Handle a request to the root path.
     */
    private void handleRootRequest(HttpServerExchange exchange) {
        exchange.getResponseHeaders().put(Headers.CONTENT_TYPE, "application/json");

        StringBuilder sb = new StringBuilder();
        sb.append("{\n");
        sb.append("  \"name\": \"Kraven UI Mock Server\",\n");
        sb.append("  \"version\": \"1.0.0\",\n");
        sb.append("  \"status\": \"running\",\n");
        sb.append("  \"endpoints\": [\n");

        MockConfiguration configuration = mockConfiguration.get();
        boolean first = true;

        for (MockEndpoint endpoint : configuration.getEndpoints()) {
            if (!first) {
                sb.append(",\n");
            }
            first = false;

            sb.append("    {\n");
            sb.append("      \"method\": \"").append(endpoint.getMethod()).append("\",\n");
            sb.append("      \"path\": \"").append(endpoint.getPath()).append("\",\n");

            // Include the original path if available
            if (endpoint.getOriginalPath() != null && !endpoint.getOriginalPath().equals(endpoint.getPath())) {
                sb.append("      \"originalPath\": \"").append(endpoint.getOriginalPath()).append("\",\n");
            }

            sb.append("      \"responses\": ").append(endpoint.getResponses().size()).append("\n");
            sb.append("    }");
        }

        sb.append("\n  ]\n");
        sb.append("}");

        exchange.getResponseSender().send(sb.toString());
    }

    /**
     * Get the HttpString for the given method name.
     */
    private HttpString getHttpMethod(String method) {
        if (method == null) {
            return Methods.GET;
        }

        switch (method.toUpperCase()) {
            case "GET":
                return Methods.GET;
            case "POST":
                return Methods.POST;
            case "PUT":
                return Methods.PUT;
            case "DELETE":
                return Methods.DELETE;
            case "PATCH":
                return Methods.PATCH;
            case "OPTIONS":
                return Methods.OPTIONS;
            case "HEAD":
                return Methods.HEAD;
            default:
                return new HttpString(method.toUpperCase());
        }
    }
}
