package io.github.rohitect.kraven.plugins.actuatorinsights.service;

import io.github.rohitect.kraven.plugins.actuatorinsights.config.ActuatorInsightsConfig;
import lombok.extern.slf4j.Slf4j;

import java.util.*;
import java.util.regex.Pattern;

/**
 * Service for masking sensitive data in environment variables.
 */
@Slf4j
public class SensitiveDataMaskingService {

    private static final String MASKED_VALUE = "********";

    // Common patterns for sensitive keys (case-insensitive)
    private final Set<Pattern> sensitivePatterns = new HashSet<>();

    // Cache for masked environment data
    private Map<String, Object> maskedEnvDataCache = null;

    // Configuration
    private final ActuatorInsightsConfig config;

    /**
     * Create a new SensitiveDataMaskingService with configuration.
     *
     * @param config the actuator insights configuration
     */
    public SensitiveDataMaskingService(ActuatorInsightsConfig config) {
        this.config = config;

        // Initialize sensitive patterns from configuration
        initializeSensitivePatterns();
    }

    /**
     * Initialize sensitive patterns from configuration.
     */
    private void initializeSensitivePatterns() {
        String patternsConfig = config.getSensitiveData().getSensitivePatterns();
        if (patternsConfig != null && !patternsConfig.isEmpty()) {
            String[] patterns = patternsConfig.split(",");
            for (String pattern : patterns) {
                String trimmedPattern = pattern.trim();
                if (!trimmedPattern.isEmpty()) {
                    addSensitivePattern(trimmedPattern);
                    log.debug("Added sensitive pattern: {}", trimmedPattern);
                }
            }
        } else {
            // Add default patterns if none are configured
            addDefaultPatterns();
        }
    }

    /**
     * Add default sensitive patterns.
     */
    private void addDefaultPatterns() {
        addSensitivePattern("password");
        addSensitivePattern("passwd");
        addSensitivePattern("secret");
        addSensitivePattern("credential");
        addSensitivePattern("token");
        addSensitivePattern("key");
        addSensitivePattern("auth");
        addSensitivePattern("private");
        addSensitivePattern("access");
    }

    /**
     * Add a sensitive pattern to the list of patterns to mask.
     *
     * @param pattern the pattern to add (case-insensitive)
     */
    public void addSensitivePattern(String pattern) {
        sensitivePatterns.add(Pattern.compile(pattern, Pattern.CASE_INSENSITIVE));
    }

    /**
     * Check if a key is sensitive based on the configured patterns.
     *
     * @param key the key to check
     * @return true if the key is sensitive, false otherwise
     */
    public boolean isSensitiveKey(String key) {
        if (key == null) {
            return false;
        }

        for (Pattern pattern : sensitivePatterns) {
            if (pattern.matcher(key).find()) {
                return true;
            }
        }

        return false;
    }

    /**
     * Mask sensitive values in the environment data.
     *
     * @param envData the environment data to mask
     * @return the masked environment data
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> maskSensitiveValues(Map<String, Object> envData) {
        // If masking is disabled, return the original data
        if (!config.getSensitiveData().isMaskSensitiveValues()) {
            log.debug("Sensitive value masking is disabled, returning original data");
            return envData;
        }

        // If we already have a cached masked version, return it
        if (maskedEnvDataCache != null) {
            log.debug("Returning cached masked environment data");
            return maskedEnvDataCache;
        }

        // If the input is null, return null
        if (envData == null) {
            return null;
        }

        log.debug("Masking sensitive values in environment data");

        // Create a deep copy of the environment data
        Map<String, Object> maskedEnvData = new HashMap<>(envData);

        // Process property sources if they exist
        if (maskedEnvData.containsKey("propertySources") && maskedEnvData.get("propertySources") instanceof List) {
            List<Map<String, Object>> propertySources = new ArrayList<>();

            for (Object source : (List<?>) maskedEnvData.get("propertySources")) {
                if (source instanceof Map) {
                    Map<String, Object> propertySource = new HashMap<>((Map<String, Object>) source);

                    // Process properties if they exist
                    if (propertySource.containsKey("properties") && propertySource.get("properties") instanceof Map) {
                        Map<String, Object> properties = new HashMap<>();
                        Map<String, Object> originalProperties = (Map<String, Object>) propertySource.get("properties");

                        for (Map.Entry<String, Object> entry : originalProperties.entrySet()) {
                            String key = entry.getKey();
                            Object value = entry.getValue();

                            if (value instanceof Map) {
                                Map<String, Object> propertyDetails = new HashMap<>((Map<String, Object>) value);

                                // Mask the value if the key is sensitive
                                if (isSensitiveKey(key) && propertyDetails.containsKey("value")) {
                                    Object originalValue = propertyDetails.get("value");
                                    propertyDetails.put("value", MASKED_VALUE);
                                    log.debug("Masked sensitive value for key: {}", key);
                                }

                                properties.put(key, propertyDetails);
                            } else {
                                properties.put(key, value);
                            }
                        }

                        propertySource.put("properties", properties);
                    }

                    propertySources.add(propertySource);
                }
            }

            maskedEnvData.put("propertySources", propertySources);
        }

        // Cache the masked data for future use
        maskedEnvDataCache = maskedEnvData;

        return maskedEnvData;
    }

    /**
     * Clear the cached masked environment data.
     * This should be called when the environment data is refreshed.
     */
    public void clearCache() {
        log.debug("Clearing masked environment data cache");
        maskedEnvDataCache = null;
    }
}
