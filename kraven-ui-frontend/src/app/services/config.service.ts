import { Injectable } from '@angular/core';

interface KravenConfig {
  basePath: string;
  apiDocsPath: string;
  title: string;
  path?: string; // Added for backward compatibility
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
  businessFlow?: {
    enabled: boolean;
    apiPath: string;
    basePackages: string[];
    autoRefreshEnabled: boolean;
    refreshIntervalMs: number;
    showDetailedMethodInfo: boolean;
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
    basePath: '/kraven/ui',
    apiDocsPath: '/v3/api-docs',
    title: 'API Documentation',
    theme: {
      darkPrimaryColor: '#6c5ce7', // Vibrant purple
      darkSecondaryColor: '#00b894', // Mint green
      darkBackgroundColor: '#1a1b2e', // Rich navy blue
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
      apiPath: '/kraven/api/feign-clients',
      tryItOutEnabled: true,
      cacheMetadata: true,
      scanIntervalMs: 0
    },
    kafka: {
      enabled: true,
      apiPath: '/kraven/api/kafka-management',
      messageLimit: 100,
      streamingEnabled: true,
      sseTimeoutMs: 300000,
      messageProductionEnabled: true,
      messageConsumptionEnabled: true,
      topicManagementEnabled: false
    },
    metrics: {
      enabled: true,
      apiPath: '/kraven/api/metrics',
      jvmMetricsEnabled: true,
      springMetricsEnabled: true,
      kafkaMetricsEnabled: true,
      feignMetricsEnabled: true,
      refreshIntervalMs: 5000,
      autoRefreshEnabled: false,
      threadDumpEnabled: true,
      heapDumpEnabled: false
    },
    businessFlow: {
      enabled: true,
      apiPath: '/kraven/api/business-flows',
      basePackages: ['io.github'],
      autoRefreshEnabled: false,
      refreshIntervalMs: 0,
      showDetailedMethodInfo: true
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

  /**
   * Gets the base path for API calls
   */
  getApiBasePath(): string {
    // Get the base API path from the window object
    const baseApiPath = (window as any).__KRAVEN_BASE_API_PATH__ || '/kraven/api';
    return baseApiPath;
  }
}
