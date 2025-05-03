package io.github.rohitect.kraven.plugins.kafka.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents a Kafka broker.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KafkaBroker {

    /**
     * Broker ID.
     */
    private int id;

    /**
     * Broker host.
     */
    private String host;

    /**
     * Broker port.
     */
    private int port;

    /**
     * Broker rack.
     */
    private String rack;

    /**
     * Whether this broker is the controller.
     */
    private boolean controller;
}
