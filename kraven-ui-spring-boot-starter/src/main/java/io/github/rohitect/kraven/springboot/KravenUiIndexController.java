package io.github.rohitect.kraven.springboot;

import io.github.rohitect.kraven.springboot.config.KravenUiConfigurationInitializer;
import io.github.rohitect.kraven.springboot.config.KravenUiEnhancedProperties;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.GetMapping;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import jakarta.annotation.PostConstruct;

/**
 * Controller for serving the Kraven UI index.html with injected configuration.
 * This controller provides a comprehensive configuration to the frontend.
 */
@Controller
@Slf4j
public class KravenUiIndexController {

    private final KravenUiEnhancedProperties properties;
    private final KravenUiConfigurationInitializer configInitializer;

    @Value("${spring.mvc.servlet.path:}")
    private String servletPath;

    @Value("${server.servlet.context-path:}")
    private String contextPath;

    @Value("${springdoc.swagger-ui.path:}")
    private String swaggerUiPath;

    @Value("${springdoc.api-docs.path:}")
    private String apiDocsPath;

    // Map of file extensions to MIME types
    private static final Map<String, MediaType> MIME_TYPES = new HashMap<>();

    static {
        // Initialize MIME types map
        MIME_TYPES.put("html", MediaType.TEXT_HTML);
        MIME_TYPES.put("css", MediaType.valueOf("text/css"));
        MIME_TYPES.put("js", MediaType.valueOf("application/javascript"));
        MIME_TYPES.put("json", MediaType.APPLICATION_JSON);
        MIME_TYPES.put("png", MediaType.IMAGE_PNG);
        MIME_TYPES.put("jpg", MediaType.IMAGE_JPEG);
        MIME_TYPES.put("jpeg", MediaType.IMAGE_JPEG);
        MIME_TYPES.put("gif", MediaType.IMAGE_GIF);
        MIME_TYPES.put("svg", MediaType.valueOf("image/svg+xml"));
        MIME_TYPES.put("ico", MediaType.valueOf("image/x-icon"));
        MIME_TYPES.put("woff", MediaType.valueOf("font/woff"));
        MIME_TYPES.put("woff2", MediaType.valueOf("font/woff2"));
        MIME_TYPES.put("ttf", MediaType.valueOf("font/ttf"));
        MIME_TYPES.put("eot", MediaType.valueOf("application/vnd.ms-fontobject"));
    }

    @Autowired
    public KravenUiIndexController(
            KravenUiEnhancedProperties properties,
            KravenUiConfigurationInitializer configInitializer) {
        this.properties = properties;
        this.configInitializer = configInitializer;
        log.info("KravenUiIndexController initialized with path: {}", properties.getNormalizedPath());
    }

    @PostConstruct
    public void init() {
        log.info("KravenUiIndexController initialized with servlet path: {}, context path: {}",
                servletPath, contextPath);
    }

