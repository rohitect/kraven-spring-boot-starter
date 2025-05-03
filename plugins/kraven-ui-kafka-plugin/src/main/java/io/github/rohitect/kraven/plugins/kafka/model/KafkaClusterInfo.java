package io.github.rohitect.kraven.plugins.kafka.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Represents information about a Kafka cluster.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KafkaClusterInfo {

    /**
     * Bootstrap servers.
     */
    private String bootstrapServers;

    /**
     * Cluster ID.
     */
    private String clusterId;

    /**
     * Controller broker ID.
     */
    private int controllerId;

    /**
     * List of brokers in the cluster.
     */
    private List<KafkaBroker> brokers;

    /**
     * List of topics in the cluster.
     */
    private List<KafkaTopic> topics;

    /**
     * List of consumer groups in the cluster.
     */
    private List<KafkaConsumerGroup> consumerGroups;
}
