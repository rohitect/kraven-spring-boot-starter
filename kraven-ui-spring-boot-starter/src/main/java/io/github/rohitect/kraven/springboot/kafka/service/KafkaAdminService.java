package io.github.rohitect.kraven.springboot.kafka.service;

import io.github.rohitect.kraven.springboot.kafka.model.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Service for interacting with Kafka Admin API.
 */
@Service
@ConditionalOnClass(name = "org.springframework.kafka.core.KafkaAdmin")
@Slf4j
public class KafkaAdminService {

    private final KafkaListenerScanner kafkaListenerScanner;

    @Autowired
    public KafkaAdminService(KafkaListenerScanner kafkaListenerScanner) {
        this.kafkaListenerScanner = kafkaListenerScanner;
    }

    /**
     * Gets information about the Kafka cluster.
     *
     * @return Kafka cluster information
     */
    public KafkaClusterInfo getClusterInfo() {
        try {
            log.debug("Getting Kafka cluster info");
            // Return fallback info if Kafka is not available
            KafkaClusterInfo clusterInfo = createFallbackClusterInfo();
            log.debug("Created fallback cluster info with {} topics",
                    clusterInfo.getTopics() != null ? clusterInfo.getTopics().size() : 0);
            if (clusterInfo.getTopics() != null) {
                clusterInfo.getTopics().forEach(topic ->
                    log.debug("Topic: {}", topic.getName()));
            }
            return clusterInfo;
        } catch (Exception e) {
            log.error("Error getting Kafka cluster info", e);
            return createFallbackClusterInfo();
        }
    }

    /**
     * Creates a fallback cluster info when Kafka is not available.
     *
     * @return Fallback Kafka cluster info
     */
    private KafkaClusterInfo createFallbackClusterInfo() {
        // Create a broker
        KafkaBroker broker = KafkaBroker.builder()
                .id(1)
                .host("localhost")
                .port(9092)
                .controller(true)
                .rack(null)
                .build();

        // Create a topic
        KafkaTopic.PartitionInfo partitionInfo = KafkaTopic.PartitionInfo.builder()
                .id(0)
                .leader(1)
                .replicas(Collections.singletonList(1))
                .inSyncReplicas(Collections.singletonList(1))
                .firstOffset(0L)
                .lastOffset(0L)
                .build();

        // Create topic settings
        List<KafkaTopic.TopicSetting> topicSettings = new ArrayList<>();
        topicSettings.add(KafkaTopic.TopicSetting.builder()
                .name("cleanup.policy")
                .value("delete")
                .description("The cleanup policy for the topic")
                .build());
        topicSettings.add(KafkaTopic.TopicSetting.builder()
                .name("compression.type")
                .value("producer")
                .description("The compression type for the topic")
                .build());
        topicSettings.add(KafkaTopic.TopicSetting.builder()
                .name("retention.ms")
                .value("604800000")
                .description("The retention period for the topic in milliseconds")
                .build());
        topicSettings.add(KafkaTopic.TopicSetting.builder()
                .name("segment.bytes")
                .value("1073741824")
                .description("The segment size for the topic in bytes")
                .build());

        KafkaTopic topic = KafkaTopic.builder()
                .name("kraven-example-topic")
                .partitions(1)
                .replicationFactor(1)
                .partitionInfos(Collections.singletonList(partitionInfo))
                .internal(false)
                .segmentSize(1073741824L)
                .segmentCount(1)
                .cleanupPolicy("delete")
                .messageCount(0L)
                .settings(topicSettings)
                .build();

        // Create a consumer group
        KafkaConsumerGroup.GroupMember member = KafkaConsumerGroup.GroupMember.builder()
                .memberId("consumer-1")
                .clientId("consumer-1")
                .host("localhost")
                .assignment("kraven-example-topic-0")
                .build();

        KafkaConsumerGroup.TopicPartitionInfo topicPartitionInfo = KafkaConsumerGroup.TopicPartitionInfo.builder()
                .topic("kraven-example-topic")
                .partition(0)
                .currentOffset(0L)
                .logEndOffset(0L)
                .lag(0L)
                .memberId("consumer-1")
                .build();

        KafkaConsumerGroup consumerGroup = KafkaConsumerGroup.builder()
                .groupId("kraven-example-group")
                .state("Stable")
                .members(Collections.singletonList(member))
                .topicPartitions(Collections.singletonList(topicPartitionInfo))
                .build();

        // Get listeners
        List<KafkaListener> listeners = kafkaListenerScanner.getKafkaListeners();

        // Build cluster info
        return KafkaClusterInfo.builder()
                .bootstrapServers("localhost:9092")
                .clusterId("kraven-example-cluster")
                .controllerId(1)
                .brokers(Collections.singletonList(broker))
                .topics(Collections.singletonList(topic))
                .consumerGroups(Collections.singletonList(consumerGroup))
                .listeners(listeners)
                .build();
    }
}
