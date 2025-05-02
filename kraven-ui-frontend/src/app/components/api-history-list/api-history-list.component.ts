import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiHistoryEntry, ApiHistoryGroup } from '../../models/api-history.model';
import { ApiHistoryService } from '../../services/api-history.service';

@Component({
  selector: 'app-api-history-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './api-history-list.component.html',
  styleUrls: ['./api-history-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ApiHistoryListComponent implements OnInit {
  @Input() applicationName: string | null = null;
  @Output() viewDetails = new EventEmitter<ApiHistoryEntry>();

  historyEntries: ApiHistoryEntry[] = [];
  loading = true;
  error: string | null = null;
  searchQuery = '';

  constructor(
    private apiHistoryService: ApiHistoryService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.applicationName) {
      // Set the application name in the history service
      this.apiHistoryService.setApplicationName(this.applicationName);
      this.loadHistory();
    }
  }

  /**
   * Load API call history
   */
  loadHistory(): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    if (!this.applicationName) {
      console.error('Application name is required');
      this.error = 'Application name is required to load history.';
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    // Load all history (which is now specific to the current application)
    this.apiHistoryService.getAllHistory().subscribe({
      next: (entries) => {
        this.historyEntries = entries;
        this.applyFilter();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading API history:', err);
        this.error = 'Failed to load API call history. Please try again.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Apply search filter to history entries
   */
  applyFilter(): void {
    if (!this.searchQuery) {
      return; // No need to filter if search query is empty
    }

    const query = this.searchQuery.toLowerCase();

    this.historyEntries = this.historyEntries.filter(entry =>
      entry.path.toLowerCase().includes(query) ||
      entry.method.toLowerCase().includes(query)
    );
  }

  /**
   * Handle search input changes
   */
  onSearchChange(): void {
    // Reload the history and then apply the filter
    this.loadHistory();
  }

  /**
   * Clear all history for the current application
   */
  clearAllHistory(): void {
    if (!this.applicationName) return;

    this.apiHistoryService.clearHistoryForApplication(this.applicationName).subscribe({
      next: () => {
        this.loadHistory();
      },
      error: (err) => {
        console.error('Error clearing API history:', err);
        this.error = 'Failed to clear API history. Please try again.';
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * View details of an API call
   */
  onViewDetails(entry: ApiHistoryEntry): void {
    this.viewDetails.emit(entry);
  }

  /**
   * Delete an API call from history
   */
  deleteApiCall(event: Event, id: number): void {
    event.stopPropagation();

    this.apiHistoryService.deleteApiCall(id).subscribe({
      next: () => {
        this.loadHistory();
      },
      error: (err) => {
        console.error('Error deleting API call:', err);
        this.error = 'Failed to delete API call from history. Please try again.';
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Clear all API call history for an application
   */
  clearHistory(event: Event, applicationName: string): void {
    event.stopPropagation();

    this.apiHistoryService.clearHistoryForApplication(applicationName).subscribe({
      next: () => {
        this.loadHistory();
      },
      error: (err) => {
        console.error('Error clearing API history:', err);
        this.error = 'Failed to clear API history. Please try again.';
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Format the timestamp to a readable date
   */
  formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString();
  }

  /**
   * Get the method badge color
   */
  getMethodColor(method: string): string {
    switch (method) {
      case 'GET': return '#61affe';
      case 'POST': return '#49cc90';
      case 'PUT': return '#fca130';
      case 'DELETE': return '#f93e3e';
      case 'PATCH': return '#50e3c2';
      case 'HEAD': return '#9012fe';
      case 'OPTIONS': return '#0d5aa7';
      default: return '#555';
    }
  }
}
