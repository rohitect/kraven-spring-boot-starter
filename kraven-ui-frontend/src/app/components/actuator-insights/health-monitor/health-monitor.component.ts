import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, JsonPipe } from '@angular/common';

@Component({
  selector: 'app-health-monitor',
  templateUrl: './health-monitor.component.html',
  styleUrls: ['./health-monitor.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    JsonPipe
  ]
})
export class HealthMonitorComponent implements OnChanges {
  @Input() healthData: any;

  status: string = 'UNKNOWN';
  components: any[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['healthData'] && this.healthData) {
      this.processHealthData();
    }
  }

  /**
   * Process health data to extract status and components
   */
  private processHealthData(): void {
    this.status = this.healthData.status || 'UNKNOWN';
    this.components = [];

    // Extract components from health data
    if (this.healthData.components) {
      Object.keys(this.healthData.components).forEach(key => {
        const component = this.healthData.components[key];
        this.components.push({
          name: key,
          status: component.status,
          details: component.details || {}
        });
      });
    }
  }

  /**
   * Get CSS class for health status
   */
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

  /**
   * Check if an object has keys
   */
  hasKeys(obj: any): boolean {
    return obj && Object.keys(obj).length > 0;
  }

  /**
   * Get object entries as array
   */
  getObjectEntries(obj: any): [string, any][] {
    return Object.entries(obj);
  }
}
