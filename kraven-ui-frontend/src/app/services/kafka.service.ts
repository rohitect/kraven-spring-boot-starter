import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfigService } from './config.service';

export interface KafkaMessage {
  id: string;
  content: string;
  timestamp: string;
  metadata?: string;
  topic?: string;
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
  private apiPath: string;
  private messageLimit: number;
  private streamingEnabled: boolean;
  private sseTimeoutMs: number;
  private messageProductionEnabled: boolean;
  private messageConsumptionEnabled: boolean;
  private topicManagementEnabled: boolean;
  private enabled: boolean;

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {
    const config = this.configService.getConfig();
    this.baseUrl = config.basePath || '';

    // Get the base API path from the ConfigService
    const baseApiPath = this.configService.getApiBasePath();

    // Initialize Kafka configuration from config
    if (config.kafka) {
      // Construct the API path using the base API path to honor servlet context path
      // The baseApiPath already includes the servlet context path, so we need to ensure
      // we're constructing the path correctly
      const servletContextPath = baseApiPath.replace('/kraven/api', '');
      this.apiPath = `${servletContextPath}/kraven/plugin/kafka`;

      this.messageLimit = config.kafka.messageLimit || 100;
      this.streamingEnabled = config.kafka.streamingEnabled !== false;
      this.sseTimeoutMs = config.kafka.sseTimeoutMs || 300000;
      this.messageProductionEnabled = config.kafka.messageProductionEnabled !== false;
      this.messageConsumptionEnabled = config.kafka.messageConsumptionEnabled !== false;
      this.topicManagementEnabled = config.kafka.topicManagementEnabled === true;
      this.enabled = config.kafka.enabled !== false;
    } else {
      // Default values if kafka config is not provided
      const servletContextPath = baseApiPath.replace('/kraven/api', '');
      this.apiPath = `${servletContextPath}/kraven/plugin/kafka`;

      this.messageLimit = 100;
      this.streamingEnabled = true;
      this.sseTimeoutMs = 300000;
      this.messageProductionEnabled = true;
      this.messageConsumptionEnabled = true;
      this.topicManagementEnabled = false;
      this.enabled = true;
    }


  }

  /**
   * Gets Kafka cluster information.
   */
  getClusterInfo(): Observable<KafkaClusterInfo> {
    if (!this.enabled) {
      console.warn('Kafka service is disabled');
      return new Observable(observer => observer.error('Kafka service is disabled'));
    }
    return this.http.get<KafkaClusterInfo>(`${this.apiPath}/cluster`);
  }

  /**
   * Gets Kafka brokers.
   */
  getBrokers(): Observable<KafkaBroker[]> {
    if (!this.enabled) {
      console.warn('Kafka service is disabled');
      return new Observable(observer => observer.error('Kafka service is disabled'));
    }
    return this.http.get<KafkaBroker[]>(`${this.apiPath}/brokers`);
  }

  /**
   * Gets Kafka topics.
   */
  getTopics(): Observable<KafkaTopic[]> {
    if (!this.enabled) {
      console.warn('Kafka service is disabled');
      return new Observable(observer => observer.error('Kafka service is disabled'));
    }
    return this.http.get<KafkaTopic[]>(`${this.apiPath}/topics`);
  }

  /**
   * Gets Kafka consumer groups.
   */
  getConsumerGroups(): Observable<KafkaConsumerGroup[]> {
    if (!this.enabled) {
      console.warn('Kafka service is disabled');
      return new Observable(observer => observer.error('Kafka service is disabled'));
    }

    const url = `${this.apiPath}/consumer-groups`;

    return this.http.get<KafkaConsumerGroup[]>(url);
  }

  /**
   * Gets Kafka listeners.
   */
  getListeners(): Observable<KafkaListener[]> {
    if (!this.enabled) {
      console.warn('Kafka service is disabled');
      return new Observable(observer => observer.error('Kafka service is disabled'));
    }

    const url = `${this.apiPath}/listeners`;

    return this.http.get<KafkaListener[]>(url);
  }

  /**
   * Gets a Kafka topic by name.
   */
  getTopicByName(name: string): Observable<KafkaTopic> {
    if (!this.enabled) {
      console.warn('Kafka service is disabled');
      return new Observable(observer => observer.error('Kafka service is disabled'));
    }
    return this.http.get<KafkaTopic>(`${this.apiPath}/topics/${name}`);
  }

