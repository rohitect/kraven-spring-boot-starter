import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { ActuatorDataService } from '../services/actuator-data.service';

@Component({
  selector: 'app-memory-tab',
  templateUrl: './memory-tab.component.html',
  styleUrls: ['./memory-tab.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ]
})
export class MemoryTabComponent implements OnInit, OnDestroy {
  memoryData: any = null;
  isLoading = true;
  refreshInterval = 15; // seconds
  showHeapDumpRequested = false;
  heapDumpRequestStatus: 'success' | 'error' | null = null;
  heapDumpRequestMessage = '';

  // Secondary tabs
  activeSecondaryTab: 'overview' | 'heap' | 'nonheap' | 'gc' = 'overview';

  private dataSubscription?: Subscription;
  private refreshSubscription?: Subscription;

  constructor(private actuatorDataService: ActuatorDataService) {}

  ngOnInit(): void {
    // Load initial data
    this.loadMemoryData();

    // Set up auto-refresh
    this.startDataRefresh();
  }

  ngOnDestroy(): void {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  /**
   * Load memory data from the service
   */
  loadMemoryData(): void {
    this.isLoading = true;
    this.dataSubscription = this.actuatorDataService.getMemoryData().subscribe({
      next: (data) => {
        this.memoryData = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading memory data:', error);
        this.isLoading = false;
      }
    });
  }

  /**
   * Start auto-refresh of data
   */
  startDataRefresh(): void {
    // Cancel any existing subscription
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }

    // Set up new subscription
    this.refreshSubscription = interval(this.refreshInterval * 1000).subscribe(() => {
      this.loadMemoryData();
    });
  }

  /**
   * Update refresh interval
   */
  updateRefreshInterval(): void {
    this.startDataRefresh();
  }

  /**
   * Force refresh of data
   */
  forceRefresh(): void {
    this.loadMemoryData();
  }

  /**
   * Request a heap dump
   */
  requestHeapDump(): void {
    this.isLoading = true;
    this.actuatorDataService.requestHeapDump().subscribe({
      next: (response) => {
        this.isLoading = false;
        this.showHeapDumpRequested = true;
        if (response && response.success) {
          this.heapDumpRequestStatus = 'success';
          this.heapDumpRequestMessage = response.message || 'Heap dump requested successfully.';
        } else {
          this.heapDumpRequestStatus = 'error';
          this.heapDumpRequestMessage = response?.message || 'Failed to request heap dump.';
        }
      },
      error: (error) => {
        console.error('Error requesting heap dump:', error);
        this.isLoading = false;
        this.showHeapDumpRequested = true;
        this.heapDumpRequestStatus = 'error';
        this.heapDumpRequestMessage = 'Failed to request heap dump. See console for details.';
      }
    });
  }

  /**
   * Close the heap dump request notification
   */
  closeHeapDumpNotification(): void {
    this.showHeapDumpRequested = false;
    this.heapDumpRequestStatus = null;
    this.heapDumpRequestMessage = '';
  }

  /**
   * Switch to a different secondary tab
   */
  switchSecondaryTab(tab: 'overview' | 'heap' | 'nonheap' | 'gc'): void {
    this.activeSecondaryTab = tab;
  }

  /**
   * Format bytes to a human-readable string
   */
  formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';
    if (isNaN(bytes) || !isFinite(bytes)) return 'N/A';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Calculate percentage
   */
  calculatePercentage(used: number, max: number): number {
    if (max <= 0 || isNaN(max) || isNaN(used)) return 0;
    return (used / max) * 100;
  }

  /**
   * Get color based on usage percentage
   */
  getColorByPercentage(percentage: number): string {
    if (percentage >= 90) return 'var(--danger-color, #dc3545)';
    if (percentage >= 70) return 'var(--warning-color, #ffc107)';
    return 'var(--success-color, #28a745)';
  }
}
