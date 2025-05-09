import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class ApiDocsService {
  constructor(private http: HttpClient, private configService: ConfigService) {}

  private usingSampleData = false;

  /**
   * Fetches the OpenAPI documentation from the server
   * Falls back to sample data if the server request fails
   */
  getApiDocs(): Observable<any> {
    // Check if we have a custom API docs URL from the application config
    const customApiDocsUrl = (window as any).__KRAVEN_API_DOCS_URL__;

    if (customApiDocsUrl) {

      return this.http.get(customApiDocsUrl).pipe(
        catchError(error => {
          console.error('Error fetching API docs from custom URL:', error);
          this.usingSampleData = true;
          return this.getSampleApiDocs();
        })
      );
    }

    // Fall back to the default behavior if no custom URL is provided
    const baseApiPath = (window as any).__KRAVEN_BASE_API_PATH__ || '/kraven/api';

    // Get the configured API docs path
    let apiDocsPath = this.configService.getConfig().apiDocsPath || '/v3/api-docs';

    // If the path starts with /v3, prefix it with the base API path
    if (apiDocsPath.startsWith('/v3')) {
      apiDocsPath = baseApiPath + apiDocsPath;
    }


    return this.http.get(apiDocsPath).pipe(
      catchError(error => {
        console.error('Error fetching API docs:', error);
        this.usingSampleData = true;
        return this.getSampleApiDocs();
      })
    );
  }

  /**
   * Loads sample OpenAPI documentation
   * Tries multiple locations for better compatibility
   */
  getSampleApiDocs(): Observable<any> {
    return this.http.get('sample-openapi.json').pipe(
      catchError(error => {
        return this.http.get('assets/sample-openapi.json');
      })
    );
  }

  /**
   * Checks if the app is using sample data
   */
  isUsingSampleData(): boolean {
    return this.usingSampleData;
  }
}