    /**
     * Handles all requests under the Kraven UI path.
     * This includes serving static files if they exist, or falling back to index.html for client-side routing.
     * Excludes API paths that start with /v1/ to allow API controllers to handle those requests.
     *
     * @param request the HTTP request
     * @return the appropriate response based on the request path
     * @throws IOException if a resource cannot be read
     */
    @GetMapping(value = "/kraven/ui/**", produces = MediaType.ALL_VALUE)
    public ResponseEntity<?> handleAllRequests(HttpServletRequest request) throws IOException {
        log.debug("KravenUiIndexController.handleAllRequests called for path: {}", request.getRequestURI());
        // Get the request path
        String path = request.getRequestURI();
        String uiPath = properties.getNormalizedPath();

        // Skip API paths to allow API controllers to handle them
        if (path.contains("/kraven/api/")) {
            log.debug("Skipping API path: {}", path);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        log.debug("Handling request for path: {}", path);
        log.debug("UI path configured as: {}", uiPath);

        // Check if the path contains the UI path
        if (!path.contains(uiPath)) {
            log.warn("Request path does not contain configured UI path. This might indicate a configuration issue.");
            // Try to handle it anyway by assuming the entire path is relative
            String relativePath = path.startsWith("/") ? path.substring(1) : path;
            log.debug("Attempting to serve as relative path: {}", relativePath);

            // If the path is empty, serve the index
            if (relativePath.isEmpty()) {
                return serveIndex();
            }

            // Otherwise, try to serve the static file
            return serveStaticFile(relativePath);
        }

        // Extract the relative path from the request path
        String relativePath = path.substring(path.indexOf(uiPath) + uiPath.length());
        if (relativePath.startsWith("/")) {
            relativePath = relativePath.substring(1);
        }

        log.debug("Relative path: {}", relativePath);

        // If the path is empty or just the UI path, serve the index
        if (relativePath.isEmpty() || relativePath.equals("/")) {
            return serveIndex();
        }

        // Otherwise, try to serve the static file
        return serveStaticFile(relativePath);
    }

    /**
     * Serves the index.html file with injected configuration.
     *
     * @return the index.html file with injected configuration
     * @throws IOException if the file cannot be read
     */
    private ResponseEntity<?> serveIndex() throws IOException {
        log.debug("Serving index.html");

        Resource resource = null;
        String resourcePath = null;

        // Locations to check, in order of preference
        List<String> locationsList = new ArrayList<>();

        // Prioritize webjar resources
        locationsList.add("/META-INF/resources/webjars/kraven-ui/" + properties.getVersion() + "/index.html");
        locationsList.add("/static/index.html");
        locationsList.add("/kraven-ui-frontend/dist/kraven-ui-frontend/browser/index.html");

        String[] locations = locationsList.toArray(new String[0]);

        // Try each location until we find the resource
        for (String location : locations) {
            resourcePath = location;
            resource = new ClassPathResource(resourcePath);
            if (resource.exists()) {
                log.debug("Found index.html at: {}", resourcePath);
                break;
            }
        }

        // If we couldn't find the resource, return an error
        if (resource == null || !resource.exists()) {
            log.error("Could not find index.html in any of the expected locations");

            // Build a helpful error message
            StringBuilder locationsChecked = new StringBuilder();
            for (String location : locations) {
                locationsChecked.append("- ").append(location).append("\n");
            }

            String errorHtml = "<!DOCTYPE html>\n" +
                    "<html>\n" +
                    "<head>\n" +
                    "    <title>Kraven UI - Resource Not Found</title>\n" +
                    "    <style>\n" +
                    "        body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; max-width: 800px; margin: 0 auto; }\n" +
                    "        h1 { color: #d32f2f; }\n" +
                    "        pre { background-color: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }\n" +
                    "    </style>\n" +
                    "</head>\n" +
                    "<body>\n" +
                    "    <h1>Kraven UI Resources Not Found</h1>\n" +
                    "    <p>Could not load the Kraven UI resources. This might be due to:</p>\n" +
                    "    <ul>\n" +
                    "        <li>Incorrect version configuration (current version: " + properties.getVersion() + ")</li>\n" +
                    "        <li>Missing resources in the classpath</li>\n" +
                    "        <li>Path configuration issue (current path: " + properties.getNormalizedPath() + ")</li>\n" +
                    "    </ul>\n" +
                    "    <p>Please check your application configuration and ensure the Kraven UI resources are properly included.</p>\n" +
                    "    <h2>Configuration</h2>\n" +
                    "    <pre>\n" +
                    "kraven.ui.path=" + properties.getPath() + "\n" +
                    "kraven.ui.version=" + properties.getVersion() + "\n" +
                    "    </pre>\n" +
                    "    <h2>Locations Checked</h2>\n" +
                    "    <pre>\n" + locationsChecked + "    </pre>\n" +
                    "</body>\n" +
                    "</html>";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.TEXT_HTML);
            return ResponseEntity.status(404)
                    .headers(headers)
                    .body(errorHtml);
        }

        // Read the resource and inject the configuration
        try (InputStream inputStream = resource.getInputStream()) {
            String html = StreamUtils.copyToString(inputStream, StandardCharsets.UTF_8);

            // Get the servlet path from injected properties
            String effectiveServletPath = "";

            // First check spring.mvc.servlet.path
            if (servletPath != null && !servletPath.isEmpty()) {
                effectiveServletPath = servletPath;
                log.debug("Using spring.mvc.servlet.path: {}", effectiveServletPath);
            }
            // Fall back to server.servlet.context-path if spring.mvc.servlet.path is not set
            else if (contextPath != null && !contextPath.isEmpty()) {
                effectiveServletPath = contextPath;
                log.debug("Using server.servlet.context-path: {}", effectiveServletPath);
            }

            // Normalize servlet path
            if (!effectiveServletPath.isEmpty() && !effectiveServletPath.startsWith("/")) {
                effectiveServletPath = "/" + effectiveServletPath;
            }

            log.debug("Using servlet path: {}", effectiveServletPath);

            // Update paths to include the UI path prefix with servlet path
            String uiPath = properties.getNormalizedPath();
            String fullPath = effectiveServletPath + uiPath;

            // Create the base API path with the servlet path and /kraven/api
            String baseApiPath = effectiveServletPath + "/kraven/api";
            log.debug("Base API path: {}", baseApiPath);

            log.debug("Full path for UI resources: {}", fullPath);

            // Inject the configuration into the HTML with the base API path
            String configScript = createConfigScript(baseApiPath);

            // Inject custom CSS if specified
            StringBuilder customResources = new StringBuilder(configScript);
            if (properties.getTheme().getCustomCssPath() != null && !properties.getTheme().getCustomCssPath().isEmpty()) {
                String customCssPath = properties.getTheme().getCustomCssPath();
                log.debug("Including custom CSS from: {}", customCssPath);
                customResources.append("<link rel=\"stylesheet\" href=\"").append(customCssPath).append("\">\n");
            }

            // Inject custom JavaScript if specified
            if (properties.getTheme().getCustomJsPath() != null && !properties.getTheme().getCustomJsPath().isEmpty()) {
                String customJsPath = properties.getTheme().getCustomJsPath();
                log.debug("Including custom JavaScript from: {}", customJsPath);
                customResources.append("<script src=\"").append(customJsPath).append("\"></script>\n");
            }

            html = html.replace("</head>", customResources.toString() + "</head>");

            // Update base href in the HTML to include the servlet path and UI path
            // This is the most reliable way to handle path resolution in Angular apps
            // as it affects all relative URLs in the document
            if (html.contains("<base href=\"/\">")) {
                html = html.replace("<base href=\"/\">", "<base href=\"" + fullPath + "/\">");
                log.debug("Updated base href to: {}", fullPath + "/");
            }

            // Return the HTML with the correct content type
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.TEXT_HTML);
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(html);
        } catch (IOException e) {
            log.error("Error reading index.html: {}", e.getMessage());
            throw e;
        }
    }

    /**
     * Serves a static file from the classpath.
     *
     * @param relativePath the relative path to the file
     * @return the file content with the appropriate content type
     * @throws IOException if the file cannot be read
     */
    private ResponseEntity<?> serveStaticFile(String relativePath) throws IOException {
        log.debug("Serving static file: {}", relativePath);

        Resource resource = null;
        String resourcePath = null;

        // Locations to check, in order of preference
        List<String> locationsList = new ArrayList<>();

        // Prioritize webjar resources
        locationsList.add("/META-INF/resources/webjars/kraven-ui/" + properties.getVersion() + "/" + relativePath);
        locationsList.add("/static/" + relativePath);
        locationsList.add("/kraven-ui-frontend/dist/kraven-ui-frontend/browser/" + relativePath);

        String[] locations = locationsList.toArray(new String[0]);

        // Try each location until we find the resource
        for (String location : locations) {
            resourcePath = location;
            resource = new ClassPathResource(resourcePath);
            if (resource.exists()) {
                log.debug("Found static file at: {}", resourcePath);
                break;
            }
        }

        // If we couldn't find the resource, fall back to index.html for client-side routing
        if (resource == null || !resource.exists()) {
            log.debug("Static file not found, falling back to index.html for client-side routing");
            return serveIndex();
        }

        // Read the resource and return it with the appropriate content type
        try (InputStream inputStream = resource.getInputStream()) {
            byte[] content = StreamUtils.copyToByteArray(inputStream);

            // Determine the content type
            MediaType contentType = getContentType(relativePath);

            // Return the content with the correct content type
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(contentType);
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(content);
        } catch (IOException e) {
            log.error("Error reading static file: {}", e.getMessage());
            throw e;
        }
    }

    /**
     * Determines the content type of a file based on its extension.
     *
     * @param path the file path
     * @return the content type
     */
    private MediaType getContentType(String path) {
        int dotIndex = path.lastIndexOf('.');
        if (dotIndex >= 0 && dotIndex < path.length() - 1) {
            String extension = path.substring(dotIndex + 1).toLowerCase();
            MediaType contentType = MIME_TYPES.get(extension);
            if (contentType != null) {
                return contentType;
            }
        }

        // Default to octet-stream
        return MediaType.APPLICATION_OCTET_STREAM;
    }

    /**
     * Creates a script tag with the configuration.
     *
     * @param baseApiPath the base API path to include in the configuration
     * @return the script tag with the configuration
     */
    private String createConfigScript(String baseApiPath) {
        String configJson = configInitializer.createFrontendConfigJson();

        StringBuilder script = new StringBuilder();
        script.append("<script>\n");
        script.append("  window.__KRAVEN_CONFIG__ = ").append(configJson).append(";\n");
        script.append("  window.__KRAVEN_BASE_API_PATH__ = \"").append(baseApiPath).append("\";\n");

        // Add Swagger/OpenAPI URL if configured
        String apiUrl = null;
        if (swaggerUiPath != null && !swaggerUiPath.isEmpty()) {
            apiUrl = swaggerUiPath;
            log.debug("Using springdoc.swagger-ui.url: {}", apiUrl);
        } else if (apiDocsPath != null && !apiDocsPath.isEmpty()) {
            apiUrl = apiDocsPath;
            log.debug("Using springdoc.api-docs.url: {}", apiUrl);
        }

        if (apiUrl != null && !apiUrl.isEmpty()) {
            script.append("  window.__KRAVEN_API_DOCS_URL__ = \"").append(apiUrl).append("\";\n");
            script.append("  console.log('Kraven UI API Docs URL:', window.__KRAVEN_API_DOCS_URL__);\n");
        }

        script.append("  console.log('Kraven UI Configuration:', window.__KRAVEN_CONFIG__);\n");
        script.append("  console.log('Kraven UI Base API Path:', window.__KRAVEN_BASE_API_PATH__);\n");
        script.append("</script>\n");

        return script.toString();
    }
}
