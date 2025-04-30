package io.github.rohitect.kraven.springboot.kafka.service;

import java.io.IOException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import io.github.rohitect.kraven.springboot.kafka.model.KafkaMessage;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;

/**
 * Service for retrieving messages from Kafka topics.
 */
@Service
@ConditionalOnClass(name = "org.springframework.kafka.core.KafkaTemplate")
@Slf4j
public class KafkaMessageService {

    // Map to store emitters by topic
    private final Map<String, List<SseEmitter>> topicEmitters = new ConcurrentHashMap<>();

    // Thread pool for async operations
    private final ExecutorService executor = Executors.newCachedThreadPool();

    private final String bootstrapServers;
    private final io.github.rohitect.kraven.springboot.config.KravenUiEnhancedProperties properties;
    private final KafkaTemplate<String, String> kafkaTemplate;

    @Autowired
    public KafkaMessageService(KafkaAdminService kafkaAdminService,
                              io.github.rohitect.kraven.springboot.config.KravenUiEnhancedProperties properties,
                              KafkaTemplate<String, String> kafkaTemplate) {
        this.bootstrapServers = kafkaAdminService.getClusterInfo().getBootstrapServers();
        this.properties = properties;
        this.kafkaTemplate = kafkaTemplate;

        log.debug("KafkaMessageService initialized with configuration: enabled={}, messageLimit={}, streamingEnabled={}, sseTimeoutMs={}",
                properties.getKafka().isEnabled(),
                properties.getKafka().getMessageLimit(),
                properties.getKafka().isStreamingEnabled(),
                properties.getKafka().getSseTimeoutMs());
    }

    /**
     * Sends a message to a Kafka topic.
     *
     * @param topicName The name of the topic to send the message to
     * @param message The message to send
     * @return The sent message with updated metadata
     */
    public KafkaMessage sendMessageToTopic(String topicName, KafkaMessage message) {
        log.debug("Sending message to topic: {}", topicName);

        // Generate an ID if not provided
        if (message.getId() == null || message.getId().isEmpty()) {
            message.setId(UUID.randomUUID().toString());
        }

        // Set timestamp if not provided
        if (message.getTimestamp() == null) {
            message.setTimestamp(LocalDateTime.now());
        }

        try {
            // Send the message to Kafka
            kafkaTemplate.send(topicName, message.getId(), message.getContent()).get();

            // Add metadata about the send operation
            String metadata = message.getMetadata();
            if (metadata == null || metadata.isEmpty()) {
                metadata = "sent=" + LocalDateTime.now();
            } else {
                metadata += ",sent=" + LocalDateTime.now();
            }
            message.setMetadata(metadata);

            log.debug("Successfully sent message to topic: {}", topicName);
            return message;
        } catch (Exception e) {
            log.error("Error sending message to topic: {}", topicName, e);
            throw new RuntimeException("Failed to send message to Kafka: " + e.getMessage(), e);
        }
    }

    /**
     * Registers an SSE emitter for a specific topic.
     *
     * @param topicName The name of the topic
     * @param emitter The SSE emitter to register
     */
    public void registerEmitter(String topicName, SseEmitter emitter) {
        log.debug("Registering emitter for topic: {}", topicName);
        topicEmitters.computeIfAbsent(topicName, k -> new ArrayList<>()).add(emitter);

        // Set up a callback to remove the emitter when it's completed or times out
        emitter.onCompletion(() -> removeEmitter(topicName, emitter));
        emitter.onTimeout(() -> removeEmitter(topicName, emitter));
        emitter.onError(e -> removeEmitter(topicName, emitter));
    }

    /**
     * Removes an SSE emitter for a specific topic.
     *
     * @param topicName The name of the topic
     * @param emitter The SSE emitter to remove
     */
    private void removeEmitter(String topicName, SseEmitter emitter) {
        log.debug("Removing emitter for topic: {}", topicName);
        List<SseEmitter> emitters = topicEmitters.get(topicName);
        if (emitters != null) {
            emitters.remove(emitter);
            if (emitters.isEmpty()) {
                topicEmitters.remove(topicName);
            }
        }
    }

