package io.github.rohitect.kraven.springboot.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationStartedEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Initializes the Kraven UI configuration after the application has started.
 * This component validates the configuration and logs any issues.
 */
@Component
@Slf4j
public class KravenUiConfigurationInitializer implements ApplicationListener<ApplicationStartedEvent> {

    private final KravenUiEnhancedProperties properties;
    private final Environment environment;
    private final ObjectMapper objectMapper;

    @Autowired
    public KravenUiConfigurationInitializer(
            KravenUiEnhancedProperties properties,
            Environment environment,
            ObjectMapper objectMapper) {
        this.properties = properties;
        this.environment = environment;
        this.objectMapper = objectMapper;
    }

    @Override
    public void onApplicationEvent(ApplicationStartedEvent event) {
        log.info("Initializing Kraven UI configuration");

        // Validate configuration
        validateConfiguration();

        // Log configuration summary
        logConfigurationSummary();
    }

    /**
     * Validates the Kraven UI configuration.
     * This method checks for any invalid or incompatible configuration values.
     */
    private void validateConfiguration() {
        // Validate path
        if (properties.getPath() == null || properties.getPath().trim().isEmpty()) {
            log.warn("Kraven UI path is empty, using default: /kraven");
            properties.setPath("/kraven");
        }

        // Validate dark theme colors
        if (properties.getTheme().getDarkPrimaryColor() == null || properties.getTheme().getDarkPrimaryColor().trim().isEmpty()) {
            log.warn("Dark theme primary color is empty, using default: #1976d2");
            properties.getTheme().setDarkPrimaryColor("#1976d2");
        }

        if (properties.getTheme().getDarkSecondaryColor() == null || properties.getTheme().getDarkSecondaryColor().trim().isEmpty()) {
            log.warn("Dark theme secondary color is empty, using default: #424242");
            properties.getTheme().setDarkSecondaryColor("#424242");
        }

        if (properties.getTheme().getDarkBackgroundColor() == null || properties.getTheme().getDarkBackgroundColor().trim().isEmpty()) {
            log.warn("Dark theme background color is empty, using default: #121212");
            properties.getTheme().setDarkBackgroundColor("#121212");
        }

        // Validate light theme colors
        if (properties.getTheme().getLightPrimaryColor() == null || properties.getTheme().getLightPrimaryColor().trim().isEmpty()) {
            log.warn("Light theme primary color is empty, using default: #1976d2");
            properties.getTheme().setLightPrimaryColor("#1976d2");
        }

        if (properties.getTheme().getLightSecondaryColor() == null || properties.getTheme().getLightSecondaryColor().trim().isEmpty()) {
            log.warn("Light theme secondary color is empty, using default: #424242");
            properties.getTheme().setLightSecondaryColor("#424242");
        }

        if (properties.getTheme().getLightBackgroundColor() == null || properties.getTheme().getLightBackgroundColor().trim().isEmpty()) {
            log.warn("Light theme background color is empty, using default: #ffffff");
            properties.getTheme().setLightBackgroundColor("#ffffff");
        }



        if (properties.getTheme().getDefaultTheme() == null || properties.getTheme().getDefaultTheme().trim().isEmpty()) {
            log.warn("Default theme is empty, using default: dark");
            properties.getTheme().setDefaultTheme("dark");
        } else if (!properties.getTheme().getDefaultTheme().equals("light") && !properties.getTheme().getDefaultTheme().equals("dark")) {
            log.warn("Default theme '{}' is invalid, must be 'light' or 'dark', using default: dark", properties.getTheme().getDefaultTheme());
            properties.getTheme().setDefaultTheme("dark");
        }

        // Validate custom CSS and JS paths
        if (properties.getTheme().getCustomCssPath() != null && !properties.getTheme().getCustomCssPath().trim().isEmpty()) {
            log.info("Custom CSS path configured: {}", properties.getTheme().getCustomCssPath());
        }

        if (properties.getTheme().getCustomJsPath() != null && !properties.getTheme().getCustomJsPath().trim().isEmpty()) {
            log.info("Custom JavaScript path configured: {}", properties.getTheme().getCustomJsPath());
        }

        // Validate Feign client configuration
        if (properties.getFeignClient().isEnabled()) {
            if (properties.getFeignClient().getBasePackages() == null || properties.getFeignClient().getBasePackages().length == 0) {
                log.warn("Feign client base packages is empty, using default packages");
                properties.getFeignClient().setBasePackages(new String[]{"io.github", "com", "org", "net"});
            }

            if (properties.getFeignClient().getApiPath() == null || properties.getFeignClient().getApiPath().trim().isEmpty()) {
                log.warn("Feign client API path is empty, using default: /kraven/v1/feign-clients");
                properties.getFeignClient().setApiPath("/kraven/v1/feign-clients");
            }

            if (properties.getFeignClient().getScanIntervalMs() < 0) {
                log.warn("Feign client scan interval is negative, using default: 0");
                properties.getFeignClient().setScanIntervalMs(0);
            }
        }

        // Validate Kafka configuration
        if (properties.getKafka().isEnabled()) {
            if (properties.getKafka().getBasePackages() == null || properties.getKafka().getBasePackages().length == 0) {
                log.warn("Kafka base packages is empty, using default packages");
                properties.getKafka().setBasePackages(new String[]{"io.github", "com", "org", "net"});
            }

            if (properties.getKafka().getMessageLimit() <= 0) {
                log.warn("Kafka message limit is invalid, using default: 100");
                properties.getKafka().setMessageLimit(100);
            }
        }

        // Validate metrics configuration
        if (properties.getMetrics().isEnabled()) {
            if (properties.getMetrics().getRefreshIntervalMs() < 1000) {
                log.warn("Metrics refresh interval is too low, using minimum: 1000ms");
                properties.getMetrics().setRefreshIntervalMs(1000);
            }
        }
    }

