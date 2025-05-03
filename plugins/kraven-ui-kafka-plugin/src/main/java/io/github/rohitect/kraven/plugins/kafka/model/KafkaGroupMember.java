package io.github.rohitect.kraven.plugins.kafka.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents a member of a Kafka consumer group.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KafkaGroupMember {

    /**
     * Member ID.
     */
    private String memberId;

    /**
     * Client ID.
     */
    private String clientId;

    /**
     * Host.
     */
    private String host;
}
