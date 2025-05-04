package io.github.rohitect.kraven.plugins.mockserver.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.rohitect.kraven.plugins.mockserver.config.MockServerConfig;
import io.github.rohitect.kraven.plugins.mockserver.model.MockConfiguration;
import io.github.rohitect.kraven.plugins.mockserver.model.MockEndpoint;
import io.github.rohitect.kraven.plugins.mockserver.model.MockResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
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

/**
 * Service for the Mock Server plugin.
 */
@Service
@Slf4j
public class MockServerService {

    @Autowired
    private MockServerConfig config;

    @Autowired
    private Environment environment;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Get all endpoints from the configuration.
     *
     * @return a list of endpoints
     */
    public List<Map<String, Object>> getEndpoints() {
        List<Map<String, Object>> result = new ArrayList<>();

        try {
            MockConfiguration configuration = loadConfiguration();

            for (MockEndpoint endpoint : configuration.getEndpoints()) {
                Map<String, Object> endpointMap = new HashMap<>();
                endpointMap.put("method", endpoint.getMethod());
                endpointMap.put("path", endpoint.getPath());

                // Include the original path if it exists and is different from the resolved path
                if (endpoint.getOriginalPath() != null && !endpoint.getOriginalPath().equals(endpoint.getPath())) {
                    endpointMap.put("originalPath", endpoint.getOriginalPath());
                }

                endpointMap.put("responseType", endpoint.getResponseType());

                List<Map<String, Object>> responses = new ArrayList<>();
                for (MockResponse response : endpoint.getResponses()) {
                    Map<String, Object> responseMap = new HashMap<>();
                    responseMap.put("id", response.getId());
                    responseMap.put("isDefault", response.isDefault());
                    responseMap.put("status", response.getStatus());
                    responseMap.put("description", response.getDescription());
                    responses.add(responseMap);
                }

                endpointMap.put("responses", responses);
                result.add(endpointMap);
            }
        } catch (Exception e) {
            log.error("Failed to get endpoints", e);
        }

        return result;
    }

    /**
     * Get details for a specific endpoint.
     *
     * @param method the HTTP method
     * @param path the endpoint path
     * @return the endpoint details
     */
    public Map<String, Object> getEndpointDetails(String method, String path) {
        Map<String, Object> result = new HashMap<>();

        try {
            MockConfiguration configuration = loadConfiguration();

            for (MockEndpoint endpoint : configuration.getEndpoints()) {
                // Check if the path contains ${} variables and try to match
                if (endpoint.getMethod().equalsIgnoreCase(method) &&
                    (endpoint.getPath().equals(path) || matchesPathWithVariables(endpoint.getPath(), path))) {
                    result.put("method", endpoint.getMethod());
                    result.put("path", endpoint.getPath());

                    // Include the original path if it exists and is different from the resolved path
                    if (endpoint.getOriginalPath() != null && !endpoint.getOriginalPath().equals(endpoint.getPath())) {
                        result.put("originalPath", endpoint.getOriginalPath());
                    }

                    result.put("responseType", endpoint.getResponseType());

                    List<Map<String, Object>> responses = new ArrayList<>();
                    for (MockResponse response : endpoint.getResponses()) {
                        Map<String, Object> responseMap = new HashMap<>();
                        responseMap.put("id", response.getId());
                        responseMap.put("isDefault", response.isDefault());
                        responseMap.put("status", response.getStatus());
                        responseMap.put("description", response.getDescription());
                        responseMap.put("headers", response.getHeaders());
                        responseMap.put("body", response.getBody());
                        responseMap.put("bodyTemplate", response.getBodyTemplate());
                        responseMap.put("bodyTemplateEngine", response.getBodyTemplateEngine());
                        responseMap.put("delay", response.getDelay());
                        responseMap.put("tags", response.getTags());
                        responseMap.put("category", response.getCategory());
                        responses.add(responseMap);
                    }

                    result.put("responses", responses);
                    break;
                }
            }
        } catch (Exception e) {
            log.error("Failed to get endpoint details", e);
            result.put("error", e.getMessage());
        }

        return result;
    }

    /**
     * Get the response details for a specific endpoint and response ID.
     *
     * @param method the HTTP method
     * @param path the endpoint path
     * @param responseId the response ID
     * @return the response details
     */
    public Map<String, Object> getResponseDetails(String method, String path, String responseId) {
        Map<String, Object> result = new HashMap<>();

        try {
            MockConfiguration configuration = loadConfiguration();

            for (MockEndpoint endpoint : configuration.getEndpoints()) {
                if (endpoint.getMethod().equalsIgnoreCase(method) &&
                    (endpoint.getPath().equals(path) || matchesPathWithVariables(endpoint.getPath(), path))) {
                    for (MockResponse response : endpoint.getResponses()) {
                        if (response.getId().equals(responseId)) {
                            result.put("id", response.getId());
                            result.put("isDefault", response.isDefault());
                            result.put("status", response.getStatus());
                            result.put("description", response.getDescription());
                            result.put("headers", response.getHeaders());
                            result.put("body", response.getBody());
                            result.put("bodyTemplate", response.getBodyTemplate());
                            result.put("bodyTemplateEngine", response.getBodyTemplateEngine());
                            result.put("delay", response.getDelay());
                            result.put("tags", response.getTags());
                            result.put("category", response.getCategory());
                            break;
                        }
                    }
                    break;
                }
            }
        } catch (Exception e) {
            log.error("Failed to get response details", e);
            result.put("error", e.getMessage());
        }

        return result;
    }

