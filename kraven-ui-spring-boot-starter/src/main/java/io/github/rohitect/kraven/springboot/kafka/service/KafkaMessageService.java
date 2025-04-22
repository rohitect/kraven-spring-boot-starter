package io.github.rohitect.kraven.springboot.kafka.service;

import io.github.rohitect.kraven.springboot.kafka.model.KafkaMessage;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.kafka.support.serializer.JsonDeserializer;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Service for retrieving messages from Kafka topics.
 */
@Service
@ConditionalOnClass(name = "org.springframework.kafka.core.KafkaTemplate")
@Slf4j
public class KafkaMessageService {

    private final String bootstrapServers;

    @Autowired
    public KafkaMessageService(KafkaAdminService kafkaAdminService) {
        this.bootstrapServers = kafkaAdminService.getClusterInfo().getBootstrapServers();
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
        log.info("Retrieving {} messages from topic: {}, offset: {}, sortNewestFirst: {}", limit, topicName, offset, sortNewestFirst);

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

            log.info("Retrieved {} messages from topic: {}", messages.size(), topicName);
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
        log.info("Getting message count for topic: {}", topicName);

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

            log.info("Topic {} has approximately {} messages", topicName, totalMessages);
        } catch (Exception e) {
            log.error("Error getting message count for topic: {}", topicName, e);
        }

        return totalMessages;
    }
}
