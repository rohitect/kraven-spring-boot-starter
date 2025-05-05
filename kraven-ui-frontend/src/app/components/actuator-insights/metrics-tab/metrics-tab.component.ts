import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { ActuatorDataService } from '../services/actuator-data.service';
import { MetricsViewerComponent } from '../metrics-viewer/metrics-viewer.component';

@Component({
  selector: 'app-metrics-tab',
  templateUrl: './metrics-tab.component.html',
  styleUrls: ['./metrics-tab.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MetricsViewerComponent
  ]
})
export class MetricsTabComponent implements OnInit, OnDestroy {
  metricsData: any = null;
  metricHistory: any = {};
  selectedMetric: string | null = null;
  refreshInterval = 15; // seconds
  isLoading = true;

  private dataSubscription?: Subscription;
  private historySubscription?: Subscription;

  constructor(private actuatorDataService: ActuatorDataService) {}

  ngOnInit(): void {
    // Load initial data
    this.loadMetricsData();

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

  loadMetricsData(): void {
    this.isLoading = true;
    this.actuatorDataService.getMetricsData().subscribe({
      next: (data) => {
        this.metricsData = data || null;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading metrics data:', error);
        this.isLoading = false;
      }
    });
  }

  loadMetricHistory(metricName: string): void {
    this.selectedMetric = metricName;
    this.actuatorDataService.getMetricHistory(metricName).subscribe({
      next: (history) => {
        this.metricHistory[metricName] = history || [];
      },
      error: (error) => {
        console.error(`Error loading history for metric ${metricName}:`, error);
      }
    });
  }

  startDataRefresh(): void {
    // Unsubscribe from existing subscription
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }

    // Create new subscription
    this.dataSubscription = interval(this.refreshInterval * 1000).subscribe(() => {
      this.loadMetricsData();
      if (this.selectedMetric) {
        this.loadMetricHistory(this.selectedMetric);
      }
    });
  }

  updateRefreshInterval(): void {
    // Restart data refresh with new interval
    this.startDataRefresh();
  }

  forceRefresh(): void {
    this.actuatorDataService.forceRefresh().subscribe({
      next: () => {
        this.loadMetricsData();
        if (this.selectedMetric) {
          this.loadMetricHistory(this.selectedMetric);
        }
      },
      error: (error) => {
        console.error('Error forcing refresh:', error);
      }
    });
  }

  onMetricSelected(metricName: string): void {
    this.loadMetricHistory(metricName);
  }

  formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString();
  }

  formatValue(value: number, baseUnit?: string): string {
    if (baseUnit === 'bytes') {
      return this.formatBytes(value);
    } else if (baseUnit === 'seconds') {
      return this.formatDuration(value);
    } else if (value > 1000000) {
      return (value / 1000000).toFixed(2) + 'M';
    } else if (value > 1000) {
      return (value / 1000).toFixed(2) + 'K';
    } else {
      return value.toFixed(2);
    }
  }

  getMaxValue(history: any[]): number {
    return Math.max(...history.map(item => item.value));
  }

  getMinValue(history: any[]): number {
    return Math.min(...history.map(item => item.value));
  }

  getAvgValue(history: any[]): number {
    const sum = history.reduce((acc, item) => acc + item.value, 0);
    return sum / history.length;
  }

  getLatestValue(history: any[]): number {
    return history[history.length - 1]?.value || 0;
  }

  getBaseUnit(history: any[]): string | undefined {
    return history[0]?.baseUnit;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private formatDuration(seconds: number): string {
    if (seconds < 0.001) {
      return (seconds * 1000000).toFixed(2) + ' µs';
    } else if (seconds < 1) {
      return (seconds * 1000).toFixed(2) + ' ms';
    } else if (seconds < 60) {
      return seconds.toFixed(2) + ' s';
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
    }
  }
}
