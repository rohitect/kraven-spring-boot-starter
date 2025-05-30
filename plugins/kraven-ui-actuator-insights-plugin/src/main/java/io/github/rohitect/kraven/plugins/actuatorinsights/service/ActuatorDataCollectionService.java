package io.github.rohitect.kraven.plugins.actuatorinsights.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.rohitect.kraven.plugins.actuatorinsights.config.ActuatorInsightsConfig;
import io.github.rohitect.kraven.plugins.actuatorinsights.model.ActuatorData;
import io.github.rohitect.kraven.plugins.actuatorinsights.model.ActuatorEndpoint;
import io.github.rohitect.kraven.plugins.actuatorinsights.model.ConditionsData;
import io.github.rohitect.kraven.plugins.actuatorinsights.model.HealthStatus;
import io.github.rohitect.kraven.plugins.actuatorinsights.model.MetricData;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StreamUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.OutputStream;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.stereotype.Service;

/**
 * Service for collecting data from Spring Boot Actuator endpoints.
 */
@Slf4j
@Service
public class ActuatorDataCollectionService {

    private final ActuatorInsightsConfig config;
    private final Environment environment;
    private final RestTemplate restTemplate;
    private final ScheduledExecutorService scheduler;
    private final AtomicBoolean collecting = new AtomicBoolean(false);

    // Cache for actuator data
    private final Cache<String, Object> dataCache;

    // Service for masking sensitive data
    private final SensitiveDataMaskingService sensitiveDataMaskingService;

    // No longer storing history in the backend

    // Available endpoints
    private final List<ActuatorEndpoint> availableEndpoints = new ArrayList<>();

    public ActuatorDataCollectionService(ActuatorInsightsConfig config, Environment environment) {
        this.config = config;
        this.environment = environment;
        this.restTemplate = new RestTemplate();
        this.scheduler = Executors.newScheduledThreadPool(1);
        this.sensitiveDataMaskingService = new SensitiveDataMaskingService(config);

        // Parse the retention period from the config
        String retentionPeriod = config.getDataCollection().getRetentionPeriod();
        Duration retention = parseDuration(retentionPeriod, Duration.ofHours(1));

        // Create the cache with expiration based on the retention period
        this.dataCache = Caffeine.newBuilder()
                .expireAfterWrite(retention)
                .build();
    }

    /**
     * Start collecting data from actuator endpoints.
     */
    public void startDataCollection() {
        if (collecting.compareAndSet(false, true)) {
            // log.info("Starting actuator data collection");

            // Discover available endpoints
            discoverEndpoints();

            // Parse the collection interval from the config
            String intervalStr = config.getDataCollection().getInterval();
            Duration interval = parseDuration(intervalStr, Duration.ofSeconds(15));

            // Schedule data collection
            scheduler.scheduleAtFixedRate(
                    this::collectData,
                    0,
                    interval.toMillis(),
                    TimeUnit.MILLISECONDS
            );
        }
    }

    /**
     * Stop collecting data from actuator endpoints.
     */
    public void stopDataCollection() {
        if (collecting.compareAndSet(true, false)) {
            // log.info("Stopping actuator data collection");
            scheduler.shutdown();
            try {
                if (!scheduler.awaitTermination(5, TimeUnit.SECONDS)) {
                    scheduler.shutdownNow();
                }
            } catch (InterruptedException e) {
                scheduler.shutdownNow();
                Thread.currentThread().interrupt();
            }
        }
    }

    /**
     * Clear all caches, including the sensitive data masking cache.
     * This should be called when forcing a refresh of the data.
     */
    public void clearCaches() {
        // log.info("Clearing all caches");
        sensitiveDataMaskingService.clearCache();
    }

    /**
     * Get the latest actuator data.
     *
     * @return the latest actuator data
     */
    public ActuatorData getActuatorData() {
        return ActuatorData.builder()
                .health(getHealthData())
                .metrics(getMetricsData())
                .info(getInfoData())
                .env(getEnvData())
                .beans(getBeansData())
                .conditions(getConditionsData())
                .logfileAvailable(isLogfileAvailable())
                .build();
    }

    /**
     * Get the available actuator endpoints.
     *
     * @return the list of available endpoints
     */
    public List<ActuatorEndpoint> getAvailableEndpoints() {
        return new ArrayList<>(availableEndpoints);
    }

