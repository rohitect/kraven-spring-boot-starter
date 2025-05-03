package io.github.rohitect.kraven.plugins.kafka.controller;

import io.github.rohitect.kraven.plugins.kafka.model.*;
import io.github.rohitect.kraven.plugins.kafka.service.KafkaAdminService;
import io.github.rohitect.kraven.plugins.kafka.service.KafkaListenerScanner;
import io.github.rohitect.kraven.plugins.kafka.service.KafkaMessageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

/**
 * REST controller for Kafka management operations.
 */
@RestController
@RequestMapping("/kraven/plugin/kafka")
@Slf4j
public class KafkaManagementController {

    private final KafkaAdminService kafkaAdminService;
    private final KafkaListenerScanner kafkaListenerScanner;
    private final KafkaMessageService kafkaMessageService;

    // List to keep track of all active SSE emitters
    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public KafkaManagementController(KafkaAdminService kafkaAdminService,
                                     KafkaListenerScanner kafkaListenerScanner,
                                     KafkaMessageService kafkaMessageService) {
        this.kafkaAdminService = kafkaAdminService;
        this.kafkaListenerScanner = kafkaListenerScanner;
        this.kafkaMessageService = kafkaMessageService;
        log.info("KafkaManagementController initialized");
    }

    @GetMapping(value = {"/cluster", "/cluster/"})
    public ResponseEntity<KafkaClusterInfo> getClusterInfo() {
        log.debug("Getting Kafka cluster info");
        return ResponseEntity.ok(kafkaAdminService.getClusterInfo());
    }

    @GetMapping(value = {"/brokers", "/brokers/"})
    public ResponseEntity<List<KafkaBroker>> getBrokers() {
        log.debug("Getting Kafka brokers");
        return ResponseEntity.ok(kafkaAdminService.getClusterInfo().getBrokers());
    }

    @GetMapping(value = {"/topics", "/topics/"})
    public ResponseEntity<List<KafkaTopic>> getTopics() {
        log.debug("Getting Kafka topics");
        return ResponseEntity.ok(kafkaAdminService.getClusterInfo().getTopics());
    }

    @GetMapping(value = {"/consumer-groups", "/consumer-groups/"})
    public ResponseEntity<List<KafkaConsumerGroup>> getConsumerGroups() {
        log.debug("Getting Kafka consumer groups");
        return ResponseEntity.ok(kafkaAdminService.getClusterInfo().getConsumerGroups());
    }

    @GetMapping(value = {"/listeners", "/listeners/"})
    public ResponseEntity<List<KafkaListener>> getListeners() {
        log.debug("Getting Kafka listeners");
        return ResponseEntity.ok(kafkaListenerScanner.getKafkaListeners());
    }

    @GetMapping(value = {"/topics/{name}/consumers", "/topics/{name}/consumers/"})
    public ResponseEntity<List<KafkaConsumerGroup>> getConsumersForTopic(@PathVariable("name") String name) {
        log.debug("Getting consumers for topic: {}", name);

        List<KafkaConsumerGroup> allConsumerGroups = kafkaAdminService.getClusterInfo().getConsumerGroups();

        // The topicPartitions list might be empty in the current implementation
        // Let's modify our approach to find consumer groups for this topic

        // First, check if any consumer group has topic partitions for this topic
        List<KafkaConsumerGroup> consumersForTopic = allConsumerGroups.stream()
                .filter(group -> group.getTopicPartitions() != null &&
                        group.getTopicPartitions().stream()
                                .anyMatch(tp -> tp != null && name.equals(tp.getTopic())))
                .collect(Collectors.toList());

        // If we didn't find any, return all consumer groups as a fallback
        // This is a temporary solution until we properly populate the topic partitions
        if (consumersForTopic.isEmpty()) {
            log.debug("No consumer groups with explicit topic partitions for topic {}. Returning all consumer groups.", name);
            consumersForTopic = allConsumerGroups;
        }

        log.debug("Found {} consumer groups for topic {}", consumersForTopic.size(), name);
        return ResponseEntity.ok(consumersForTopic);
    }

