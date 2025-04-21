import { Injectable } from '@angular/core';

interface KravenConfig {
  basePath: string;
  apiDocsPath: string;
  title: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
  };
  layout: {
    type: string;
  };
  feignClient?: {
    enabled: boolean;
    apiPath: string;
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
      primaryColor: '#1976d2',
      secondaryColor: '#424242',
      fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif'
    },
    layout: {
      type: 'three-pane'
    },
    feignClient: {
      enabled: true,
      apiPath: '/kraven/v1/feign-clients'
    }
  };

  /**
   * Gets the configuration from the window object or returns default values
   */
  getConfig(): KravenConfig {
    return window.__KRAVEN_CONFIG__ || this.defaultConfig;
  }
}