    // History methods removed as history is now maintained only in the frontend

    /**
     * Discover available actuator endpoints.
     */
    private void discoverEndpoints() {
        log.debug("Discovering actuator endpoints");

        // Get the actuator base URL with proper context path
        String actuatorUrl = getEndpointPath("");

        try {
            log.debug("Querying actuator endpoint: {}", actuatorUrl);
            ResponseEntity<Map> response = restTemplate.getForEntity(actuatorUrl, Map.class);
            Map<String, Object> body = response.getBody();

            if (body != null && body.containsKey("_links")) {
                Map<String, Object> links = (Map<String, Object>) body.get("_links");
                links.forEach((key, value) -> {
                    if (!"self".equals(key)) {
                        Map<String, String> link = (Map<String, String>) value;
                        String href = link.get("href");
                        availableEndpoints.add(new ActuatorEndpoint(key, href));
                        log.debug("Discovered endpoint: {} -> {}", key, href);
                    }
                });
            }
        } catch (RestClientException e) {
            log.warn("Failed to discover actuator endpoints: {}", e.getMessage());
        }
    }

    /**
     * Get the base URL for actuator endpoints, including context path if specified.
     *
     * @return the base URL
     */
    private String getBaseUrl() {
        // Get the server port from environment
        String serverPort = environment.getProperty("server.port", "8080");

        // Construct the base URL with the actual port
        String baseUrl = "http://127.0.0.1:" + serverPort;
        if (!baseUrl.endsWith("/")) {
            baseUrl = baseUrl + "/";
        }

        // Add context path if specified in Spring Boot configuration
        String contextPath = getContextPath();
        if (StringUtils.hasText(contextPath)) {
            if (contextPath.startsWith("/")) {
                contextPath = contextPath.substring(1);
            }
            if (!contextPath.endsWith("/")) {
                contextPath = contextPath + "/";
            }
            baseUrl = baseUrl + contextPath;
        }

        // Check if management.endpoints.web.base-path is configured
        String managementBasePath = getManagementBasePath();
        if (managementBasePath != null && !managementBasePath.equals("/actuator")) {
            // If a custom base path is configured, use it instead of /actuator
            log.debug("Using custom management base path: {}", managementBasePath);
            // Remove the default actuator path that will be added later
            if (baseUrl.endsWith("actuator/")) {
                baseUrl = baseUrl.substring(0, baseUrl.length() - "actuator/".length());
            }
        }

        log.debug("Constructed base URL: {}", baseUrl);
        return baseUrl;
    }

    /**
     * Get the context path configured for the application.
     * This method checks for Spring Boot context path properties in the following order:
     * 1. server.servlet.context-path
     * 2. spring.mvc.servlet.path
     * 3. Falls back to the plugin configuration if neither is found
     *
     * @return the context path
     */
    public String getContextPath() {
        // First check for Spring Boot's server.servlet.context-path property
        String servletContextPath = environment.getProperty("server.servlet.context-path");

        if (StringUtils.hasText(servletContextPath)) {
            log.debug("Using Spring Boot servlet context path (server.servlet.context-path): {}", servletContextPath);
            return servletContextPath;
        }

        // Next check for Spring Boot's spring.mvc.servlet.path property
        String mvcServletPath = environment.getProperty("spring.mvc.servlet.path");

        if (StringUtils.hasText(mvcServletPath)) {
            log.debug("Using Spring Boot MVC servlet path (spring.mvc.servlet.path): {}", mvcServletPath);
            return mvcServletPath;
        }

        // Fall back to the plugin configuration
        String configContextPath = config.getContextPath();
        log.debug("Using plugin config context path: {}", configContextPath);
        return configContextPath;
    }

    /**
     * Get the actuator base path, which includes the management base path.
     *
     * @return the actuator base path
     */
    public String getActuatorBasePath() {
        String managementBasePath = getManagementBasePath();
        if (managementBasePath == null) {
            managementBasePath = "/actuator";
        }

        // Remove leading slash if present
        if (managementBasePath.startsWith("/")) {
            managementBasePath = managementBasePath.substring(1);
        }

        return managementBasePath;
    }

