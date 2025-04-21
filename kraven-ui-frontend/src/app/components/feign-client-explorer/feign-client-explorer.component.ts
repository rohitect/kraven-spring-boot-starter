import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { FeignClientService } from '../../services/feign-client.service';
import { ConfigService } from '../../services/config.service';
import { ThemeService } from '../../services/theme.service';
import { trigger, transition, style, animate, state } from '@angular/animations';
import { HeaderComponent } from '../shared/header/header.component';
import { FeignClient, FeignMethod, FeignParameter } from '../../models/feign-client.model';
import { AccordionModule } from 'primeng/accordion';
@Component({
  selector: 'app-feign-client-explorer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AccordionModule,
    HeaderComponent
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
  loading = true;
  error: string | null = null;
  title = 'Feign Client Explorer';
  isDarkTheme = true;
  searchQuery: string = '';

  selectedClient: FeignClient | null = null;
  selectedMethod: FeignMethod | null = null;

  // Response data
  responseData: any = null;
  responseTime: number = 0;
  responseStatus: number = 0;
  responseStatusText: string = '';
  responseContentType: string = '';
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
  }

  /**
   * Toggles the theme between light and dark.
   */
  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  /**
   * Debug Feign clients by checking various endpoints.
   */
  debugFeignClients(): void {
    const config = this.configService.getConfig();
    const apiPath = config.feignClient?.apiPath || '/kraven/v1/feign-clients';

    console.log('Debug: Checking Feign client endpoints');
    console.log('Debug: API Path:', apiPath);

    // Check the debug endpoint
    this.http.get(`${apiPath}/debug`).subscribe(
      response => {
        console.log('Debug endpoint response:', response);
        alert('Debug endpoint is working. Check console for details.');
      },
      error => {
        console.error('Debug endpoint error:', error);
        alert('Debug endpoint error. Check console for details.');
      }
    );

    // Check the names endpoint
    this.http.get<string[]>(`${apiPath}/debug/names`).subscribe(
      names => {
        console.log('Client names:', names);
        if (names && names.length > 0) {
          alert(`Found ${names.length} client names: ${names.join(', ')}`);
        } else {
          alert('No client names found.');
        }
      },
      error => {
        console.error('Names endpoint error:', error);
        alert('Names endpoint error. Check console for details.');
      }
    );
  }

  /**
   * Loads all Feign clients.
   */
  loadFeignClients(): void {
    this.loading = true;
    this.error = null;

    this.feignClientService.getFeignClients().subscribe({
      next: (clients) => {
        this.feignClients = clients || [];
        this.filteredClients = [...this.feignClients]; // Initialize filtered clients
        this.loading = false;

        // If no client is selected and we have clients, select the first one
        if (!this.selectedClient && this.feignClients.length > 0) {
          this.selectClient(this.feignClients[0]);
        }
      },
      error: (error) => {
        console.error('Error loading Feign clients:', error);
        this.error = 'Failed to load Feign clients. Please check the server connection.';
        this.loading = false;
      }
    });
  }

  /**
   * Filter clients based on search query
   */
  filterClients(): void {
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
   * Copy response data to clipboard
   */
  copyResponseToClipboard(): void {
    if (this.responseData) {
      const text = JSON.stringify(this.responseData, null, 2);
      navigator.clipboard.writeText(text).then(
        () => {
          alert('Response copied to clipboard');
        },
        (err) => {
          console.error('Could not copy text: ', err);
          alert('Failed to copy response to clipboard');
        }
      );
    }
  }

  /**
   * Selects a Feign client by name.
   *
   * @param name the name of the Feign client
   */
  selectClientByName(name: string): void {
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

    // Update the URL
    this.router.navigate(['/feign-clients', client.name]);

    // Expand all methods by default
    if (client.methods) {
      client.methods.forEach(method => {
        method.isExpanded = false;
        method.showTryItOut = false;
      });
    }
  }

  /**
   * Selects a Feign client method.
   *
   * @param method the method to select
   */
  selectMethod(method: FeignMethod): void {
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

      console.log('Try It Out opened for method:', method.name);
    } else {
      console.log('Try It Out closed for method:', method.name);
    }
  }

  /**
   * Executes a Feign client method.
   *
   * @param client the Feign client
   * @param method the method to execute
   */
  executeMethod(client: FeignClient, method: FeignMethod): void {
    this.isExecuting = true;
    this.responseData = null;
    this.responseTime = 0;
    this.responseStatus = 0;
    this.responseStatusText = '';
    this.responseContentType = '';

    const startTime = new Date().getTime();

    this.feignClientService.executeMethod(
      client.name,
      method.name,
      this.paramValues
    ).subscribe({
      next: (response) => {
        const endTime = new Date().getTime();
        this.responseTime = endTime - startTime;
        this.responseData = response;
        this.responseStatus = 200;
        this.responseStatusText = 'OK';
        this.responseContentType = 'application/json';

        // Refresh the JSON viewer
        setTimeout(() => {
          if (this.responseViewer) {
            const viewerElement = this.responseViewer.nativeElement;
            if (viewerElement) {
              viewerElement.innerHTML = '';
              viewerElement.appendChild(document.createTextNode(JSON.stringify(this.responseData, null, 2)));
            }
          }
        }, 0);

        // Switch to the response tab
        this.setRightPaneTab('response');
      },
      error: (error) => {
        console.error('Error executing method:', error);
        const endTime = new Date().getTime();
        this.responseTime = endTime - startTime;

        // Type guard for error object
        const err = error as { status?: number; statusText?: string; error?: any };
        this.responseStatus = err.status || 500;
        this.responseStatusText = err.statusText || 'Internal Server Error';
        this.responseData = err.error || { error: 'Failed to execute method' };
        this.responseContentType = 'application/json';
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
}
