package io.github.rohitect.kraven.springboot.config;

import io.github.rohitect.kraven.springboot.KravenUiIndexController;
import io.github.rohitect.kraven.springboot.KravenUiProperties;
import io.github.rohitect.kraven.springboot.config.KravenUiEnhancedProperties;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.core.annotation.Order;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.io.IOException;

/**
 * Configuration class to manage controller registration.
 * This class ensures that only one controller is registered to handle the Kraven UI requests.
 */
@Configuration
@Slf4j
@Order(1)
public class KravenUiControllerConfiguration {

    /**
     * Registers a placeholder bean to prevent the original KravenUiIndexController from being created.
     * This bean has the same name as the original controller bean, which prevents Spring from creating
     * the original controller when this bean is active.
     *
     * @return a placeholder KravenUiIndexController bean
     */
    @Bean(name = "kravenUiIndexController")
    @Primary
    @ConditionalOnProperty(name = "kraven.ui.enhanced.enabled", matchIfMissing = true)
    public KravenUiIndexController disableOriginalController(KravenUiProperties properties, KravenUiEnhancedProperties enhancedProperties) {
        log.info("Registering no-op KravenUiIndexController to avoid ambiguous mapping");

        // Create a no-op controller that will never actually handle requests
        return new KravenUiIndexController(properties, enhancedProperties) {
            @Override
            public ResponseEntity<?> handleAllRequests(HttpServletRequest request) throws IOException {
                log.debug("No-op KravenUiIndexController called, this should never happen");
                return ResponseEntity.notFound().build();
            }
        };
    }

    /**
     * Controller advice to handle exceptions from the controllers.
     */
    @ControllerAdvice
    public static class KravenUiControllerExceptionHandler {

        /**
         * Handles ambiguous mapping exceptions.
         */
        @ExceptionHandler(IllegalStateException.class)
        public ResponseEntity<?> handleAmbiguousMapping(IllegalStateException ex) {
            if (ex.getMessage() != null && ex.getMessage().contains("Ambiguous handler methods mapped")) {
                log.error("Ambiguous mapping detected: {}", ex.getMessage());
                return ResponseEntity.status(500)
                        .body("Ambiguous mapping detected. Please check your configuration.");
            }
            throw ex;
        }
    }
}