    /**
     * Get the full path for a specific actuator endpoint.
     * This method considers:
     * 1. The base URL (including protocol, host, port)
     * 2. The servlet context path
     * 3. The management base path (e.g., /actuator)
     * 4. Any custom path mapping for the specific endpoint
     *
     * @param endpointId the ID of the endpoint (e.g., "health", "metrics")
     * @return the full URL for the endpoint
     */
    private String getEndpointPath(String endpointId) {
        // Get the base URL (includes protocol, host, port, and context path)
        String baseUrl = getBaseUrl();

        // Get the management base path
        String managementBasePath = getManagementBasePath();
        if (managementBasePath == null) {
            managementBasePath = "/actuator";
        }

        // Remove leading slash if present
        if (managementBasePath.startsWith("/")) {
            managementBasePath = managementBasePath.substring(1);
        }

        // Check for custom path mapping for this endpoint
        String endpointPath = "";
        if (!endpointId.isEmpty()) {
            endpointPath = getEndpointCustomPath(endpointId);
            if (endpointPath == null) {
                // No custom mapping, use default
                endpointPath = endpointId;
            }
            // Add a separator
            endpointPath = "/" + endpointPath;
        }

        // Construct the full URL
        return baseUrl + managementBasePath + endpointPath;
    }

    /**
     * Get the custom path for a specific endpoint, if configured.
     * This checks for properties like management.endpoints.web.path-mapping.health
     * using Spring's Environment to resolve the property.
     *
     * @param endpointId the ID of the endpoint
     * @return the custom path, or null if not configured
     */
    private String getEndpointCustomPath(String endpointId) {
        // The standard property name for endpoint path mappings in Spring Boot
        String propertyName = "management.endpoints.web.path-mapping." + endpointId;

        // Use Spring's Environment to resolve the property
        String customPath = environment.getProperty(propertyName);

        if (customPath != null) {
            log.debug("Found custom path for endpoint {}: {}", endpointId, customPath);
            return customPath;
        }

        // No custom mapping found, return null to use the default
        return null;
    }

    /**
     * Get the management base path from Spring Boot properties.
     * This uses Spring's Environment to resolve the property, which respects Spring Boot's
     * property resolution order (including application.properties, application.yml,
     * environment variables, system properties, etc.)
     *
     * @return the management base path, or null if it cannot be determined
     */
    private String getManagementBasePath() {
        // The standard property name for the management base path in Spring Boot
        String propertyName = "management.endpoints.web.base-path";

        // Use Spring's Environment to resolve the property
        String basePath = environment.getProperty(propertyName);

        if (basePath != null) {
            log.debug("Found management base path from Environment: {}", basePath);
            return basePath;
        }

        // Default value in Spring Boot is /actuator
        log.debug("No custom management base path found, using default: /actuator");
        return "/actuator";
    }

    /**
     * Collect data from actuator endpoints.
     */
    private void collectData() {
        log.debug("Collecting actuator data");

        // Collect health data
        collectHealthData();

        // Collect metrics data
        collectMetricsData();

        // Collect info data
        collectInfoData();

        // Collect env data
        collectEnvData();

        // Collect beans data
        collectBeansData();

        // Collect conditions data
        collectConditionsData();

        // Check if logfile endpoint is available
        checkLogfileEndpoint();
    }

    /**
     * Collect health data from the health endpoint.
     */
    private void collectHealthData() {
        String healthUrl = getEndpointPath("health");

        try {
            // log.info("Collecting health data from: {}", healthUrl);
            ResponseEntity<Map> response = restTemplate.getForEntity(healthUrl, Map.class);
            Map<String, Object> body = response.getBody();

            if (body != null) {
                String status = (String) body.get("status");
                // log.info("Health status: {}", status);

                // Check for components
                if (body.containsKey("components")) {
                    Map<String, Object> components = (Map<String, Object>) body.get("components");
                    // log.info("Health components found: {}", components.keySet());
                } else {
                    // log.info("No health components found in response");
                }

                HealthStatus healthStatus = new HealthStatus(status, new Date(), body);

                // Store in cache
                dataCache.put("health", healthStatus);
                // log.info("Health data stored in cache");
            } else {
                log.warn("Health endpoint returned null body");
                // Create a default UP status to avoid null pointer exceptions
                Map<String, Object> defaultHealth = new HashMap<>();
                defaultHealth.put("status", "UP");
                HealthStatus healthStatus = new HealthStatus("UP", new Date(), defaultHealth);
                dataCache.put("health", healthStatus);
            }
        } catch (RestClientException e) {
            log.warn("Failed to collect health data: {}", e.getMessage());
            // Create a default UP status to avoid null pointer exceptions
            Map<String, Object> defaultHealth = new HashMap<>();
            defaultHealth.put("status", "UP");
            HealthStatus healthStatus = new HealthStatus("UP", new Date(), defaultHealth);
            dataCache.put("health", healthStatus);
        }
    }