  /**
   * Gets consumers for a specific topic.
   */
  getConsumersForTopic(topicName: string): Observable<KafkaConsumerGroup[]> {
    if (!this.enabled) {
      console.warn('Kafka service is disabled');
      return new Observable(observer => observer.error('Kafka service is disabled'));
    }

    const url = `${this.apiPath}/topics/${topicName}/consumers`;

    return this.http.get<KafkaConsumerGroup[]>(url);
  }

  /**
   * Sends a message to Kafka.
   * @param message The message to send, including topic, content, and optional metadata
   */
  sendMessage(message: KafkaMessage): Observable<KafkaMessage> {
    if (!this.enabled) {
      console.warn('Kafka service is disabled');
      return new Observable(observer => observer.error('Kafka service is disabled'));
    }

    if (!this.messageProductionEnabled) {
      console.warn('Kafka message production is disabled');
      return new Observable(observer => observer.error('Kafka message production is disabled'));
    }

    // Use the correct endpoint from the API path
    return this.http.post<KafkaMessage>(`${this.apiPath}/topics/${message.topic || 'default'}/messages`, message);
  }

  /**
   * Gets received messages from Kafka.
   * @param sort Optional sort parameter ('new' for newest first, 'old' for oldest first)
   * @deprecated Use getMessagesFromTopic() instead. This method will be removed in a future version.
   */
  getReceivedMessages(sort: string = 'new'): Observable<KafkaMessage[]> {
    console.warn('getReceivedMessages() is deprecated. Use getMessagesFromTopic() instead.');

    // Use "all" as a generic topic name to get messages from all topics
    return this.getMessagesFromTopic("all", 0, this.messageLimit, sort)
      .pipe(
        map(response => {
          // If the response has a messages property, use it; otherwise, return the response as is
          return response.messages ? response.messages as KafkaMessage[] : response as KafkaMessage[];
        })
      );
  }

  /**
   * Clears received messages.
   * @deprecated Use a topic-specific method instead. This method will be removed in a future version.
   */
  clearMessages(): Observable<void> {
    if (!this.enabled) {
      console.warn('Kafka service is disabled');
      return new Observable(observer => observer.error('Kafka service is disabled'));
    }

    console.warn('clearMessages() is deprecated. Use a topic-specific method instead.');

    // Use the correct endpoint from the API path
    return this.http.delete<void>(`${this.apiPath}/topics/all/messages`);
  }

  /**
   * Gets messages from a specific topic with pagination support.
   * @param topicName The name of the topic to retrieve messages from
   * @param page The page number (0-based, default: 0)
   * @param limit The maximum number of messages per page (default: 0 - uses configured limit)
   * @param sort Optional sort parameter ('new' for newest first, 'old' for oldest first)
   */
  getMessagesFromTopic(topicName: string, page: number = 0, limit: number = 0, sort: string = 'new'): Observable<any> {
    if (!this.enabled) {
      console.warn('Kafka service is disabled');
      return new Observable(observer => observer.error('Kafka service is disabled'));
    }

    if (!this.messageConsumptionEnabled) {
      console.warn('Kafka message consumption is disabled');
      return new Observable(observer => observer.error('Kafka message consumption is disabled'));
    }

    // Use configured message limit if not specified
    const actualLimit = limit > 0 ? limit : this.messageLimit;

    return this.http.get<any>(`${this.apiPath}/topics/${topicName}/messages?page=${page}&limit=${actualLimit}&sort=${sort}`);
  }

  /**
   * Creates an EventSource connection to stream messages from a specific topic.
   * @param topicName The name of the topic to stream messages from
   * @returns An EventSource object that can be used to listen for messages
   */
  streamMessagesFromTopic(topicName: string): EventSource | null {
    if (!this.enabled) {
      console.warn('Kafka service is disabled');
      return null;
    }

    if (!this.streamingEnabled) {
      console.warn('Kafka streaming is disabled');
      return null;
    }

    if (!this.messageConsumptionEnabled) {
      console.warn('Kafka message consumption is disabled');
      return null;
    }

    const url = `${this.apiPath}/topics/${topicName}/stream`;
    return new EventSource(url);
  }
}
