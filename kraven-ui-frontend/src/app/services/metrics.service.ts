import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { ConfigService } from './config.service';

export interface MemoryPoolMetrics {
  name: string;
  init: number;
  used: number;
  committed: number;
  max: number;
  usagePercentage: number;
}

export interface MemoryDetails {
  heap: MemoryPoolMetrics;
  nonHeap: MemoryPoolMetrics;
  memoryPools: { [key: string]: MemoryPoolMetrics };
}

export interface GarbageCollectorInfo {
  name: string;
  collectionCount: number;
  collectionTime: number;
}

export interface GarbageCollectorMetrics {
  collectors: { [key: string]: GarbageCollectorInfo };
}

export interface JvmMetrics {
  totalMemory: number;
  freeMemory: number;
  maxMemory: number;
  usedMemory: number;
  memoryDetails?: MemoryDetails;
  availableProcessors: number;
  threadCount: number;
  peakThreadCount: number;
  daemonThreadCount: number;
  totalStartedThreadCount: number;
  uptime: number;
  loadedClassCount: number;
  totalLoadedClassCount: number;
  unloadedClassCount: number;
  systemProperties: { [key: string]: string };
  garbageCollector?: GarbageCollectorMetrics;
}

export interface AppMetrics {
  name: string;
  version: string;
  buildTime: string;
  startTime: string;
  uptime: number;
  profiles: string[];
}

export interface SpringMetrics {
  beanCount: number;
  controllerCount: number;
  serviceCount: number;
  repositoryCount: number;
  componentCount: number;
  configurationCount: number;
  endpointCount: number;
}

export interface KafkaMetrics {
  topicCount: number;
  consumerCount: number;
  producerCount: number;
  listenerCount: number;
}

export interface FeignMetrics {
  clientCount: number;
  methodCount: number;
}

export interface ApplicationMetrics {
  jvm: JvmMetrics;
  application: AppMetrics;
  spring: SpringMetrics;
  kafka: KafkaMetrics;
  feign: FeignMetrics;
}

@Injectable({
  providedIn: 'root'
})
export class MetricsService {
  private baseUrl: string;

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {
    const config = this.configService.getConfig();
    this.baseUrl = config.basePath || '';
  }

  /**
   * Gets all application metrics.
   */
  getMetrics(): Observable<ApplicationMetrics> {
    return this.http.get<ApplicationMetrics>('/api/kraven-metrics').pipe(
      catchError(error => {
        console.error('Error fetching metrics:', error);
        return of(this.getEmptyMetrics());
      })
    );
  }

  /**
   * Gets JVM metrics.
   */
  getJvmMetrics(): Observable<JvmMetrics> {
    return this.http.get<JvmMetrics>('/api/kraven-metrics/jvm').pipe(
      catchError(error => {
        console.error('Error fetching JVM metrics:', error);
        return of(this.getEmptyJvmMetrics());
      })
    );
  }

  /**
   * Gets application metrics.
   */
  getAppMetrics(): Observable<AppMetrics> {
    return this.http.get<AppMetrics>('/api/kraven-metrics/application').pipe(
      catchError(error => {
        console.error('Error fetching application metrics:', error);
        return of(this.getEmptyAppMetrics());
      })
    );
  }

  /**
   * Gets Spring metrics.
   */
  getSpringMetrics(): Observable<SpringMetrics> {
    return this.http.get<SpringMetrics>('/api/kraven-metrics/spring').pipe(
      catchError(error => {
        console.error('Error fetching Spring metrics:', error);
        return of(this.getEmptySpringMetrics());
      })
    );
  }

  /**
   * Gets Kafka metrics.
   */
  getKafkaMetrics(): Observable<KafkaMetrics> {
    return this.http.get<KafkaMetrics>('/api/kraven-metrics/kafka').pipe(
      catchError(error => {
        console.error('Error fetching Kafka metrics:', error);
        return of(this.getEmptyKafkaMetrics());
      })
    );
  }

  /**
   * Gets Feign client metrics.
   */
  getFeignMetrics(): Observable<FeignMetrics> {
    return this.http.get<FeignMetrics>('/api/kraven-metrics/feign').pipe(
      catchError(error => {
        console.error('Error fetching Feign metrics:', error);
        return of(this.getEmptyFeignMetrics());
      })
    );
  }

  /**
   * Downloads a thread dump.
   */
  downloadThreadDump(): Observable<Blob> {
    return this.http.get('/api/kraven-metrics/thread-dump', {
      responseType: 'blob'
    });
  }

