package io.github.rohitect.kraven.plugins.kafka.service;

import io.github.rohitect.kraven.plugins.kafka.KafkaPluginConfig;
import io.github.rohitect.kraven.plugins.kafka.model.*;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.admin.*;
import org.apache.kafka.clients.consumer.OffsetAndMetadata;
import org.apache.kafka.common.Node;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.TopicPartitionInfo;
import org.apache.kafka.common.config.ConfigResource;
import org.springframework.context.ApplicationContext;
import org.springframework.kafka.core.KafkaAdmin;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;
import java.util.Objects;

/**
 * Service for Kafka administration operations.
 */
@Service
@Slf4j
public class KafkaAdminService {

    private final ApplicationContext applicationContext;
    private final KafkaListenerScanner kafkaListenerScanner;
    private final KafkaPluginConfig config;

    public KafkaAdminService(ApplicationContext applicationContext,
                             KafkaListenerScanner kafkaListenerScanner,
                             KafkaPluginConfig config) {
        this.applicationContext = applicationContext;
        this.kafkaListenerScanner = kafkaListenerScanner;
        this.config = config;
        log.info("KafkaAdminService initialized");
    }

    /**
     * Get information about the Kafka cluster.
     *
     * @return Kafka cluster information
     */
    public KafkaClusterInfo getClusterInfo() {
        log.debug("Getting Kafka cluster info");
        KafkaClusterInfo clusterInfo = new KafkaClusterInfo();

        try {
            // Get KafkaAdmin from Spring context
            KafkaAdmin kafkaAdmin = applicationContext.getBean(KafkaAdmin.class);
            if (kafkaAdmin == null) {
                log.warn("KafkaAdmin bean not found");
                return clusterInfo;
            }

            // Get bootstrap servers
            String bootstrapServers = kafkaAdmin.getConfigurationProperties()
                    .getOrDefault("bootstrap.servers", "").toString();
            clusterInfo.setBootstrapServers(bootstrapServers);

            // Create AdminClient
            try (AdminClient adminClient = AdminClient.create(kafkaAdmin.getConfigurationProperties())) {
                // Get cluster info
                DescribeClusterResult clusterResult = adminClient.describeCluster();
                clusterInfo.setClusterId(clusterResult.clusterId().get());
                clusterInfo.setControllerId(clusterResult.controller().get().id());

                // Get brokers
                Collection<Node> nodes = clusterResult.nodes().get();
                List<KafkaBroker> brokers = nodes.stream()
                        .map(node -> KafkaBroker.builder()
                                .id(node.id())
                                .host(node.host())
                                .port(node.port())
                                .rack(node.rack())
                                .controller(node.id() == clusterInfo.getControllerId())
                                .build())
                        .collect(Collectors.toList());
                clusterInfo.setBrokers(brokers);

                // Get topics
                ListTopicsResult topicsResult = adminClient.listTopics();
                Set<String> topicNames = topicsResult.names().get();

                // Describe topics
                DescribeTopicsResult topicsDescResult = adminClient.describeTopics(topicNames);
                Map<String, TopicDescription> topicDescriptions = topicsDescResult.allTopicNames().get();

                // Get topic configs
                DescribeConfigsResult configsResult = adminClient.describeConfigs(
                        topicNames.stream()
                                .map(name -> new ConfigResource(ConfigResource.Type.TOPIC, name))
                                .collect(Collectors.toList())
                );
                Map<ConfigResource, Config> configs = configsResult.all().get();

                // Build topics list
                List<KafkaTopic> topics = new ArrayList<>();
                for (String topicName : topicNames) {
                    try {
                        TopicDescription topicDesc = topicDescriptions.get(topicName);
                        if (topicDesc != null) {
                            // Get topic config
                            ConfigResource topicResource = new ConfigResource(ConfigResource.Type.TOPIC, topicName);
                            Config topicConfig = configs.get(topicResource);
                            Map<String, String> configMap = new HashMap<>();
                            if (topicConfig != null) {
                                topicConfig.entries().forEach(entry ->
                                        configMap.put(entry.name(), entry.value()));
                            }

                            // Get partitions
                            List<TopicPartitionInfo> partitionInfos = topicDesc.partitions();
                            List<KafkaTopicPartition> topicPartitions = new ArrayList<>();

                            // Get offsets for partitions
                            Map<TopicPartition, Long> beginningOffsets = new HashMap<>();
                            Map<TopicPartition, Long> endOffsets = new HashMap<>();

                            // Build topic
                            KafkaTopic topic = KafkaTopic.builder()
                                    .name(topicName)
                                    .partitions(partitionInfos.size())
                                    .replicationFactor(partitionInfos.isEmpty() ? 0 :
                                            partitionInfos.get(0).replicas().size())
                                    .config(configMap)
                                    .topicPartitions(topicPartitions)
                                    .build();

                            topics.add(topic);
                        }
                    } catch (Exception e) {
                        log.warn("Error processing topic {}", topicName, e);
                    }
                }
                clusterInfo.setTopics(topics);

                // Get consumer groups
                ListConsumerGroupsResult groupsResult = adminClient.listConsumerGroups();
                Collection<ConsumerGroupListing> groups = groupsResult.all().get();
                List<String> groupIds = groups.stream()
                        .map(ConsumerGroupListing::groupId)
                        .filter(Objects::nonNull) // Filter out null group IDs
                        .collect(Collectors.toList());

                List<KafkaConsumerGroup> consumerGroups = new ArrayList<>();
                if (!groupIds.isEmpty()) {
                    try {
                        // Describe consumer groups
                        DescribeConsumerGroupsResult groupsDescResult = adminClient.describeConsumerGroups(groupIds);
                        Map<String, ConsumerGroupDescription> groupDescriptions = groupsDescResult.all().get();

                        // Get consumer group offsets
                        // Process each group ID individually to avoid the Map<String, Collection<TopicPartition>> issue
                        Map<String, Map<TopicPartition, OffsetAndMetadata>> allOffsets = new HashMap<>();

                        for (String groupId : groupIds) {
                            if (groupId != null) {
                                try {
                                    // Call listConsumerGroupOffsets with a single group ID
                                    ListConsumerGroupOffsetsResult offsetsResult = adminClient.listConsumerGroupOffsets(groupId);
                                    Map<TopicPartition, OffsetAndMetadata> offsets = offsetsResult.partitionsToOffsetAndMetadata().get();
                                    allOffsets.put(groupId, offsets);
                                } catch (Exception e) {
                                    log.warn("Error getting offsets for group {}", groupId, e);
                                }
                            }
                        }

                        // Build consumer groups
                        for (String groupId : groupIds) {
                            try {
                                if (groupId == null) {
                                    continue; // Skip null group IDs
                                }

                                ConsumerGroupDescription groupDesc = groupDescriptions.get(groupId);
                                if (groupDesc != null) {
                                    // Get members
                                    List<KafkaGroupMember> members = groupDesc.members().stream()
                                            .filter(Objects::nonNull) // Filter out null members
                                            .map(member -> KafkaGroupMember.builder()
                                                    .memberId(member.consumerId())
                                                    .clientId(member.clientId())
                                                    .host(member.host())
                                                    .build())
                                            .collect(Collectors.toList());

                                    // Get topic partitions
                                    Map<TopicPartition, OffsetAndMetadata> groupOffsets =
                                            allOffsets.getOrDefault(groupId, Collections.emptyMap());
                                    List<KafkaGroupTopicPartition> topicPartitions = new ArrayList<>();

                                    // Process topic partitions from offsets
                                    if (groupOffsets != null && !groupOffsets.isEmpty()) {
                                        for (Map.Entry<TopicPartition, OffsetAndMetadata> entry : groupOffsets.entrySet()) {
                                            TopicPartition tp = entry.getKey();
                                            OffsetAndMetadata offsetAndMetadata = entry.getValue();

                                            if (tp != null && offsetAndMetadata != null) {
                                                String topic = tp.topic();
                                                int partition = tp.partition();
                                                long currentOffset = offsetAndMetadata.offset();

                                                // Create a topic partition entry
                                                KafkaGroupTopicPartition topicPartition = KafkaGroupTopicPartition.builder()
                                                        .topic(topic)
                                                        .partition(partition)
                                                        .currentOffset(currentOffset)
                                                        .logEndOffset(0) // We don't have this information yet
                                                        .lag(0) // We don't have this information yet
                                                        .memberId("") // We don't have this information yet
                                                        .build();

                                                topicPartitions.add(topicPartition);
                                            }
                                        }
                                    }

                                    // Build consumer group
                                    consumerGroups.add(KafkaConsumerGroup.builder()
                                            .groupId(groupId)
                                            .state(groupDesc.state() != null ? groupDesc.state().toString() : "Unknown")
                                            .members(members)
                                            .topicPartitions(topicPartitions)
                                            .build());
                                }
                            } catch (Exception e) {
                                log.warn("Error processing consumer group {}", groupId, e);
                            }
                        }
                    } catch (Exception e) {
                        log.warn("Error getting consumer groups", e);
                    }
                }
                clusterInfo.setConsumerGroups(consumerGroups);
            }
        } catch (Exception e) {
            log.error("Error getting Kafka cluster info", e);
        }

        return clusterInfo;
    }

    /**
     * Check if message consumption is enabled.
     *
     * @return true if message consumption is enabled
     */
    public boolean isMessageConsumptionEnabled() {
        return config.isMessageConsumptionEnabled();
    }

    /**
     * Check if message production is enabled.
     *
     * @return true if message production is enabled
     */
    public boolean isMessageProductionEnabled() {
        return config.isMessageProductionEnabled();
    }

    /**
     * Check if streaming is enabled.
     *
     * @return true if streaming is enabled
     */
    public boolean isStreamingEnabled() {
        return config.isStreamingEnabled();
    }
}
