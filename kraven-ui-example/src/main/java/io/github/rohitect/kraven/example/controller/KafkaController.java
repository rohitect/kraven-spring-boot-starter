package io.github.rohitect.kraven.example.controller;

import io.github.rohitect.kraven.example.model.KafkaMessage;
import io.github.rohitect.kraven.example.service.KafkaConsumerService;
import io.github.rohitect.kraven.example.service.KafkaProducerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for Kafka operations.
 */
@RestController
@RequestMapping("/api/kafka")
@Tag(name = "Kafka", description = "Kafka messaging APIs")
@RequiredArgsConstructor
public class KafkaController {

    private final KafkaProducerService producerService;
    private final KafkaConsumerService consumerService;

    @PostMapping("/messages")
    @Operation(summary = "Send a message to Kafka", description = "Sends a message to the Kafka topic")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "202", description = "Message accepted for delivery",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = KafkaMessage.class))),
            @ApiResponse(responseCode = "400", description = "Invalid input", content = @Content)
    })
    public ResponseEntity<KafkaMessage> sendMessage(
            @Parameter(description = "Message to send", required = true)
            @Valid @RequestBody KafkaMessage message) {

        // Fire and forget - we don't wait for the result
        producerService.sendMessage(message);

        // Return 202 Accepted as we've accepted the message but don't wait for Kafka confirmation
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(message);
    }

    @GetMapping("/messages")
    @Operation(summary = "Get received messages", description = "Retrieves messages received from the Kafka topic")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved messages",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = KafkaMessage.class)))
    })
    public ResponseEntity<List<KafkaMessage>> getReceivedMessages(
            @Parameter(description = "Sort order: 'new' for newest first, 'old' for oldest first")
            @RequestParam(name = "sort", defaultValue = "new") String sort) {

        List<KafkaMessage> messages;
        if ("old".equalsIgnoreCase(sort)) {
            messages = consumerService.getOldestMessages();
        } else {
            // Default to newest first
            messages = consumerService.getNewestMessages();
        }

        return ResponseEntity.ok(messages);
    }

    @DeleteMapping("/messages")
    @Operation(summary = "Clear received messages", description = "Clears all received messages from memory")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Messages cleared successfully", content = @Content)
    })
    public ResponseEntity<Void> clearMessages() {
        consumerService.clearMessages();
        return ResponseEntity.noContent().build();
    }
}
