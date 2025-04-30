package io.github.rohitect.kraven.springboot.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.AutoConfigureBefore;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;

import io.github.rohitect.kraven.springboot.KravenUiAutoConfiguration;
import io.github.rohitect.kraven.springboot.KravenUiIndexController;
import io.github.rohitect.kraven.springboot.KravenUiProperties;

/**
 * Auto-configuration for the enhanced Kraven UI configuration system.
 * This configuration is loaded before the standard KravenUiAutoConfiguration
 * to ensure that the enhanced properties are available.
 */
@Configuration
@ConditionalOnWebApplication
@EnableConfigurationProperties(KravenUiEnhancedProperties.class)
@ConditionalOnProperty(
    name = {
        "kraven.ui.enabled",
        "kraven.ui.enhanced.enabled"
    },
    matchIfMissing = true
)
@AutoConfigureBefore(KravenUiAutoConfiguration.class)
@Order(1) // Higher precedence than the default auto-configuration
@Slf4j
public class KravenUiEnhancedAutoConfiguration {

    /**
     * Creates the configuration processor.
     *
     * @return the configuration processor
     */
    @Bean
    @ConditionalOnMissingBean
    public KravenUiConfigurationProcessor kravenUiConfigurationProcessor() {
        return new KravenUiConfigurationProcessor();
    }

    /**
     * Creates the configuration initializer.
     *
     * @param properties the enhanced properties
     * @param environment the environment
     * @param objectMapper the object mapper
     * @return the configuration initializer
     */
    @Bean
    @ConditionalOnMissingBean
    public KravenUiConfigurationInitializer kravenUiConfigurationInitializer(
            KravenUiEnhancedProperties properties,
            Environment environment,
            ObjectMapper objectMapper) {
        return new KravenUiConfigurationInitializer(properties, environment, objectMapper);
    }

    /**
     * Creates the Kraven UI index controller.
     *
     * @param properties the enhanced properties
     * @param configInitializer the configuration initializer
     * @return the Kraven UI index controller
     */
    @Bean
    @ConditionalOnMissingBean
    public KravenUiIndexController kravenUiIndexController(
            KravenUiEnhancedProperties properties,
            KravenUiConfigurationInitializer configInitializer) {
        log.info("Initializing KravenUiIndexController");
        return new KravenUiIndexController(properties, configInitializer);
    }

    /**
     * Creates a compatibility adapter that maps the enhanced properties to the standard properties.
     * This ensures backward compatibility with code that uses the standard properties.
     *
     * @param enhancedProperties the enhanced properties
     * @return the standard properties
     */
    @Bean
    @Primary
    @ConditionalOnMissingBean(KravenUiProperties.class)
    public KravenUiProperties kravenUiProperties(KravenUiEnhancedProperties enhancedProperties) {
        log.info("Creating compatibility adapter for KravenUiProperties");

        KravenUiProperties properties = new KravenUiProperties();

        // Copy basic properties
        properties.setEnabled(enhancedProperties.isEnabled());
        // Path is now hardcoded
        properties.setVersion(enhancedProperties.getVersion());

        // Copy enhanced properties
        properties.getEnhanced().setEnabled(enhancedProperties.getEnhanced().isEnabled());

        // Copy layout properties
        KravenUiProperties.Layout layout = new KravenUiProperties.Layout();
        layout.setType(enhancedProperties.getLayout().getType());
        properties.setLayout(layout);

        // Copy theme properties
        KravenUiProperties.Theme theme = new KravenUiProperties.Theme();
        theme.setDarkPrimaryColor(enhancedProperties.getTheme().getDarkPrimaryColor());
        theme.setDarkSecondaryColor(enhancedProperties.getTheme().getDarkSecondaryColor());
        theme.setDarkBackgroundColor(enhancedProperties.getTheme().getDarkBackgroundColor());
        theme.setLightPrimaryColor(enhancedProperties.getTheme().getLightPrimaryColor());
        theme.setLightSecondaryColor(enhancedProperties.getTheme().getLightSecondaryColor());
        theme.setLightBackgroundColor(enhancedProperties.getTheme().getLightBackgroundColor());

        theme.setCustomCssPath(enhancedProperties.getTheme().getCustomCssPath());
        theme.setCustomJsPath(enhancedProperties.getTheme().getCustomJsPath());
        theme.setDefaultTheme(enhancedProperties.getTheme().getDefaultTheme());
        theme.setRespectSystemPreference(enhancedProperties.getTheme().isRespectSystemPreference());
        properties.setTheme(theme);

        // Copy Feign client properties
        KravenUiProperties.FeignClientConfig feignClient = new KravenUiProperties.FeignClientConfig();
        feignClient.setEnabled(enhancedProperties.getFeignClient().isEnabled());
        feignClient.setBasePackages(enhancedProperties.getFeignClient().getBasePackages());
        properties.setFeignClient(feignClient);

        // Copy Kafka properties
        KravenUiProperties.KafkaConfig kafka = new KravenUiProperties.KafkaConfig();
        kafka.setEnabled(enhancedProperties.getKafka().isEnabled());
        kafka.setBasePackages(enhancedProperties.getKafka().getBasePackages());
        properties.setKafka(kafka);

        // Copy Business Flow properties if available
        try {
            KravenUiProperties.BusinessFlowConfig businessFlow = new KravenUiProperties.BusinessFlowConfig();
            businessFlow.setEnabled(enhancedProperties.getBusinessFlow().isEnabled());
            businessFlow.setBasePackages(enhancedProperties.getBusinessFlow().getBasePackages());
            properties.setBusinessFlow(businessFlow);
        } catch (Exception e) {
            log.warn("Failed to copy business flow properties: {}", e.getMessage());
        }

        return properties;
    }
}
