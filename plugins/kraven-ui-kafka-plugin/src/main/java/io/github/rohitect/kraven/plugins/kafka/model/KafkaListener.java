package io.github.rohitect.kraven.plugins.kafka.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Represents a Kafka listener in the application.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KafkaListener {

    /**
     * ID of the listener.
     */
    private String id;

    /**
     * Topics the listener is subscribed to.
     */
    private List<String> topics;

    /**
     * Consumer group ID.
     */
    private String groupId;

    /**
     * Class containing the listener.
     */
    private String className;

    /**
     * Method name of the listener.
     */
    private String methodName;

    /**
     * Bean name of the listener.
     */
    private String beanName;

    /**
     * Type of message the listener processes.
     */
    private String messageType;
}
