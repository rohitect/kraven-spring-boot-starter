package io.github.rohitect.kraven.plugins.kafka;

import lombok.Data;

/**
 * Configuration properties for the Kafka plugin.
 */
@Data
public class KafkaPluginConfig {
    
    /**
     * Enable or disable the Kafka plugin.
     */
    private boolean enabled = true;
    
    /**
     * The base packages to scan for Kafka listeners.
     */
    private String[] basePackages = {"io.github", "com", "org", "net"};
    
    /**
     * Enable or disable message consumption.
     */
    private boolean messageConsumptionEnabled = true;
    
    /**
     * Enable or disable message production.
     */
    private boolean messageProductionEnabled = false;
    
    /**
     * Enable or disable streaming.
     */
    private boolean streamingEnabled = true;
    
    /**
     * The timeout for SSE connections in milliseconds.
     */
    private long sseTimeoutMs = 300000; // 5 minutes
    
    /**
     * The default message limit for topic consumption.
     */
    private int defaultMessageLimit = 100;
    
    /**
     * The maximum message limit for topic consumption.
     */
    private int maxMessageLimit = 1000;
}
