package io.github.rohitect.kraven.springboot.metrics.model;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

/**
 * Model class for application metrics.
 */
@Data
@Builder
public class ApplicationMetrics {

    /**
     * JVM metrics.
     */
    private JvmMetrics jvm;

    /**
     * Application metrics.
     */
    private AppMetrics application;

    /**
     * Spring metrics.
     */
    private SpringMetrics spring;

    /**
     * Kafka metrics.
     */
    private KafkaMetrics kafka;

    /**
     * Feign client metrics.
     */
    private FeignMetrics feign;

    /**
     * JVM metrics.
     */
    @Data
    @Builder
    public static class JvmMetrics {
        private long totalMemory;
        private long freeMemory;
        private long maxMemory;
        private long usedMemory;
        private MemoryDetails memoryDetails;
        private int availableProcessors;
        private int threadCount;
        private int peakThreadCount;
        private int daemonThreadCount;
        private long totalStartedThreadCount;
        private long uptime;
        private int loadedClassCount;
        private long totalLoadedClassCount;
        private long unloadedClassCount;
        private Map<String, String> systemProperties;
        private GarbageCollectorMetrics garbageCollector;
    }

    /**
     * Detailed memory metrics.
     */
    @Data
    @Builder
    public static class MemoryDetails {
        private MemoryPoolMetrics heap;
        private MemoryPoolMetrics nonHeap;
        private Map<String, MemoryPoolMetrics> memoryPools;
    }

    /**
     * Memory pool metrics.
     */
    @Data
    @Builder
    public static class MemoryPoolMetrics {
        private String name;
        private long init;
        private long used;
        private long committed;
        private long max;
        private double usagePercentage;
    }

    /**
     * Garbage collector metrics.
     */
    @Data
    @Builder
    public static class GarbageCollectorMetrics {
        private Map<String, GarbageCollectorInfo> collectors;
    }

    /**
     * Garbage collector info.
     */
    @Data
    @Builder
    public static class GarbageCollectorInfo {
        private String name;
        private long collectionCount;
        private long collectionTime;
    }

    /**
     * Application metrics.
     */
    @Data
    @Builder
    public static class AppMetrics {
        private String name;
        private String version;
        private String buildTime;
        private String startTime;
        private long uptime;
        private String[] profiles;
    }

    /**
     * Spring metrics.
     */
    @Data
    @Builder
    public static class SpringMetrics {
        private int beanCount;
        private int controllerCount;
        private int serviceCount;
        private int repositoryCount;
        private int componentCount;
        private int configurationCount;
        private int endpointCount;
    }

    /**
     * Kafka metrics.
     */
    @Data
    @Builder
    public static class KafkaMetrics {
        private int topicCount;
        private int consumerCount;
        private int producerCount;
        private int listenerCount;
    }

    /**
     * Feign client metrics.
     */
    @Data
    @Builder
    public static class FeignMetrics {
        private int clientCount;
        private int methodCount;
    }
}