    /**
     * Collect metrics data from the metrics endpoint.
     */
    private void collectMetricsData() {
        String metricsUrl = getEndpointPath("metrics");

        try {
            // First, get the list of available metrics
            log.debug("Collecting metrics list from: {}", metricsUrl);
            ResponseEntity<Map> response = restTemplate.getForEntity(metricsUrl, Map.class);
            Map<String, Object> body = response.getBody();

            if (body != null && body.containsKey("names")) {
                List<String> metricNames = (List<String>) body.get("names");

                // Collect data for each metric
                for (String metricName : metricNames) {
                    collectMetricData(metricName);
                }
            }
        } catch (RestClientException e) {
            log.warn("Failed to collect metrics list: {}", e.getMessage());
        }
    }

    /**
     * Collect data for a specific metric.
     *
     * @param metricName the name of the metric
     */
    private void collectMetricData(String metricName) {
        String metricUrl = getEndpointPath("metrics/" + metricName);

        try {
            log.debug("Collecting metric data from: {}", metricUrl);
            ResponseEntity<Map> response = restTemplate.getForEntity(metricUrl, Map.class);
            Map<String, Object> body = response.getBody();

            if (body != null) {
                try {
                    // Extract measurements from the response
                    List<Map<String, Object>> measurements = (List<Map<String, Object>>) body.get("measurements");
                    Double value = null;

                    // Get the first measurement's value
                    if (measurements != null && !measurements.isEmpty()) {
                        Map<String, Object> measurement = measurements.get(0);
                        if (measurement.containsKey("value")) {
                            Object valueObj = measurement.get("value");
                            value = convertToDouble(valueObj);
                        }
                    }

                    String description = (String) body.get("description");
                    String baseUnit = (String) body.get("baseUnit");

                    if (value != null) {
                        MetricData metricData = new MetricData(metricName, value, new Date(), description, baseUnit);
                        // Store in cache
                        dataCache.put("metric." + metricName, metricData);
                        // log.debug("Collected metric data for {}: {}", metricName, value);
                    } else {
                        // log.warn("No value found in measurements for metric: {}", metricName);
                    }
                } catch (Exception e) {
                    log.warn("Error processing metric data for {}: {}", metricName, e.getMessage());
                    log.debug("Metric response body: {}", body);
                }
            }
        } catch (RestClientException e) {
            log.warn("Failed to collect metric data for {}: {}", metricName, e.getMessage());
        }
    }

    /**
     * Collect info data from the info endpoint.
     */
    private void collectInfoData() {
        String infoUrl = getEndpointPath("info");

        try {
            // log.info("Collecting info data from: {}", infoUrl);
            ResponseEntity<Map> response = restTemplate.getForEntity(infoUrl, Map.class);
            Map<String, Object> body = response.getBody();

            if (body != null) {
                // Store in cache
                dataCache.put("info", body);
                // log.info("Successfully collected info data: {}", body);
            } else {
                log.warn("Info endpoint returned null body");
                // Store an empty map to avoid null pointer exceptions
                dataCache.put("info", new HashMap<>());
            }
        } catch (RestClientException e) {
            log.warn("Failed to collect info data: {}", e.getMessage());
            // Store an empty map to avoid null pointer exceptions
            dataCache.put("info", new HashMap<>());
        }
    }

