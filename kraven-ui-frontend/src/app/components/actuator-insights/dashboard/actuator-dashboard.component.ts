import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, JsonPipe, KeyValuePipe, NgClass, NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { ConfigService } from '../../../services/config.service';
import { PluginRegistryService, PluginStatus } from '../../../services/plugin-registry.service';
import { PluginLoaderComponent } from '../../shared/plugin-loader/plugin-loader.component';
import { HealthMonitorComponent } from '../health-monitor/health-monitor.component';
import { MetricsViewerComponent } from '../metrics-viewer/metrics-viewer.component';

@Component({
  selector: 'app-actuator-dashboard',
  templateUrl: './actuator-dashboard.component.html',
  styleUrls: ['./actuator-dashboard.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    JsonPipe,
    KeyValuePipe,
    NgClass,
    NgIf,
    NgFor,
    PluginLoaderComponent,
    HealthMonitorComponent,
    MetricsViewerComponent
  ]
})
export class ActuatorDashboardComponent implements OnInit, OnDestroy {
  
  // Plugin status
  pluginStatus: PluginStatus = PluginStatus.UNKNOWN;
  actuatorDetected = false;
  
  // Actuator data
  actuatorData: any = null;
  availableEndpoints: any[] = [];
  
  // Refresh interval
  refreshInterval = 15; // seconds
  private dataSubscription?: Subscription;
  
  // Base URL
  private baseUrl: string;
  private apiPath: string;

  constructor(
    private http: HttpClient,
    private configService: ConfigService,
    private pluginRegistry: PluginRegistryService
  ) {
    this.baseUrl = window.location.origin;
    this.apiPath = this.configService.getApiBasePath();
  }

  ngOnInit(): void {
    // Check plugin status
    this.pluginStatus = this.pluginRegistry.getPluginStatus('actuator-insights');
    
    // Get plugin status
    this.getPluginStatus();
    
    // Get available endpoints
    this.getAvailableEndpoints();
    
    // Start data refresh
    this.startDataRefresh();
  }

  ngOnDestroy(): void {
    // Unsubscribe from data refresh
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
  }

  /**
   * Get the status of the plugin
   */
  getPluginStatus(): void {
    const url = `${this.baseUrl}${this.apiPath}/plugins/actuator-insights/status`;
    
    this.http.get<any>(url).subscribe(
      (response) => {
        this.actuatorDetected = response.actuatorDetected;
      },
      (error) => {
        console.error('Error getting plugin status:', error);
      }
    );
  }

  /**
   * Get available actuator endpoints
   */
  getAvailableEndpoints(): void {
    const url = `${this.baseUrl}${this.apiPath}/plugins/actuator-insights/endpoints`;
    
    this.http.get<any[]>(url).subscribe(
      (endpoints) => {
        this.availableEndpoints = endpoints;
      },
      (error) => {
        console.error('Error getting available endpoints:', error);
      }
    );
  }

  /**
   * Start data refresh
   */
  startDataRefresh(): void {
    // Unsubscribe from existing subscription
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
    
    // Create new subscription
    this.dataSubscription = interval(this.refreshInterval * 1000)
      .pipe(
        switchMap(() => {
          const url = `${this.baseUrl}${this.apiPath}/plugins/actuator-insights/data`;
          return this.http.get<any>(url);
        }),
        catchError((error) => {
          console.error('Error refreshing actuator data:', error);
          throw error;
        })
      )
      .subscribe(
        (data) => {
          this.actuatorData = data;
        }
      );
    
    // Initial data load
    this.refreshData();
  }

  /**
   * Refresh data manually
   */
  refreshData(): void {
    const url = `${this.baseUrl}${this.apiPath}/plugins/actuator-insights/data`;
    
    this.http.get<any>(url).subscribe(
      (data) => {
        this.actuatorData = data;
      },
      (error) => {
        console.error('Error refreshing actuator data:', error);
      }
    );
  }

  /**
   * Update refresh interval
   */
  updateRefreshInterval(): void {
    // Restart data refresh with new interval
    this.startDataRefresh();
  }

  /**
   * Force refresh of actuator data
   */
  forceRefresh(): void {
    const url = `${this.baseUrl}${this.apiPath}/plugins/actuator-insights/refresh`;
    
    this.http.post<any>(url, {}).subscribe(
      (response) => {
        console.log('Actuator data refreshed:', response);
        this.refreshData();
      },
      (error) => {
        console.error('Error forcing refresh:', error);
      }
    );
  }
}
