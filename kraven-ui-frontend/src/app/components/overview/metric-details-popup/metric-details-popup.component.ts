import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate, query, stagger, state } from '@angular/animations';

export interface MetricDetail {
  name: string;
  value?: string;
  description?: string;
  type?: string;
  tags?: string[];
}

@Component({
  selector: 'app-metric-details-popup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './metric-details-popup.component.html',
  styleUrls: ['./metric-details-popup.component.scss'],
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
export class MetricDetailsPopupComponent implements OnInit, OnChanges {
  @Input() isVisible = false;
  @Input() title = '';
  @Input() metricType = '';
  @Input() items: MetricDetail[] = [];
  @Output() close = new EventEmitter<void>();

  filteredItems: MetricDetail[] = [];
  searchTerm = '';

  constructor() {}

  ngOnInit(): void {
    this.updateItemsList();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Update when items or visibility changes
    if (changes['items'] || changes['isVisible']) {
      this.updateItemsList();

      // Prevent body scrolling when popup is visible
      if (this.isVisible) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  }

  private updateItemsList(): void {
    this.filteredItems = [...this.items];
    this.searchTerm = '';
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredItems = [...this.items];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredItems = this.items.filter(item =>
      item.name.toLowerCase().includes(term) ||
      (item.value && item.value.toLowerCase().includes(term)) ||
      (item.description && item.description.toLowerCase().includes(term)) ||
      (item.tags && item.tags.some(tag => tag.toLowerCase().includes(term)))
    );
  }

  /**
   * Clears the search input and resets the filtered items list
   */
  clearSearch(): void {
    this.searchTerm = '';
    this.filteredItems = [...this.items];
  }

  closePopup(): void {
    document.body.style.overflow = ''; // Restore scrolling
    this.close.emit();
  }
}
