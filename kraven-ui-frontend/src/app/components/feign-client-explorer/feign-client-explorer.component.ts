import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { FeignClientService } from '../../services/feign-client.service';
import { ConfigService } from '../../services/config.service';
import { ThemeService } from '../../services/theme.service';
import { trigger, transition, style, animate, state } from '@angular/animations';
import { FeignClient, FeignMethod, FeignParameter } from '../../models/feign-client.model';

@Component({
  selector: 'app-feign-client-explorer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './feign-client-explorer.component.html',
  styleUrls: ['./feign-client-explorer.component.scss'],
  animations: [
    trigger('fadeInOut', [
      state('void', style({ opacity: 0 })),
      state('*', style({ opacity: 1 })),
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms 50ms ease-in')
      ]),
      transition(':leave', [
        animate('200ms ease-out', style({ opacity: 0 }))
      ])
    ]),
    trigger('expandCollapse', [
      state('collapsed', style({ height: '0', overflow: 'hidden', opacity: 0 })),
      state('expanded', style({ height: '*', overflow: 'visible', opacity: 1 })),
      transition('collapsed <=> expanded', [
        animate('300ms ease-in-out')
      ])
    ])
  ]
})
export class FeignClientExplorerComponent implements OnInit {
  feignClients: FeignClient[] = [];
  filteredClients: FeignClient[] = [];
  recentlyUsedClients: FeignClient[] = [];
  loading = true;
  error: string | null = null;
  title = 'Feign Client Explorer';
  isDarkTheme = true;
  searchQuery: string = '';
  searchFocused: boolean = false;

  private _viewMode: 'list' | 'card' = 'list';

  get viewMode(): 'list' | 'card' {
    return this._viewMode;
  }

  set viewMode(value: 'list' | 'card') {
    this._viewMode = value;
    // Save view mode to local storage
    try {
      localStorage.setItem('feignClientViewMode', value);
    } catch (error) {
      console.error('Failed to save view mode to local storage:', error);
    }
  }

  selectedClient: FeignClient | null = null;
  selectedMethod: FeignMethod | null = null;

  // Response data
  responseData: any = null;
  responseTime: number = 0;
  responseStatus: number = 0;
  responseStatusText: string = '';
  responseContentType: string = '';
  responseHeaders: { name: string, value: string }[] = [];
  formattedResponseBody: string = '';
  responseTab: 'body' | 'headers' = 'body';
  isExecuting = false;

  // Parameter values for try-it-out
  paramValues: { [key: string]: any } = {};
  requestBody: string = '';

  // Right pane state
  rightPaneActiveTab: 'try-it-out' | 'response' = 'try-it-out';

  @ViewChild('responseViewer') responseViewer!: ElementRef;

  constructor(
    private feignClientService: FeignClientService,
    private configService: ConfigService,
    private themeService: ThemeService,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // Get the current theme from the theme service
    this.isDarkTheme = this.themeService.getCurrentTheme() === 'dark';

    // Subscribe to theme changes
    this.themeService.theme$.subscribe(theme => {
      this.isDarkTheme = theme === 'dark';
    });

    // Load Feign clients
    this.loadFeignClients();

    // Check if a client is specified in the route
    this.route.params.subscribe(params => {
      const clientName = params['client'];
      if (clientName) {
        this.selectClientByName(clientName);
      }
    });

    // Initialize view mode from local storage if available
    const savedViewMode = localStorage.getItem('feignClientViewMode');
    if (savedViewMode === 'list' || savedViewMode === 'card') {
      this.viewMode = savedViewMode;
    }
  }

  /**
   * Handle keyboard shortcuts
   */
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Ignore if user is typing in an input field
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (
      activeElement.tagName.toLowerCase() === 'input' ||
      activeElement.tagName.toLowerCase() === 'textarea' ||
      activeElement.getAttribute('contenteditable') === 'true'
    );

    // Focus search input when '/' is pressed
    if (event.key === '/' && !isInputFocused) {
      event.preventDefault();
      this.focusSearchInput();
      return;
    }

