package io.github.rohitect.kraven.plugins.kafka.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Represents a Kafka topic.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KafkaTopic {

    /**
     * Topic name.
     */
    private String name;

    /**
     * Number of partitions.
     */
    private int partitions;

    /**
     * Replication factor.
     */
    private int replicationFactor;

    /**
     * Topic configuration.
     */
    private Map<String, String> config;

    /**
     * List of partitions.
     */
    private List<KafkaTopicPartition> topicPartitions;
}
