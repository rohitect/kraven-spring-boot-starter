package io.github.rohitect.kraven.example.service;

import io.github.rohitect.kraven.example.config.KafkaConfig;
import io.github.rohitect.kraven.example.model.KafkaMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

/**
 * Service for producing messages to Kafka.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class KafkaProducerService {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    /**
     * Sends a message to the Kafka topic.
     *
     * @param message The message to send
     * @return CompletableFuture with the result of the send operation
     */
    public CompletableFuture<SendResult<String, Object>> sendMessage(KafkaMessage message) {
        if (message.getId() == null || message.getId().isEmpty()) {
            message.setId(UUID.randomUUID().toString());
        }
        
        if (message.getTimestamp() == null) {
            message.setTimestamp(LocalDateTime.now());
        }
        
        log.info("Sending message to Kafka topic {}: {}", KafkaConfig.TOPIC_NAME, message);
        
        return kafkaTemplate.send(KafkaConfig.TOPIC_NAME, message.getId(), message)
                .whenComplete((result, ex) -> {
                    if (ex == null) {
                        log.info("Message sent successfully: {}", message);
                        log.debug("Message details: offset=[{}] partition=[{}]", 
                                result.getRecordMetadata().offset(),
                                result.getRecordMetadata().partition());
                    } else {
                        log.error("Unable to send message to Kafka: {}", message, ex);
                    }
                });
    }
}
