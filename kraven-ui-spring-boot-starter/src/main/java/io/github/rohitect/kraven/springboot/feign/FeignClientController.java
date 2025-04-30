package io.github.rohitect.kraven.springboot.feign;

import io.github.rohitect.kraven.springboot.config.KravenUiEnhancedProperties;
import io.github.rohitect.kraven.springboot.kafka.service.KafkaListenerScanner;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Controller for Feign client metadata.
 */
@RestController
@RequestMapping("/kraven/api/feign-clients")
@ConditionalOnProperty(prefix = "kraven.ui", name = "enabled", matchIfMissing = true)
public class FeignClientController {

    private final FeignClientScanner feignClientScanner;
    private final FeignClientExecutor feignClientExecutor;
    private final KravenUiEnhancedProperties properties;

    // Logger instance
    private static final Logger log = LoggerFactory.getLogger(FeignClientController.class);

    @Autowired
    public FeignClientController(FeignClientScanner feignClientScanner, FeignClientExecutor feignClientExecutor, KravenUiEnhancedProperties properties) {
        this.feignClientScanner = feignClientScanner;
        this.feignClientExecutor = feignClientExecutor;
        this.properties = properties;

        String apiPath = properties.getFeignClient().getApiPath();
        log.debug("FeignClientController initialized with path: {}", apiPath);
    }

    /**
     * Debug endpoint to check if the controller is properly registered.
     *
     * @return a simple message
     */
    @GetMapping(value = "/debug", produces = "application/json")
    public ResponseEntity<Map<String, String>> debug() {
        return ResponseEntity.ok()
            .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
            .body(Map.of("status", "ok", "message", "FeignClientController is working"));
    }

    /**
     * Debug endpoint to get all client names.
     *
     * @return a list of all client names
     */
    @GetMapping(value = "/debug/names", produces = "application/json")
    public ResponseEntity<List<String>> debugNames() {
        try {
            List<FeignClientMetadata> feignClients = feignClientScanner.scanFeignClients();
            List<String> names = feignClients.stream()
                .map(FeignClientMetadata::getName)
                .collect(Collectors.toList());
            return ResponseEntity.ok()
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .body(names);
        } catch (Exception e) {
            log.error("Error getting client names: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .body(Collections.emptyList());
        }
    }

    /**
     * Gets all Feign clients.
     *
     * @return the list of Feign client metadata
     */
    @GetMapping(produces = "application/json")
    public ResponseEntity<List<FeignClientMetadata>> getAllFeignClients() {
        try {
            // Check if Spring Cloud OpenFeign is available
            Class.forName("org.springframework.cloud.openfeign.FeignClient");

            // The scanner is already initialized with the configured base packages
            List<FeignClientMetadata> feignClients = feignClientScanner.scanFeignClients();
            return ResponseEntity.ok()
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .body(feignClients);
        } catch (ClassNotFoundException e) {
            // Spring Cloud OpenFeign is not available
            log.warn("WARNING: Spring Cloud OpenFeign is not available on the classpath. Feign client scanning is disabled.");
            log.warn("To use the Feign client scanner, add the spring-cloud-starter-openfeign dependency to your project.");
            return ResponseEntity.ok()
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .body(Collections.emptyList());
        }
    }

    /**
     * Gets a specific Feign client by name.
     *
     * @param name the name of the Feign client
     * @return the Feign client metadata
     */
    @GetMapping(value = "/{name}", produces = "application/json")
    public ResponseEntity<FeignClientMetadata> getFeignClient(@PathVariable(name = "name") String name) {
        log.debug("Received request for Feign client: {}", name);
        try {
            // Check if Spring Cloud OpenFeign is available
            Class.forName("org.springframework.cloud.openfeign.FeignClient");

            // The scanner is already initialized with the configured base packages
            List<FeignClientMetadata> feignClients = feignClientScanner.scanFeignClients();
            log.debug("Found {} Feign clients", feignClients.size());

            // Print all client names for debugging
            log.debug("Available Feign client names: {}",
                feignClients.stream()
                    .map(FeignClientMetadata::getName)
                    .collect(Collectors.joining(", ")));

            Optional<FeignClientMetadata> feignClient = feignClients.stream()
                    .filter(client -> {
                        // Try both case-sensitive and case-insensitive comparison
                        boolean exactMatch = client.getName().equals(name);
                        boolean caseInsensitiveMatch = client.getName().equalsIgnoreCase(name);
                        log.debug("Checking client {} against {}: exact={}, caseInsensitive={}", client.getName(), name, exactMatch, caseInsensitiveMatch);

                        // Use case-insensitive match to be more forgiving
                        boolean matches = exactMatch || caseInsensitiveMatch;
                        return matches;
                    })
                    .findFirst();
            if (feignClient.isPresent()) {
                return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                    .body(feignClient.get());
            } else {
                return ResponseEntity.notFound()
                    .header("Content-Type", "application/json")
                    .build();
            }
        } catch (ClassNotFoundException e) {
            // Spring Cloud OpenFeign is not available
            log.warn("WARNING: Spring Cloud OpenFeign is not available on the classpath. Feign client scanning is disabled.");
            log.warn("To use the Feign client scanner, add the spring-cloud-starter-openfeign dependency to your project.");
            return ResponseEntity.notFound()
                .header("Content-Type", "application/json")
                .build();
        }
    }

    /**
     * Executes a Feign client method.
     *
     * @param name       the name of the Feign client
     * @param methodName the name of the method
     * @param parameters the parameters for the method
     * @return the result of the method execution
     */
    @PostMapping(value = "/{name}/methods/{methodName}/execute", produces = "application/json")
    public ResponseEntity<Object> executeMethod(
            @PathVariable(name = "name") String name,
            @PathVariable(name = "methodName") String methodName,
            @RequestBody(required = false) Map<String, Object> parameters) {
        try {
            // Check if Spring Cloud OpenFeign is available
            Class.forName("org.springframework.cloud.openfeign.FeignClient");

            // If parameters is null, use an empty map
            Map<String, Object> safeParameters = parameters != null ? parameters : Collections.emptyMap();

            // Log the request for debugging
            log.debug("Executing method: {}.{} with parameters: {}", name, methodName, safeParameters);

            Object result = feignClientExecutor.executeMethod(name, methodName, safeParameters);
            return ResponseEntity.ok()
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .body(result);
        } catch (ClassNotFoundException e) {
            // Spring Cloud OpenFeign is not available
            log.warn("WARNING: Spring Cloud OpenFeign is not available on the classpath. Feign client execution is disabled.");
            log.warn("To use the Feign client executor, add the spring-cloud-starter-openfeign dependency to your project.");
            return ResponseEntity.badRequest()
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .body(Map.of("error", "Spring Cloud OpenFeign is not available on the classpath."));
        } catch (Exception e) {
            // Log the full exception for debugging
            log.error("Error executing method {}.{}: {}", name, methodName, e.getMessage(), e);

            String errorMessage = null;
            if (e instanceof java.lang.reflect.InvocationTargetException) {
                Throwable targetException = ((java.lang.reflect.InvocationTargetException) e).getTargetException();
                if (targetException != null) {
                    errorMessage = targetException.getMessage();
                }
            }

            errorMessage = errorMessage == null ? e.getMessage() : errorMessage;
            return ResponseEntity.badRequest()
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .body(Map.of("error", errorMessage));
        }
    }
}
