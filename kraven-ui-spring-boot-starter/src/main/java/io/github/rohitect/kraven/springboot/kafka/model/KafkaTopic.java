package io.github.rohitect.kraven.springboot.kafka.model;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Represents a Kafka topic.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Kafka topic information")
public class KafkaTopic {

    @Schema(description = "Name of the topic", example = "my-topic")
    private String name;

    @Schema(description = "Number of partitions", example = "3")
    private int partitions;

    @Schema(description = "Replication factor", example = "1")
    private int replicationFactor;

    @Schema(description = "List of partition information")
    private List<PartitionInfo> partitionInfos;

    @Schema(description = "Whether the topic is internal", example = "false")
    private boolean internal;

    @Schema(description = "Segment size in bytes", example = "1073741824")
    private long segmentSize;

    @Schema(description = "Number of segments", example = "5")
    private int segmentCount;

    @Schema(description = "Cleanup policy", example = "delete")
    private String cleanupPolicy;

    @Schema(description = "Message count", example = "1000")
    private long messageCount;

    @Schema(description = "Topic configuration settings")
    private List<TopicSetting> settings;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Kafka topic setting")
    public static class TopicSetting {
        @Schema(description = "Setting name", example = "cleanup.policy")
        private String name;

        @Schema(description = "Setting value", example = "delete")
        private String value;

        @Schema(description = "Setting description", example = "The cleanup policy for the topic")
        private String description;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Kafka partition information")
    public static class PartitionInfo {
        @Schema(description = "Partition ID", example = "0")
        private int id;

        @Schema(description = "Leader broker ID", example = "1")
        private int leader;

        @Schema(description = "List of replica broker IDs", example = "[1, 2, 3]")
        private List<Integer> replicas;

        @Schema(description = "List of in-sync replica broker IDs", example = "[1, 2]")
        private List<Integer> inSyncReplicas;

        @Schema(description = "First offset", example = "0")
        private long firstOffset;

        @Schema(description = "Last offset", example = "1000")
        private long lastOffset;
    }
}
