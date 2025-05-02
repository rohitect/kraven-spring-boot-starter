import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiHistoryEntry } from '../../models/api-history.model';
import { AndypfJsonViewerComponent } from '../andypf-json-viewer/andypf-json-viewer.component';
import { ThemeService } from '../../services/theme.service';

// Make Object available in the template
type WithObject = {
  Object: typeof Object;
};

@Component({
  selector: 'app-api-history-detail',
  standalone: true,
  imports: [CommonModule, AndypfJsonViewerComponent],
  templateUrl: './api-history-detail.component.html',
  styleUrls: ['./api-history-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ApiHistoryDetailComponent implements WithObject {
  // Make Object available in the template
  readonly Object = Object;
  @Input() historyEntry: ApiHistoryEntry | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() rerun = new EventEmitter<ApiHistoryEntry>();
  @Output() delete = new EventEmitter<number>();

  isDarkTheme = true;
  activeTab: 'request' | 'response' = 'response';
  jsonViewerExpanded = true;

  constructor(private themeService: ThemeService) {
    this.isDarkTheme = this.themeService.getCurrentTheme() === 'dark';
    this.themeService.theme$.subscribe(theme => {
      this.isDarkTheme = theme === 'dark';
    });
  }

  /**
   * Set the active tab
   */
  setActiveTab(tab: 'request' | 'response'): void {
    this.activeTab = tab;
  }

  /**
   * Close the detail modal
   */
  closeModal(): void {
    this.close.emit();
  }

  /**
   * Rerun the API call
   */
  rerunApiCall(): void {
    if (this.historyEntry) {
      this.rerun.emit(this.historyEntry);
    }
  }

  /**
   * Delete the API call from history
   */
  deleteApiCall(): void {
    if (this.historyEntry && this.historyEntry.id) {
      this.delete.emit(this.historyEntry.id);
    }
  }

  /**
   * Format the timestamp to a readable date
   */
  formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  /**
   * Get the status class based on the response status
   */
  getStatusClass(status: number): string {
    if (status >= 200 && status < 300) {
      return 'status-success';
    } else if (status >= 400) {
      return 'status-error';
    } else if (status >= 300 && status < 400) {
      return 'status-redirect';
    } else {
      return 'status-info';
    }
  }

  /**
   * Get the status text based on the response status
   */
  getStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      500: 'Internal Server Error'
    };

    return statusTexts[status] || '';
  }

  /**
   * Toggle JSON viewer expanded state
   */
  toggleJsonViewerExpanded(): void {
    this.jsonViewerExpanded = !this.jsonViewerExpanded;
  }
}