  /**
   * Downloads a heap dump.
   */
  downloadHeapDump(): Observable<Blob> {
    return this.http.get('/api/kraven-metrics/heap-dump', {
      responseType: 'blob'
    });
  }

  /**
   * Generates a text summary of all metrics data.
   */
  generateTextSummary(metrics: ApplicationMetrics): string {
    if (!metrics) return 'No metrics data available.';

    const summary = [];
    const timestamp = new Date().toISOString();

    // Application info
    summary.push('=== APPLICATION INFORMATION ===');
    summary.push(`Timestamp: ${timestamp}`);
    summary.push(`Application Name: ${metrics.application.name || 'N/A'}`);
    summary.push(`Version: ${metrics.application.version || 'N/A'}`);
    summary.push(`Uptime: ${this.formatDuration(metrics.application.uptime) || 'N/A'}`);
    summary.push(`Active Profiles: ${metrics.application.profiles?.join(', ') || 'N/A'}`);
    summary.push('');

    // JVM metrics
    summary.push('=== JVM METRICS ===');
    summary.push(`Java Version: ${metrics.jvm.systemProperties?.['java.version'] || 'N/A'}`);
    summary.push(`Total Memory: ${this.formatBytes(metrics.jvm.totalMemory)}`);
    summary.push(`Used Memory: ${this.formatBytes(metrics.jvm.usedMemory)}`);
    summary.push(`Free Memory: ${this.formatBytes(metrics.jvm.freeMemory)}`);
    summary.push(`Max Memory: ${this.formatBytes(metrics.jvm.maxMemory)}`);
    summary.push(`Available Processors: ${metrics.jvm.availableProcessors}`);
    summary.push('');

    // Memory details
    if (metrics.jvm.memoryDetails) {
      summary.push('=== MEMORY DETAILS ===');
      summary.push(`Heap Memory: ${this.formatBytes(metrics.jvm.memoryDetails.heap.used)} / ${this.formatBytes(metrics.jvm.memoryDetails.heap.max > 0 ? metrics.jvm.memoryDetails.heap.max : metrics.jvm.memoryDetails.heap.committed)}`);
      summary.push(`Non-Heap Memory: ${this.formatBytes(metrics.jvm.memoryDetails.nonHeap.used)} / ${this.formatBytes(metrics.jvm.memoryDetails.nonHeap.max > 0 ? metrics.jvm.memoryDetails.nonHeap.max : metrics.jvm.memoryDetails.nonHeap.committed)}`);

      // Memory pools
      if (metrics.jvm.memoryDetails.memoryPools) {
        summary.push('\nMemory Pools:');
        Object.values(metrics.jvm.memoryDetails.memoryPools).forEach(pool => {
          summary.push(`  ${pool.name}: ${this.formatBytes(pool.used)} / ${this.formatBytes(pool.max > 0 ? pool.max : pool.committed)} (${pool.usagePercentage.toFixed(1)}%)`);
        });
      }
      summary.push('');
    }

    // Thread metrics
    summary.push('=== THREAD METRICS ===');
    summary.push(`Thread Count: ${metrics.jvm.threadCount}`);
    summary.push(`Peak Thread Count: ${metrics.jvm.peakThreadCount}`);
    summary.push(`Daemon Thread Count: ${metrics.jvm.daemonThreadCount}`);
    summary.push(`Total Started Thread Count: ${metrics.jvm.totalStartedThreadCount}`);
    summary.push('');

    // Class loading metrics
    summary.push('=== CLASS LOADING METRICS ===');
    summary.push(`Loaded Class Count: ${metrics.jvm.loadedClassCount}`);
    summary.push(`Total Loaded Class Count: ${metrics.jvm.totalLoadedClassCount}`);
    summary.push(`Unloaded Class Count: ${metrics.jvm.unloadedClassCount}`);
    summary.push('');

    // Spring metrics
    summary.push('=== SPRING METRICS ===');
    summary.push(`Bean Count: ${metrics.spring.beanCount}`);
    summary.push(`Controller Count: ${metrics.spring.controllerCount}`);
    summary.push(`Service Count: ${metrics.spring.serviceCount}`);
    summary.push(`Repository Count: ${metrics.spring.repositoryCount}`);
    summary.push(`Component Count: ${metrics.spring.componentCount}`);
    summary.push(`Configuration Count: ${metrics.spring.configurationCount}`);
    summary.push(`Endpoint Count: ${metrics.spring.endpointCount}`);
    summary.push('');

    // Kafka metrics
    summary.push('=== KAFKA METRICS ===');
    summary.push(`Topic Count: ${metrics.kafka.topicCount}`);
    summary.push(`Consumer Count: ${metrics.kafka.consumerCount}`);
    summary.push(`Producer Count: ${metrics.kafka.producerCount}`);
    summary.push(`Listener Count: ${metrics.kafka.listenerCount}`);
    summary.push('');

    // Feign metrics
    summary.push('=== FEIGN CLIENT METRICS ===');
    summary.push(`Client Count: ${metrics.feign.clientCount}`);
    summary.push(`Method Count: ${metrics.feign.methodCount}`);
    summary.push('');

    // System properties
    summary.push('=== SYSTEM PROPERTIES ===');
    if (metrics.jvm.systemProperties) {
      Object.entries(metrics.jvm.systemProperties)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([key, value]) => {
          summary.push(`${key}: ${value}`);
        });
    }

