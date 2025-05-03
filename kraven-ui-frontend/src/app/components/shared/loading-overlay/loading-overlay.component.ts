import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { PluginRegistryService } from '../../../services/plugin-registry.service';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-overlay.component.html',
  styleUrls: ['./loading-overlay.component.scss'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class LoadingOverlayComponent implements OnInit {
  @Input() show = false;
  @Input() message = 'Loading...';
  @Input() pluginId: string | null = null;

  // Plugin-specific sarcastic messages
  private pluginMessages: Record<string, string[]> = {
    'kafka': [
      "Waking up the Kafka cluster from its nap...",
      "Convincing Kafka to share its messages with us...",
      "Herding the Kafka topics into submission...",
      "Negotiating with Kafka brokers (they're tough negotiators)...",
      "Teaching Kafka to speak human again...",
      "Untangling the Kafka message queue spaghetti...",
      "Asking Kafka nicely to stop hiding the consumer groups...",
      "Bribing Kafka with more RAM to cooperate...",
      "Waiting for Kafka to finish its coffee break...",
      "Translating Kafka's cryptic error messages to English...",
      "Convincing Kafka that it's not a bug, it's a feature...",
      "Waiting for Kafka to stop partitioning everything...",
      "Trying to understand what Kafka is thinking...",
      "Kafka is thinking about your request (very slowly)...",
      "Kafka is processing your request at the speed of a sleepy sloth..."
    ],
    'default': [
      "Convincing the plugin to wake up and do its job...",
      "Negotiating with the plugin (it's being difficult)...",
      "Waiting for the plugin to finish its coffee break...",
      "Plugin is thinking about your request (very slowly)...",
      "Trying to understand what the plugin is thinking...",
      "Bribing the plugin with more CPU cycles...",
      "Plugin is processing your request at the speed of a sleepy sloth...",
      "Untangling the plugin's spaghetti code...",
      "Asking the plugin nicely to cooperate...",
      "Translating the plugin's cryptic error messages to English...",
      "Convincing the plugin that it's not a bug, it's a feature..."
    ]
  };

  // Current messages to display
  sarcasticMessages: string[] = [];
  currentMessageIndex = 0;
  displayedMessage = '';
  private intervalId: any = null;

  constructor(private pluginRegistry: PluginRegistryService) {}

  ngOnInit(): void {
    // Initialize messages based on plugin ID
    this.initializeMessages();

    // Start rotating messages
    this.rotateMessages();
  }

  ngOnDestroy(): void {
    // Clear the interval when component is destroyed
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private initializeMessages(): void {
    if (this.pluginId && this.pluginMessages[this.pluginId]) {
      this.sarcasticMessages = this.pluginMessages[this.pluginId];
    } else {
      this.sarcasticMessages = this.pluginMessages['default'];
    }

    // Set initial message
    if (this.sarcasticMessages.length > 0) {
      this.displayedMessage = this.sarcasticMessages[0];
    }
  }

  rotateMessages(): void {
    // Clear any existing interval
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // Rotate messages every 3 seconds
    this.intervalId = setInterval(() => {
      this.currentMessageIndex = (this.currentMessageIndex + 1) % this.sarcasticMessages.length;
      this.displayedMessage = this.sarcasticMessages[this.currentMessageIndex];
    }, 3000);
  }
}
