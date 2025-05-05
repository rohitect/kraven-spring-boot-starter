import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-metrics-viewer',
  templateUrl: './metrics-viewer.component.html',
  styleUrls: ['./metrics-viewer.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ]
})
export class MetricsViewerComponent implements OnChanges {
  @Input() metricsData: any;
  @Output() metricSelected = new EventEmitter<string>();

  metrics: any[] = [];
  filteredMetrics: any[] = [];
  searchTerm: string = '';

  // Key metrics to display at the top
  keyMetricNames: string[] = [
    'jvm.memory.used',
    'jvm.memory.max',
    'system.cpu.usage',
    'process.cpu.usage',
    'http.server.requests',
    'jvm.threads.live'
  ];

  keyMetrics: any[] = [];
  otherMetrics: any[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['metricsData'] && this.metricsData) {
      this.processMetricsData();
    }
  }

  /**
   * Process metrics data to extract metrics
   */
  private processMetricsData(): void {
    this.metrics = [];
    this.keyMetrics = [];
    this.otherMetrics = [];

    // Convert metrics data to array
    if (this.metricsData) {
      Object.keys(this.metricsData).forEach(key => {
        const metric = this.metricsData[key];
        const metricObj = {
          name: key,
          value: metric.value,
          timestamp: metric.timestamp,
          description: metric.description,
          baseUnit: metric.baseUnit
        };

        this.metrics.push(metricObj);

        // Categorize as key metric or other metric
        if (this.keyMetricNames.includes(key)) {
          this.keyMetrics.push(metricObj);
        } else {
          this.otherMetrics.push(metricObj);
        }
      });

      // Sort key metrics to match the order in keyMetricNames
      this.keyMetrics.sort((a, b) => {
        return this.keyMetricNames.indexOf(a.name) - this.keyMetricNames.indexOf(b.name);
      });

      // Sort other metrics alphabetically
      this.otherMetrics.sort((a, b) => a.name.localeCompare(b.name));
    }

    this.applyFilter();
  }

  /**
   * Apply search filter to metrics
   */
  applyFilter(): void {
    if (!this.searchTerm) {
      this.filteredMetrics = [...this.keyMetrics, ...this.otherMetrics];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredMetrics = this.metrics.filter(metric =>
      metric.name.toLowerCase().includes(term) ||
      (metric.description && metric.description.toLowerCase().includes(term))
    );
  }

  /**
   * Format metric value with appropriate unit
   */
  formatMetricValue(metric: any): string {
    if (metric.value === undefined || metric.value === null) {
      return 'N/A';
    }

    // Format based on base unit
    if (metric.baseUnit) {
      switch (metric.baseUnit) {
        case 'bytes':
          return this.formatBytes(metric.value);
        case 'percent':
          return `${metric.value.toFixed(2)}%`;
        case 'seconds':
          return `${metric.value.toFixed(3)}s`;
        default:
          return `${metric.value} ${metric.baseUnit}`;
      }
    }

    // Format based on metric name patterns
    if (metric.name.includes('memory')) {
      return this.formatBytes(metric.value);
    } else if (metric.name.includes('cpu.usage')) {
      return `${(metric.value * 100).toFixed(2)}%`;
    }

    // Default formatting
    return metric.value.toString();
  }

  /**
   * Format bytes to human-readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