    // Clear search when 'Escape' is pressed
    if (event.key === 'Escape') {
      if (this.searchQuery) {
        this.searchQuery = '';
        this.filterClients();
      }
    }
  }

  /**
   * Focus the search input field
   */
  focusSearchInput(): void {
    // Try to find and focus the search input
    const searchInput = document.querySelector('.search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }

  /**
   * Toggles the theme between light and dark.
   */
  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  /**
   * Checks if try-it-out is enabled in the configuration.
   * @returns true if try-it-out is enabled, false otherwise
   */
  isTryItOutEnabled(): boolean {
    const config = this.configService.getConfig();
    return config.feignClient?.tryItOutEnabled !== false; // Default to true if not specified
  }

  /**
   * Debug Feign clients by checking various endpoints.
   */
  debugFeignClients(): void {
    const config = this.configService.getConfig();
    const apiPath = config.feignClient?.apiPath || '/kraven/v1/feign-clients';

    // Check the debug endpoint
    this.http.get(`${apiPath}/debug`).subscribe({
      next: (response) => {
        alert('Debug endpoint is working.');
      },
      error: (error) => {
        console.error('Debug endpoint error:', error);
        alert('Debug endpoint error.');
      }
    });

    // Check the names endpoint
    this.http.get<string[]>(`${apiPath}/debug/names`).subscribe({
      next: (names) => {
        if (names && names.length > 0) {
          alert(`Found ${names.length} client names: ${names.join(', ')}`);
        } else {
          alert('No client names found.');
        }
      },
      error: (error) => {
        console.error('Names endpoint error:', error);
        alert('Names endpoint error.');
      }
    });
  }

  /**
   * Loads all Feign clients.
   */
  loadFeignClients(): void {
    this.loading = true;
    this.error = null;

    // Initialize feignClients as an empty array to prevent "not iterable" errors
    this.feignClients = [];
    this.filteredClients = [];

    this.feignClientService.getFeignClients().subscribe({
      next: (clients) => {
        // Ensure clients is always an array
        if (Array.isArray(clients)) {
          this.feignClients = clients;
        } else {
          console.warn('Received non-array response for Feign clients:', clients);
          this.feignClients = [];
        }

        this.filteredClients = [...this.feignClients]; // Initialize filtered clients
        this.loading = false;

        // Load recently used clients from local storage
        this.loadRecentlyUsedClientsFromStorage();

        // If no client is selected and we have clients, select the first one
        if (!this.selectedClient && this.feignClients.length > 0) {
          this.selectClient(this.feignClients[0]);
        }
      },
      error: (error) => {
        console.error('Error loading Feign clients:', error);
        this.error = 'Failed to load Feign clients. Please check the server connection.';
        this.loading = false;

        // Ensure feignClients is an array even on error
        this.feignClients = [];
        this.filteredClients = [];
      }
    });
  }

  /**
   * Filter clients based on search query
   */
  filterClients(): void {
    // Ensure feignClients is an array
    if (!Array.isArray(this.feignClients)) {
      console.warn('feignClients is not an array:', this.feignClients);
      this.feignClients = [];
    }

    if (!this.searchQuery) {
      this.filteredClients = [...this.feignClients];
      return;
    }

    const query = this.searchQuery.toLowerCase();
    this.filteredClients = this.feignClients.filter(client => {
      return (
        client.name.toLowerCase().includes(query) ||
        (client.path && client.path.toLowerCase().includes(query)) ||
        (client.url && client.url.toLowerCase().includes(query)) ||
        (client.className && client.className.toLowerCase().includes(query))
      );
    });
  }

  /**
   * Clear search query
   */
  clearSearch(): void {
    this.searchQuery = '';
    this.filterClients();
  }

  /**
   * Selects a Feign client by name.
   *
   * @param name the name of the Feign client
   */
  selectClientByName(name: string): void {
    // Ensure feignClients is an array
    if (!Array.isArray(this.feignClients)) {
      this.feignClients = [];
    }

    // First check if the client is already loaded
    const client = this.feignClients.find(c => c.name === name);
    if (client) {
      this.selectClient(client);
      return;
    }

    // If not, try to load it
    this.feignClientService.getFeignClient(name).subscribe({
      next: (client) => {
        if (client) {
          this.selectClient(client);
        }
      },
      error: (error) => {
        console.error('Error loading Feign client:', error);
        this.error = `Failed to load Feign client "${name}". Please check the server connection.`;
      }
    });
  }

  /**
   * Selects a Feign client.
   *
   * @param client the Feign client to select
   */
  selectClient(client: FeignClient): void {
    // Reset try-it-out state for previous client if any
    if (this.selectedClient && this.selectedClient.methods) {
      this.selectedClient.methods.forEach(method => {
        method.showTryItOut = false;
      });
    }

    this.selectedClient = client;
    this.selectedMethod = null;
    this.responseData = null;
    this.paramValues = {};

    // Update the URL using className for uniqueness
    this.router.navigate(['/feign-clients', client.className || client.name]);

    // Expand all methods by default
    if (client.methods) {
      client.methods.forEach(method => {
        method.isExpanded = false;
        method.showTryItOut = false;
      });
    }

    // Add to recently used clients
    this.updateRecentlyUsedClients(client);
  }

  /**
   * Updates the recently used clients list.
   *
   * @param client The client to add to the recently used list
   */
  private updateRecentlyUsedClients(client: FeignClient): void {
    // Remove the client if it already exists in the list
    this.recentlyUsedClients = this.recentlyUsedClients.filter(c => c.name !== client.name);

    // Add the client to the beginning of the list
    this.recentlyUsedClients.unshift(client);

    // Keep only the most recent 3 clients
    if (this.recentlyUsedClients.length > 3) {
      this.recentlyUsedClients = this.recentlyUsedClients.slice(0, 3);
    }

    // Save to local storage for persistence
    this.saveRecentlyUsedClientsToStorage();
  }

  /**
   * Saves the recently used clients to local storage.
   */
  private saveRecentlyUsedClientsToStorage(): void {
    try {
      // Only store the client names to avoid storing too much data
      const clientNames = this.recentlyUsedClients.map(client => client.name);
      localStorage.setItem('recentlyUsedFeignClients', JSON.stringify(clientNames));
    } catch (error) {
      console.error('Failed to save recently used clients to local storage:', error);
    }
  }

  /**
   * Loads the recently used clients from local storage.
   */
  private loadRecentlyUsedClientsFromStorage(): void {
    try {
      // Ensure feignClients is an array
      if (!Array.isArray(this.feignClients)) {
        this.feignClients = [];
        return;
      }

      const storedClients = localStorage.getItem('recentlyUsedFeignClients');
      if (storedClients) {
        const clientNames = JSON.parse(storedClients) as string[];
        // Find the clients in the loaded clients list
        this.recentlyUsedClients = clientNames
          .map(name => this.feignClients.find(client => client.name === name))
          .filter((client): client is FeignClient => client !== undefined);
      }
    } catch (error) {
      console.error('Failed to load recently used clients from local storage:', error);
      this.recentlyUsedClients = [];
    }
  }

  /**
   * Selects a Feign client method.
   *
   * @param method the method to select
   */
  selectMethod(method: FeignMethod): void {
    // Check if the method has any expandable content
    const hasContent = this.hasExpandableContent(method);

    // If the method has no expandable content, just select it without toggling expansion
    if (!hasContent) {
      // Collapse previously selected method if any
      if (this.selectedMethod && this.selectedMethod !== method) {
        this.selectedMethod.isExpanded = false;

        // Also hide try-it-out if it was showing
        if (this.selectedMethod.showTryItOut) {
          this.selectedMethod.showTryItOut = false;
        }
      }

      // Select the method
      this.selectedMethod = method;
      this.responseData = null;
      this.paramValues = {};

      // Initialize parameter values (though there shouldn't be any for methods without content)
      if (method.parameters) {
        method.parameters.forEach(param => {
          this.paramValues[param.name] = param.defaultValue || '';
        });
      }

      return;
    }

    // For methods with expandable content, proceed with normal accordion behavior
    // Initialize isExpanded property if it doesn't exist
    if (method.isExpanded === undefined) {
      method.isExpanded = false;
    }

    // Toggle the method expansion
    method.isExpanded = !method.isExpanded;

    // If expanding, select the method
    if (method.isExpanded) {
      // Collapse previously selected method if any and it's not the current method
      if (this.selectedMethod && this.selectedMethod !== method) {
        this.selectedMethod.isExpanded = false;

        // Also hide try-it-out if it was showing
        if (this.selectedMethod.showTryItOut) {
          this.selectedMethod.showTryItOut = false;
        }
      }

      this.selectedMethod = method;
      this.responseData = null;
      this.paramValues = {};

      // Initialize parameter values
      if (method.parameters) {
        method.parameters.forEach(param => {
          this.paramValues[param.name] = param.defaultValue || '';
        });
      }
    } else if (this.selectedMethod === method) {
      // If collapsing the selected method, deselect it
      this.selectedMethod = null;
    }
  }

  /**
   * Toggles the try-it-out section for a method.
   *
   * @param method the method to toggle try-it-out for
   * @param event the click event
   */
  toggleTryItOut(method: FeignMethod, event: Event): void {
    event.stopPropagation();

    // Check if try-it-out is enabled in the configuration
    const config = this.configService.getConfig();
    if (config.feignClient?.tryItOutEnabled === false) {
      console.warn('Try-it-out is disabled in the configuration');
      return;
    }

    // Initialize the showTryItOut property if it doesn't exist
    if (method.showTryItOut === undefined) {
      method.showTryItOut = false;
    }

    // If another method has try-it-out open, close it first
    if (this.selectedClient && this.selectedClient.methods) {
      this.selectedClient.methods.forEach(m => {
        if (m !== method && m.showTryItOut) {
          m.showTryItOut = false;
        }
      });
    }

    // Toggle the showTryItOut property
    method.showTryItOut = !method.showTryItOut;

    if (method.showTryItOut) {
      // Make sure the method is selected and expanded
      this.selectedMethod = method;
      method.isExpanded = true;

      // Reset response data when opening Try It Out
      this.responseData = null;
      this.responseStatus = 0;
      this.responseStatusText = '';
      this.responseTime = 0;

      // Initialize parameter values
      this.paramValues = {};
      if (method.parameters) {
        method.parameters.forEach(param => {
          this.paramValues[param.name] = param.defaultValue || '';
        });
      }

      // Reset request body
      this.requestBody = '';

      // Reset right pane tab
      this.rightPaneActiveTab = 'try-it-out';

      // Method is now ready for execution
    } else {
      // Try It Out has been closed
    }
  }

  /**
   * Executes a Feign client method.
   *
   * @param client the Feign client
   * @param method the method to execute
   */
  executeMethod(client: FeignClient, method: FeignMethod): void {
    if (!client || !method) return;

    // Check if try-it-out is enabled in the configuration
    const config = this.configService.getConfig();
    if (config.feignClient?.tryItOutEnabled === false) {
      console.warn('Try-it-out is disabled in the configuration');
      return;
    }

    this.isExecuting = true;
    this.responseData = null;
    this.responseTime = 0;
    this.responseStatus = 0;
    this.responseStatusText = '';
    this.responseContentType = '';
    this.responseHeaders = [];

    const startTime = new Date().getTime();

    // Prepare parameters
    const parameters: Record<string, any> = {};

    // Add path and query parameters
    if (method.parameters) {
      method.parameters.forEach(param => {
        if (param.annotationType !== 'RequestBody' &&
            this.paramValues[param.name] !== undefined &&
            this.paramValues[param.name] !== '') {
          parameters[param.name] = this.paramValues[param.name];
        }
      });
    }



    this.feignClientService.executeMethod(
      client.name,
      method.name,
      parameters,
      this.requestBody
    ).subscribe({
      next: (response) => {
        const endTime = new Date().getTime();
        this.responseTime = endTime - startTime;
        // this.responseData = response;



        this.responseStatus = 200;
        this.responseStatusText = 'OK';
        this.responseContentType = 'application/json';
        this.responseData = response.body;

        // Extract headers (if available)
        this.responseHeaders = [];
        // this.responseHeaders = [
        //   { name: 'Content-Type', value: 'application/json' },
        //   { name: 'Request-Time', value: `${this.responseTime} ms` }
        // ];
        // convert the key of the response.headers as name and value array as value joined by comma
        if (response.headers) {
          Object.keys(response.headers).forEach(key => {
            this.responseHeaders.push({ name: key, value: response.headers[key].join(', ') });
          });
        }

        // Format the response body
        this.formatResponseBody(this.responseData);

        // Switch to the response tab
        this.setRightPaneTab('response');
      },
      error: (error) => {
        console.error('Error executing method:', error);
        const endTime = new Date().getTime();
        this.responseTime = endTime - startTime;

        // Type guard for error object
        const err = error as { status?: number; statusText?: string; error?: any; headers?: any };
        this.responseStatus = err.status || 500;
        this.responseStatusText = err.statusText || 'Internal Server Error';

        // Get the raw error response
        if (err.error) {
          // If the error is a string, use it directly
          if (typeof err.error === 'string') {
            try {
              // Try to parse it as JSON
              this.responseData = JSON.parse(err.error);
            } catch (e) {
              // If it's not valid JSON, use it as a string
              this.responseData = err.error;
            }
          } else {
            // If it's already an object, use it directly
            this.responseData = err.error;
          }
        } else {
          // Fallback error message
          this.responseData = { error: 'Failed to execute method' };
        }

        this.responseContentType = 'application/json';

        // Extract headers from error response if available
        this.responseHeaders = [];
        if (err.headers) {
          // Extract headers from the error response
          // This would depend on the actual structure of your error object
        } else {
          // Add some default headers for the error case
          this.responseHeaders = [
            { name: 'Content-Type', value: 'application/json' },
            { name: 'Status', value: `${this.responseStatus} ${this.responseStatusText}` }
          ];
        }

        // Format the error response body
        this.formatResponseBody(this.responseData);

        this.isExecuting = false;

        // Switch to the response tab
        this.setRightPaneTab('response');
      },
      complete: () => {
        this.isExecuting = false;
      }
    });
  }

  /**
   * Set the active tab in the right pane
   */
  setRightPaneTab(tab: 'try-it-out' | 'response'): void {
    // If trying to select response but no response data is available, stay on try-it-out
    if (tab === 'response' && !this.responseData) {
      return;
    }

    this.rightPaneActiveTab = tab;
  }

  /**
   * Cancels the execution of a method.
   */
  cancelExecution(): void {
    this.isExecuting = false;
  }

  /**
   * Formats the response body for display.
   *
   * @param data The response data to format
   */
  formatResponseBody(data: any): void {
    try {
      if (data === null || data === undefined) {
        this.formattedResponseBody = 'No response body';
        return;
      }

      if (typeof data === 'string') {
        // Try to parse as JSON if it's a string that looks like JSON
        if (data.trim().startsWith('{') || data.trim().startsWith('[')) {
          try {
            const jsonData = JSON.parse(data);
            this.formattedResponseBody = JSON.stringify(jsonData, null, 2);
            return;
          } catch (e) {
            // Not valid JSON, just display as string
          }
        }
        this.formattedResponseBody = data;
      } else {
        // Format objects and arrays as pretty JSON
        this.formattedResponseBody = JSON.stringify(data, null, 2);
      }
    } catch (e) {
      console.error('Error formatting response body:', e);
      this.formattedResponseBody = String(data);
    }

    // Update the viewer element if it exists
    setTimeout(() => {
      if (this.responseViewer) {
        const viewerElement = this.responseViewer.nativeElement;
        if (viewerElement) {
          viewerElement.innerHTML = '';
          viewerElement.appendChild(document.createTextNode(this.formattedResponseBody));
        }
      }
    }, 0);
  }

  /**
   * Gets the parameter type display name.
   *
   * @param parameter the parameter
   */
  getParameterTypeDisplay(parameter: FeignParameter): string {
    // Extract the simple name from the fully qualified name
    const parts = parameter.type.split('.');
    return parts[parts.length - 1];
  }

  /**
   * Gets the return type display name.
   *
   * @param method the method
   */
  getReturnTypeDisplay(method: FeignMethod): string {
    // Extract the simple name from the fully qualified name
    const parts = method.returnType.split('.');
    return parts[parts.length - 1];
  }

  /**
   * Gets the method color based on the HTTP method.
   *
   * @param httpMethod the HTTP method
   */
  getMethodColor(httpMethod: string): string {
    switch (httpMethod.toUpperCase()) {
      case 'GET':
        return 'text-blue-500';
      case 'POST':
        return 'text-green-500';
      case 'PUT':
        return 'text-orange-500';
      case 'DELETE':
        return 'text-red-500';
      case 'PATCH':
        return 'text-purple-500';
      default:
        return 'text-gray-500';
    }
  }

  /**
   * Gets the method background color based on the HTTP method.
   *
   * @param httpMethod the HTTP method
   */
  getMethodBgColor(httpMethod: string): string {
    switch (httpMethod.toUpperCase()) {
      case 'GET':
        return 'bg-blue-100 dark:bg-blue-900';
      case 'POST':
        return 'bg-green-100 dark:bg-green-900';
      case 'PUT':
        return 'bg-orange-100 dark:bg-orange-900';
      case 'DELETE':
        return 'bg-red-100 dark:bg-red-900';
      case 'PATCH':
        return 'bg-purple-100 dark:bg-purple-900';
      default:
        return 'bg-gray-100 dark:bg-gray-900';
    }
  }

  /**
   * Checks if a method has any expandable content (parameters, headers, produces, consumes).
   *
   * @param method the method to check
   * @returns true if the method has expandable content, false otherwise
   */
  hasExpandableContent(method: FeignMethod): boolean {
    return (
      (method.parameters && method.parameters.length > 0) ||
      (method.headers && method.headers.length > 0) ||
      (method.produces && method.produces.length > 0) ||
      (method.consumes && method.consumes.length > 0)
    );
  }

  /**
   * Copies the response data to the clipboard.
   */
  copyResponseToClipboard(): void {
    if (!this.formattedResponseBody) {
      return;
    }

    try {
      navigator.clipboard.writeText(this.formattedResponseBody).then(
        () => {
          // Show a temporary success message
          const copyButton = document.querySelector('.copy-button');
          if (copyButton) {
            const originalText = copyButton.innerHTML;
            copyButton.innerHTML = '<span>Copied!</span>';
            setTimeout(() => {
              copyButton.innerHTML = originalText;
            }, 2000);
          }
        },
        (err) => {
          console.error('Could not copy text: ', err);
        }
      );
    } catch (err) {
      console.error('Clipboard API not available:', err);

      // Fallback method using a temporary textarea
      const textarea = document.createElement('textarea');
      textarea.value = this.formattedResponseBody;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();

      try {
        const successful = document.execCommand('copy');
        if (successful) {
          // Show success message
          const copyButton = document.querySelector('.copy-button');
          if (copyButton) {
            const originalText = copyButton.innerHTML;
            copyButton.innerHTML = '<span>Copied!</span>';
            setTimeout(() => {
              copyButton.innerHTML = originalText;
            }, 2000);
          }
        } else {
          console.error('Failed to copy text');
        }
      } catch (err) {
        console.error('Failed to copy text:', err);
      }

      document.body.removeChild(textarea);
    }
  }
}
