import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { KafkaService, KafkaClusterInfo, KafkaTopic, KafkaBroker, KafkaConsumerGroup, KafkaListener, KafkaMessage } from '../../services/kafka.service';
import { ConfigService } from '../../services/config.service';
import { ThemeService } from '../../services/theme.service';
import { trigger, transition, style, animate, state } from '@angular/animations';

@Component({
  selector: 'app-kafka-explorer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './kafka-explorer.component.html',
  styleUrls: ['./kafka-explorer.component.scss'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ opacity: 0 }))
      ])
    ]),
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateY(-10px)', opacity: 0 }),
        animate('300ms ease-in', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ transform: 'translateY(-10px)', opacity: 0 }))
      ])
    ])
  ]
})
export class KafkaExplorerComponent implements OnInit {
  clusterInfo: KafkaClusterInfo | null = null;
  selectedTopic: KafkaTopic | null = null;
  selectedBroker: KafkaBroker | null = null;
  selectedConsumerGroup: KafkaConsumerGroup | null = null;
  selectedListener: KafkaListener | null = null;

  loading = true;
  error: string | null = null;
  title = 'Kafka Explorer';
  isDarkTheme = true;
  searchQuery: string = '';
  searchFocused: boolean = false;

  // Message sending
  newMessage: KafkaMessage = {
    id: '',
    content: '',
    timestamp: new Date().toISOString(),
    metadata: ''
  };

  // Received messages
  receivedMessages: KafkaMessage[] = [];
  filteredMessages: KafkaMessage[] = [];
  loadingMessages = false;
  expandedMessageIds: Set<string> = new Set<string>();
  messageFilter: string = '';

  // Pagination
  currentPage = 0;
  pageSize = 20;
  totalMessages = 0;
  totalPages = 0;

  // Active tab
  activeTabIndex = 0;

  // Topic detail tabs
  activeTopicTab = 'overview';
  topicConsumers: KafkaConsumerGroup[] = [];
  topicDetails: KafkaTopic | null = null;
  messageViewMode: string = 'new'; // 'new', 'old', or 'live'

  // Right pane visibility
  showRightPane = false;

  constructor(
    private kafkaService: KafkaService,
    private configService: ConfigService,
    private themeService: ThemeService,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // Get the current theme from the theme service
    this.isDarkTheme = this.themeService.getCurrentTheme() === 'dark';

    // Subscribe to theme changes
    this.themeService.theme$.subscribe(theme => {
      this.isDarkTheme = theme === 'dark';
    });

    // Initialize filtered messages array
    this.filteredMessages = [];

    // Load Kafka cluster info
    this.loadClusterInfo();

    // Load received messages
    this.loadReceivedMessages();
  }

  /**
   * Toggles the theme between light and dark.
   */
  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  /**
   * Loads Kafka cluster information.
   */
  loadClusterInfo(): void {
    this.loading = true;
    this.error = null;

    this.kafkaService.getClusterInfo().subscribe({
      next: (clusterInfo) => {
        this.clusterInfo = clusterInfo;
        this.loading = false;

        // Select the first topic if available
        if (clusterInfo.topics.length > 0) {
          this.selectTopic(clusterInfo.topics[0]);
        }

        // Select the first broker if available
        if (clusterInfo.brokers.length > 0) {
          this.selectBroker(clusterInfo.brokers[0]);
        }

        // Select the first consumer group if available
        if (clusterInfo.consumerGroups.length > 0) {
          this.selectConsumerGroup(clusterInfo.consumerGroups[0]);
        }

        // Select the first listener if available
        if (clusterInfo.listeners.length > 0) {
          this.selectListener(clusterInfo.listeners[0]);
        }
      },
      error: (error) => {
        console.error('Error loading Kafka cluster info:', error);
        this.error = 'Failed to load Kafka cluster information. Please check the server connection.';
        this.loading = false;
      }
    });
  }

  /**
   * Loads received messages from Kafka.
   */
  loadReceivedMessages(): void {
    this.loadingMessages = true;

    // Use the appropriate sort parameter based on the message view mode
    const sortParam = this.messageViewMode === 'old' ? 'old' : 'new';

    // If a topic is selected, load messages for that topic
    if (this.selectedTopic) {
      this.loadMessagesForTopic(this.selectedTopic.name, sortParam);
    } else {
      // Otherwise, load general received messages (for backward compatibility)
      this.kafkaService.getReceivedMessages(sortParam).subscribe({
        next: (messages) => {
          this.receivedMessages = messages;
          this.loadingMessages = false;
        },
        error: (error) => {
          console.error('Error loading received messages:', error);
          this.loadingMessages = false;
        }
      });
    }
  }

