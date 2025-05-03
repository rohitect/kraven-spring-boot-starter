package io.github.rohitect.kraven.plugins.kafka.model;

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
public class KafkaConsumerGroup {

    /**
     * Group ID.
     */
    private String groupId;

    /**
     * Group state.
     */
    private String state;

    /**
     * List of members in the group.
     */
    private List<KafkaGroupMember> members;

    /**
     * List of topic partitions assigned to the group.
     */
    private List<KafkaGroupTopicPartition> topicPartitions;
}
