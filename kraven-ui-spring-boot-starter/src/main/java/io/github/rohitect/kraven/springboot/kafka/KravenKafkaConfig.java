package io.github.rohitect.kraven.springboot.kafka;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

/**
 * Configuration for Kafka admin client.
 */
@Configuration
@ConditionalOnProperty(prefix = "kraven.ui.kafka", name = "enabled", matchIfMissing = true)
@ConditionalOnClass(name = "org.springframework.kafka.core.KafkaAdmin")
public class KravenKafkaConfig {

    @Value("${spring.kafka.bootstrap-servers:localhost:9092}")
    private String bootstrapServers;

    /**
     * Kafka admin client configuration.
     */
    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnClass(name = {"org.springframework.kafka.core.KafkaAdmin", "org.apache.kafka.clients.admin.AdminClientConfig"})
    public Object kafkaAdmin() {
        try {
            Class<?> kafkaAdminClass = Class.forName("org.springframework.kafka.core.KafkaAdmin");
            Class<?> adminClientConfigClass = Class.forName("org.apache.kafka.clients.admin.AdminClientConfig");

            Map<String, Object> configs = new HashMap<>();
            configs.put(adminClientConfigClass.getField("BOOTSTRAP_SERVERS_CONFIG").get(null).toString(), bootstrapServers);

            return kafkaAdminClass.getConstructor(Map.class).newInstance(configs);
        } catch (Exception e) {
            throw new RuntimeException("Failed to create KafkaAdmin", e);
        }
    }
}
