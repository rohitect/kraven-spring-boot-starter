package io.github.rohitect.kraven.plugins.kafka.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Represents a Kafka topic partition.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KafkaTopicPartition {

    /**
     * Partition ID.
     */
    private int partition;

    /**
     * Leader broker ID.
     */
    private int leader;

    /**
     * List of replica broker IDs.
     */
    private List<Integer> replicas;

    /**
     * List of in-sync replica broker IDs.
     */
    private List<Integer> isr;

    /**
     * Beginning offset.
     */
    private long beginningOffset;

    /**
     * End offset.
     */
    private long endOffset;
}
