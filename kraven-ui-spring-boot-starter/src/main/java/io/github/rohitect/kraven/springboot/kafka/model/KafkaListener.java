package io.github.rohitect.kraven.springboot.kafka.model;

import io.swagger.v3.oas.annotations.media.Schema;
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
@Schema(description = "Kafka listener information")
public class KafkaListener {

    @Schema(description = "ID of the listener", example = "myListener")
    private String id;

    @Schema(description = "Topics the listener is subscribed to", example = "[\"my-topic\"]")
    private List<String> topics;

    @Schema(description = "Consumer group ID", example = "my-consumer-group")
    private String groupId;

    @Schema(description = "Class containing the listener", example = "com.example.MyConsumer")
    private String className;

    @Schema(description = "Method name of the listener", example = "processMessage")
    private String methodName;

    @Schema(description = "Bean name", example = "myConsumerBean")
    private String beanName;

    @Schema(description = "Type of message consumed", example = "com.example.MyMessage")
    private String messageType;
}
