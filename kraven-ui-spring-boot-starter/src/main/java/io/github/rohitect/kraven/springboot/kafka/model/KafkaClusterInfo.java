package io.github.rohitect.kraven.springboot.kafka.model;

import io.swagger.v3.oas.annotations.media.Schema;
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
@Schema(description = "Kafka cluster information")
public class KafkaClusterInfo {

    @Schema(description = "Bootstrap servers", example = "localhost:9092")
    private String bootstrapServers;

    @Schema(description = "Cluster ID", example = "my-cluster")
    private String clusterId;

    @Schema(description = "Controller broker ID", example = "1")
    private int controllerId;

    @Schema(description = "List of brokers in the cluster")
    private List<KafkaBroker> brokers;

    @Schema(description = "List of topics in the cluster")
    private List<KafkaTopic> topics;

    @Schema(description = "List of consumer groups in the cluster")
    private List<KafkaConsumerGroup> consumerGroups;

    @Schema(description = "List of Kafka listeners in the application")
    private List<KafkaListener> listeners;
}