    /**
     * Logs a summary of the Kraven UI configuration.
     */
    private void logConfigurationSummary() {
        log.info("Kraven UI Configuration Summary:");
        log.info("  Enabled: {}", properties.isEnabled());
        log.info("  Path: {}", properties.getNormalizedPath());
        log.info("  Version: {}", properties.getVersion());
        log.info("  Development Mode: {}", properties.isDevelopmentMode());
        log.info("  Enhanced Mode: {}", properties.getEnhanced().isEnabled());
        log.info("  Layout Type: {}", properties.getLayout().getType());
        log.info("  Theme: Default={}, SystemPreference={}",
                properties.getTheme().getDefaultTheme(),
                properties.getTheme().isRespectSystemPreference());
        log.info("  Dark Theme Colors: Primary={}, Secondary={}, Background={}",
                properties.getTheme().getDarkPrimaryColor(),
                properties.getTheme().getDarkSecondaryColor(),
                properties.getTheme().getDarkBackgroundColor());
        log.info("  Light Theme Colors: Primary={}, Secondary={}, Background={}",
                properties.getTheme().getLightPrimaryColor(),
                properties.getTheme().getLightSecondaryColor(),
                properties.getTheme().getLightBackgroundColor());
        if (properties.getTheme().getCustomCssPath() != null && !properties.getTheme().getCustomCssPath().trim().isEmpty()) {
            log.info("  Custom CSS: {}", properties.getTheme().getCustomCssPath());
        }
        if (properties.getTheme().getCustomJsPath() != null && !properties.getTheme().getCustomJsPath().trim().isEmpty()) {
            log.info("  Custom JS: {}", properties.getTheme().getCustomJsPath());
        }
        log.info("  API Docs: Enabled={}, Path={}",
                properties.getApiDocs().isEnabled(),
                properties.getApiDocs().getSpecPath());
        log.info("  Feign Client: Enabled={}, API Path={}, Try-It-Out={}, Cache={}, Scan Interval={}ms",
                properties.getFeignClient().isEnabled(),
                properties.getFeignClient().getApiPath(),
                properties.getFeignClient().isTryItOutEnabled(),
                properties.getFeignClient().isCacheMetadata(),
                properties.getFeignClient().getScanIntervalMs());
        log.info("  Kafka: Enabled={}, Message Limit={}",
                properties.getKafka().isEnabled(),
                properties.getKafka().getMessageLimit());
        log.info("  Metrics: Enabled={}, Auto-Refresh={}",
                properties.getMetrics().isEnabled(),
                properties.getMetrics().isAutoRefreshEnabled());
    }

