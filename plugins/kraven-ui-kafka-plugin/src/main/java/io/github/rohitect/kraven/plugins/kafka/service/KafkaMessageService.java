package io.github.rohitect.kraven.plugins.kafka.service;

import io.github.rohitect.kraven.plugins.kafka.KafkaPluginConfig;
import io.github.rohitect.kraven.plugins.kafka.model.KafkaMessage;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.header.Header;
import org.springframework.context.ApplicationContext;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Service for Kafka message operations.
 */
@Service
@Slf4j
public class KafkaMessageService {

    private final ApplicationContext applicationContext;
    private final KafkaPluginConfig config;
    private final Map<String, List<SseEmitter>> topicEmitters = new ConcurrentHashMap<>();

    public KafkaMessageService(ApplicationContext applicationContext, KafkaPluginConfig config) {
        this.applicationContext = applicationContext;
        this.config = config;
        log.info("KafkaMessageService initialized");
    }

    /**
     * Get messages from a topic.
     *
     * @param topic the topic name
     * @param limit the maximum number of messages to retrieve
     * @param offset the offset to start from
     * @param newestFirst whether to sort newest messages first
     * @return list of messages
     */
    public List<KafkaMessage> getMessagesFromTopic(String topic, int limit, int offset, boolean newestFirst) {
        log.debug("Getting messages from topic: {} (limit: {}, offset: {}, newestFirst: {})",
                topic, limit, offset, newestFirst);

        // This is a simplified implementation that would need to be expanded
        // to actually consume messages from Kafka
        return new ArrayList<>();
    }

    /**
     * Get the total number of messages in a topic.
     *
     * @param topic the topic name
     * @return the total number of messages
     */
    public long getTopicMessageCount(String topic) {
        log.debug("Getting message count for topic: {}", topic);

        // This is a simplified implementation that would need to be expanded
        // to actually get the message count from Kafka
        return 0;
    }

    /**
     * Send a message to a topic.
     *
     * @param topic the topic name
     * @param message the message to send
     * @return the sent message
     */
    public KafkaMessage sendMessageToTopic(String topic, KafkaMessage message) {
        log.debug("Sending message to topic: {}", topic);

        try {
            // Get KafkaTemplate from Spring context
            KafkaTemplate<String, Object> kafkaTemplate = applicationContext.getBean(KafkaTemplate.class);
            if (kafkaTemplate == null) {
                log.warn("KafkaTemplate bean not found");
                throw new IllegalStateException("KafkaTemplate bean not found");
            }

            // Create producer record
            ProducerRecord<String, Object> record = new ProducerRecord<>(
                    topic,
                    null,
                    message.getKey(),
                    message.getValue()
            );

            // Add headers if present
            if (message.getHeaders() != null) {
                message.getHeaders().forEach((key, value) ->
                        record.headers().add(key, value != null ? value.getBytes() : null));
            }

            // Send message
            kafkaTemplate.send(record).get();

            // Set timestamp
            message.setTimestamp(System.currentTimeMillis());

            return message;
        } catch (Exception e) {
            log.error("Error sending message to topic: {}", topic, e);
            throw new RuntimeException("Error sending message to topic: " + e.getMessage(), e);
        }
    }

    /**
     * Register an SSE emitter for a topic.
     *
     * @param topic the topic name
     * @param emitter the SSE emitter
     */
    public void registerEmitter(String topic, SseEmitter emitter) {
        log.debug("Registering SSE emitter for topic: {}", topic);

        // Get or create emitter list for topic
        List<SseEmitter> emitters = topicEmitters.computeIfAbsent(
                topic, k -> new CopyOnWriteArrayList<>());

        // Add emitter to list
        emitters.add(emitter);

        // Set completion callback to remove emitter when it completes
        emitter.onCompletion(() -> {
            log.debug("SSE emitter completed for topic: {}", topic);
            removeEmitter(topic, emitter);
        });

        // Set timeout callback to remove emitter when it times out
        emitter.onTimeout(() -> {
            log.debug("SSE emitter timed out for topic: {}", topic);
            removeEmitter(topic, emitter);
        });

        // Set error callback to remove emitter when it errors
        emitter.onError(e -> {
            log.debug("SSE emitter error for topic: {}: {}", topic, e.getMessage());
            removeEmitter(topic, emitter);
        });
    }

    /**
     * Remove an SSE emitter for a topic.
     *
     * @param topic the topic name
     * @param emitter the SSE emitter
     */
    private void removeEmitter(String topic, SseEmitter emitter) {
        List<SseEmitter> emitters = topicEmitters.get(topic);
        if (emitters != null) {
            emitters.remove(emitter);
            if (emitters.isEmpty()) {
                topicEmitters.remove(topic);
            }
        }
    }

    /**
     * Listen for messages on all Kafka topics and forward them to registered SSE emitters.
     *
     * @param record the Kafka record
     */
    @KafkaListener(topicPattern = ".*", groupId = "kraven-ui-sse-listener")
    public void listenToAllTopics(ConsumerRecord<String, Object> record) {
        String topicName = record.topic();
        List<SseEmitter> emitters = topicEmitters.get(topicName);

        if (emitters != null && !emitters.isEmpty()) {
            log.debug("Received message for topic {} with {} registered emitters",
                    topicName, emitters.size());

            // Convert record to KafkaMessage
            KafkaMessage message = convertRecordToMessage(record);

            // Send message to all emitters
            List<SseEmitter> deadEmitters = new ArrayList<>();
            for (SseEmitter emitter : emitters) {
                try {
                    emitter.send(SseEmitter.event()
                            .name("message")
                            .data(message));
                } catch (IOException e) {
                    log.debug("Error sending message to SSE emitter: {}", e.getMessage());
                    deadEmitters.add(emitter);
                }
            }

            // Remove any dead emitters
            if (!deadEmitters.isEmpty()) {
                emitters.removeAll(deadEmitters);
                if (emitters.isEmpty()) {
                    topicEmitters.remove(topicName);
                }
            }
        }
    }

    /**
     * Convert a Kafka record to a KafkaMessage.
     *
     * @param record the Kafka record
     * @return the KafkaMessage
     */
    private KafkaMessage convertRecordToMessage(ConsumerRecord<String, Object> record) {
        // Extract headers
        Map<String, String> headers = new HashMap<>();
        for (Header header : record.headers()) {
            headers.put(header.key(), header.value() != null ?
                    new String(header.value()) : null);
        }

        // Build message
        return KafkaMessage.builder()
                .key(record.key())
                .value(record.value())
                .headers(headers)
                .partition(record.partition())
                .offset(record.offset())
                .timestamp(record.timestamp())
                .build();
    }
}