  /**
   * Loads messages for a specific topic with pagination.
   */
  loadMessagesForTopic(topicName: string, sort: string = 'new', page: number = 0): void {
    this.loadingMessages = true;

    this.kafkaService.getMessagesFromTopic(topicName, page, this.pageSize, sort).subscribe({
      next: (response) => {
        console.log('Response from getMessagesFromTopic:', response);

        // Check if response is an array (direct messages) or an object with messages property
        if (Array.isArray(response)) {
          // Handle case where API returns an array directly
          this.receivedMessages = response;
          this.totalMessages = response.length;
          this.totalPages = 1;
          this.currentPage = 0;
        } else if (response && typeof response === 'object') {
          // Handle case where API returns a paginated response object
          this.receivedMessages = response.messages || [];
          this.currentPage = response.page !== undefined ? response.page : 0;
          this.totalMessages = response.totalMessages !== undefined ? response.totalMessages : (this.receivedMessages.length || 0);
          this.totalPages = response.totalPages !== undefined ? response.totalPages : 1;
        } else {
          // Fallback for unexpected response format
          console.error('Unexpected response format:', response);
          this.receivedMessages = [];
          this.totalMessages = 0;
          this.totalPages = 0;
          this.currentPage = 0;
        }

        this.applyMessageFilter(); // Apply any existing filter
        this.loadingMessages = false;
      },
      error: (error) => {
        console.error(`Error loading messages for topic ${topicName}:`, error);
        this.receivedMessages = [];
        this.filteredMessages = [];
        this.totalMessages = 0;
        this.totalPages = 0;
        this.currentPage = 0;
        this.loadingMessages = false;
      }
    });
  }

  /**
   * Navigates to the next page of messages.
   */
  nextPage(): void {
    if (this.currentPage < this.totalPages - 1 && this.selectedTopic) {
      const sortParam = this.messageViewMode === 'old' ? 'old' : 'new';
      this.loadMessagesForTopic(this.selectedTopic.name, sortParam, this.currentPage + 1);
    }
  }

  /**
   * Navigates to the previous page of messages.
   */
  previousPage(): void {
    if (this.currentPage > 0 && this.selectedTopic) {
      const sortParam = this.messageViewMode === 'old' ? 'old' : 'new';
      this.loadMessagesForTopic(this.selectedTopic.name, sortParam, this.currentPage - 1);
    }
  }

