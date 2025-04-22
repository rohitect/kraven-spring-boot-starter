package io.github.rohitect.kraven.springboot.kafka.service;

import io.github.rohitect.kraven.springboot.kafka.model.*;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.admin.*;
import org.apache.kafka.common.Node;
import org.apache.kafka.common.TopicPartitionInfo;
import org.apache.kafka.common.config.ConfigResource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.kafka.core.KafkaAdmin;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for interacting with Kafka Admin API.
 */
@Service
@ConditionalOnClass(name = "org.springframework.kafka.core.KafkaAdmin")
@Slf4j
public class KafkaAdminService {

    private final KafkaListenerScanner kafkaListenerScanner;
    private final KafkaAdmin kafkaAdmin;

    @Value("${spring.kafka.bootstrap-servers:localhost:9092}")
    private String bootstrapServers;

    @Autowired
    public KafkaAdminService(KafkaListenerScanner kafkaListenerScanner, KafkaAdmin kafkaAdmin) {
        this.kafkaListenerScanner = kafkaListenerScanner;
        this.kafkaAdmin = kafkaAdmin;
    }

    /**
     * Gets information about the Kafka cluster.
     *
     * @return Kafka cluster information
     */
    public KafkaClusterInfo getClusterInfo() {
        try {
            log.debug("Getting Kafka cluster info");

            // Create AdminClient from KafkaAdmin
            try (AdminClient adminClient = AdminClient.create(kafkaAdmin.getConfigurationProperties())) {
                // Get cluster info
                DescribeClusterResult clusterResult = adminClient.describeCluster();
                String clusterId = clusterResult.clusterId().get();
                Collection<Node> nodes = clusterResult.nodes().get();
                int controllerId = clusterResult.controller().get().id();

                // Get brokers
                List<KafkaBroker> brokers = nodes.stream()
                        .map(node -> KafkaBroker.builder()
                                .id(node.id())
                                .host(node.host())
                                .port(node.port())
                                .rack(node.rack())
                                .controller(node.id() == controllerId)
                                .build())
                        .collect(Collectors.toList());

                // Get topics
                ListTopicsResult topicsResult = adminClient.listTopics();
                Set<String> topicNames = topicsResult.names().get();

                // Get topic descriptions
                Map<String, TopicDescription> topicDescriptions = adminClient.describeTopics(topicNames).topicNameValues().entrySet().stream()
                        .collect(Collectors.toMap(Map.Entry::getKey, entry -> {
                            try {
                                return entry.getValue().get();
                            } catch (Exception e) {
                                log.warn("Error getting topic description for {}", entry.getKey(), e);
                                return null;
                            }
                        }));
                topicDescriptions.values().removeIf(Objects::isNull);

                // Get topic configs
                Map<ConfigResource, Config> topicConfigs = new HashMap<>();
                try {
                    Set<ConfigResource> resources = topicNames.stream()
                            .map(name -> new ConfigResource(ConfigResource.Type.TOPIC, name))
                            .collect(Collectors.toSet());

                    if (!resources.isEmpty()) {
                        topicConfigs = adminClient.describeConfigs(resources).all().get();
                    }
                } catch (Exception e) {
                    log.warn("Error getting topic configs", e);
                }

                // Build topic list
                List<KafkaTopic> topics = new ArrayList<>();
                for (String topicName : topicNames) {
                    try {
                        TopicDescription desc = topicDescriptions.get(topicName);
                        if (desc != null) {
                            // Get partition info
                            List<KafkaTopic.PartitionInfo> partitionInfos = new ArrayList<>();
                            for (TopicPartitionInfo partitionInfo : desc.partitions()) {
                                partitionInfos.add(KafkaTopic.PartitionInfo.builder()
                                        .id(partitionInfo.partition())
                                        .leader(partitionInfo.leader().id())
                                        .replicas(partitionInfo.replicas().stream()
                                                .map(Node::id)
                                                .collect(Collectors.toList()))
                                        .inSyncReplicas(partitionInfo.isr().stream()
                                                .map(Node::id)
                                                .collect(Collectors.toList()))
                                        .firstOffset(0L) // Not available from AdminClient
                                        .lastOffset(0L)  // Not available from AdminClient
                                        .build());
                            }

                            // Get topic settings
                            List<KafkaTopic.TopicSetting> settings = new ArrayList<>();
                            ConfigResource resource = new ConfigResource(ConfigResource.Type.TOPIC, topicName);
                            Config config = topicConfigs.get(resource);

                            if (config != null) {
                                for (ConfigEntry entry : config.entries()) {
                                    settings.add(KafkaTopic.TopicSetting.builder()
                                            .name(entry.name())
                                            .value(entry.value())
                                            .description(entry.documentation())
                                            .build());
                                }
                            }

                            // Get cleanup policy
                            String cleanupPolicy = "unknown";
                            if (config != null) {
                                ConfigEntry cleanupEntry = config.get("cleanup.policy");
                                if (cleanupEntry != null) {
                                    cleanupPolicy = cleanupEntry.value();
                                }
                            }

                            // Build topic
                            topics.add(KafkaTopic.builder()
                                    .name(topicName)
                                    .partitions(desc.partitions().size())
                                    .replicationFactor((short) desc.partitions().get(0).replicas().size())
                                    .partitionInfos(partitionInfos)
                                    .internal(desc.isInternal())
                                    .segmentSize(0L) // Not available from AdminClient
                                    .segmentCount(0)  // Not available from AdminClient
                                    .cleanupPolicy(cleanupPolicy)
                                    .messageCount(0L) // Not available from AdminClient
                                    .settings(settings)
                                    .build());
                        }
                    } catch (Exception e) {
                        log.warn("Error processing topic {}", topicName, e);
                    }
                }

                // Get consumer groups
                List<KafkaConsumerGroup> consumerGroups = new ArrayList<>();
                try {
                    ListConsumerGroupsResult groupsResult = adminClient.listConsumerGroups();
                    Collection<ConsumerGroupListing> groups = groupsResult.all().get();

                    if (!groups.isEmpty()) {
                        Set<String> groupIds = groups.stream()
                                .map(ConsumerGroupListing::groupId)
                                .collect(Collectors.toSet());

                        Map<String, ConsumerGroupDescription> groupDescriptions =
                                adminClient.describeConsumerGroups(groupIds).all().get();

                        for (String groupId : groupIds) {
                            try {
                                ConsumerGroupDescription groupDesc = groupDescriptions.get(groupId);
                                if (groupDesc != null) {
                                    // Get members and collect topic partitions from assignments
                                    List<KafkaConsumerGroup.GroupMember> members = new ArrayList<>();
                                    Map<String, Set<Integer>> topicPartitionsMap = new HashMap<>();

                                    for (MemberDescription member : groupDesc.members()) {
                                        String assignment = "";
                                        if (member.assignment() != null && member.assignment().topicPartitions() != null) {
                                            // Process topic partitions for this member
                                            for (org.apache.kafka.common.TopicPartition tp : member.assignment().topicPartitions()) {
                                                // Add to the map of topic partitions
                                                topicPartitionsMap
                                                    .computeIfAbsent(tp.topic(), k -> new HashSet<>())
                                                    .add(tp.partition());
                                            }

                                            assignment = member.assignment().topicPartitions().stream()
                                                    .map(tp -> tp.topic() + "-" + tp.partition())
                                                    .collect(Collectors.joining(", "));
                                        }

                                        members.add(KafkaConsumerGroup.GroupMember.builder()
                                                .memberId(member.consumerId())
                                                .clientId(member.clientId())
                                                .host(member.host())
                                                .assignment(assignment)
                                                .build());
                                    }

                                    // Create topic partitions list from the collected data
                                    // Note: Offsets are not available from AdminClient, so we set them to 0
                                    List<KafkaConsumerGroup.TopicPartitionInfo> topicPartitions = new ArrayList<>();
                                    for (Map.Entry<String, Set<Integer>> entry : topicPartitionsMap.entrySet()) {
                                        String topic = entry.getKey();
                                        for (Integer partition : entry.getValue()) {
                                            topicPartitions.add(KafkaConsumerGroup.TopicPartitionInfo.builder()
                                                    .topic(topic)
                                                    .partition(partition)
                                                    .currentOffset(0L) // Not available from AdminClient
                                                    .logEndOffset(0L)  // Not available from AdminClient
                                                    .lag(0L)          // Not available from AdminClient
                                                    .memberId("")     // Not tracking which member owns which partition
                                                    .build());
                                        }
                                    }

                                    // Build consumer group
                                    consumerGroups.add(KafkaConsumerGroup.builder()
                                            .groupId(groupId)
                                            .state(groupDesc.state().toString())
                                            .members(members)
                                            .topicPartitions(topicPartitions)
                                            .build());
                                }
                            } catch (Exception e) {
                                log.warn("Error processing consumer group {}", groupId, e);
                            }
                        }
                    }
                } catch (Exception e) {
                    log.warn("Error getting consumer groups", e);
                }

                // Get listeners
                List<KafkaListener> listeners = kafkaListenerScanner.getKafkaListeners();

                // Build cluster info
                return KafkaClusterInfo.builder()
                        .bootstrapServers(bootstrapServers)
                        .clusterId(clusterId)
                        .controllerId(controllerId)
                        .brokers(brokers)
                        .topics(topics)
                        .consumerGroups(consumerGroups)
                        .listeners(listeners)
                        .build();
            }
        } catch (Exception e) {
            log.error("Error getting Kafka cluster info", e);
            return createEmptyClusterInfo();
        }
    }

    /**
     * Creates an empty cluster info when Kafka is not available.
     *
     * @return Empty Kafka cluster info
     */
    private KafkaClusterInfo createEmptyClusterInfo() {
        // Get listeners (these are available even if Kafka is not)
        List<KafkaListener> listeners = kafkaListenerScanner.getKafkaListeners();

        // Build empty cluster info
        return KafkaClusterInfo.builder()
                .bootstrapServers(bootstrapServers)
                .clusterId("-----")
                .controllerId(-1)
                .brokers(Collections.emptyList())
                .topics(Collections.emptyList())
                .consumerGroups(Collections.emptyList())
                .listeners(listeners)
                .build();
    }
}
