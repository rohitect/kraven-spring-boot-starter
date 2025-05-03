package io.github.rohitect.kraven.plugins.kafka.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents a topic partition assigned to a Kafka consumer group.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KafkaGroupTopicPartition {

    /**
     * Topic name.
     */
    private String topic;

    /**
     * Partition ID.
     */
    private int partition;

    /**
     * Current offset.
     */
    private long currentOffset;

    /**
     * Log end offset.
     */
    private long logEndOffset;

    /**
     * Lag (difference between log end offset and current offset).
     */
    private long lag;

    /**
     * Member ID.
     */
    private String memberId;
}