    /**
     * Collect environment data from the env endpoint.
     */
    private void collectEnvData() {
        String envUrl = getEndpointPath("env");

        try {
            // log.info("Collecting env data from: {}", envUrl);
            ResponseEntity<Map> response = restTemplate.getForEntity(envUrl, Map.class);
            Map<String, Object> body = response.getBody();

            if (body != null) {
                // Clear the sensitive data masking cache since we have new data
                sensitiveDataMaskingService.clearCache();

                // Store in cache
                dataCache.put("env", body);
                // log.info("Successfully collected env data with {} properties",
                    // body.containsKey("propertySources") ?((List)body.get("propertySources")).size() : 0);
            } else {
                log.warn("Env endpoint returned null body");
                // Store an empty map to avoid null pointer exceptions
                dataCache.put("env", new HashMap<>());
            }
        } catch (RestClientException e) {
            log.warn("Failed to collect env data: {}", e.getMessage());
            // Store an empty map to avoid null pointer exceptions
            dataCache.put("env", new HashMap<>());
        }
    }

    /**
     * Collect beans data from the beans endpoint.
     */
    private void collectBeansData() {
        String beansUrl = getEndpointPath("beans");

        try {
            // log.info("Collecting beans data from: {}", beansUrl);
            ResponseEntity<Map> response = restTemplate.getForEntity(beansUrl, Map.class);
            Map<String, Object> body = response.getBody();

            if (body != null) {
                // Store in cache
                dataCache.put("beans", body);
                // log.info("Successfully collected beans data");
            } else {
                log.warn("Beans endpoint returned null body");
                // Store an empty map to avoid null pointer exceptions
                dataCache.put("beans", new HashMap<>());
            }
        } catch (RestClientException e) {
            log.warn("Failed to collect beans data: {}", e.getMessage());
            // Store an empty map to avoid null pointer exceptions
            dataCache.put("beans", new HashMap<>());
        }
    }

    /**
     * Get the latest health data from the cache.
     *
     * @return the latest health data
     */
    public Map<String, Object> getHealthData() {
        Object cachedData = dataCache.getIfPresent("health");
        if (cachedData == null) {
            return null;
        }

        // If the cached data is a HealthStatus object, return its details
        if (cachedData instanceof HealthStatus) {
            HealthStatus healthStatus = (HealthStatus) cachedData;
            return healthStatus.getDetails();
        }

        // If it's already a Map, return it directly
        if (cachedData instanceof Map) {
            return (Map<String, Object>) cachedData;
        }

        // If it's neither, log a warning and return null
        log.warn("Unexpected type for health data in cache: {}", cachedData.getClass().getName());
        return null;
    }

    /**
     * Get the latest metrics data from the cache.
     *
     * @return the latest metrics data
     */
    public Map<String, MetricData> getMetricsData() {
        Map<String, MetricData> metrics = new HashMap<>();

        dataCache.asMap().forEach((key, value) -> {
            if (key.startsWith("metric.")) {
                String metricName = key.substring("metric.".length());
                metrics.put(metricName, (MetricData) value);
            }
        });

        return metrics;
    }

    /**
     * Get the latest info data from the cache.
     *
     * @return the latest info data
     */
    public Map<String, Object> getInfoData() {
        Object cachedData = dataCache.getIfPresent("info");
        if (cachedData == null) {
            return null;
        }

        if (cachedData instanceof Map) {
            return (Map<String, Object>) cachedData;
        }

        log.warn("Unexpected type for info data in cache: {}", cachedData.getClass().getName());
        return null;
    }

    /**
     * Get the latest environment data from the cache with sensitive values masked.
     *
     * @return the latest environment data with sensitive values masked
     */
    public Map<String, Object> getEnvData() {
        Object cachedData = dataCache.getIfPresent("env");
        if (cachedData == null) {
            return null;
        }

        if (cachedData instanceof Map) {
            // Mask sensitive values before returning
            return sensitiveDataMaskingService.maskSensitiveValues((Map<String, Object>) cachedData);
        }

        log.warn("Unexpected type for environment data in cache: {}", cachedData.getClass().getName());
        return null;
    }

    /**
     * Get the latest beans data from the cache.
     *
     * @return the latest beans data
     */
    public Map<String, Object> getBeansData() {
        Object cachedData = dataCache.getIfPresent("beans");
        if (cachedData == null) {
            return null;
        }

        if (cachedData instanceof Map) {
            return (Map<String, Object>) cachedData;
        }

        log.warn("Unexpected type for beans data in cache: {}", cachedData.getClass().getName());
        return null;
    }

