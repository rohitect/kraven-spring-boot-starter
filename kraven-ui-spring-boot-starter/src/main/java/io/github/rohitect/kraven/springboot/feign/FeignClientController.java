package io.github.rohitect.kraven.springboot.feign;

import io.github.rohitect.kraven.springboot.KravenUiProperties;
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
@RequestMapping("/kraven/v1/feign-clients")
@ConditionalOnProperty(prefix = "kraven.ui", name = "enabled", matchIfMissing = true)
public class FeignClientController {

    private final FeignClientScanner feignClientScanner;
    private final FeignClientExecutor feignClientExecutor;
    private final KravenUiProperties properties;

    @Autowired
    public FeignClientController(FeignClientScanner feignClientScanner, FeignClientExecutor feignClientExecutor, KravenUiProperties properties) {
        this.feignClientScanner = feignClientScanner;
        this.feignClientExecutor = feignClientExecutor;
        this.properties = properties;
        System.out.println("FeignClientController initialized with path: /kraven/v1/feign-clients");
    }

    /**
     * Debug endpoint to check if the controller is properly registered.
     *
     * @return a simple message
     */
    @GetMapping("/debug")
    public ResponseEntity<Map<String, String>> debug() {
        return ResponseEntity.ok(Map.of("status", "ok", "message", "FeignClientController is working"));
    }

    /**
     * Debug endpoint to get all client names.
     *
     * @return a list of all client names
     */
    @GetMapping("/debug/names")
    public ResponseEntity<List<String>> debugNames() {
        try {
            List<FeignClientMetadata> feignClients = feignClientScanner.scanFeignClients();
            List<String> names = feignClients.stream()
                .map(FeignClientMetadata::getName)
                .collect(Collectors.toList());
            return ResponseEntity.ok(names);
        } catch (Exception e) {
            System.err.println("Error getting client names: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.emptyList());
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
            return ResponseEntity.ok(feignClients);
        } catch (ClassNotFoundException e) {
            // Spring Cloud OpenFeign is not available
            System.err.println("WARNING: Spring Cloud OpenFeign is not available on the classpath. Feign client scanning is disabled.");
            System.err.println("To use the Feign client scanner, add the spring-cloud-starter-openfeign dependency to your project.");
            return ResponseEntity.ok(Collections.emptyList());
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
        System.out.println("Received request for Feign client: " + name);
        try {
            // Check if Spring Cloud OpenFeign is available
            Class.forName("org.springframework.cloud.openfeign.FeignClient");

            // The scanner is already initialized with the configured base packages
            List<FeignClientMetadata> feignClients = feignClientScanner.scanFeignClients();
            System.out.println("Found " + feignClients.size() + " Feign clients");

            // Print all client names for debugging
            System.out.println("Available Feign client names: " +
                feignClients.stream()
                    .map(FeignClientMetadata::getName)
                    .collect(Collectors.joining(", ")));

            Optional<FeignClientMetadata> feignClient = feignClients.stream()
                    .filter(client -> {
                        // Try both case-sensitive and case-insensitive comparison
                        boolean exactMatch = client.getName().equals(name);
                        boolean caseInsensitiveMatch = client.getName().equalsIgnoreCase(name);
                        System.out.println("Checking client " + client.getName() + " against " + name + ": exact=" + exactMatch + ", caseInsensitive=" + caseInsensitiveMatch);

                        // Use case-insensitive match to be more forgiving
                        boolean matches = exactMatch || caseInsensitiveMatch;
                        return matches;
                    })
                    .findFirst();
            return feignClient.map(ResponseEntity::ok)
                    .orElseGet(() -> ResponseEntity.notFound().build());
        } catch (ClassNotFoundException e) {
            // Spring Cloud OpenFeign is not available
            System.err.println("WARNING: Spring Cloud OpenFeign is not available on the classpath. Feign client scanning is disabled.");
            System.err.println("To use the Feign client scanner, add the spring-cloud-starter-openfeign dependency to your project.");
            return ResponseEntity.notFound().build();
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
            System.out.println("Executing method: " + name + "." + methodName + " with parameters: " + safeParameters);

            Object result = feignClientExecutor.executeMethod(name, methodName, safeParameters);
            return ResponseEntity.ok(result);
        } catch (ClassNotFoundException e) {
            // Spring Cloud OpenFeign is not available
            System.err.println("WARNING: Spring Cloud OpenFeign is not available on the classpath. Feign client execution is disabled.");
            System.err.println("To use the Feign client executor, add the spring-cloud-starter-openfeign dependency to your project.");
            return ResponseEntity.badRequest().body(Map.of("error", "Spring Cloud OpenFeign is not available on the classpath."));
        } catch (Exception e) {
            // Log the full exception for debugging
            System.err.println("Error executing method " + name + "." + methodName + ": " + e.getMessage());
            e.printStackTrace();

            String errorMessage = null;
            if (e instanceof java.lang.reflect.InvocationTargetException) {
                Throwable targetException = ((java.lang.reflect.InvocationTargetException) e).getTargetException();
                if (targetException != null) {
                    errorMessage = targetException.getMessage();
                }
            }

            errorMessage = errorMessage == null ? e.getMessage() : errorMessage;
            return ResponseEntity.badRequest().body(Map.of("error", errorMessage));
        }
    }
}
