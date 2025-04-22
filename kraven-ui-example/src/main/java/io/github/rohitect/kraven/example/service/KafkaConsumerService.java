package io.github.rohitect.kraven.example.service;

import io.github.rohitect.kraven.example.config.KafkaConfig;
import io.github.rohitect.kraven.example.model.KafkaMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;

import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Service for consuming messages from Kafka.
 */
@Service
@Slf4j
public class KafkaConsumerService {

    private final List<KafkaMessage> receivedMessages = Collections.synchronizedList(new ArrayList<>());
    private static final int MAX_MESSAGES = 100;

    /**
     * Listens for messages on the Kafka topic.
     *
     * @param message The received message
     */
    @KafkaListener(topics = KafkaConfig.TOPIC_NAME, groupId = "${spring.kafka.consumer.group-id}")
    public void listen(@Payload KafkaMessage message) {
        log.info("Received message from Kafka: {}", message);

        synchronized (receivedMessages) {
            // Add the message to the beginning of the list (newest first)
            receivedMessages.add(0, message);

            // Keep only the most recent MAX_MESSAGES
            if (receivedMessages.size() > MAX_MESSAGES) {
                receivedMessages.remove(receivedMessages.size() - 1);
            }
        }
    }

    /**
     * Gets all received messages.
     *
     * @return List of received messages
     */
    public List<KafkaMessage> getReceivedMessages() {
        synchronized (receivedMessages) {
            return new ArrayList<>(receivedMessages);
        }
    }

    /**
     * Gets the latest messages in newest-first order.
     *
     * @return List of messages sorted by timestamp (newest first)
     */
    public List<KafkaMessage> getNewestMessages() {
        synchronized (receivedMessages) {
            // The list is already maintained in newest-first order
            return new ArrayList<>(receivedMessages);
        }
    }

    /**
     * Gets the latest messages in oldest-first order.
     *
     * @return List of messages sorted by timestamp (oldest first)
     */
    public List<KafkaMessage> getOldestMessages() {
        synchronized (receivedMessages) {
            List<KafkaMessage> oldestFirst = new ArrayList<>(receivedMessages);
            Collections.reverse(oldestFirst);
            return oldestFirst;
        }
    }

    /**
     * Clears all received messages.
     */
    public void clearMessages() {
        synchronized (receivedMessages) {
            receivedMessages.clear();
        }
    }
}