    return summary.join('\n');
  }

  /**
   * Generates a JSON summary of all metrics data.
   */
  generateJsonSummary(metrics: ApplicationMetrics): string {
    if (!metrics) return JSON.stringify({ error: 'No metrics data available.' });

    // Create a copy of the metrics object with a timestamp
    const summary = {
      timestamp: new Date().toISOString(),
      ...metrics
    };

    return JSON.stringify(summary, null, 2);
  }

  /**
   * Downloads the metrics summary as a text file.
   */
  downloadTextSummary(metrics: ApplicationMetrics): void {
    const text = this.generateTextSummary(metrics);
    const blob = new Blob([text], { type: 'text/plain' });
    this.downloadFile(blob, `metrics-summary-${new Date().toISOString().replace(/:/g, '-')}.txt`);
  }

  /**
   * Downloads the metrics summary as a JSON file.
   */
  downloadJsonSummary(metrics: ApplicationMetrics): void {
    const json = this.generateJsonSummary(metrics);
    const blob = new Blob([json], { type: 'application/json' });
    this.downloadFile(blob, `metrics-summary-${new Date().toISOString().replace(/:/g, '-')}.json`);
  }

  /**
   * Helper method to download a file.
   */
  private downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  }

  /**
   * Formats bytes to a human-readable string.
   */
  formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Formats milliseconds to a human-readable duration string.
   */
  formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Creates empty metrics for error handling.
   */
  private getEmptyMetrics(): ApplicationMetrics {
    return {
      jvm: this.getEmptyJvmMetrics(),
      application: this.getEmptyAppMetrics(),
      spring: this.getEmptySpringMetrics(),
      kafka: this.getEmptyKafkaMetrics(),
      feign: this.getEmptyFeignMetrics()
    };
  }

  private getEmptyJvmMetrics(): JvmMetrics {
    return {
      totalMemory: 0,
      freeMemory: 0,
      maxMemory: 0,
      usedMemory: 0,
      memoryDetails: {
        heap: this.getEmptyMemoryPoolMetrics('Heap'),
        nonHeap: this.getEmptyMemoryPoolMetrics('Non-Heap'),
        memoryPools: {}
      },
      availableProcessors: 0,
      threadCount: 0,
      peakThreadCount: 0,
      daemonThreadCount: 0,
      totalStartedThreadCount: 0,
      uptime: 0,
      loadedClassCount: 0,
      totalLoadedClassCount: 0,
      unloadedClassCount: 0,
      systemProperties: {},
      garbageCollector: {
        collectors: {}
      }
    };
  }

  private getEmptyMemoryPoolMetrics(name: string): MemoryPoolMetrics {
    return {
      name: name,
      init: 0,
      used: 0,
      committed: 0,
      max: 0,
      usagePercentage: 0
    };
  }

  private getEmptyAppMetrics(): AppMetrics {
    return {
      name: 'Unknown',
      version: 'Unknown',
      buildTime: 'Unknown',
      startTime: 'Unknown',
      uptime: 0,
      profiles: []
    };
  }

  private getEmptySpringMetrics(): SpringMetrics {
    return {
      beanCount: 0,
      controllerCount: 0,
      serviceCount: 0,
      repositoryCount: 0,
      componentCount: 0,
      configurationCount: 0,
      endpointCount: 0
    };
  }

  private getEmptyKafkaMetrics(): KafkaMetrics {
    return {
      topicCount: 0,
      consumerCount: 0,
      producerCount: 0,
      listenerCount: 0
    };
  }

  private getEmptyFeignMetrics(): FeignMetrics {
    return {
      clientCount: 0,
      methodCount: 0
    };
  }
}