  /**
   * Navigates to a specific page of messages.
   */
  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages && this.selectedTopic) {
      const sortParam = this.messageViewMode === 'old' ? 'old' : 'new';
      this.loadMessagesForTopic(this.selectedTopic.name, sortParam, page);
    }
  }

  /**
   * Refreshes the current messages.
   */
  refreshMessages(): void {
    if (this.selectedTopic) {
      const sortParam = this.messageViewMode === 'old' ? 'old' : 'new';
      this.loadMessagesForTopic(this.selectedTopic.name, sortParam, this.currentPage);
    }
  }

  /**
   * Applies the filter to messages.
   */
  applyMessageFilter(): void {
    // Initialize filteredMessages as an empty array if receivedMessages is undefined
    if (!this.receivedMessages) {
      this.filteredMessages = [];
      return;
    }

    if (!this.messageFilter || this.messageFilter.trim() === '') {
      this.filteredMessages = [...this.receivedMessages];
      return;
    }

    const filterLower = this.messageFilter.toLowerCase();
    this.filteredMessages = this.receivedMessages.filter(message => {
      // Check if the content contains the filter text
      if (message.content && message.content.toLowerCase().includes(filterLower)) {
        return true;
      }
      // Check if the ID contains the filter text
      if (message.id && message.id.toLowerCase().includes(filterLower)) {
        return true;
      }
      // Check if the metadata contains the filter text
      if (message.metadata && message.metadata.toLowerCase().includes(filterLower)) {
        return true;
      }
      return false;
    });
  }

  /**
   * Updates the message filter and applies it.
   */
  onMessageFilterChange(filter: string): void {
    this.messageFilter = filter;
    this.applyMessageFilter();
  }

  /**
   * Sends a message to Kafka.
   */
  sendMessage(): void {
    if (!this.newMessage.content) {
      return;
    }

    this.newMessage.timestamp = new Date().toISOString();

    this.kafkaService.sendMessage(this.newMessage).subscribe({
      next: (response) => {
        console.log('Message sent successfully:', response);

        // Clear the form
        this.newMessage = {
          id: '',
          content: '',
          timestamp: new Date().toISOString(),
          metadata: ''
        };

        // Reload received messages after a short delay
        setTimeout(() => this.loadReceivedMessages(), 1000);
      },
      error: (error) => {
        console.error('Error sending message:', error);
      }
    });
  }

  /**
   * Clears received messages.
   */
  clearMessages(): void {
    this.kafkaService.clearMessages().subscribe({
      next: () => {
        this.receivedMessages = [];
      },
      error: (error) => {
        console.error('Error clearing messages:', error);
      }
    });
  }

  /**
   * Selects a topic and loads its details and consumers.
   */
  selectTopic(topic: KafkaTopic): void {
    this.selectedTopic = topic;
    this.activeTopicTab = 'overview';

    // Load detailed topic information
    this.kafkaService.getTopicByName(topic.name).subscribe({
      next: (topicDetails) => {
        this.topicDetails = topicDetails;
      },
      error: (error) => {
        console.error('Error loading topic details:', error);
      }
    });

    // Load consumers for this topic
    this.kafkaService.getConsumersForTopic(topic.name).subscribe({
      next: (consumers) => {
        this.topicConsumers = consumers;
      },
      error: (error) => {
        console.error('Error loading topic consumers:', error);
      }
    });

    // Load messages for this topic
    const sortParam = this.messageViewMode === 'old' ? 'old' : 'new';
    this.loadMessagesForTopic(topic.name, sortParam);
  }

  /**
   * Selects a broker.
   */
  selectBroker(broker: KafkaBroker): void {
    this.selectedBroker = broker;
    this.hideProduceMessagePane();
  }

  /**
   * Selects a consumer group.
   */
  selectConsumerGroup(consumerGroup: KafkaConsumerGroup): void {
    this.selectedConsumerGroup = consumerGroup;
    this.hideProduceMessagePane();
  }

  /**
   * Selects a listener.
   */
  selectListener(listener: KafkaListener): void {
    this.selectedListener = listener;
    this.hideProduceMessagePane();
  }

  /**
   * Gets the severity class for a tag based on the consumer group state.
   */
  getConsumerGroupStateSeverity(state: string): string {
    switch (state) {
      case 'Stable':
        return 'success';
      case 'PreparingRebalance':
      case 'CompletingRebalance':
        return 'warning';
      case 'Dead':
        return 'danger';
      default:
        return 'info';
    }
  }

  /**
   * Gets the severity class for a tag based on the topic partition status.
   */
  getPartitionStatusSeverity(partition: any): string {
    if (partition.inSyncReplicas.length < partition.replicas.length) {
      return 'danger';
    }
    return 'success';
  }

  /**
   * Refreshes the Kafka cluster information.
   */
  refreshClusterInfo(): void {
    this.loadClusterInfo();
  }

  // Note: refreshMessages() method is already defined above

  /**
   * Formats a timestamp for display.
   */
  formatTimestamp(timestamp: string): string {
    if (!timestamp) return '';

    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      return timestamp;
    }
  }

  /**
   * Toggles the expanded state of a message.
   */
  toggleMessageExpanded(messageId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    if (this.expandedMessageIds.has(messageId)) {
      this.expandedMessageIds.delete(messageId);
    } else {
      this.expandedMessageIds.add(messageId);
    }
  }

  /**
   * Checks if a message is expanded.
   */
  isMessageExpanded(messageId: string): boolean {
    return this.expandedMessageIds.has(messageId);
  }

  /**
   * Formats message content for display, attempting to parse JSON if possible.
   * If the content is JSON, it extracts and displays only the content value.
   */
  formatMessageContent(content: string): string {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(content);

      // If the parsed object has a 'content' property, extract and display only that
      if (parsed && typeof parsed === 'object' && parsed.content !== undefined) {
        // If the content value is itself a JSON object, pretty-print it
        if (typeof parsed.content === 'object') {
          return JSON.stringify(parsed.content, null, 2);
        }
        // Otherwise return the content value as is
        return parsed.content;
      }

      // If no content property, pretty-print the entire JSON
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      // If not valid JSON, return as is
      return content;
    }
  }

  /**
   * Checks if message content is valid JSON.
   */
  isJsonContent(content: string): boolean {
    try {
      JSON.parse(content);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Sets the active topic tab.
   */
  setActiveTopicTab(tab: string): void {
    this.activeTopicTab = tab;
  }

  /**
   * Sets the message view mode.
   */
  setMessageViewMode(mode: string): void {
    this.messageViewMode = mode;
    // Reload messages with the new sort order
    if (this.selectedTopic) {
      const sortParam = mode === 'old' ? 'old' : 'new';
      this.loadMessagesForTopic(this.selectedTopic.name, sortParam);
    } else {
      this.loadReceivedMessages();
    }
  }

  /**
   * Gets the count of in-sync replicas for a topic.
   */
  getInSyncReplicaCount(): number {
    if (!this.topicDetails || !this.topicDetails.partitionInfos) return 0;

    return this.topicDetails.partitionInfos.reduce((count, partition) => {
      return count + partition.inSyncReplicas.length;
    }, 0);
  }

  /**
   * Gets the count of under-replicated partitions for a topic.
   */
  getUnderReplicatedPartitionCount(): number {
    if (!this.topicDetails || !this.topicDetails.partitionInfos) return 0;

    return this.topicDetails.partitionInfos.filter(partition =>
      partition.inSyncReplicas.length < partition.replicas.length
    ).length;
  }

  /**
   * Gets the total lag for a consumer group.
   */
  getTotalLag(consumer: KafkaConsumerGroup): number {
    if (!consumer || !consumer.topicPartitions) return 0;

    return consumer.topicPartitions.reduce((sum, tp) => sum + tp.lag, 0);
  }

  /**
   * Checks if the topic has settings.
   */
  hasSettings(): boolean {
    return !!this.topicDetails && !!this.topicDetails.settings && this.topicDetails.settings.length > 0;
  }

  /**
   * Shows the right pane for producing messages
   */
  showProduceMessagePane(): void {
    this.showRightPane = true;
  }

  /**
   * Hides the right pane
   */
  hideProduceMessagePane(): void {
    this.showRightPane = false;
  }
}
