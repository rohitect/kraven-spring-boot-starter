package io.github.rohitect.kraven.springboot.kafka.controller;

import io.github.rohitect.kraven.springboot.kafka.model.*;
import io.github.rohitect.kraven.springboot.kafka.service.KafkaAdminService;
import io.github.rohitect.kraven.springboot.kafka.service.KafkaListenerScanner;
import io.github.rohitect.kraven.springboot.kafka.service.KafkaMessageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

/**
 * REST controller for Kafka management operations.
 */
@RestController
@RequestMapping("/api/kraven-kafka-management")
@Tag(name = "Kraven Kafka Management", description = "Kraven Kafka management APIs")
@RequiredArgsConstructor
@ConditionalOnClass(name = "org.springframework.kafka.core.KafkaAdmin")
@ConditionalOnBean({KafkaAdminService.class, KafkaListenerScanner.class})
@Slf4j
public class KafkaManagementController {

    private final KafkaAdminService kafkaAdminService;
    private final KafkaListenerScanner kafkaListenerScanner;
    private final KafkaMessageService kafkaMessageService;

    // List to keep track of all active SSE emitters
    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    @GetMapping("/cluster")
    @Operation(summary = "Get Kafka cluster info", description = "Retrieves information about the Kafka cluster")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved cluster info",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = KafkaClusterInfo.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error", content = @Content)
    })
    public ResponseEntity<KafkaClusterInfo> getClusterInfo() {
        return ResponseEntity.ok(kafkaAdminService.getClusterInfo());
    }

    @GetMapping("/brokers")
    @Operation(summary = "Get Kafka brokers", description = "Retrieves information about Kafka brokers")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved brokers",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = KafkaBroker.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error", content = @Content)
    })
    public ResponseEntity<List<KafkaBroker>> getBrokers() {
        return ResponseEntity.ok(kafkaAdminService.getClusterInfo().getBrokers());
    }

    @GetMapping("/topics")
    @Operation(summary = "Get Kafka topics", description = "Retrieves information about Kafka topics")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved topics",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = KafkaTopic.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error", content = @Content)
    })
    public ResponseEntity<List<KafkaTopic>> getTopics() {
        return ResponseEntity.ok(kafkaAdminService.getClusterInfo().getTopics());
    }

    @GetMapping("/consumer-groups")
    @Operation(summary = "Get Kafka consumer groups", description = "Retrieves information about Kafka consumer groups")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved consumer groups",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = KafkaConsumerGroup.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error", content = @Content)
    })
    public ResponseEntity<List<KafkaConsumerGroup>> getConsumerGroups() {
        return ResponseEntity.ok(kafkaAdminService.getClusterInfo().getConsumerGroups());
    }

    @GetMapping("/listeners")
    @Operation(summary = "Get Kafka listeners", description = "Retrieves information about Kafka listeners in the application")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved listeners",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = KafkaListener.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error", content = @Content)
    })
    public ResponseEntity<List<KafkaListener>> getListeners() {
        return ResponseEntity.ok(kafkaListenerScanner.getKafkaListeners());
    }

    @GetMapping("/topics/{name}")
    @Operation(summary = "Get Kafka topic by name", description = "Retrieves detailed information about a specific Kafka topic")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved topic",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = KafkaTopic.class))),
            @ApiResponse(responseCode = "404", description = "Topic not found", content = @Content),
            @ApiResponse(responseCode = "500", description = "Internal server error", content = @Content)
    })
    public ResponseEntity<KafkaTopic> getTopicByName(@PathVariable("name") String name) {
        log.info("Getting topic by name: {}", name);
        KafkaClusterInfo clusterInfo = kafkaAdminService.getClusterInfo();

        if (clusterInfo.getTopics() == null) {
            log.warn("No topics found in cluster info");
            return ResponseEntity.notFound().build();
        }

        log.info("Found {} topics in cluster info", clusterInfo.getTopics().size());
        clusterInfo.getTopics().forEach(topic -> log.info("Available topic: {}", topic.getName()));

        return clusterInfo.getTopics().stream()
                .filter(topic -> {
                    boolean matches = topic.getName().equals(name);
                    log.info("Topic {} matches requested name {}: {}", topic.getName(), name, matches);
                    return matches;
                })
                .findFirst()
                .map(topic -> {
                    log.info("Found topic: {}", topic.getName());
                    return ResponseEntity.ok(topic);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/topics/{name}/consumers")
    @Operation(summary = "Get consumers for a topic", description = "Retrieves consumer groups that are consuming from a specific topic")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved consumer groups",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = KafkaConsumerGroup.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error", content = @Content)
    })
    public ResponseEntity<List<KafkaConsumerGroup>> getConsumersForTopic(@PathVariable("name") String name) {
        log.info("Getting consumers for topic: {}", name);
        KafkaClusterInfo clusterInfo = kafkaAdminService.getClusterInfo();

        if (clusterInfo.getConsumerGroups() == null) {
            log.warn("No consumer groups found in cluster info");
            return ResponseEntity.ok(Collections.emptyList());
        }

        log.info("Found {} consumer groups in cluster info", clusterInfo.getConsumerGroups().size());

        List<KafkaConsumerGroup> consumersForTopic = clusterInfo.getConsumerGroups().stream()
                .filter(group -> {
                    if (group.getTopicPartitions() == null) {
                        log.warn("Consumer group {} has no topic partitions", group.getGroupId());
                        return false;
                    }

                    boolean matches = group.getTopicPartitions().stream()
                            .anyMatch(tp -> {
                                boolean topicMatches = tp.getTopic().equals(name);
                                log.info("Topic partition {} matches requested topic {}: {}",
                                        tp.getTopic(), name, topicMatches);
                                return topicMatches;
                            });

                    log.info("Consumer group {} matches topic {}: {}", group.getGroupId(), name, matches);
                    return matches;
                })
                .collect(Collectors.toList());

        log.info("Found {} consumer groups for topic {}", consumersForTopic.size(), name);
        return ResponseEntity.ok(consumersForTopic);
    }

    @GetMapping("/topics/{name}/messages")
    @Operation(summary = "Get messages from a topic", description = "Retrieves messages from a specific Kafka topic with pagination support")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved messages",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = KafkaMessage.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error", content = @Content)
    })
    public ResponseEntity<Map<String, Object>> getMessagesFromTopic(
            @PathVariable("name") String name,
            @Parameter(description = "Maximum number of messages per page")
            @RequestParam(name = "limit", defaultValue = "20") int limit,
            @Parameter(description = "Page number (0-based)")
            @RequestParam(name = "page", defaultValue = "0") int page,
            @Parameter(description = "Sort order: 'new' for newest first, 'old' for oldest first")
            @RequestParam(name = "sort", defaultValue = "new") String sort) {

        log.info("Getting messages from topic: {}, limit: {}, page: {}, sort: {}", name, limit, page, sort);

        boolean sortNewestFirst = !"old".equalsIgnoreCase(sort);
        int offset = page * limit;
        List<KafkaMessage> messages = kafkaMessageService.getMessagesFromTopic(name, limit, offset, sortNewestFirst);
        long totalMessages = kafkaMessageService.getTopicMessageCount(name);
        int totalPages = (int) Math.ceil((double) totalMessages / limit);

        Map<String, Object> response = new HashMap<>();
        response.put("messages", messages);
        response.put("page", page);
        response.put("limit", limit);
        response.put("totalMessages", totalMessages);
        response.put("totalPages", totalPages);

        log.info("Retrieved {} messages from topic: {} (page {}/{}, total messages: {})",
                messages.size(), name, page + 1, totalPages, totalMessages);
        return ResponseEntity.ok(response);
    }

    @GetMapping(value = "/topics/{name}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Stream messages from a topic", description = "Establishes a Server-Sent Events connection to stream messages from a specific Kafka topic in real-time")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully established stream connection",
                    content = @Content(mediaType = "text/event-stream")),
            @ApiResponse(responseCode = "500", description = "Internal server error", content = @Content)
    })
    public SseEmitter streamMessagesFromTopic(
            @PathVariable("name") String name) {

        log.info("Establishing SSE stream for topic: {}", name);

        // Create a new emitter with a timeout
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);

        // Add the emitter to our list
        emitters.add(emitter);

        // Set up callbacks for completion, timeout, and error
        emitter.onCompletion(() -> {
            log.info("SSE stream completed for topic: {}", name);
            emitters.remove(emitter);
        });

        emitter.onTimeout(() -> {
            log.info("SSE stream timed out for topic: {}", name);
            emitters.remove(emitter);
        });

        emitter.onError(e -> {
            log.error("SSE stream error for topic: {}", name, e);
            emitters.remove(emitter);
        });

        // Send an initial event to establish the connection
        try {
            emitter.send(SseEmitter.event()
                    .name("connected")
                    .data("Connected to topic: " + name));
        } catch (IOException e) {
            log.error("Error sending initial SSE event for topic: {}", name, e);
            emitter.completeWithError(e);
        }

        // Register this emitter with the message service for updates
        kafkaMessageService.registerEmitter(name, emitter);

        return emitter;
    }
}