    /**
     * Sends a message to all registered emitters for a specific topic.
     *
     * @param topicName The name of the topic
     * @param message The message to send
     */
    public void sendMessageToEmitters(String topicName, KafkaMessage message) {
        List<SseEmitter> emitters = topicEmitters.get(topicName);
        if (emitters != null && !emitters.isEmpty()) {
            log.debug("Sending message to {} emitters for topic: {}", emitters.size(), topicName);
            List<SseEmitter> deadEmitters = new ArrayList<>();

            emitters.forEach(emitter -> {
                try {
                    emitter.send(SseEmitter.event()
                            .name("message")
                            .data(message));
                } catch (IOException e) {
                    log.error("Error sending message to emitter for topic: {}", topicName, e);
                    deadEmitters.add(emitter);
                }
            });

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
     * Listens for messages on all Kafka topics and forwards them to registered SSE emitters.
     * This method uses a generic Kafka listener that can be configured to listen to multiple topics.
     *
     * @param record The Kafka record received
     */
    @KafkaListener(topicPattern = ".*", groupId = "kraven-ui-sse-listener")
    public void listenToAllTopics(ConsumerRecord<String, Object> record) {
        String topicName = record.topic();
        Object value = record.value();
        log.debug("Received message from Kafka topic {}: {}", topicName, value);

        // Check if we have any emitters registered for this topic
        if (topicEmitters.containsKey(topicName)) {
            KafkaMessage message;

            // Handle different types of message values
            if (value instanceof KafkaMessage) {
                // If the value is already a KafkaMessage, use it directly
                message = (KafkaMessage) value;
                // Ensure the message has an ID
                if (message.getId() == null || message.getId().isEmpty()) {
                    message.setId(record.key() != null ? record.key() : UUID.randomUUID().toString());
                }
                // Ensure the message has a timestamp
                if (message.getTimestamp() == null) {
                    message.setTimestamp(LocalDateTime.now());
                }
                // Add metadata if not present
                if (message.getMetadata() == null || message.getMetadata().isEmpty()) {
                    message.setMetadata("offset=" + record.offset() + ",partition=" + record.partition());
                }
            } else {
                // If the value is not a KafkaMessage, create a new one
                String content = value != null ? value.toString() : "";
                message = KafkaMessage.builder()
                        .id(record.key() != null ? record.key() : UUID.randomUUID().toString())
                        .content(content)
                        .timestamp(LocalDateTime.now())
                        .metadata("offset=" + record.offset() + ",partition=" + record.partition())
                        .build();
            }

            // Send the message to all registered emitters for this topic
            executor.submit(() -> sendMessageToEmitters(topicName, message));
        }
    }

    /**
     * Cleanup method to shutdown the executor service.
     */
    @PreDestroy
    public void cleanup() {
        log.debug("Shutting down KafkaMessageService executor");
        executor.shutdown();
    }

    /**
     * Retrieves messages from a specific Kafka topic with pagination support.
     *
     * @param topicName The name of the topic to retrieve messages from
     * @param limit The maximum number of messages to retrieve per page
     * @param offset The offset to start retrieving messages from
     * @param sortNewestFirst Whether to sort messages with newest first (true) or oldest first (false)
     * @return List of Kafka messages
     */
    public List<KafkaMessage> getMessagesFromTopic(String topicName, int limit, int offset, boolean sortNewestFirst) {
        log.debug("Retrieving {} messages from topic: {}, offset: {}, sortNewestFirst: {}", limit, topicName, offset, sortNewestFirst);

        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "kraven-message-fetcher-" + UUID.randomUUID());
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false");
        props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, limit);

        List<KafkaMessage> messages = new ArrayList<>();

        try (KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props)) {
            // Get topic partitions
            List<TopicPartition> partitions = new ArrayList<>();
            for (org.apache.kafka.common.PartitionInfo partitionInfo : consumer.partitionsFor(topicName)) {
                partitions.add(new TopicPartition(topicName, partitionInfo.partition()));
            }

            if (partitions.isEmpty()) {
                log.warn("No partitions found for topic: {}", topicName);
                return messages;
            }

            consumer.assign(partitions);

            // Get end offsets for each partition
            Map<TopicPartition, Long> endOffsets = consumer.endOffsets(partitions);

            // Calculate total messages across all partitions
            long totalMessages = 0;
            for (TopicPartition partition : partitions) {
                totalMessages += endOffsets.get(partition);
            }

            // For each partition, seek to the appropriate position based on offset and limit
            // This is a simplified approach - in a real implementation, you'd need more sophisticated logic
            // to handle offsets across multiple partitions
            for (TopicPartition partition : partitions) {
                long endOffset = endOffsets.get(partition);
                // If sorting newest first, start from the end and go backwards
                // If sorting oldest first, start from the beginning
                long startOffset;
                if (sortNewestFirst) {
                    startOffset = Math.max(0, endOffset - offset - limit);
                } else {
                    startOffset = Math.min(offset, endOffset);
                }
                consumer.seek(partition, startOffset);
            }

            // Poll for records
            ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(5000));

