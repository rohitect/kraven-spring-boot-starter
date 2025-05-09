import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { ActuatorDataService } from '../services/actuator-data.service';
import { HealthMonitorComponent } from '../health-monitor/health-monitor.component';

// No longer needed

@Component({
  selector: 'app-health-tab',
  templateUrl: './health-tab.component.html',
  styleUrls: ['./health-tab.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HealthMonitorComponent
  ]
})
export class HealthTabComponent implements OnInit, OnDestroy {
  healthData: any = null;
  healthHistory: any[] = [];
  refreshInterval = 15; // seconds
  isLoading = true;

  private dataSubscription?: Subscription;
  private historySubscription?: Subscription;

  constructor(private actuatorDataService: ActuatorDataService) {}

  ngOnInit(): void {
    // Load initial data
    this.loadHealthData();
    this.loadHealthHistory();

    // Set up auto-refresh
    this.startDataRefresh();
  }

  ngOnDestroy(): void {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
    if (this.historySubscription) {
      this.historySubscription.unsubscribe();
    }
  }

  loadHealthData(): void {
    this.isLoading = true;
    this.actuatorDataService.getHealthData().subscribe({
      next: (data) => {
        this.healthData = data || null;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading health data:', error);
        this.isLoading = false;
      }
    });
  }

  loadHealthHistory(): void {
    this.actuatorDataService.getHealthHistory().subscribe({
      next: (history) => {
        this.healthHistory = history || [];
        // Log the history for debugging
        // console.log('Health history loaded:', this.healthHistory);
      },
      error: (error) => {
        console.error('Error loading health history:', error);
      }
    });
  }

  /**
   * Get a summary of components and their statuses
   */
  getComponentsSummary(components: any): string {
    if (!components) return '';

    const componentStatuses = Object.entries(components).map(([name, data]: [string, any]) => {
      return `${name}: ${data.status || 'UNKNOWN'}`;
    });

    return componentStatuses.join(' | ');
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    if (confirm('Are you sure you want to clear all health logs?')) {
      this.actuatorDataService.clearHistory();
      this.healthHistory = [];
    }
  }

  /**
   * Get object entries for iteration in template
   */
  getObjectEntries(obj: any): [string, any][] {
    if (!obj) return [];
    return Object.entries(obj);
  }

  /**
   * Get icon for health status
   */
  getStatusIcon(status: string): string {
    switch (status?.toUpperCase()) {
      case 'UP':
        return 'fa-check-circle';
      case 'DOWN':
        return 'fa-times-circle';
      case 'OUT_OF_SERVICE':
        return 'fa-exclamation-circle';
      case 'UNKNOWN':
        return 'fa-question-circle';
      default:
        return 'fa-question-circle';
    }
  }

  startDataRefresh(): void {
    // Unsubscribe from existing subscription
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }

    // Create new subscription
    this.dataSubscription = interval(this.refreshInterval * 1000).subscribe(() => {
      this.loadHealthData();
      this.loadHealthHistory();
    });
  }

  updateRefreshInterval(): void {
    // Restart data refresh with new interval
    this.startDataRefresh();
  }

  forceRefresh(): void {
    this.actuatorDataService.forceRefresh().subscribe({
      next: () => {
        this.loadHealthData();
        this.loadHealthHistory();
      },
      error: (error) => {
        console.error('Error forcing refresh:', error);
      }
    });
  }

  getStatusClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'UP':
        return 'status-up';
      case 'DOWN':
        return 'status-down';
      case 'OUT_OF_SERVICE':
        return 'status-out-of-service';
      case 'UNKNOWN':
        return 'status-unknown';
      default:
        return 'status-unknown';
    }
  }

  getComponentStatus(component: any): string {
    if (!component) return 'UNKNOWN';
    if (typeof component === 'object' && component.status) {
      return component.status;
    }
    return 'UNKNOWN';
  }
}