    /**
     * Check if a path with variables matches an actual path
     *
     * @param templatePath the path with potential ${} variables
     * @param actualPath the actual path to match against
     * @return true if the paths match, false otherwise
     */
    public boolean matchesPathWithVariables(String templatePath, String actualPath) {
        // If the template doesn't contain variables, use exact matching
        if (!templatePath.contains("${")) {
            return templatePath.equals(actualPath);
        }

        // Handle leading and trailing slashes consistently
        String normalizedTemplatePath = normalizePathSlashes(templatePath);
        String normalizedActualPath = normalizePathSlashes(actualPath);

        // Convert template path to regex pattern
        String[] templateSegments = normalizedTemplatePath.split("/");
        String[] actualSegments = normalizedActualPath.split("/");

        // If segment count doesn't match, paths don't match
        if (templateSegments.length != actualSegments.length) {
            return false;
        }

        // Check each segment
        for (int i = 0; i < templateSegments.length; i++) {
            String templateSegment = templateSegments[i];
            String actualSegment = actualSegments[i];

            // If this segment contains a variable, it matches any value
            if (templateSegment.contains("${") && templateSegment.contains("}")) {
                // It's a variable segment, so it matches anything
                continue;
            } else if (!templateSegment.equals(actualSegment)) {
                // Not a variable and doesn't match exactly
                return false;
            }
        }

        // All segments matched
        return true;
    }

    /**
     * Normalize path slashes to ensure consistent matching
     */
    private String normalizePathSlashes(String path) {
        // Remove leading slash if present
        if (path.startsWith("/")) {
            path = path.substring(1);
        }

        // Remove trailing slash if present
        if (path.endsWith("/") && path.length() > 1) {
            path = path.substring(0, path.length() - 1);
        }

        return path;
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
                MockConfiguration configuration = objectMapper.readValue(is, MockConfiguration.class);

                // Process the configuration to resolve Spring Boot properties in paths
                processConfigurationPaths(configuration);

                return configuration;
            }
        } else {
            log.warn("No configuration resource found, using empty configuration");
            return new MockConfiguration();
        }
    }

    /**
     * Process the configuration to resolve Spring Boot properties in paths
     *
     * @param configuration the configuration to process
     */
    private void processConfigurationPaths(MockConfiguration configuration) {
        if (configuration == null || configuration.getEndpoints() == null) {
            return;
        }

        for (MockEndpoint endpoint : configuration.getEndpoints()) {
            if (endpoint.getPath() != null && endpoint.getPath().contains("${")) {
                String originalPath = endpoint.getPath();
                String resolvedPath = resolvePropertyPlaceholders(originalPath);

                // Store the original path for reference
                endpoint.setOriginalPath(originalPath);

                // Update the path with the resolved value
                if (!originalPath.equals(resolvedPath)) {
                    log.debug("Resolved path from '{}' to '{}'", originalPath, resolvedPath);
                    endpoint.setPath(resolvedPath);
                }
            }
        }
    }

    /**
     * Resolve Spring Boot property placeholders in a string
     *
     * @param text the text containing property placeholders
     * @return the text with resolved property values
     */
    private String resolvePropertyPlaceholders(String text) {
        if (text == null || !text.contains("${")) {
            return text;
        }

        StringBuilder result = new StringBuilder();
        int startIndex = 0;
        int placeholderStart;
        int placeholderEnd;

        while ((placeholderStart = text.indexOf("${", startIndex)) != -1) {
            // Append text before the placeholder
            result.append(text, startIndex, placeholderStart);

            // Find the end of the placeholder
            placeholderEnd = text.indexOf("}", placeholderStart);
            if (placeholderEnd == -1) {
                // No closing brace, just append the rest and break
                result.append(text.substring(placeholderStart));
                break;
            }

            // Extract the property key
            String propertyKey = text.substring(placeholderStart + 2, placeholderEnd);

            // Resolve the property value
            String propertyValue = environment.getProperty(propertyKey);

            if (propertyValue != null) {
                // Append the resolved value
                result.append(propertyValue);
                log.debug("Resolved property '{}' to '{}'", propertyKey, propertyValue);
            } else {
                // Property not found, keep the placeholder
                result.append("${").append(propertyKey).append("}");
                log.debug("Could not resolve property '{}', keeping placeholder", propertyKey);
            }

            // Move past this placeholder
            startIndex = placeholderEnd + 1;
        }

        // Append any remaining text
        if (startIndex < text.length()) {
            result.append(text.substring(startIndex));
        }

        return result.toString();
    }
}