    /**
     * Get the thread dump data from the actuator endpoint.
     *
     * @return the thread dump data
     */
    public Map<String, Object> getThreadDumpData() {
        // Check if we have cached data
        Object cachedData = dataCache.getIfPresent("threaddump");
        if (cachedData != null && cachedData instanceof Map) {
            return (Map<String, Object>) cachedData;
        }

        // If not cached or not a map, fetch fresh data
        String threadDumpUrl = getEndpointPath("threaddump");

        try {
            // log.info("Fetching thread dump data from: {}", threadDumpUrl);
            ResponseEntity<Map> response = restTemplate.getForEntity(threadDumpUrl, Map.class);
            Map<String, Object> body = response.getBody();

            if (body != null) {
                // Store in cache
                dataCache.put("threaddump", body);
                // log.info("Successfully fetched thread dump data");
                return body;
            } else {
                log.warn("Thread dump endpoint returned null body");
                return new HashMap<>();
            }
        } catch (RestClientException e) {
            log.warn("Failed to fetch thread dump data: {}", e.getMessage());
            return new HashMap<>();
        }
    }

    /**
     * Collect conditions data from the conditions endpoint.
     */
    private void collectConditionsData() {
        String conditionsUrl = getEndpointPath("conditions");

        try {
            log.debug("Collecting conditions data from: {}", conditionsUrl);
            ResponseEntity<Map> response = restTemplate.getForEntity(conditionsUrl, Map.class);
            Map<String, Object> body = response.getBody();

            if (body != null) {
                // Store in cache with timestamp
                ConditionsData conditionsData = new ConditionsData(new Date(), body);
                dataCache.put("conditions", conditionsData);
                log.debug("Successfully collected conditions data");
            } else {
                log.warn("Conditions endpoint returned null body");
                // Store an empty map to avoid null pointer exceptions
                dataCache.put("conditions", new ConditionsData(new Date(), new HashMap<>()));
            }
        } catch (RestClientException e) {
            log.warn("Failed to collect conditions data: {}", e.getMessage());
            // Store an empty map to avoid null pointer exceptions
            dataCache.put("conditions", new ConditionsData(new Date(), new HashMap<>()));
        }
    }

    /**
     * Get the latest conditions data from the cache.
     *
     * @return the latest conditions data
     */
    public Map<String, Object> getConditionsData() {
        Object cachedData = dataCache.getIfPresent("conditions");
        if (cachedData == null) {
            return null;
        }

        // If the cached data is a ConditionsData object, return its details
        if (cachedData instanceof ConditionsData) {
            ConditionsData conditionsData = (ConditionsData) cachedData;
            return conditionsData.getDetails();
        }

        // If it's already a Map, return it directly
        if (cachedData instanceof Map) {
            return (Map<String, Object>) cachedData;
        }

        // If it's neither, log a warning and return null
        log.warn("Unexpected type for conditions data in cache: {}", cachedData.getClass().getName());
        return null;
    }



