package io.github.rohitect.kraven.springboot.kafka.model;

import io.swagger.v3.oas.annotations.media.Schema;
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
@Schema(description = "Kafka broker information")
public class KafkaBroker {

    @Schema(description = "ID of the broker", example = "1")
    private int id;

    @Schema(description = "Host of the broker", example = "localhost")
    private String host;

    @Schema(description = "Port of the broker", example = "9092")
    private int port;

    @Schema(description = "Rack of the broker", example = "rack1")
    private String rack;

    @Schema(description = "Whether the broker is the controller", example = "true")
    private boolean controller;
}
