import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { KafkaService, KafkaClusterInfo, KafkaTopic, KafkaBroker, KafkaConsumerGroup, KafkaListener, KafkaMessage } from '../../services/kafka.service';
import { ConfigService } from '../../services/config.service';
import { ThemeService } from '../../services/theme.service';
import { trigger, transition, style, animate, state } from '@angular/animations';
import { PluginLoaderComponent } from '../shared/plugin-loader/plugin-loader.component';

@Component({
  selector: 'app-kafka-explorer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PluginLoaderComponent
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
export class KafkaExplorerComponent implements OnInit, OnDestroy {
  clusterInfo: KafkaClusterInfo | null = null;
  selectedTopic: KafkaTopic | null = null;
  selectedBroker: KafkaBroker | null = null;
  selectedConsumerGroup: KafkaConsumerGroup | null = null;
  selectedListener: KafkaListener | null = null;

  loading = true;
  error: string | null = null;
  title = 'Kafka Explorer';
  isDarkTheme = true;
  topicSearchQuery: string = '';
  filteredTopics: KafkaTopic[] = [];

  // Configuration options
  messageProductionEnabled = true;
  messageConsumptionEnabled = true;
  streamingEnabled = true;
  messageLimit = 100;

  // Message sending
  newMessage: KafkaMessage = {
    key: '',
    value: '',
    headers: {}
  };

  // UI helper properties for headers
  headerEntries: { key: string; value: string }[] = [];

  // Received messages
  receivedMessages: KafkaMessage[] = [];
  filteredMessages: KafkaMessage[] = [];
  loadingMessages = false;
  expandedMessageIndices: Set<number> = new Set<number>();
  messageFilter: string = '';

  // Live streaming properties
  eventSource: EventSource | null = null;
  isStreaming: boolean = false;
  streamedMessages: KafkaMessage[] = [];

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
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Get the current theme from the theme service
    this.isDarkTheme = this.themeService.getCurrentTheme() === 'dark';

    // Subscribe to theme changes
    this.themeService.theme$.subscribe(theme => {
      this.isDarkTheme = theme === 'dark';
    });

    // Initialize configuration options from config service
    const config = this.configService.getConfig();
    if (config.kafka) {
      this.messageProductionEnabled = config.kafka.messageProductionEnabled !== false;
      this.messageConsumptionEnabled = config.kafka.messageConsumptionEnabled !== false;
      this.streamingEnabled = config.kafka.streamingEnabled !== false;
      this.messageLimit = config.kafka.messageLimit || 100;


    }

    // Initialize filtered messages array
    this.filteredMessages = [];

    // Load Kafka cluster info and handle query parameters
    this.loadClusterInfoAndHandleParams();
  }

  /**
   * Toggles the theme between light and dark.
   */
  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  /**
   * Loads Kafka cluster information and handles query parameters.
   * Handles the simplified 'tab' and 'item' query parameters.
   */
  loadClusterInfoAndHandleParams(): void {
    this.loading = true;
    this.error = null;

    // Get query parameters once
    this.route.queryParams.subscribe(params => {
      const tabParam = params['tab'];
      const itemParam = params['item'];

      // Only fetch cluster info if we don't already have it
      if (!this.clusterInfo) {
        this.kafkaService.getClusterInfo().subscribe({
          next: (clusterInfo) => {
            this.clusterInfo = clusterInfo;
            this.loading = false;

            // Process the cluster info and handle params
            this.processClusterInfoAndParams(clusterInfo, tabParam, itemParam);
          },
          error: (error) => {
            console.error('Error loading Kafka cluster info:', error);
            this.error = 'Failed to load Kafka cluster information. Please check the server connection.';
            this.loading = false;
          }
        });
      } else {

        this.loading = false;
        // Use the existing cluster info
        this.processClusterInfoAndParams(this.clusterInfo, tabParam, itemParam);
      }
    });
  }

  /**
   * Process the cluster info and handle URL parameters
   * This is extracted from loadClusterInfoAndHandleParams to avoid code duplication
   */
  private processClusterInfoAndParams(clusterInfo: KafkaClusterInfo, tabParam: string | null, itemParam: string | null): void {
    // Initialize filtered topics with null check
    if (clusterInfo && clusterInfo.topics) {
      this.filteredTopics = [...clusterInfo.topics];
    } else {
      console.warn('No topics found in cluster info or cluster info is null');
      this.filteredTopics = [];
    }

    // Handle tab selection from query params
    const activeTab = tabParam ? parseInt(tabParam, 10) || 0 : 0;
    this.activeTabIndex = activeTab;

    // Handle item selection based on query params
    let itemSelected = false;

    if (itemParam) {
      switch (activeTab) {
        case 0: // Topics
          // For topics, the item is a composite of topic name and active tab
          const [topicName, topicTab] = itemParam.split(':');
          if (topicName && clusterInfo && clusterInfo.topics && clusterInfo.topics.length > 0) {
            const topic = clusterInfo.topics.find(t => t.name === topicName);
            if (topic) {
              this.selectTopic(topic);
              // Set the active topic tab if specified
              if (topicTab) {
                this.activeTopicTab = topicTab;
              }
              itemSelected = true;
            }
          }
          break;

        case 1: // Brokers
          if (clusterInfo && clusterInfo.brokers && clusterInfo.brokers.length > 0) {
            const brokerId = parseInt(itemParam, 10);
            const broker = clusterInfo.brokers.find(b => b.id === brokerId);
            if (broker) {
              this.selectBroker(broker);
              itemSelected = true;
            }
          }
          break;

        case 2: // Consumer Groups
          if (clusterInfo && clusterInfo.consumerGroups && clusterInfo.consumerGroups.length > 0) {
            const consumerGroup = clusterInfo.consumerGroups.find(cg => cg.groupId === itemParam);
            if (consumerGroup) {
              this.selectConsumerGroup(consumerGroup);
              itemSelected = true;
            }
          }
          break;

        case 3: // Listeners
          if (clusterInfo && clusterInfo.listeners && clusterInfo.listeners.length > 0) {
            const listener = clusterInfo.listeners.find(l => l.id === itemParam);
            if (listener) {
              this.selectListener(listener);
              itemSelected = true;
            }
          }
          break;
      }
    }

    // If no specific item was selected from query params, select defaults based on active tab
    if (!itemSelected) {
      switch (activeTab) {
        case 0: // Topics
          // Select the first topic if available
          if (clusterInfo && clusterInfo.topics && clusterInfo.topics.length > 0) {
            this.selectTopic(clusterInfo.topics[0]);
          }
          break;

        case 1: // Brokers
          // Select the first broker if available
          if (clusterInfo && clusterInfo.brokers && clusterInfo.brokers.length > 0) {
            this.selectBroker(clusterInfo.brokers[0]);
          }
          break;

        case 2: // Consumer Groups
          // Select the first consumer group if available
          if (clusterInfo && clusterInfo.consumerGroups && clusterInfo.consumerGroups.length > 0) {
            this.selectConsumerGroup(clusterInfo.consumerGroups[0]);
          }
          break;

        case 3: // Listeners
          // Select the first listener if available
          if (clusterInfo && clusterInfo.listeners && clusterInfo.listeners.length > 0) {
            this.selectListener(clusterInfo.listeners[0]);
          }
          break;
      }
    }

    // Only load messages if we're on the topics tab and in the messages sub-tab
    if (activeTab === 0 && this.activeTopicTab === 'messages' && this.selectedTopic) {
      this.loadReceivedMessages();
    }
  }

  /**
   * Updates the URL query parameters based on the current selection state.
   * Uses only 'tab' and 'item' parameters for cleaner URLs.
   */
  updateQueryParams(): void {
    const queryParams: any = {
      tab: this.activeTabIndex
    };

    // Add the appropriate item ID based on the active tab
    switch (this.activeTabIndex) {
      case 0: // Topics
        if (this.selectedTopic) {
          // For topics, the item is a composite of topic name and active tab
          queryParams.item = `${this.selectedTopic.name}:${this.activeTopicTab}`;
        }
        break;
      case 1: // Brokers
        if (this.selectedBroker) {
          queryParams.item = this.selectedBroker.id.toString();
        }
        break;
      case 2: // Consumer Groups
        if (this.selectedConsumerGroup) {
          queryParams.item = this.selectedConsumerGroup.groupId;
        }
        break;
      case 3: // Listeners
        if (this.selectedListener) {
          queryParams.item = this.selectedListener.id;
        }
        break;
    }

    // Update the URL without navigating
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: queryParams,
      queryParamsHandling: 'replace', // Use 'replace' instead of 'merge' to ensure only these two params
      replaceUrl: true
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
    // Check if message consumption is enabled
    if (!this.messageConsumptionEnabled) {
      console.warn('Message consumption is disabled');
      this.receivedMessages = [];
      this.filteredMessages = [];
      this.totalMessages = 0;
      this.totalPages = 0;
      this.currentPage = 0;
      this.loadingMessages = false;
      return;
    }

    this.loadingMessages = true;

    this.kafkaService.getMessagesFromTopic(topicName, page, this.messageLimit, sort).subscribe({
      next: (response) => {


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
      // Don't refresh if we're in live mode
      if (this.messageViewMode === 'live') {
        return;
      }

      const sortParam = this.messageViewMode === 'old' ? 'old' : 'new';
      this.loadMessagesForTopic(this.selectedTopic.name, sortParam, this.currentPage);
    }
  }

  /**
   * Applies the filter to messages.
   */
  applyMessageFilter(): void {
    // Determine which message array to use based on the view mode
    const sourceMessages = this.messageViewMode === 'live' ? this.streamedMessages : this.receivedMessages;

    // Initialize filteredMessages as an empty array if source messages is undefined
    if (!sourceMessages) {
      this.filteredMessages = [];
      return;
    }

    if (!this.messageFilter || this.messageFilter.trim() === '') {
      this.filteredMessages = [...sourceMessages];
      return;
    }

    const filterLower = this.messageFilter.toLowerCase();
    this.filteredMessages = sourceMessages.filter(message => {
      // Check if the value contains the filter text
      if (message.value && typeof message.value === 'string' && message.value.toLowerCase().includes(filterLower)) {
        return true;
      }
      // Check if the key contains the filter text
      if (message.key && message.key.toLowerCase().includes(filterLower)) {
        return true;
      }
      // Check if any header contains the filter text
      if (message.headers) {
        for (const [key, value] of Object.entries(message.headers)) {
          if (key.toLowerCase().includes(filterLower) || value.toLowerCase().includes(filterLower)) {
            return true;
          }
        }
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
    if (!this.newMessage.value) {
      return;
    }

    // Check if message production is enabled
    if (!this.messageProductionEnabled) {
      console.warn('Message production is disabled');
      alert('Message production is disabled in the configuration');
      return;
    }

    if (!this.selectedTopic) {
      console.warn('No topic selected');
      alert('Please select a topic first');
      return;
    }

    // Build headers from header entries
    const headers: { [key: string]: string } = {};
    this.headerEntries.forEach(entry => {
      if (entry.key && entry.value) {
        headers[entry.key] = entry.value;
      }
    });

    // Prepare the message payload
    const messagePayload: KafkaMessage = {
      value: this.newMessage.value,
      ...(this.newMessage.key && { key: this.newMessage.key }),
      ...(Object.keys(headers).length > 0 && { headers })
    };

    this.kafkaService.sendMessage(this.selectedTopic.name, messagePayload).subscribe({
      next: (response) => {
        // Clear the form
        this.newMessage = {
          key: '',
          value: '',
          headers: {}
        };
        this.headerEntries = [];

        // Reload received messages after a short delay
        setTimeout(() => this.loadReceivedMessages(), 1000);
      },
      error: (error) => {
        console.error('Error sending message:', error);
        alert('Error sending message: ' + (error.message || 'Unknown error'));
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

    // Update query parameters
    this.updateQueryParams();
  }

  /**
   * Selects a broker.
   */
  selectBroker(broker: KafkaBroker): void {
    this.selectedBroker = broker;
    this.hideProduceMessagePane();

    // Update query parameters
    this.updateQueryParams();
  }

  /**
   * Selects a consumer group.
   */
  selectConsumerGroup(consumerGroup: KafkaConsumerGroup): void {
    this.selectedConsumerGroup = consumerGroup;
    this.hideProduceMessagePane();

    // Update query parameters
    this.updateQueryParams();
  }

  /**
   * Selects a listener.
   */
  selectListener(listener: KafkaListener): void {
    this.selectedListener = listener;
    this.hideProduceMessagePane();

    // Update query parameters
    this.updateQueryParams();
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
    this.loadClusterInfoAndHandleParams();
  }

  /**
   * Sets the message view mode.
   */
  setMessageViewMode(mode: string): void {
    // If we're switching to or from live mode, handle the stream
    if (mode === 'live' && this.messageViewMode !== 'live') {
      this.startLiveStream();
    } else if (this.messageViewMode === 'live' && mode !== 'live') {
      this.stopLiveStream();
    }

    this.messageViewMode = mode;

    // Only refresh messages if we're not in live mode
    if (mode !== 'live') {
      this.refreshMessages();
    }
  }

  /**
   * Starts the live stream for the selected topic.
   */
  startLiveStream(): void {
    if (!this.selectedTopic) {
      return;
    }

    // Check if streaming is enabled
    if (!this.streamingEnabled) {
      console.warn('Streaming is disabled');
      alert('Streaming is disabled in the configuration');
      this.messageViewMode = 'new'; // Fall back to non-streaming mode
      return;
    }

    // Check if message consumption is enabled
    if (!this.messageConsumptionEnabled) {
      console.warn('Message consumption is disabled');
      alert('Message consumption is disabled in the configuration');
      this.messageViewMode = 'new'; // Fall back to non-streaming mode
      return;
    }

    // Clear any existing streamed messages
    this.streamedMessages = [];
    this.filteredMessages = [];

    // Close any existing event source
    this.stopLiveStream();

    // Create a new event source
    this.isStreaming = true;
    const eventSource = this.kafkaService.streamMessagesFromTopic(this.selectedTopic.name);

    // Check if event source was created (it might be null if streaming is disabled)
    if (!eventSource) {
      this.isStreaming = false;
      this.messageViewMode = 'new'; // Fall back to non-streaming mode
      return;
    }

    this.eventSource = eventSource;

    // Handle connection open
    this.eventSource.onopen = () => {
      // Connection opened successfully
    };

    // Handle messages
    this.eventSource.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data) as KafkaMessage;

        // Add the message to the beginning of the array (newest first)
        this.streamedMessages.unshift(message);

        // Keep only the most recent 100 messages
        if (this.streamedMessages.length > 100) {
          this.streamedMessages.pop();
        }

        // Update filtered messages
        this.applyMessageFilter();
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    // Handle errors
    this.eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      this.stopLiveStream();
    };
  }

  /**
   * Stops the live stream.
   */
  stopLiveStream(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isStreaming = false;
  }

  /**
   * Formats a timestamp for display.
   */
  formatTimestamp(timestamp: number | string): string {
    if (!timestamp) return '';

    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      return String(timestamp);
    }
  }

  /**
   * Toggles the expanded state of a message.
   */
  toggleMessageExpanded(messageIndex: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    if (this.expandedMessageIndices.has(messageIndex)) {
      this.expandedMessageIndices.delete(messageIndex);
    } else {
      this.expandedMessageIndices.add(messageIndex);
    }
  }

  /**
   * Checks if a message is expanded.
   */
  isMessageExpanded(messageIndex: number): boolean {
    return this.expandedMessageIndices.has(messageIndex);
  }

  /**
   * Cleans up resources when the component is destroyed.
   */
  ngOnDestroy(): void {
    // Clean up the event source if it exists
    this.stopLiveStream();
  }

  /**
   * Formats message value for display, attempting to parse JSON if possible.
   */
  formatMessageContent(value: any): string {
    if (value === undefined || value === null) {
      return '';
    }

    // If value is already a string, try to parse as JSON for pretty printing
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return JSON.stringify(parsed, null, 2);
      } catch (e) {
        // If not valid JSON, return as is
        return value;
      }
    }

    // If value is an object, pretty-print it
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }

    // For other types, convert to string
    return String(value);
  }

  /**
   * Checks if message value is valid JSON.
   */
  isJsonContent(value: any): boolean {
    if (typeof value === 'object') {
      return true;
    }
    if (typeof value === 'string') {
      try {
        JSON.parse(value);
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  /**
   * Sets the active tab index, loads the appropriate data for the tab, and updates the query parameters.
   */
  setActiveTabIndex(index: number): void {
    this.activeTabIndex = index;

    // Load the appropriate data based on the selected tab
    switch (index) {
      case 0: // Topics tab
        // Topics are already loaded in loadClusterInfoAndHandleParams
        // Only load messages if we're on the topics tab and in the messages sub-tab
        if (this.activeTopicTab === 'messages' && this.selectedTopic) {
          this.loadReceivedMessages();
        }
        break;
      case 1: // Brokers tab
        // Refresh brokers data
        this.kafkaService.getBrokers().subscribe({
          next: (brokers) => {
            if (this.clusterInfo) {
              this.clusterInfo.brokers = brokers;
            }
            // Select the first broker if none is selected
            if (!this.selectedBroker && brokers && brokers.length > 0) {
              this.selectBroker(brokers[0]);
            }
          },
          error: (error) => {
            console.error('Error loading brokers:', error);
          }
        });
        break;
      case 2: // Consumer Groups tab
        // Refresh consumer groups data
        this.kafkaService.getConsumerGroups().subscribe({
          next: (consumerGroups) => {
            if (this.clusterInfo) {
              this.clusterInfo.consumerGroups = consumerGroups;
            }
            // Select the first consumer group if none is selected
            if (!this.selectedConsumerGroup && consumerGroups && consumerGroups.length > 0) {
              this.selectConsumerGroup(consumerGroups[0]);
            }
          },
          error: (error) => {
            console.error('Error loading consumer groups:', error);
          }
        });
        break;
      case 3: // Listeners tab
        // Refresh listeners data
        this.kafkaService.getListeners().subscribe({
          next: (listeners) => {
            if (this.clusterInfo) {
              this.clusterInfo.listeners = listeners;
            }
            // Select the first listener if none is selected
            if (!this.selectedListener && listeners && listeners.length > 0) {
              this.selectListener(listeners[0]);
            }
          },
          error: (error) => {
            console.error('Error loading listeners:', error);
          }
        });
        break;
    }

    this.updateQueryParams();
  }

  /**
   * Sets the active topic tab, loads the appropriate data for the tab, and updates the query parameters.
   */
  setActiveTopicTab(tab: string): void {
    // console.log(`Setting active topic tab to: ${tab}`);
    this.activeTopicTab = tab;

    // Load the appropriate data based on the selected tab
    if (this.selectedTopic) {
      switch (tab) {
        case 'overview':
          // Refresh topic details
          // console.log(`Loading topic details for: ${this.selectedTopic.name}`);
          this.kafkaService.getTopicByName(this.selectedTopic.name).subscribe({
            next: (topicDetails) => {
              // console.log('Received topic details:', topicDetails);
              this.topicDetails = topicDetails;
            },
            error: (error) => {
              console.error('Error loading topic details:', error);
            }
          });
          break;
        case 'messages':
          // Refresh messages only when switching to the messages tab
          const sortParam = this.messageViewMode === 'old' ? 'old' : 'new';
          this.loadMessagesForTopic(this.selectedTopic.name, sortParam, this.currentPage);
          break;
        case 'consumers':
          // Refresh consumers for this topic
          this.refreshConsumers();
          break;
        case 'settings':
          // Refresh topic details to get settings
          this.kafkaService.getTopicByName(this.selectedTopic.name).subscribe({
            next: (topicDetails) => {
              this.topicDetails = topicDetails;
            },
            error: (error) => {
              console.error('Error loading topic settings:', error);
            }
          });
          break;
      }
    }

    this.updateQueryParams();
  }

  // setMessageViewMode is implemented above with live streaming support

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
   * Refreshes the consumers for the selected topic
   */
  refreshConsumers(): void {
    if (!this.selectedTopic) return;

    this.kafkaService.getConsumersForTopic(this.selectedTopic.name).subscribe({
      next: (consumers) => {
        this.topicConsumers = consumers;
      },
      error: (error) => {
        console.error('Error refreshing topic consumers:', error);
      }
    });
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
   * Adds a new header entry
   */
  addHeaderEntry(): void {
    this.headerEntries.push({ key: '', value: '' });
  }

  /**
   * Removes a header entry at the specified index
   */
  removeHeaderEntry(index: number): void {
    this.headerEntries.splice(index, 1);
  }

  /**
   * Hides the right pane
   */
  hideProduceMessagePane(): void {
    this.showRightPane = false;
  }

  /**
   * Filters topics based on the search query
   */
  filterTopics(): void {
    if (!this.clusterInfo || !this.clusterInfo.topics) {
      this.filteredTopics = [];
      return;
    }

    if (!this.topicSearchQuery || this.topicSearchQuery.trim() === '') {
      this.filteredTopics = [...this.clusterInfo.topics];
      return;
    }

    const query = this.topicSearchQuery.toLowerCase();
    this.filteredTopics = this.clusterInfo.topics.filter(topic =>
      topic && topic.name && topic.name.toLowerCase().includes(query)
    );
  }

  /**
   * Extracts the actual content from a message
   * Returns the message value as a string
   */
  extractMessageContent(message: KafkaMessage): string {
    if (!message || message.value === undefined || message.value === null) {
      return '';
    }

    // If value is already a string, return it
    if (typeof message.value === 'string') {
      return message.value;
    }

    // If value is an object, stringify it
    if (typeof message.value === 'object') {
      return JSON.stringify(message.value, null, 2);
    }

    // For other types, convert to string
    return String(message.value);
  }

  /**
   * Copies the message content to the clipboard
   */
  copyMessageContentToClipboard(message: KafkaMessage, event: Event): void {
    // Prevent the click from toggling the message expansion
    event.stopPropagation();

    // Extract the actual content
    const content = this.extractMessageContent(message);

    // Copy to clipboard
    navigator.clipboard.writeText(content)
      .then(() => {
        // You could add a toast notification here
      })
      .catch(err => {
        console.error('Failed to copy content: ', err);
      });
  }

  /**
   * Reproduces a message by copying its content to the producer pane
   */
  reproduceMessage(message: KafkaMessage, event: Event): void {
    // Prevent the click from toggling the message expansion
    event.stopPropagation();

    // Copy the message data to the new message
    this.newMessage.key = message.key || '';
    this.newMessage.value = message.value || '';

    // Copy headers if they exist
    this.headerEntries = [];
    if (message.headers) {
      Object.entries(message.headers).forEach(([key, value]) => {
        this.headerEntries.push({ key, value });
      });
    }

    // Show the produce message pane
    this.showProduceMessagePane();
  }

  /**
   * Helper method to get Object.keys for template use
   */
  getObjectKeys(obj: any): string[] {
    return Object.keys(obj || {});
  }
}
