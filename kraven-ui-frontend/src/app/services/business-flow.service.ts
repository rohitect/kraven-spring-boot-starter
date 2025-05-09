import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface BusinessFlowTag {
  name: string;
  methodCount: number;
  stereotypeCount: number;
}

export interface TaggedMethod {
  className: string;
  simpleClassName: string;
  methodName: string;
  tagName: string;
  level: number;
  description: string;
  stereotype: string;
  methodSignature: string;
  packageName: string;
}

export interface BusinessFlow {
  tagName: string;
  methodsByStereotype: { [key: string]: TaggedMethod[] };
  methods: TaggedMethod[];
}

@Injectable({
  providedIn: 'root'
})
export class BusinessFlowService {
  private apiPath: string;

  constructor(
    private http: HttpClient
  ) {
    // Use the global variable if available, otherwise fall back to default
    const baseApiPath = (window as any).__KRAVEN_BASE_API_PATH__ || '/kraven/api';
    this.apiPath = `${baseApiPath}/business-flows`;

  }

  /**
   * Gets all available business flow tags.
   */
  getAllTags(): Observable<BusinessFlowTag[]> {
    return this.http.get<BusinessFlowTag[]>(`${this.apiPath}/tags`).pipe(
      catchError(error => {
        console.error('Error fetching business flow tags:', error);
        return of([]);
      })
    );
  }

  /**
   * Gets a business flow by tag name.
   *
   * @param tagName the tag name
   */
  getBusinessFlow(tagName: string): Observable<BusinessFlow> {
    return this.http.get<BusinessFlow>(`${this.apiPath}/flows/${tagName}`).pipe(
      catchError(error => {
        console.error(`Error fetching business flow for tag ${tagName}:`, error);
        return of({ tagName, methodsByStereotype: {}, methods: [] });
      })
    );
  }

  /**
   * Refreshes the business flow data by rescanning the application.
   */
  refreshBusinessFlows(): Observable<string> {
    return this.http.post<string>(`${this.apiPath}/refresh`, {}).pipe(
      catchError(error => {
        console.error('Error refreshing business flows:', error);
        return of('Failed to refresh business flows');
      })
    );
  }

  /**
   * Gets the stereotype order for display.
   * This ensures that stereotypes are displayed in a logical order.
   */
  getStereotypeOrder(stereotype: string): number {
    const order: { [key: string]: number } = {
      'Controller': 1,
      'Service': 2,
      'Component': 3,
      'Repository': 4,
      'Other': 5
    };
    return order[stereotype] || 99;
  }

  /**
   * Gets the color for a stereotype.
   */
  getStereotypeColor(stereotype: string): string {
    const colors: { [key: string]: string } = {
      'Controller': '#6c5ce7', // Purple
      'Service': '#00b894',    // Green
      'Component': '#0984e3',  // Blue
      'Repository': '#e17055', // Orange
      'Other': '#636e72'       // Gray
    };
    return colors[stereotype] || '#636e72';
  }
}
