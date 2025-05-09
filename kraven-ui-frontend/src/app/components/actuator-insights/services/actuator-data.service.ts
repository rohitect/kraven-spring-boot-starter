import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, switchMap } from 'rxjs';
import { ConfigService } from '../../../services/config.service';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ActuatorDataService {
  private baseUrl: string;
  private apiPath: string;
  private contextPath: string = '';
  private actuatorBasePath: string = 'actuator';
  private fullActuatorPath: string = '/actuator';
  private pluginInitialized: boolean = false;

  // In-memory storage for history data
  private metricHistory: { [key: string]: any[] } = {};
  private healthHistory: any[] = [];
  private threadHistory: any[] = [];

  // Maximum number of history entries to keep
  private readonly MAX_HISTORY_SIZE = 100;

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {
    this.baseUrl = window.location.origin;
    this.apiPath = this.configService.getApiBasePath();

    // Initialize by getting the plugin status which includes context path info
    this.initializePlugin();
  }

  /**
   * Initialize the plugin by getting status information
   */
  private initializePlugin(): void {
    if (!this.pluginInitialized) {
      const url = `${this.baseUrl}${this.apiPath}/plugins/actuator-insights/status`;

      this.http.get<any>(url).subscribe({
        next: (status) => {
          if (status) {
            this.contextPath = status.contextPath || '';
            this.actuatorBasePath = status.actuatorBasePath || 'actuator';
            this.fullActuatorPath = status.fullActuatorPath || '/actuator';
            this.pluginInitialized = true;
            // console.log('Actuator plugin initialized with context path:', this.contextPath);
            // console.log('Actuator base path:', this.actuatorBasePath);
            // console.log('Full actuator path:', this.fullActuatorPath);
          }
        },
        error: (error) => {
          console.error('Error initializing actuator plugin:', error);
        }
      });
    }
  }

  /**
   * Get the status of the actuator plugin
   */
  getPluginStatus(): Observable<any> {
    const url = `${this.baseUrl}${this.apiPath}/plugins/actuator-insights/status`;

    return this.http.get<any>(url).pipe(
      catchError(error => {
        console.error('Error getting plugin status:', error);
        return of({ actuatorDetected: false });
      })
    );
  }

  /**
   * Get available actuator endpoints
   */
  getAvailableEndpoints(): Observable<any[]> {
    const url = `${this.baseUrl}${this.apiPath}/plugins/actuator-insights/endpoints`;

    return this.http.get<any[]>(url).pipe(
      catchError(error => {
        console.error('Error getting available endpoints:', error);
        return of([]);
      })
    );
  }

  /**
   * Get all actuator data (for backward compatibility)
   */
  getActuatorData(): Observable<any> {
    // First ensure the plugin is initialized
    if (!this.pluginInitialized) {
      return this.http.get<any>(`${this.baseUrl}${this.apiPath}/plugins/actuator-insights/status`).pipe(
        switchMap(status => {
          if (status) {
            this.contextPath = status.contextPath || '';
            this.actuatorBasePath = status.actuatorBasePath || 'actuator';
            this.fullActuatorPath = status.fullActuatorPath || '/actuator';
            this.pluginInitialized = true;
            // console.log('Actuator plugin initialized with context path:', this.contextPath);
            // console.log('Actuator base path:', this.actuatorBasePath);
            // console.log('Full actuator path:', this.fullActuatorPath);
          }

          // Now get the data with the updated context path
          const url = `${this.baseUrl}${this.apiPath}/plugins/actuator-insights/data`;
          return this.http.get<any>(url);
        }),
        map(data => {
          this.updateHistoryFromData(data);
          return data;
        }),
        catchError(error => {
          console.error('Error getting actuator data:', error);
          return of(null);
        })
      );
    }

    // If already initialized, just get the data
    const url = `${this.baseUrl}${this.apiPath}/plugins/actuator-insights/data`;

    return this.http.get<any>(url).pipe(
      map(data => {
        this.updateHistoryFromData(data);
        return data;
      }),
      catchError(error => {
        console.error('Error getting actuator data:', error);
        return of(null);
      })
    );
  }

  /**
   * Get health data
   */
  getHealthData(): Observable<any> {
    // Ensure the plugin is initialized
    if (!this.pluginInitialized) {
      return this.initializeAndGetData('health');
    }

    const url = `${this.baseUrl}${this.apiPath}/plugins/actuator-insights/health`;

    return this.http.get<any>(url).pipe(
      map(data => {
        // Update health history
        const healthStatus = {
          status: data.status,
          timestamp: new Date(),
          details: data
        };

        this.healthHistory.push(healthStatus);

        // Trim history if it gets too large
        if (this.healthHistory.length > this.MAX_HISTORY_SIZE) {
          this.healthHistory.shift();
        }

        return data;
      }),
      catchError(error => {
        console.error('Error getting health data:', error);
        return of(null);
      })
    );
  }

  /**
   * Get metrics data
   */
  getMetricsData(): Observable<any> {
    // Ensure the plugin is initialized
    if (!this.pluginInitialized) {
      return this.initializeAndGetData('metrics');
    }

    const url = `${this.baseUrl}${this.apiPath}/plugins/actuator-insights/metrics`;

    return this.http.get<any>(url).pipe(
      map(data => {
        // Update metrics history
        Object.entries(data).forEach(([metricName, metricData]: [string, any]) => {
          if (!this.metricHistory[metricName]) {
            this.metricHistory[metricName] = [];
          }

          // Add timestamp if not present
          if (!metricData.timestamp) {
            metricData.timestamp = new Date();
          }

          this.metricHistory[metricName].push(metricData);

          // Trim history if it gets too large
          if (this.metricHistory[metricName].length > this.MAX_HISTORY_SIZE) {
            this.metricHistory[metricName].shift();
          }
        });

        return data;
      }),
      catchError(error => {
        console.error('Error getting metrics data:', error);
        return of(null);
      })
    );
  }

  /**
   * Get environment data
   */
  getEnvironmentData(): Observable<any> {
    // Ensure the plugin is initialized
    if (!this.pluginInitialized) {
      return this.initializeAndGetData('environment');
    }

    const url = `${this.baseUrl}${this.apiPath}/plugins/actuator-insights/environment`;

    return this.http.get<any>(url).pipe(
      catchError(error => {
        console.error('Error getting environment data:', error);
        return of(null);
      })
    );
  }

  /**
   * Get beans data
   */
  getBeansData(): Observable<any> {
    // Ensure the plugin is initialized
    if (!this.pluginInitialized) {
      return this.initializeAndGetData('beans');
    }

    const url = `${this.baseUrl}${this.apiPath}/plugins/actuator-insights/beans`;

    return this.http.get<any>(url).pipe(
      catchError(error => {
        console.error('Error getting beans data:', error);
        return of(null);
      })
    );
  }

  /**
   * Get info data
   */
  getInfoData(): Observable<any> {
    // Ensure the plugin is initialized
    if (!this.pluginInitialized) {
      return this.initializeAndGetData('info');
    }

    const url = `${this.baseUrl}${this.apiPath}/plugins/actuator-insights/info`;

    return this.http.get<any>(url).pipe(
      catchError(error => {
        console.error('Error getting info data:', error);
        return of(null);
      })
    );
  }

  /**
   * Initialize the plugin and get data for a specific endpoint
   */
  private initializeAndGetData(endpoint: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}${this.apiPath}/plugins/actuator-insights/status`).pipe(
      switchMap(status => {
        if (status) {
          this.contextPath = status.contextPath || '';
          this.actuatorBasePath = status.actuatorBasePath || 'actuator';
          this.fullActuatorPath = status.fullActuatorPath || '/actuator';
          this.pluginInitialized = true;
        }

        // Now get the data with the updated context path
        const url = `${this.baseUrl}${this.apiPath}/plugins/actuator-insights/${endpoint}`;
        return this.http.get<any>(url);
      }),
      catchError(error => {
        console.error(`Error getting ${endpoint} data:`, error);
        return of(null);
      })
    );
  }

  /**
   * Update history data from the latest actuator data
   */
  private updateHistoryFromData(data: any): void {
    if (!data) return;

    // Update health history
    if (data.health) {
      const healthStatus = {
        status: data.health.status,
        timestamp: new Date(),
        details: data.health
      };

      this.healthHistory.push(healthStatus);

      // Trim history if it gets too large
      if (this.healthHistory.length > this.MAX_HISTORY_SIZE) {
        this.healthHistory.shift();
      }
    }

    // Update metrics history
    if (data.metrics) {
      Object.entries(data.metrics).forEach(([metricName, metricData]: [string, any]) => {
        if (!this.metricHistory[metricName]) {
          this.metricHistory[metricName] = [];
        }

        // Add timestamp if not present
        if (!metricData.timestamp) {
          metricData.timestamp = new Date();
        }

        this.metricHistory[metricName].push(metricData);

        // Trim history if it gets too large
        if (this.metricHistory[metricName].length > this.MAX_HISTORY_SIZE) {
          this.metricHistory[metricName].shift();
        }
      });
    }
  }

  /**
   * Get historical metric data for a specific metric
   */
  getMetricHistory(metricName: string): Observable<any[]> {
    // Return the in-memory history
    return of(this.metricHistory[metricName] || []);
  }

  /**
   * Get historical health status data
   */
  getHealthHistory(): Observable<any[]> {
    // Return the in-memory history
    return of(this.healthHistory);
  }

  // Removed duplicate forceRefresh method

  /**
   * Get thread dump data
   */
  getThreadDumpData(): Observable<any> {
    // Ensure the plugin is initialized
    if (!this.pluginInitialized) {
      return this.initializeAndGetData('threaddump');
    }

    const url = `${this.baseUrl}${this.apiPath}/plugins/actuator-insights/threaddump`;

    return this.http.get<any>(url).pipe(
      map(data => {
        // Update thread history
        const threadData = {
          timestamp: new Date(),
          data: data
        };

        this.threadHistory.push(threadData);

        // Trim history if it gets too large
        if (this.threadHistory.length > this.MAX_HISTORY_SIZE) {
          this.threadHistory.shift();
        }

        return data;
      }),
      catchError(error => {
        console.error('Error getting thread dump data:', error);
        return of(null);
      })
    );
  }

  /**
   * Get thread history data
   */
  getThreadHistory(): Observable<any[]> {
    return of(this.threadHistory);
  }

  /**
   * Get available thread dump analysis types
   */
  getThreadDumpAnalysisTypes(): Observable<any[]> {
    const url = `${this.baseUrl}${this.apiPath}/plugins/actuator-insights/threaddump/analysis-types`;

    return this.http.get<any[]>(url).pipe(
      catchError(error => {
        console.error('Error getting thread dump analysis types:', error);
        return of([]);
      })
    );
  }

  /**
   * Analyze thread dump
   */
  analyzeThreadDump(analysisType: string): Observable<any> {
    const url = `${this.baseUrl}${this.apiPath}/plugins/actuator-insights/threaddump/analyze?analysisType=${analysisType}`;

    return this.http.get<any>(url).pipe(
      catchError(error => {
        console.error('Error analyzing thread dump:', error);
        return of({
          success: false,
          error: 'Failed to analyze thread dump'
        });
      })
    );
  }



  /**
   * Clear all history data
   */
  clearHistory(): void {
    this.metricHistory = {};
    this.healthHistory = [];
    this.threadHistory = [];
  }

  /**
   * Force refresh of actuator data
   */
  forceRefresh(): Observable<any> {
    const url = `${this.baseUrl}${this.apiPath}/plugins/actuator-insights/refresh`;

    return this.http.post<any>(url, {}).pipe(
      catchError(error => {
        console.error('Error forcing refresh:', error);
        return of({ success: false, message: 'Failed to refresh data' });
      })
    );
  }

  /**
   * Manually set the actuator detection status
   */
  setDetectionStatus(detected: boolean): Observable<any> {
    const url = `${this.baseUrl}${this.apiPath}/plugins/actuator-insights/detection?detected=${detected}`;

    return this.http.post<any>(url, {}).pipe(
      catchError(error => {
        console.error('Error setting detection status:', error);
        return of({ success: false, message: 'Failed to set detection status' });
      })
    );
  }
}