    /**
     * Check if the logfile endpoint is available and store its status.
     * This method uses cache control headers to ensure we get fresh data.
     */
    private void checkLogfileEndpoint() {
        String logfileUrl = getEndpointPath("logfile");

        try {
            log.debug("Checking logfile endpoint availability: {}", logfileUrl);

            // Add cache control headers to ensure we get fresh data
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
            headers.set("Pragma", "no-cache");
            headers.set("Expires", "0");

            org.springframework.http.HttpEntity<?> requestEntity = new org.springframework.http.HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                logfileUrl,
                HttpMethod.HEAD,
                requestEntity,
                String.class
            );

            boolean available = response.getStatusCode().is2xxSuccessful();
            dataCache.put("logfileAvailable", available);
            log.debug("Logfile endpoint available: {}", available);
        } catch (RestClientException e) {
            log.debug("Logfile endpoint not available: {}", e.getMessage());
            dataCache.put("logfileAvailable", false);
        }
    }

    /**
     * Check if the logfile endpoint is available.
     * This method performs a real-time check instead of relying on cached data.
     *
     * @return true if the logfile endpoint is available
     */
    public boolean isLogfileAvailable() {
        String logfileUrl = getLogfileUrl();

        try {
            // Add cache control headers to ensure we get fresh data
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
            headers.set("Pragma", "no-cache");
            headers.set("Expires", "0");

            org.springframework.http.HttpEntity<?> requestEntity = new org.springframework.http.HttpEntity<>(headers);
            log.info("logfileUrl : {}",logfileUrl);

            ResponseEntity<String> response = restTemplate.exchange(
                logfileUrl,
                HttpMethod.HEAD,
                requestEntity,
                String.class
            );

            boolean available = response.getStatusCode().is2xxSuccessful();
            // Update the cache
            dataCache.put("logfileAvailable", available);
            return available;
        } catch (RestClientException e) {
            log.error(e.getMessage());
            // Update the cache
            dataCache.put("logfileAvailable", false);
            return false;
        }
    }

    /**
     * Get the logfile URL.
     *
     * @return the logfile URL
     */
    public String getLogfileUrl() {
        return getEndpointPath("logfile");
    }

    /**
     * Get the log file content from the logfile endpoint with pagination support.
     * This method supports the Range header for pagination.
     * Note: Logfile data is never cached and is always fetched fresh from the actuator endpoint.
     *
     * @param rangeHeader the Range header for pagination (e.g., "bytes=0-1024")
     * @return ResponseEntity with the requested range of log content
     */
    public ResponseEntity<String> getLogfileContent(String rangeHeader) {
        if (!isLogfileAvailable()) {
            return ResponseEntity.notFound().build();
        }

        String logfileUrl = getLogfileUrl();
        log.debug("Fetching logfile content from: {} with range: {}", logfileUrl, rangeHeader);

        try {
            // Create request entity with Range header if provided
            org.springframework.http.HttpHeaders requestHeaders = new org.springframework.http.HttpHeaders();

            // Add Cache-Control header to ensure we get fresh data
            requestHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");
            requestHeaders.set("Pragma", "no-cache");
            requestHeaders.set("Expires", "0");

            // Add Range header if provided
            if (rangeHeader != null && !rangeHeader.isEmpty()) {
                requestHeaders.set("Range", rangeHeader);
            }

            org.springframework.http.HttpEntity<?> requestEntity = new org.springframework.http.HttpEntity<>(requestHeaders);

            // Execute the request
            ResponseEntity<String> response = restTemplate.exchange(
                logfileUrl,
                HttpMethod.GET,
                requestEntity,
                String.class
            );

            // Set appropriate headers for the response
            org.springframework.http.HttpHeaders responseHeaders = new org.springframework.http.HttpHeaders();
            responseHeaders.setContentType(org.springframework.http.MediaType.TEXT_PLAIN);
            responseHeaders.set("Content-Disposition", "inline; filename=\"application.log\"");

            // Add cache control headers to prevent caching
            responseHeaders.setCacheControl("no-cache, no-store, must-revalidate");
            responseHeaders.setPragma("no-cache");
            responseHeaders.setExpires(0);

            // Copy Content-Range header if present
            if (response.getHeaders().containsKey("Content-Range")) {
                responseHeaders.set("Content-Range", response.getHeaders().getFirst("Content-Range"));
            }

            // Copy Accept-Ranges header if present
            if (response.getHeaders().containsKey("Accept-Ranges")) {
                responseHeaders.set("Accept-Ranges", response.getHeaders().getFirst("Accept-Ranges"));
            } else {
                // Explicitly set Accept-Ranges to bytes if not present
                responseHeaders.set("Accept-Ranges", "bytes");
            }

            return new ResponseEntity<>(
                response.getBody(),
                responseHeaders,
                response.getStatusCode()
            );
        } catch (RestClientException e) {
            log.error("Failed to fetch logfile content: {}", e.getMessage());
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Failed to fetch logfile content: " + e.getMessage());
        }
    }

    /**
     * Get the size of the log file in bytes.
     * This method tries multiple approaches to determine the size:
     * 1. First, it tries a HEAD request to get the Content-Length header
     * 2. If that fails, it tries a GET request with Range: bytes=0-0 to get the Content-Range header
     * 3. If that fails, it makes a GET request for the entire file and measures its length
     *
     * @return the size of the log file in bytes
     */
    public long getLogfileSize() {
        if (!isLogfileAvailable()) {
            log.info("No Logfile Available.");
            return 0;
        }

        String logfileUrl = getLogfileUrl();
        log.info("Getting logfile size from: {}", logfileUrl);

        try {
            // Approach 1: Try a HEAD request to get the Content-Length header
            org.springframework.http.HttpHeaders headers = restTemplate.headForHeaders(logfileUrl);

            if (headers.containsKey("Content-Length")) {
                long size = headers.getContentLength();
                log.debug("Logfile size from Content-Length header: {} bytes", size);
                return size;
            } else {
                log.debug("Content-Length header not found in HEAD response, trying Range request");
            }

            // Approach 2: Try a GET request with Range: bytes=0-0 to get the Content-Range header
            org.springframework.http.HttpHeaders rangeHeaders = new org.springframework.http.HttpHeaders();
            rangeHeaders.set("Range", "bytes=0-0");
            org.springframework.http.HttpEntity<String> requestEntity = new org.springframework.http.HttpEntity<>(rangeHeaders);

            ResponseEntity<String> response = restTemplate.exchange(
                logfileUrl,
                HttpMethod.GET,
                requestEntity,
                String.class
            );

            if (response.getHeaders().containsKey("Content-Range")) {
                String contentRange = response.getHeaders().getFirst("Content-Range");
                log.debug("Content-Range header: {}", contentRange);

                // Parse the Content-Range header (format: "bytes 0-0/12345")
                if (contentRange != null && contentRange.startsWith("bytes ")) {
                    String[] parts = contentRange.substring(6).split("/");
                    if (parts.length == 2) {
                        try {
                            long size = Long.parseLong(parts[1]);
                            log.debug("Logfile size from Content-Range header: {} bytes", size);
                            return size;
                        } catch (NumberFormatException e) {
                            log.warn("Failed to parse Content-Range header: {}", contentRange);
                        }
                    }
                }
            } else {
                log.debug("Content-Range header not found in Range response, fetching entire file");
            }

            // Approach 3: As a last resort, get the entire file and measure its length
            // Note: This is not ideal for large files but ensures we get a size
            log.debug("Fetching entire logfile to determine size");
            String content = restTemplate.getForObject(logfileUrl, String.class);
            if (content != null) {
                long size = content.length();
                log.debug("Logfile size from content length: {} bytes", size);
                return size;
            }

            log.warn("All approaches to determine logfile size failed");
            return 0;
        } catch (RestClientException e) {
            log.error("Failed to get logfile size: {}", e.getMessage());
            return 0;
        }
    }

    /**
     * Parse a duration string into a Duration object.
     *
     * @param durationStr the duration string (e.g., "15s", "1m", "1h")
     * @param defaultDuration the default duration to use if parsing fails
     * @return the parsed duration
     */
    private Duration parseDuration(String durationStr, Duration defaultDuration) {
        if (durationStr == null || durationStr.isEmpty()) {
            return defaultDuration;
        }

        try {
            String value = durationStr.replaceAll("[^0-9]", "");
            String unit = durationStr.replaceAll("[0-9]", "");

            long amount = Long.parseLong(value);

            switch (unit.toLowerCase()) {
                case "s":
                    return Duration.ofSeconds(amount);
                case "m":
                    return Duration.ofMinutes(amount);
                case "h":
                    return Duration.ofHours(amount);
                case "d":
                    return Duration.ofDays(amount);
                default:
                    log.warn("Unknown duration unit: {}. Using default duration.", unit);
                    return defaultDuration;
            }
        } catch (NumberFormatException e) {
            log.warn("Failed to parse duration: {}. Using default duration.", durationStr);
            return defaultDuration;
        }
    }

    /**
     * Convert an object to Double, handling both Number and String types.
     *
     * @param value the value to convert
     * @return the converted Double value, or null if conversion fails
     */
    private Double convertToDouble(Object value) {
        if (value == null) {
            return null;
        }

        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }

        if (value instanceof String) {
            String stringValue = (String) value;
            try {
                return Double.parseDouble(stringValue);
            } catch (NumberFormatException e) {
                log.debug("Failed to parse string value '{}' as double: {}", stringValue, e.getMessage());
                return null;
            }
        }

        log.debug("Cannot convert value of type {} to Double: {}", value.getClass().getSimpleName(), value);
        return null;
    }
}
