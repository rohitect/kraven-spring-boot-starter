import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit, OnDestroy } from '@angular/core';
import { MockEndpoint, MockResponse, MockServerService } from '../../../services/mock-server.service';
import { AndypfJsonViewerComponent } from '../../../components/andypf-json-viewer/andypf-json-viewer.component';
import { ThemeService } from '../../../services/theme.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-endpoint-management',
  templateUrl: './endpoint-management.component.html',
  styleUrls: ['./endpoint-management.component.scss'],
  standalone: false
})
export class EndpointManagementComponent implements OnChanges, OnInit, OnDestroy {
  @Input() endpoints: MockEndpoint[] = [];
  @Input() serverRunning = false;
  @Input() selectedEndpoint: MockEndpoint | null = null;
  @Output() endpointSelected = new EventEmitter<MockEndpoint>();

  // Endpoint details
  endpointDetails: MockEndpoint | null = null;
  selectedResponse: MockResponse | null = null;

  // UI state
  loading = false;
  error: string | null = null;
  searchQuery = '';
  filteredEndpoints: MockEndpoint[] = [];
  isDarkTheme = true;
  private themeSubscription: Subscription | null = null;

  constructor(
    private mockServerService: MockServerService,
    private themeService: ThemeService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['endpoints']) {
      this.filterEndpoints();
    }

    if (changes['selectedEndpoint'] && this.selectedEndpoint) {
      this.loadEndpointDetails(this.selectedEndpoint);
    }
  }

  /**
   * Filter endpoints based on search query
   */
  filterEndpoints(): void {
    if (!this.searchQuery) {
      this.filteredEndpoints = [...this.endpoints];
      return;
    }

    const query = this.searchQuery.toLowerCase();
    this.filteredEndpoints = this.endpoints.filter(endpoint => {
      return endpoint.path.toLowerCase().includes(query) ||
             endpoint.method.toLowerCase().includes(query);
    });
  }

  /**
   * Handle search input changes
   */
  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.filterEndpoints();
  }

  /**
   * Select an endpoint
   */
  selectEndpoint(endpoint: MockEndpoint): void {
    this.selectedEndpoint = endpoint;
    this.endpointSelected.emit(endpoint);
    this.loadEndpointDetails(endpoint);
  }

  /**
   * Load endpoint details
   */
  loadEndpointDetails(endpoint: MockEndpoint): void {
    if (!endpoint || !endpoint.method || !endpoint.path) {
      console.error('Invalid endpoint data:', endpoint);
      this.error = 'Invalid endpoint data';
      return;
    }

    this.loading = true;
    this.mockServerService.getEndpointDetails(endpoint.method, endpoint.path).subscribe({
      next: (details) => {
        this.endpointDetails = details;
        // Check if responses array exists before trying to find in it
        if (details && Array.isArray(details.responses)) {
          this.selectedResponse = details.responses.find(r => r.isDefault) ||
                                 (details.responses.length > 0 ? details.responses[0] : null);
        } else {
          this.selectedResponse = null;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading endpoint details:', error);
        this.error = 'Failed to load endpoint details';
        this.loading = false;
        this.endpointDetails = null;
        this.selectedResponse = null;
      }
    });
  }

  /**
   * Select a response
   */
  selectResponse(response: MockResponse): void {
    this.selectedResponse = response;
  }

  /**
   * Set a response as active
   */
  setActiveResponse(response: MockResponse): void {
    if (!this.endpointDetails || !this.serverRunning) {
      return;
    }

    this.loading = true;
    this.mockServerService.setActiveResponse(
      this.endpointDetails.method,
      this.endpointDetails.path,
      response.id
    ).subscribe({
      next: (result) => {
        if (result.success) {
          // Update the UI to reflect the change
          if (this.endpointDetails) {
            this.endpointDetails.responses.forEach(r => {
              r.isDefault = r.id === response.id;
            });
          }
        } else {
          this.error = result.message;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error setting active response:', error);
        this.error = 'Failed to set active response';
        this.loading = false;
      }
    });
  }

  /**
   * Get the HTTP method class for styling
   */
  getMethodClass(method: string | undefined): string {
    // Handle undefined or null method
    if (!method) {
      return 'method-other';
    }

    try {
      switch (method.toUpperCase()) {
        case 'GET': return 'method-get';
        case 'POST': return 'method-post';
        case 'PUT': return 'method-put';
        case 'DELETE': return 'method-delete';
        case 'PATCH': return 'method-patch';
        default: return 'method-other';
      }
    } catch (error) {
      console.error('Error processing method:', method, error);
      return 'method-other';
    }
  }

  /**
   * Get the status code class for styling
   */
  getStatusClass(status: number | undefined): string {
    // Handle undefined or null status
    if (status === undefined || status === null) {
      return 'status-other';
    }

    try {
      if (status >= 200 && status < 300) {
        return 'status-success';
      } else if (status >= 300 && status < 400) {
        return 'status-redirect';
      } else if (status >= 400 && status < 500) {
        return 'status-client-error';
      } else if (status >= 500) {
        return 'status-server-error';
      }
    } catch (error) {
      console.error('Error processing status:', status, error);
    }
    return 'status-other';
  }

  /**
   * Initialize the component
   */
  ngOnInit(): void {
    // Subscribe to theme changes
    this.themeSubscription = this.themeService.isDarkTheme$.subscribe(isDark => {
      this.isDarkTheme = isDark;
    });
  }

  /**
   * Clean up subscriptions
   */
  ngOnDestroy(): void {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }

  /**
   * Format JSON for display
   */
  formatJson(json: any): string {
    try {
      if (typeof json === 'string') {
        return JSON.stringify(JSON.parse(json), null, 2);
      }
      return JSON.stringify(json, null, 2);
    } catch (e) {
      return typeof json === 'string' ? json : JSON.stringify(json);
    }
  }

  /**
   * Check if a template string is JSON
   */
  isJsonTemplate(template: string): boolean {
    if (!template) return false;

    try {
      const trimmed = template.trim();
      return (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
             (trimmed.startsWith('[') && trimmed.endsWith(']'));
    } catch (e) {
      return false;
    }
  }

  /**
   * Parse a JSON template string into an object
   */
  parseJsonTemplate(template: string): any {
    try {
      return JSON.parse(template);
    } catch (e) {
      console.error('Error parsing JSON template:', e);
      return { error: 'Invalid JSON template' };
    }
  }

  /**
   * Format path with variables for display
   * Highlights path variables like ${variable} in a user-friendly way
   */
  formatPathWithVariables(path: string): string {
    if (!path) return '';
    if (!path.includes('${')) return path;

    // Replace ${variable} with a styled span but preserve the original syntax
    return path.replace(/\${([^}]+)}/g, '<span class="path-variable">${$1}</span>');
  }
}
