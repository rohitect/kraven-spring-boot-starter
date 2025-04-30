package io.github.rohitect.kraven.springboot.cache;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/**
 * Internal cache service for Kraven UI.
 * This service provides a simple in-memory cache that doesn't depend on Spring's caching infrastructure.
 */
@Component
@Slf4j
public class KravenUiCacheService {

    private final Map<String, Object> cache = new ConcurrentHashMap<>();
    private final boolean cacheEnabled;

    public KravenUiCacheService(@Value("${kraven.ui.cache.enabled:true}") boolean cacheEnabled) {
        this.cacheEnabled = cacheEnabled;
        log.info("KravenUiCacheService initialized with caching {}", cacheEnabled ? "enabled" : "disabled");
    }

    /**
     * Gets a value from the cache, or computes it if not present.
     *
     * @param cacheKey the cache key
     * @param supplier the supplier to compute the value if not present
     * @param <T>      the type of the value
     * @return the cached or computed value
     */
    @SuppressWarnings("unchecked")
    public <T> T getOrCompute(String cacheKey, Supplier<T> supplier) {
        if (!cacheEnabled) {
            return supplier.get();
        }

        return (T) cache.computeIfAbsent(cacheKey, k -> {
            log.debug("Cache miss for key: {}", k);
            return supplier.get();
        });
    }

    /**
     * Clears the cache.
     */
    public void clearCache() {
        log.info("Clearing Kraven UI cache");
        cache.clear();
    }

    /**
     * Removes a specific key from the cache.
     *
     * @param cacheKey the cache key to remove
     */
    public void invalidate(String cacheKey) {
        log.debug("Invalidating cache key: {}", cacheKey);
        cache.remove(cacheKey);
    }

    /**
     * Checks if caching is enabled.
     *
     * @return true if caching is enabled, false otherwise
     */
    public boolean isCacheEnabled() {
        return cacheEnabled;
    }
}
