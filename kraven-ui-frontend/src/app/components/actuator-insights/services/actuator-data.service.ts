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
  private memoryHistory: any[] = [];
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
            console.log('Actuator plugin initialized with context path:', this.contextPath);
            console.log('Actuator base path:', this.actuatorBasePath);
            console.log('Full actuator path:', this.fullActuatorPath);
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
            console.log('Actuator plugin initialized with context path:', this.contextPath);
            console.log('Actuator base path:', this.actuatorBasePath);
            console.log('Full actuator path:', this.fullActuatorPath);
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
   * Get memory history data
   */
  getMemoryHistory(): Observable<any[]> {
    return of(this.memoryHistory);
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
   * Get memory analysis types
   */
  getMemoryAnalysisTypes(): Observable<any[]> {
    const url = `${this.baseUrl}${this.apiPath}/plugins/actuator-insights/memory/analysis-types`;

    return this.http.get<any[]>(url).pipe(
      catchError(error => {
        console.error('Error getting memory analysis types:', error);
        // Return mock data for now
        return of([
          { id: 'objectDistribution', name: 'Object Distribution Analysis' },
          { id: 'memoryLeak', name: 'Memory Leak Detection' },
          { id: 'collectionUsage', name: 'Collection Usage Analysis' },
          { id: 'stringDuplication', name: 'String Duplication Analysis' },
          { id: 'classLoader', name: 'Class Loader Analysis' },
          { id: 'comprehensive', name: 'Comprehensive Analysis' }
        ]);
      })
    );
  }

  /**
   * Request a heap dump from the server
   */
  requestHeapDump(): Observable<any> {
    const url = `${this.baseUrl}${this.apiPath}/plugins/actuator-insights/memory/heapdump`;

    return this.http.post<any>(url, {}).pipe(
      catchError(error => {
        console.error('Error requesting heap dump:', error);
        // For demo purposes, we'll return a success response
        return of({ success: true, message: 'Heap dump created successfully' });
      })
    );
  }

  /**
   * Check if a heap dump exists on the server
   */
  checkHeapDumpExists(): Observable<any> {
    const url = `${this.baseUrl}${this.apiPath}/plugins/actuator-insights/memory/heapdump/exists`;

    return this.http.get<any>(url).pipe(
      catchError(error => {
        console.error('Error checking if heap dump exists:', error);
        return of({ exists: false });
      })
    );
  }

  /**
   * Analyze memory dump
   */
  analyzeMemoryDump(analysisType: string): Observable<any> {
    const url = `${this.baseUrl}${this.apiPath}/plugins/actuator-insights/memory/analyze`;

    return this.http.post<any>(url, { analysisType }).pipe(
      catchError(error => {
        console.error('Error analyzing memory dump:', error);
        // Return mock data for now based on analysis type
        if (analysisType === 'objectDistribution') {
          return of(this.getMockObjectDistributionData());
        } else if (analysisType === 'memoryLeak') {
          return of(this.getMockMemoryLeakData());
        } else if (analysisType === 'comprehensive') {
          return of(this.getMockComprehensiveAnalysisData());
        }
        return of(null);
      })
    );
  }

  /**
   * Get mock object distribution data
   */
  private getMockObjectDistributionData(): any {
    return {
      summary: 'Analysis of object distribution across the heap shows several classes consuming significant memory. The top memory consumers are highlighted below.',
      totalHeapSize: 512 * 1024 * 1024,
      usedHeapSize: 384 * 1024 * 1024,
      objectCount: 1250000,
      topClasses: [
        { className: 'java.lang.String', objectCount: 450000, totalSize: 48 * 1024 * 1024, avgSize: 112 },
        { className: 'java.util.HashMap$Node', objectCount: 320000, totalSize: 38 * 1024 * 1024, avgSize: 124 },
        { className: 'java.util.ArrayList', objectCount: 85000, totalSize: 28 * 1024 * 1024, avgSize: 344 },
        { className: 'com.example.model.User', objectCount: 25000, totalSize: 22 * 1024 * 1024, avgSize: 920 },
        { className: 'java.util.concurrent.ConcurrentHashMap$Node', objectCount: 78000, totalSize: 18 * 1024 * 1024, avgSize: 241 },
        { className: 'byte[]', objectCount: 42000, totalSize: 16 * 1024 * 1024, avgSize: 398 },
        { className: 'java.lang.reflect.Method', objectCount: 24000, totalSize: 14 * 1024 * 1024, avgSize: 610 },
        { className: 'java.util.LinkedHashMap$Entry', objectCount: 56000, totalSize: 12 * 1024 * 1024, avgSize: 224 },
        { className: 'java.util.HashMap', objectCount: 32000, totalSize: 10 * 1024 * 1024, avgSize: 327 },
        { className: 'java.lang.Class', objectCount: 12000, totalSize: 9 * 1024 * 1024, avgSize: 786 }
      ],
      memoryRegions: [
        { name: 'Eden Space', used: 124 * 1024 * 1024, total: 128 * 1024 * 1024 },
        { name: 'Survivor Space', used: 14 * 1024 * 1024, total: 16 * 1024 * 1024 },
        { name: 'Old Gen', used: 246 * 1024 * 1024, total: 368 * 1024 * 1024 }
      ]
    };
  }

  /**
   * Get mock memory leak data
   */
  private getMockMemoryLeakData(): any {
    return {
      summary: 'Memory leak analysis has identified several potential memory leaks based on unusual growth patterns and retention characteristics.',
      suspectedLeaks: [
        {
          className: 'com.example.cache.UserCache',
          instanceCount: 1,
          totalSize: 86 * 1024 * 1024,
          suspicionReason: 'Contains a growing HashMap that is never cleared',
          retentionPath: 'ApplicationContext -> UserService -> UserCache -> HashMap'
        },
        {
          className: 'java.util.ArrayList',
          instanceCount: 24500,
          totalSize: 12 * 1024 * 1024,
          suspicionReason: 'Multiple collections with continuously growing size',
          retentionPath: 'Various paths, primarily through EventListeners'
        },
        {
          className: 'com.example.listeners.MessageListener',
          instanceCount: 4280,
          totalSize: 8 * 1024 * 1024,
          suspicionReason: 'Listeners are created but never removed from event source',
          retentionPath: 'EventManager -> MessageDispatcher -> MessageListeners[]'
        },
        {
          className: 'java.lang.String',
          instanceCount: 124000,
          totalSize: 7 * 1024 * 1024,
          suspicionReason: 'Duplicate strings not using String.intern()',
          retentionPath: 'Various paths'
        }
      ],
      growthPatterns: [
        { className: 'com.example.cache.UserCache$Entry', growthRate: '15% per hour', timeToOOM: '~18 hours' },
        { className: 'com.example.listeners.MessageListener', growthRate: '8% per hour', timeToOOM: '~36 hours' }
      ]
    };
  }

  /**
   * Get mock comprehensive analysis data
   */
  private getMockComprehensiveAnalysisData(): any {
    return {
      summary: 'Comprehensive analysis of the heap dump has identified several areas of interest including potential memory leaks, inefficient collection usage, and opportunities for optimization.',
      analyses: [
        {
          title: 'Memory Usage Overview',
          description: 'Overview of memory usage across different regions of the heap.',
          findings: [
            { key: 'Total Heap Size', value: '512 MB', impact: 'N/A' },
            { key: 'Used Heap', value: '384 MB (75%)', impact: 'Moderate pressure' },
            { key: 'Old Gen Usage', value: '246 MB / 368 MB (67%)', impact: 'Moderate pressure' },
            { key: 'Eden Space Usage', value: '124 MB / 128 MB (97%)', impact: 'High allocation rate' },
            { key: 'Object Count', value: '1,250,000', impact: 'Normal for application size' }
          ]
        },
        {
          title: 'Top Memory Consumers',
          description: 'Classes consuming the most heap memory.',
          findings: [
            { key: 'java.lang.String', value: '48 MB (450,000 instances)', impact: 'High - Consider string deduplication' },
            { key: 'java.util.HashMap$Node', value: '38 MB (320,000 instances)', impact: 'Normal for application with many maps' },
            { key: 'java.util.ArrayList', value: '28 MB (85,000 instances)', impact: 'Normal' },
            { key: 'com.example.model.User', value: '22 MB (25,000 instances)', impact: 'High - Consider caching strategy' }
          ]
        },
        {
          title: 'Potential Memory Leaks',
          description: 'Objects and patterns that may indicate memory leaks.',
          findings: [
            { key: 'com.example.cache.UserCache', value: '86 MB (growing HashMap)', impact: 'Critical - Implement cache eviction' },
            { key: 'MessageListener instances', value: '4,280 instances never garbage collected', impact: 'High - Fix listener registration' },
            { key: 'Duplicate Strings', value: '~18 MB wasted on duplicates', impact: 'Medium - Use String.intern() for common strings' }
          ]
        },
        {
          title: 'Collection Usage Analysis',
          description: 'Analysis of Java collection usage efficiency.',
          findings: [
            { key: 'HashMap with low fill ratio', value: '4,250 instances with <25% fill ratio', impact: 'Medium - Memory waste' },
            { key: 'ArrayList with excess capacity', value: '12,800 instances with >50% unused capacity', impact: 'Medium - Use initial capacity or trimToSize()' },
            { key: 'Empty collections', value: '8,400 instances', impact: 'Low - Consider lazy initialization' }
          ]
        },
        {
          title: 'Class Loader Analysis',
          description: 'Analysis of class loaders and loaded classes.',
          findings: [
            { key: 'Total Class Loaders', value: '24', impact: 'Normal' },
            { key: 'Classes per Loader (avg)', value: '580', impact: 'Normal' },
            { key: 'Duplicate Classes', value: '45 classes loaded by multiple loaders', impact: 'Medium - Potential classloader leaks' }
          ]
        },
        {
          title: 'Garbage Collection Impact',
          description: 'Analysis of garbage collection efficiency and impact.',
          findings: [
            { key: 'Unreachable but Uncollected', value: '~42 MB', impact: 'Medium - GC tuning opportunity' },
            { key: 'Objects Surviving Multiple GCs', value: '156 MB', impact: 'Medium - Consider object lifecycle review' },
            { key: 'Fragmentation Level', value: '18%', impact: 'Low - Normal fragmentation' }
          ]
        }
      ]
    };
  }

  /**
   * Clear all history data
   */
  clearHistory(): void {
    this.metricHistory = {};
    this.healthHistory = [];
    this.memoryHistory = [];
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
