package io.github.rohitect.kraven.springboot.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

/**
 * Cache configuration for Kraven UI.
 * This class is kept for backward compatibility but is no longer used.
 * Kraven UI now uses its own internal caching mechanism that doesn't depend on Spring's caching infrastructure.
 *
 * @deprecated This class is kept for backward compatibility but is no longer used.
 */
@Configuration
@ConditionalOnProperty(name = "kraven.ui.cache.enabled", matchIfMissing = true)
@Slf4j
@Deprecated
public class KravenUiCacheConfiguration {

    public KravenUiCacheConfiguration() {
        log.info("KravenUiCacheConfiguration initialized (deprecated, using internal caching)");
    }
}