            // Convert records to KafkaMessage objects
            for (ConsumerRecord<String, String> record : records) {
                KafkaMessage message = KafkaMessage.builder()
                        .id(record.key() != null ? record.key() : UUID.randomUUID().toString())
                        .content(record.value())
                        .timestamp(LocalDateTime.now()) // Using current time as we don't have the original timestamp
                        .metadata("offset=" + record.offset() + ",partition=" + record.partition())
                        .build();
                messages.add(message);
            }

            // Sort messages if needed
            if (sortNewestFirst) {
                messages.sort(Comparator.comparing(KafkaMessage::getTimestamp).reversed());
            } else {
                messages.sort(Comparator.comparing(KafkaMessage::getTimestamp));
            }

            // Limit the number of messages
            if (messages.size() > limit) {
                messages = messages.subList(0, limit);
            }

            log.debug("Retrieved {} messages from topic: {}", messages.size(), topicName);
        } catch (Exception e) {
            log.error("Error retrieving messages from topic: {}", topicName, e);
        }

        return messages;
    }

    /**
     * Gets the approximate total number of messages in a topic.
     *
     * @param topicName The name of the topic
     * @return The approximate total number of messages
     */
    public long getTopicMessageCount(String topicName) {
        log.debug("Getting message count for topic: {}", topicName);

        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "kraven-message-counter-" + UUID.randomUUID());
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());

        long totalMessages = 0;

        try (KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props)) {
            // Get topic partitions
            List<TopicPartition> partitions = new ArrayList<>();
            for (org.apache.kafka.common.PartitionInfo partitionInfo : consumer.partitionsFor(topicName)) {
                partitions.add(new TopicPartition(topicName, partitionInfo.partition()));
            }

            if (partitions.isEmpty()) {
                log.warn("No partitions found for topic: {}", topicName);
                return 0;
            }

            consumer.assign(partitions);

            // Get beginning and end offsets for each partition
            Map<TopicPartition, Long> beginningOffsets = consumer.beginningOffsets(partitions);
            Map<TopicPartition, Long> endOffsets = consumer.endOffsets(partitions);

            // Calculate total messages
            for (TopicPartition partition : partitions) {
                long beginningOffset = beginningOffsets.get(partition);
                long endOffset = endOffsets.get(partition);
                totalMessages += (endOffset - beginningOffset);
            }

            log.debug("Topic {} has approximately {} messages", topicName, totalMessages);
        } catch (Exception e) {
            log.error("Error getting message count for topic: {}", topicName, e);
        }

        return totalMessages;
    }
}
