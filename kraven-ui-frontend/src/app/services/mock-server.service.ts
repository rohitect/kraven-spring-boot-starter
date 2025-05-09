import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';

export interface MockServerStatus {
  running: boolean;
  host?: string;
  port?: number;
  basePath?: string;
}

export interface MockServerConfig {
  enabled: boolean;
  autoStart: boolean;
  host: string;
  port: number;
  basePath: string;
  configPath: string;
  configVolumePath: string;
  autoReload: boolean;
  reloadIntervalMs: number;
  maxHistoryEntries: number;
  defaultDelayMs: number;
  endpointCount?: number;
  responseCount?: number;
}

export interface MockEndpoint {
  method: string;
  path: string;
  originalPath?: string;
  responseType: string;
  responses: MockResponse[];
}

export interface MockResponse {
  id: string;
  isDefault: boolean;
  status: number;
  description: string;
  headers?: Record<string, string>;
  body?: any;
  bodyTemplate?: string;
  bodyTemplateEngine?: string;
  delay?: number;
  tags?: string[];
  category?: string;
}

export interface MockConfiguration {
  endpoints: MockEndpoint[];
}

export interface ServerOperationResult {
  success: boolean;
  message: string;
  host?: string;
  port?: number;
  basePath?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MockServerService {
  private baseUrl: string;

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {
    // Get the base API path from the ConfigService
    const baseApiPath = this.configService.getApiBasePath();

    // Construct the API path using the base API path to honor servlet context path
    // The baseApiPath already includes the servlet context path, so we need to ensure
    // we're constructing the path correctly
    const servletContextPath = baseApiPath.replace('/kraven/api', '');
    this.baseUrl = `${servletContextPath}/kraven/plugin/mock-server`;


  }

  /**
   * Get the server status
   */
  getServerStatus(): Observable<MockServerStatus> {
    return this.http.get<MockServerStatus>(`${this.baseUrl}/server/status`);
  }

  /**
   * Get the server configuration
   */
  getServerConfig(): Observable<MockServerConfig> {
    return this.http.get<MockServerConfig>(`${this.baseUrl}/status`);
  }

  /**
   * Start the server
   */
  startServer(): Observable<ServerOperationResult> {
    return this.http.post<ServerOperationResult>(`${this.baseUrl}/server/start`, {});
  }

  /**
   * Stop the server
   */
  stopServer(): Observable<ServerOperationResult> {
    return this.http.post<ServerOperationResult>(`${this.baseUrl}/server/stop`, {});
  }

  /**
   * Get the mock configuration
   */
  getMockConfiguration(): Observable<MockConfiguration> {
    return this.http.get<MockConfiguration>(`${this.baseUrl}/config`);
  }

  /**
   * Get all endpoints
   */
  getEndpoints(): Observable<MockEndpoint[]> {
    return this.http.get<MockEndpoint[]>(`${this.baseUrl}/endpoints`);
  }

  /**
   * Get endpoint details
   */
  getEndpointDetails(method: string, path: string): Observable<MockEndpoint> {
    // Encode the path parameter to handle special characters
    const encodedPath = encodeURIComponent(path);
    const encodedMethod = encodeURIComponent(method);
    return this.http.get<MockEndpoint>(`${this.baseUrl}/endpoints/${encodedMethod}/${encodedPath}`);
  }

  /**
   * Get response details
   */
  getResponseDetails(method: string, path: string, responseId: string): Observable<MockResponse> {
    return this.http.get<MockResponse>(`${this.baseUrl}/endpoints/${method}/${path}/responses/${responseId}`);
  }

  /**
   * Set active response
   */
  setActiveResponse(method: string, path: string, responseId: string): Observable<ServerOperationResult> {
    return this.http.post<ServerOperationResult>(
      `${this.baseUrl}/endpoints/${method}/${path}/active-response?responseId=${responseId}`,
      {}
    );
  }
}
