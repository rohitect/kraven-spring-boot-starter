package io.github.rohitect.kraven.springboot.kafka.model;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Represents a Kafka consumer group.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Kafka consumer group information")
public class KafkaConsumerGroup {

    @Schema(description = "ID of the consumer group", example = "my-consumer-group")
    private String groupId;

    @Schema(description = "State of the consumer group", example = "Stable")
    private String state;

    @Schema(description = "Members of the consumer group")
    private List<GroupMember> members;

    @Schema(description = "Topic partitions assigned to the consumer group")
    private List<TopicPartitionInfo> topicPartitions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Kafka consumer group member information")
    public static class GroupMember {
        @Schema(description = "ID of the member", example = "consumer-1")
        private String memberId;

        @Schema(description = "Client ID", example = "consumer-client-1")
        private String clientId;

        @Schema(description = "Host of the member", example = "localhost")
        private String host;

        @Schema(description = "Topic partition assignment", example = "my-topic-0")
        private String assignment;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Kafka topic partition information")
    public static class TopicPartitionInfo {
        @Schema(description = "Topic name", example = "my-topic")
        private String topic;

        @Schema(description = "Partition ID", example = "0")
        private int partition;

        @Schema(description = "Current offset", example = "1000")
        private long currentOffset;

        @Schema(description = "Log end offset", example = "1500")
        private long logEndOffset;

        @Schema(description = "Lag (difference between log end offset and current offset)", example = "500")
        private long lag;

        @Schema(description = "ID of the member assigned to this partition", example = "consumer-1")
        private String memberId;
    }
}
