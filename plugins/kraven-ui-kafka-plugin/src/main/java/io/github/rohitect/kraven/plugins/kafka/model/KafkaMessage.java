package io.github.rohitect.kraven.plugins.kafka.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Represents a Kafka message.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KafkaMessage {

    /**
     * Message key.
     */
    private String key;

    /**
     * Message value.
     */
    private Object value;

    /**
     * Message headers.
     */
    private Map<String, String> headers;

    /**
     * Partition.
     */
    private int partition;

    /**
     * Offset.
     */
    private long offset;

    /**
     * Timestamp.
     */
    private long timestamp;
}
