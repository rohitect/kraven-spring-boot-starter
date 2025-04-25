import { Injectable } from '@angular/core';

interface KravenConfig {
  basePath: string;
  apiDocsPath: string;
  title: string;
  theme: {
    /** @deprecated Use darkPrimaryColor or lightPrimaryColor instead */
    primaryColor?: string;
    /** @deprecated Use darkSecondaryColor or lightSecondaryColor instead */
    secondaryColor?: string;
    darkPrimaryColor: string;
    darkSecondaryColor: string;
    darkBackgroundColor: string;
    lightPrimaryColor: string;
    lightSecondaryColor: string;
    lightBackgroundColor: string;

    defaultTheme?: 'light' | 'dark';
    respectSystemPreference?: boolean;
    customCssPath?: string;
    customJsPath?: string;
  };
  layout: {
    type: string;
  };
  apiDocs?: {
    enabled: boolean;
    tryItOutEnabled: boolean;
  };
  feignClient?: {
    enabled: boolean;
    apiPath: string;
    tryItOutEnabled: boolean;
    cacheMetadata: boolean;
    scanIntervalMs: number;
  };
  kafka?: {
    enabled: boolean;
    apiPath: string;
    messageLimit: number;
    streamingEnabled: boolean;
    sseTimeoutMs: number;
    messageProductionEnabled: boolean;
    messageConsumptionEnabled: boolean;
    topicManagementEnabled: boolean;
  };
  metrics?: {
    enabled: boolean;
    apiPath: string;
    jvmMetricsEnabled: boolean;
    springMetricsEnabled: boolean;
    kafkaMetricsEnabled: boolean;
    feignMetricsEnabled: boolean;
    refreshIntervalMs: number;
    autoRefreshEnabled: boolean;
    threadDumpEnabled: boolean;
    heapDumpEnabled: boolean;
  };
}

declare global {
  interface Window {
    __KRAVEN_CONFIG__?: KravenConfig;
  }
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private defaultConfig: KravenConfig = {
    basePath: '/kraven',
    apiDocsPath: '/v3/api-docs',
    title: 'API Documentation',
    theme: {
      darkPrimaryColor: '#1976d2',
      darkSecondaryColor: '#424242',
      darkBackgroundColor: '#121212',
      lightPrimaryColor: '#1976d2',
      lightSecondaryColor: '#424242',
      lightBackgroundColor: '#ffffff',

      defaultTheme: 'dark',
      respectSystemPreference: true,
      customCssPath: '',
      customJsPath: ''
    },
    layout: {
      type: 'three-pane'
    },
    apiDocs: {
      enabled: true,
      tryItOutEnabled: true
    },
    feignClient: {
      enabled: true,
      apiPath: '/kraven/v1/feign-clients',
      tryItOutEnabled: true,
      cacheMetadata: true,
      scanIntervalMs: 0
    },
    kafka: {
      enabled: true,
      apiPath: '/api/kraven-kafka-management',
      messageLimit: 100,
      streamingEnabled: true,
      sseTimeoutMs: 300000,
      messageProductionEnabled: true,
      messageConsumptionEnabled: true,
      topicManagementEnabled: false
    },
    metrics: {
      enabled: true,
      apiPath: '/api/kraven-metrics',
      jvmMetricsEnabled: true,
      springMetricsEnabled: true,
      kafkaMetricsEnabled: true,
      feignMetricsEnabled: true,
      refreshIntervalMs: 5000,
      autoRefreshEnabled: false,
      threadDumpEnabled: true,
      heapDumpEnabled: false
    }
  };

  /**
   * Gets the configuration from the window object or returns default values
   */
  getConfig(): KravenConfig {
    try {
      // Check if window.__KRAVEN_CONFIG__ exists and has required properties
      if (window.__KRAVEN_CONFIG__ &&
          window.__KRAVEN_CONFIG__.theme &&
          window.__KRAVEN_CONFIG__.basePath) {
        return window.__KRAVEN_CONFIG__;
      } else {
        console.warn('Invalid or incomplete configuration found, using default config');
        return this.defaultConfig;
      }
    } catch (error) {
      console.error('Error getting configuration:', error);
      return this.defaultConfig;
    }
  }
}
