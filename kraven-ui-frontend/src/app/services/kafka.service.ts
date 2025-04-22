import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';

export interface KafkaMessage {
  id: string;
  content: string;
  timestamp: string;
  metadata?: string;
}

export interface TopicSetting {
  name: string;
  value: string;
  description: string;
}

export interface KafkaTopic {
  name: string;
  partitions: number;
  replicationFactor: number;
  internal: boolean;
  partitionInfos: {
    id: number;
    leader: number;
    replicas: number[];
    inSyncReplicas: number[];
    firstOffset: number;
    lastOffset: number;
  }[];
  segmentSize: number;
  segmentCount: number;
  cleanupPolicy: string;
  messageCount: number;
  settings: TopicSetting[];
}

export interface KafkaBroker {
  id: number;
  host: string;
  port: number;
  controller: boolean;
  rack: string;
}

export interface KafkaConsumerGroup {
  groupId: string;
  state: string;
  members: {
    memberId: string;
    clientId: string;
    host: string;
    assignment: string;
  }[];
  topicPartitions: {
    topic: string;
    partition: number;
    currentOffset: number;
    logEndOffset: number;
    lag: number;
    memberId: string;
  }[];
}

export interface KafkaListener {
  id: string;
  topics: string[];
  groupId: string;
  className: string;
  methodName: string;
  beanName: string;
  messageType: string;
}

export interface KafkaClusterInfo {
  bootstrapServers: string;
  clusterId: string;
  controllerId: number;
  brokers: KafkaBroker[];
  topics: KafkaTopic[];
  consumerGroups: KafkaConsumerGroup[];
  listeners: KafkaListener[];
}

@Injectable({
  providedIn: 'root'
})
export class KafkaService {
  private baseUrl: string;

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {
    const config = this.configService.getConfig();
    this.baseUrl = config.basePath || '';
  }

  /**
   * Gets Kafka cluster information.
   */
  getClusterInfo(): Observable<KafkaClusterInfo> {
    return this.http.get<KafkaClusterInfo>('/api/kraven-kafka-management/cluster');
  }

  /**
   * Gets Kafka brokers.
   */
  getBrokers(): Observable<KafkaBroker[]> {
    return this.http.get<KafkaBroker[]>('/api/kraven-kafka-management/brokers');
  }

  /**
   * Gets Kafka topics.
   */
  getTopics(): Observable<KafkaTopic[]> {
    return this.http.get<KafkaTopic[]>('/api/kraven-kafka-management/topics');
  }

  /**
   * Gets Kafka consumer groups.
   */
  getConsumerGroups(): Observable<KafkaConsumerGroup[]> {
    return this.http.get<KafkaConsumerGroup[]>('/api/kraven-kafka-management/consumer-groups');
  }

  /**
   * Gets Kafka listeners.
   */
  getListeners(): Observable<KafkaListener[]> {
    return this.http.get<KafkaListener[]>('/api/kraven-kafka-management/listeners');
  }

  /**
   * Gets a Kafka topic by name.
   */
  getTopicByName(name: string): Observable<KafkaTopic> {
    return this.http.get<KafkaTopic>(`/api/kraven-kafka-management/topics/${name}`);
  }

  /**
   * Gets consumers for a specific topic.
   */
  getConsumersForTopic(topicName: string): Observable<KafkaConsumerGroup[]> {
    return this.http.get<KafkaConsumerGroup[]>(`/api/kraven-kafka-management/topics/${topicName}/consumers`);
  }

  /**
   * Sends a message to Kafka.
   */
  sendMessage(message: KafkaMessage): Observable<KafkaMessage> {
    return this.http.post<KafkaMessage>('/api/kafka/messages', message);
  }

  /**
   * Gets received messages from Kafka.
   * @param sort Optional sort parameter ('new' for newest first, 'old' for oldest first)
   */
  getReceivedMessages(sort: string = 'new'): Observable<KafkaMessage[]> {
    return this.http.get<KafkaMessage[]>(`/api/kafka/messages?sort=${sort}`);
  }

  /**
   * Clears received messages.
   */
  clearMessages(): Observable<void> {
    return this.http.delete<void>('/api/kafka/messages');
  }

  /**
   * Gets messages from a specific topic with pagination support.
   * @param topicName The name of the topic to retrieve messages from
   * @param page The page number (0-based, default: 0)
   * @param limit The maximum number of messages per page (default: 20)
   * @param sort Optional sort parameter ('new' for newest first, 'old' for oldest first)
   */
  getMessagesFromTopic(topicName: string, page: number = 0, limit: number = 20, sort: string = 'new'): Observable<any> {
    return this.http.get<any>(`/api/kraven-kafka-management/topics/${topicName}/messages?page=${page}&limit=${limit}&sort=${sort}`);
  }

  /**
   * Creates an EventSource connection to stream messages from a specific topic.
   * @param topicName The name of the topic to stream messages from
   * @returns An EventSource object that can be used to listen for messages
   */
  streamMessagesFromTopic(topicName: string): EventSource {
    const url = `/api/kraven-kafka-management/topics/${topicName}/stream`;
    return new EventSource(url);
  }
}