    /**
     * Creates a JSON representation of the configuration for the frontend.
     *
     * @return a JSON string representing the configuration
     */
    public String createFrontendConfigJson() {
        try {
            Map<String, Object> config = new HashMap<>();

            // Basic configuration
            config.put("basePath", properties.getNormalizedPath());
            config.put("apiDocsPath", properties.getApiDocs().getSpecPath());
            config.put("title", "API Documentation");
            config.put("enhancedMode", properties.getEnhanced().isEnabled());

            // Theme configuration
            Map<String, Object> theme = new HashMap<>();

            // Theme-specific colors
            theme.put("darkPrimaryColor", properties.getTheme().getDarkPrimaryColor());
            theme.put("darkSecondaryColor", properties.getTheme().getDarkSecondaryColor());
            theme.put("darkBackgroundColor", properties.getTheme().getDarkBackgroundColor());
            theme.put("lightPrimaryColor", properties.getTheme().getLightPrimaryColor());
            theme.put("lightSecondaryColor", properties.getTheme().getLightSecondaryColor());
            theme.put("lightBackgroundColor", properties.getTheme().getLightBackgroundColor());

            // For backward compatibility
            theme.put("primaryColor", "dark".equals(properties.getTheme().getDefaultTheme()) ?
                    properties.getTheme().getDarkPrimaryColor() : properties.getTheme().getLightPrimaryColor());
            theme.put("secondaryColor", "dark".equals(properties.getTheme().getDefaultTheme()) ?
                    properties.getTheme().getDarkSecondaryColor() : properties.getTheme().getLightSecondaryColor());

            theme.put("fontFamily", "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif"); // Default font family
            theme.put("defaultTheme", properties.getTheme().getDefaultTheme());
            theme.put("respectSystemPreference", properties.getTheme().isRespectSystemPreference());
            theme.put("customCssPath", properties.getTheme().getCustomCssPath());
            theme.put("customJsPath", properties.getTheme().getCustomJsPath());
            config.put("theme", theme);

            // Layout configuration
            Map<String, Object> layout = new HashMap<>();
            layout.put("type", properties.getLayout().getType());
            layout.put("showSidebar", properties.getLayout().isShowSidebar());
            layout.put("middlePaneWidth", properties.getLayout().getMiddlePaneWidth());
            layout.put("rightPaneWidth", properties.getLayout().getRightPaneWidth());
            config.put("layout", layout);

            // API Docs configuration
            Map<String, Object> apiDocs = new HashMap<>();
            apiDocs.put("enabled", properties.getApiDocs().isEnabled());
            apiDocs.put("tryItOutEnabled", properties.getApiDocs().isTryItOutEnabled());
            apiDocs.put("showExamples", false);
            apiDocs.put("expandOperations", false);
            apiDocs.put("showApiInfo", true);
            apiDocs.put("syntaxHighlighting", true);
            apiDocs.put("markdownEnabled", true);
            config.put("apiDocs", apiDocs);

            // Feign client configuration
            Map<String, Object> feignClient = new HashMap<>();
            feignClient.put("enabled", properties.getFeignClient().isEnabled());
            feignClient.put("apiPath", properties.getFeignClient().getApiPath());
            feignClient.put("tryItOutEnabled", properties.getFeignClient().isTryItOutEnabled());
            feignClient.put("cacheMetadata", properties.getFeignClient().isCacheMetadata());
            feignClient.put("scanIntervalMs", properties.getFeignClient().getScanIntervalMs());
            config.put("feignClient", feignClient);

            // Kafka configuration
            Map<String, Object> kafka = new HashMap<>();
            kafka.put("enabled", properties.getKafka().isEnabled());
            kafka.put("apiPath", properties.getKafka().getApiPath());
            kafka.put("messageLimit", properties.getKafka().getMessageLimit());
            kafka.put("streamingEnabled", properties.getKafka().isStreamingEnabled());
            kafka.put("messageProductionEnabled", properties.getKafka().isMessageProductionEnabled());
            kafka.put("messageConsumptionEnabled", properties.getKafka().isMessageConsumptionEnabled());
            config.put("kafka", kafka);

            // Metrics configuration
            Map<String, Object> metrics = new HashMap<>();
            metrics.put("enabled", properties.getMetrics().isEnabled());
            metrics.put("apiPath", properties.getMetrics().getApiPath());
            metrics.put("refreshIntervalMs", properties.getMetrics().getRefreshIntervalMs());
            metrics.put("autoRefreshEnabled", properties.getMetrics().isAutoRefreshEnabled());
            metrics.put("jvmMetricsEnabled", properties.getMetrics().isJvmMetricsEnabled());
            metrics.put("springMetricsEnabled", properties.getMetrics().isSpringMetricsEnabled());
            metrics.put("kafkaMetricsEnabled", properties.getMetrics().isKafkaMetricsEnabled());
            metrics.put("feignMetricsEnabled", properties.getMetrics().isFeignMetricsEnabled());
            metrics.put("threadDumpEnabled", properties.getMetrics().isThreadDumpEnabled());
            metrics.put("heapDumpEnabled", properties.getMetrics().isHeapDumpEnabled());
            config.put("metrics", metrics);

            // Add any additional properties
            config.putAll(properties.getAdditionalProperties());

            return objectMapper.writeValueAsString(config);
        } catch (Exception e) {
            log.error("Failed to create frontend configuration JSON", e);
            return "{}";
        }
    }
}
