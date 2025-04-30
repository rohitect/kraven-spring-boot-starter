import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';
import { ConfigService } from './config.service';
import { FeignClient } from '../models/feign-client.model';

@Injectable({
  providedIn: 'root'
})
export class FeignClientService {
  private apiPath: string;
  private enabled: boolean;
  private tryItOutEnabled: boolean;
  private cacheMetadata: boolean;
  private scanIntervalMs: number;

  constructor(private http: HttpClient, private configService: ConfigService) {
    const config = this.configService.getConfig();

    // Get the base API path from the window object
    const baseApiPath = (window as any).__KRAVEN_BASE_API_PATH__ || '/kraven/api';

    // Initialize feign client configuration from config
    if (config.feignClient) {
      // Use the configured API path but replace /kraven/api with the baseApiPath
      // const configuredPath = config.feignClient.apiPath || '/kraven/api/feign-clients';
      // this.apiPath = configuredPath.replace('/kraven/api', baseApiPath);
      this.apiPath = `${baseApiPath}/feign-clients`;

      this.enabled = config.feignClient.enabled !== false;
      this.tryItOutEnabled = config.feignClient.tryItOutEnabled !== false;
      this.cacheMetadata = config.feignClient.cacheMetadata !== false;
      this.scanIntervalMs = config.feignClient.scanIntervalMs || 60000;
    } else {
      // Default values if feign client config is not provided
      this.apiPath = `${baseApiPath}/feign-clients`;
      this.enabled = true;
      this.tryItOutEnabled = true;
      this.cacheMetadata = true;
      this.scanIntervalMs = 60000;
    }

    console.log('Feign client service initialized with config:', {
      apiPath: this.apiPath,
      enabled: this.enabled,
      tryItOutEnabled: this.tryItOutEnabled,
      cacheMetadata: this.cacheMetadata,
      scanIntervalMs: this.scanIntervalMs
    });
  }

  /**
   * Fetches all Feign clients from the server.
   */
  getFeignClients(): Observable<FeignClient[]> {
    if (!this.enabled) {
      console.log('Feign client feature is disabled');
      return of([]);
    }

    console.log('Fetching Feign clients from:', this.apiPath);

    // First try the debug endpoint to check if the controller is accessible
    this.http.get(`${this.apiPath}/debug`, { headers: { 'Accept': 'application/json' } }).subscribe({
      next: (response) => console.log('Debug endpoint response:', response),
      error: (error) => console.error('Debug endpoint error:', error)
    });

    return this.http.get<FeignClient[]>(this.apiPath, { headers: { 'Accept': 'application/json' } }).pipe(
      map(response => {
        // Ensure we always return an array
        if (Array.isArray(response)) {
          return response;
        } else {
          console.warn('Response is not an array:', response);
          return [];
        }
      }),
      catchError(error => {
        console.error('Error fetching Feign clients:', error);
        console.error('Response text:', error.error?.text || 'No response text');
        return of([]);
      })
    );
  }

  /**
   * Fetches a specific Feign client by name.
   *
   * @param name the name of the Feign client
   */
  getFeignClient(name: string): Observable<FeignClient | null> {
    if (!this.enabled) {
      console.log('Feign client feature is disabled');
      return of(null);
    }

    const url = `${this.apiPath}/${name}`;
    console.log('Fetching Feign client from:', url);

    // First try the debug endpoint to check if the controller is accessible
    this.http.get(`${this.apiPath}/debug`, { headers: { 'Accept': 'application/json' } }).subscribe({
      next: (response) => console.log('Debug endpoint response before getting client:', response),
      error: (error) => console.error('Debug endpoint error before getting client:', error)
    });

    return this.http.get<FeignClient>(url, { headers: { 'Accept': 'application/json' } }).pipe(
      catchError(error => {
        console.error('Error fetching Feign client:', error);
        console.error('Response text:', error.error?.text || 'No response text');
        return of(null);
      })
    );
  }

  /**
   * Executes a Feign client method.
   *
   * @param clientName the name of the Feign client
   * @param methodName the name of the method
   * @param parameters the parameters for the method
   * @param requestBody optional request body as string
   */
  executeMethod(clientName: string, methodName: string, parameters: any, requestBody?: string): Observable<any> {
    if (!this.enabled) {
      console.log('Feign client feature is disabled');
      return of(null);
    }

    console.log('Executing Feign client method:', `${this.apiPath}/${clientName}/methods/${methodName}/execute`);

    // Prepare the request payload
    const payload: any = { ...parameters };

    // If there's a request body parameter and requestBody is provided, add it
    if (requestBody) {
      try {
        // Try to parse as JSON
        payload['requestBody'] = JSON.parse(requestBody);
      } catch (e) {
        // If not valid JSON, use as string
        payload['requestBody'] = requestBody;
      }
    }

    console.log('Request payload:', payload);

    // Return the raw response without wrapping it
    return this.http.post(`${this.apiPath}/${clientName}/methods/${methodName}/execute`, payload, {
      observe: 'response',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
    }).pipe(
      map(response => {
        // Return the raw response body
        return response.body;
      }),
      catchError(error => {
        console.error('Error executing Feign client method:', error);
        console.error('Response text:', error.error?.text || 'No response text');

        // Try to extract error message from the response
        let errorMessage = 'Failed to execute method';
        if (error.error) {
          if (typeof error.error === 'string') {
            try {
              const errorObj = JSON.parse(error.error);
              errorMessage = errorObj.error || errorMessage;
            } catch (e) {
              errorMessage = error.error;
            }
          } else if (error.error.error) {
            errorMessage = error.error.error;
          } else if (error.message) {
            errorMessage = error.message;
          }
        }

        console.error('Error message:', errorMessage);
        return of({ error: errorMessage });
      })
    );
  }

  /**
   * Checks if the Feign client feature is enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Checks if the Try-It-Out feature is enabled.
   */
  isTryItOutEnabled(): boolean {
    return this.tryItOutEnabled;
  }

  /**
   * Checks if metadata caching is enabled.
   */
  isCacheMetadataEnabled(): boolean {
    return this.cacheMetadata;
  }

  /**
   * Gets the scan interval in milliseconds.
   */
  getScanIntervalMs(): number {
    return this.scanIntervalMs;
  }
}
