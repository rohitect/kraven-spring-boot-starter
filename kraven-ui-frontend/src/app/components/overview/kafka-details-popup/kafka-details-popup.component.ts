import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { trigger, transition, style, animate, query, stagger, state } from '@angular/animations';
import { KafkaConsumerGroup, KafkaListener } from '../../../services/kafka.service';

export interface KafkaDetails {
  type: 'consumer' | 'producer';
  data: KafkaConsumerGroup | KafkaListener;
}

@Component({
  selector: 'app-kafka-details-popup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './kafka-details-popup.component.html',
  styleUrls: ['./kafka-details-popup.component.scss'],
  animations: [
    trigger('fadeAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
      ])
    ]),
    trigger('scaleAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.92)' }),
        animate('400ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'scale(0.96)' }))
      ])
    ]),
    trigger('slideAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms 100ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('itemAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-10px)' }),
        animate('300ms {{delay}}ms ease-out',
          style({ opacity: 1, transform: 'translateX(0)' })
        )
      ])
    ])
  ]
})
export class KafkaDetailsPopupComponent implements OnInit, OnChanges {
  @Input() isVisible = false;
  @Input() kafkaType: 'consumer' | 'producer' = 'consumer';
  @Input() items: any[] = [];
  @Output() close = new EventEmitter<void>();

  selectedItem: any | null = null;
  filteredItems: any[] = [];
  searchTerm = '';

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.updateItemsList();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Update when items or kafkaType changes
    if (changes['items'] || changes['isVisible']) {
      this.updateItemsList();
    }
  }

  private updateItemsList(): void {
    this.filteredItems = [...this.items];
    this.searchTerm = '';

    if (this.items.length > 0) {
      this.selectedItem = this.items[0];
    } else {
      this.selectedItem = null;
    }
  }

  onItemSelect(item: any): void {
    this.selectedItem = item;
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredItems = [...this.items];
      return;
    }

    const term = this.searchTerm.toLowerCase();

    if (this.kafkaType === 'consumer') {
      // Search in consumer groups
      this.filteredItems = this.items.filter((item: KafkaConsumerGroup) =>
        item.groupId.toLowerCase().includes(term) ||
        item.state.toLowerCase().includes(term)
      );
    } else {
      // Search in producers (listeners)
      this.filteredItems = this.items.filter((item: KafkaListener) =>
        item.id.toLowerCase().includes(term) ||
        item.className.toLowerCase().includes(term) ||
        item.methodName.toLowerCase().includes(term) ||
        (item.topics && item.topics.some(topic => topic.toLowerCase().includes(term)))
      );
    }
  }

  /**
   * Clears the search input and resets the filtered items list
   */
  clearSearch(): void {
    this.searchTerm = '';
    this.filteredItems = [...this.items];
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
   * Gets the total lag for a consumer group.
   */
  getTotalLag(consumer: KafkaConsumerGroup): number {
    if (!consumer || !consumer.topicPartitions) return 0;
    return consumer.topicPartitions.reduce((sum, tp) => sum + tp.lag, 0);
  }

  /**
   * Navigate to Kafka Explorer with the selected item
   * Uses the simplified 'tab' and 'item' query parameters
   */
  navigateToKafkaExplorer(): void {
    if (!this.selectedItem) return;

    if (this.kafkaType === 'consumer') {
      this.router.navigate(['/kafka'], {
        queryParams: {
          tab: 2, // Consumer Groups tab
          item: this.selectedItem.groupId
        }
      });
    } else {
      this.router.navigate(['/kafka'], {
        queryParams: {
          tab: 3, // Listeners tab
          item: this.selectedItem.id
        }
      });
    }

    this.closePopup();
  }

  closePopup(): void {
    this.close.emit();
  }
}