    @GetMapping(value = {"/topics/{name}/messages", "/topics/{name}/messages/"})
    public ResponseEntity<Map<String, Object>> getMessagesFromTopic(
            @PathVariable("name") String name,
            @RequestParam(value = "limit", defaultValue = "100") int limit,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "sort", defaultValue = "new") String sort) {

        log.debug("Getting messages from topic: {} (limit: {}, page: {}, sort: {})",
                name, limit, page, sort);

        // Check if message consumption is enabled
        if (!kafkaAdminService.isMessageConsumptionEnabled()) {
            log.warn("Message consumption is disabled. Rejecting request for topic: {}", name);
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "Message consumption is disabled in the configuration. To enable it, set 'kraven.plugins.kafka.message-consumption-enabled=true' in your application properties.");
        }

        // Ensure limit is within bounds
        int actualLimit = Math.min(limit, 1000);

        // Get messages
        boolean sortNewestFirst = !"old".equalsIgnoreCase(sort);
        int offset = page * actualLimit;
        List<KafkaMessage> messages = kafkaMessageService.getMessagesFromTopic(
                name, actualLimit, offset, sortNewestFirst);
        long totalMessages = kafkaMessageService.getTopicMessageCount(name);
        int totalPages = (int) Math.ceil((double) totalMessages / actualLimit);

        Map<String, Object> response = new HashMap<>();
        response.put("messages", messages);
        response.put("page", page);
        response.put("limit", actualLimit);
        response.put("totalMessages", totalMessages);
        response.put("totalPages", totalPages);

        log.debug("Retrieved {} messages from topic: {} (page {}/{}, total messages: {})",
                messages.size(), name, page + 1, totalPages, totalMessages);
        return ResponseEntity.ok(response);
    }

    @PostMapping(value = {"/topics/{name}/messages", "/topics/{name}/messages/"})
    public ResponseEntity<KafkaMessage> sendMessageToTopic(
            @PathVariable("name") String name,
            @RequestBody KafkaMessage message) {

        log.debug("Received request to send message to topic: {}", name);

        // Check if message production is enabled
        if (!kafkaAdminService.isMessageProductionEnabled()) {
            log.warn("Message production is disabled. Rejecting request for topic: {}", name);
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "Message production is disabled in the configuration. To enable it, set 'kraven.plugins.kafka.message-production-enabled=true' in your application properties.");
        }

        try {
            // Send the message to the topic
            KafkaMessage sentMessage = kafkaMessageService.sendMessageToTopic(name, message);
            log.debug("Successfully sent message to topic: {}", name);
            return ResponseEntity.ok(sentMessage);
        } catch (Exception e) {
            log.error("Error sending message to topic: {}", name, e);
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR,
                    "Error sending message to topic: " + e.getMessage());
        }
    }

    @GetMapping(value = {"/topics/{name}/stream", "/topics/{name}/stream/"}, produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamMessagesFromTopic(@PathVariable("name") String name) {
        log.debug("Establishing SSE stream for topic: {}", name);

        // Check if streaming is enabled
        if (!kafkaAdminService.isStreamingEnabled()) {
            log.warn("Streaming is disabled. Rejecting SSE request for topic: {}", name);
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "Streaming is disabled in the configuration. To enable it, set 'kraven.plugins.kafka.streaming-enabled=true' in your application properties.");
        }

        // Create emitter with timeout
        SseEmitter emitter = new SseEmitter(300000L); // 5 minutes

        // Add to list of active emitters
        emitters.add(emitter);

        // Set completion callback
        emitter.onCompletion(() -> {
            log.debug("SSE connection completed for topic: {}", name);
            emitters.remove(emitter);
        });

        // Set timeout callback
        emitter.onTimeout(() -> {
            log.debug("SSE connection timed out for topic: {}", name);
            emitters.remove(emitter);
        });

        // Set error callback
        emitter.onError(e -> {
            log.debug("SSE connection error for topic: {}: {}", name, e.getMessage());
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
