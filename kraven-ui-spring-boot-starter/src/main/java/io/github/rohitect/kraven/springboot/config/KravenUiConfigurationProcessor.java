package io.github.rohitect.kraven.springboot.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.MutablePropertySources;

import java.util.HashMap;
import java.util.Map;

/**
 * Environment post-processor that processes Kraven UI configuration from environment variables.
 * This processor looks for the KRAVEN_UI_CONFIG environment variable, which should contain a JSON
 * representation of the Kraven UI configuration. The JSON is parsed and added to the environment
 * as properties with the prefix "kraven.ui".
 */
@Slf4j
public class KravenUiConfigurationProcessor implements EnvironmentPostProcessor {

    private static final String ENV_VAR_NAME = "KRAVEN_UI_CONFIG";
    private static final String PROPERTY_SOURCE_NAME = "kravenUiEnvConfig";
    private static final String CONFIG_PREFIX = "kraven.ui";

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String envConfig = System.getenv(ENV_VAR_NAME);
        if (envConfig != null && !envConfig.isEmpty()) {
            try {
                log.info("Found Kraven UI configuration in environment variable: {}", ENV_VAR_NAME);
                @SuppressWarnings("unchecked")
                Map<String, Object> configMap = objectMapper.readValue(envConfig, Map.class);
                Map<String, Object> properties = flattenMap(configMap, CONFIG_PREFIX);

                MutablePropertySources propertySources = environment.getPropertySources();
                propertySources.addFirst(new MapPropertySource(PROPERTY_SOURCE_NAME, properties));

                log.info("Added {} Kraven UI configuration properties from environment variable", properties.size());
            } catch (Exception e) {
                log.error("Failed to process Kraven UI configuration from environment variable", e);
            }
        }
    }

    /**
     * Flattens a nested map into a flat map with dot-separated keys.
     *
     * @param map the nested map to flatten
     * @param prefix the prefix to prepend to all keys
     * @return a flat map with dot-separated keys
     */
    private Map<String, Object> flattenMap(Map<String, Object> map, String prefix) {
        Map<String, Object> result = new HashMap<>();

        for (Map.Entry<String, Object> entry : map.entrySet()) {
            String key = prefix + "." + entry.getKey();
            Object value = entry.getValue();

            if (value instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> nestedMap = (Map<String, Object>) value;
                result.putAll(flattenMap(nestedMap, key));
            } else {
                result.put(key, value);
            }
        }

        return result;
    }
}
