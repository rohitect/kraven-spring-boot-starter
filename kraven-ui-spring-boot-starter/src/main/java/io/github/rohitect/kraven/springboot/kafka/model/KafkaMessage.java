package io.github.rohitect.kraven.springboot.kafka.model;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Represents a message sent to or received from Kafka.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Kafka message information")
public class KafkaMessage {

    @Schema(description = "Unique identifier of the message", example = "msg-123")
    private String id;

    @NotBlank
    @Schema(description = "Content of the message", example = "Hello, Kafka!", required = true)
    private String content;

    @Schema(description = "Timestamp when the message was created", example = "2023-06-15T10:30:45")
    private LocalDateTime timestamp;

    @Schema(description = "Additional metadata for the message", example = "priority=high")
    private String metadata;

    @Schema(description = "Topic the message belongs to (only used when sending messages)", example = "my-topic")
    private String topic;
}
