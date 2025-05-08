import { Component, OnInit, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiDocsService } from '../../services/api-docs.service';
import { ConfigService } from '../../services/config.service';
import { ThemeService } from '../../services/theme.service';
import { trigger, transition, style, animate, state } from '@angular/animations';
import { AndypfJsonViewerComponent } from '../andypf-json-viewer/andypf-json-viewer.component';
import { TryItOutComponent } from '../try-it-out-new/try-it-out.component';
import { GlobalAuthenticationComponent } from '../global-authentication/global-authentication.component';
import { MarkdownPipe } from '../../pipes/markdown.pipe';
import { HighlightSearchPipe } from '../../pipes/highlight-search.pipe';
import { ApiHistoryListComponent } from '../api-history-list/api-history-list.component';
import { ApiHistoryDetailComponent } from '../api-history-detail/api-history-detail.component';
import { ApiHistoryService } from '../../services/api-history.service';
import { ApiHistoryEntry } from '../../models/api-history.model';
import { MetricsService } from '../../services/metrics.service';
import { ApiTabService } from '../../services/api-tab.service';
import { ApiTab } from '../../models/api-tab.model';
import { ApiTabBarComponent } from '../api-tab-bar/api-tab-bar.component';
import { TabLimitPopupComponent } from '../tab-limit-popup/tab-limit-popup.component';
import { ApiFavoritesService } from '../../services/api-favorites.service';
import { ApiFavoritesListComponent } from '../api-favorites-list/api-favorites-list.component';
import { FavoriteButtonComponent } from '../favorite-button/favorite-button.component';

@Component({
  selector: 'app-api-docs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TryItOutComponent,
    GlobalAuthenticationComponent,
    MarkdownPipe,
    HighlightSearchPipe,
    AndypfJsonViewerComponent,
    ApiHistoryListComponent,
    ApiHistoryDetailComponent,
    ApiTabBarComponent,
    TabLimitPopupComponent,
    ApiFavoritesListComponent,
    FavoriteButtonComponent
  ],
  templateUrl: './api-docs.component.html',
  styleUrls: ['./api-docs.component.scss'],
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
    ])
  ]
})
export class ApiDocsComponent implements OnInit {
  apiDocs: any = null;
  loading = true;
  error: string | null = null;
  title = 'API Documentation';

  // Store paths and methods
  paths: Array<{
    path: string,
    pathItem: any,
    methods: Array<{
      type: string,
      operation: any,
      isExpanded: boolean,
      autoExpand: boolean,
      showDropdown?: boolean
    }>,
    isExpanded: boolean,
    showDropdown?: boolean,
    showExportDropdown?: boolean
  }> = [];

  // Three-pane layout properties
  tags: Array<{
    name: string,
    description?: string,
    isExpanded: boolean,
    endpoints: Array<{
      path: string,
      method: any
    }>
  }> = [];

  selectedEndpoint: {
    path: string,
    method: any
  } | null = null;

  selectedResponseCode: string | null = null;
  isTryItOutVisible: boolean = false;
  searchQuery: string = '';
  filteredTags: any[] = [];

  // Response handling
  currentResponse: any = null;
  responseSamples: {[code: string]: any} = {};

  // Dropdown and popup states
  showCurlModal = false;
  showApiInfoModal = false;
  showAuthModal = false;
  isExportPostmanModalVisible = false;
  showingApiInfo = true; // Show API info by default
  curlCommand = '';
  curlCopied = false;
  showMainDropdown = false;
  showExportMainDropdown = false;
  selectedTagForExport: string | null = null;

  // Request body state
  selectedRequestBodyContentType = '';
  requestBodyExampleCopied = false;

  // Security schemes for global authentication
  securitySchemes: { [key: string]: any } = {};
  securitySchemesArray: Array<{name: string, scheme: any}> = [];

  // Theme state
  isDarkTheme = true;

  // Right pane state
  rightPaneActiveTab: 'try-it-out' | 'response-samples' = 'try-it-out'; // Default to try-it-out tab
  rightPaneCollapsed = false; // Default to expanded

  // Secondary tabs state for API Playground
  secondaryTabActiveTab: 'playground' | 'documentation' = 'documentation'; // Default to documentation tab

  // Left sidebar state
  leftSidebarActiveTab: 'endpoints' | 'history' | 'favorites' = 'endpoints'; // Default to endpoints tab

  // Documentation search state
  docSearchTags: Array<{text: string, color: string}> = [];
  docSearchResults: Array<{
    tagName: string,
    endpoint: any,
    score: number,
    matchedTags: number
  }> = [];
  docSearchLoading: boolean = false;
  searchExamples: string[] = ['user', 'create', 'update', 'delete', 'list', 'auth'];
  // Map to store tag colors to ensure consistency
  private tagColorMap: Map<string, string> = new Map();

  // API history state
  selectedHistoryEntry: ApiHistoryEntry | null = null;
  showHistoryDetailModal = false;
  applicationName: string = '';

  // API documentation configuration
  apiDocsConfig = {
    enabled: true,
    tryItOutEnabled: true,
    // Default values for removed properties
    showExamples: true, // Always show examples, not configurable
    expandOperations: false,
    showApiInfo: true,
    syntaxHighlighting: true,
    markdownEnabled: true
  };

  // Tab state
  tabs: ApiTab[] = [];
  activeTabId: string | null = null;
  showTabLimitPopup = false;

  // JSON viewer state
  jsonViewerExpanded = true;

  @ViewChild('jsonViewer') jsonViewer?: AndypfJsonViewerComponent;

  constructor(
    public apiDocsService: ApiDocsService,
    private configService: ConfigService,
    private themeService: ThemeService,
    private apiHistoryService: ApiHistoryService,
    private metricsService: MetricsService,
    private apiTabService: ApiTabService,
    private favoritesService: ApiFavoritesService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Application name will be set in ngOnInit after loading metrics
  }

  ngOnInit(): void {
    const config = this.configService.getConfig();
    this.title = config.title;

    // Load API documentation configuration from config service
    if (config.apiDocs) {
      // Only copy the properties that exist in the config interface
      this.apiDocsConfig.enabled = config.apiDocs.enabled;
      this.apiDocsConfig.tryItOutEnabled = config.apiDocs.tryItOutEnabled;

      // Keep showExamples always true (not configurable)
      // No need to modify it as it's already set to true in the component
    }

    // Get the current theme from the theme service
    this.isDarkTheme = this.themeService.getCurrentTheme() === 'dark';

    // Subscribe to theme changes
    this.themeService.theme$.subscribe(theme => {
      this.isDarkTheme = theme === 'dark';
    });

    // Check for query parameters (secondary tab, left sidebar tab, search tags, and search query)
    this.route.queryParams.subscribe(params => {
      // Check for secondary tab
      if (params['secondaryTab']) {
        const tabParam = params['secondaryTab'];
        // Only set if it's a valid tab value
        if (tabParam === 'playground' || tabParam === 'documentation') {
          this.secondaryTabActiveTab = tabParam as 'playground' | 'documentation';
        }
      }

      // Check for left sidebar tab
      if (params['leftSidebarTab']) {
        const sidebarTabParam = params['leftSidebarTab'];
        // Only set if it's a valid tab value
        if (sidebarTabParam === 'endpoints' || sidebarTabParam === 'history' || sidebarTabParam === 'favorites') {
          this.leftSidebarActiveTab = sidebarTabParam as 'endpoints' | 'history' | 'favorites';
        }
      }

      // Check for search tags
      if (params['tags'] && this.secondaryTabActiveTab === 'documentation') {
        const tagsParam = params['tags'];
        // Split the tags by comma and create tag objects
        this.docSearchTags = tagsParam.split(',')
          .filter((tag: string) => tag.trim().length > 0)
          .map((tag: string) => {
            const tagText = tag.trim();
            return {
              text: tagText,
              color: '' // Empty string as we're using CSS for color
            };
          });
      }

      // We'll trigger the search after API docs are loaded if we have tags or search query
    });

    // Get the application name from the metrics service
    this.metricsService.getAppMetrics().subscribe({
      next: (appMetrics) => {
        // Use the application name from the metrics service
        this.applicationName = appMetrics.name || 'Application';
        console.log('Application name from metrics:', this.applicationName);

        // Set the application name in the API History Service
        this.apiHistoryService.setApplicationName(this.applicationName);

        // Set the application name in the API Tab Service
        this.apiTabService.setApplicationName(this.applicationName);

        // Set the application name in the API Favorites Service
        this.favoritesService.setApplicationName(this.applicationName);

        // Load tabs
        this.loadTabs();
      },
      error: (err) => {
        console.error('Error getting application name from metrics:', err);
        // Fallback to a default name
        this.applicationName = 'Application';

        // Set the default application name in the API History Service
        this.apiHistoryService.setApplicationName(this.applicationName);

        // Set the default application name in the API Tab Service
        this.apiTabService.setApplicationName(this.applicationName);

        // Set the default application name in the API Favorites Service
        this.favoritesService.setApplicationName(this.applicationName);

        // Load tabs
        this.loadTabs();
      }
    });

    // Load API docs and then handle URL parameters
    this.loadApiDocs().then(() => {
      this.handleUrlParameters();

      // Clean up favorites that no longer exist in the API endpoints
      this.cleanupFavorites();
    });
  }

  /**
   * Handle URL parameters to select the appropriate endpoint or show API info
   */
  private handleUrlParameters(): void {
    // Check if we have URL parameters
    this.route.paramMap.subscribe(params => {
      const tag = params.get('tag');
      const path = params.get('path');
      const method = params.get('method');
      const tabId = params.get('tab');

      // If we have a tab ID, try to select that tab
      if (tabId) {
        this.selectTabById(tabId);
      }
      // If we have all endpoint parameters, find and select the endpoint
      else if (tag && path && method) {
        this.selectEndpointFromUrl(tag, path, method);
      } else {
        // Check if we're on the info route
        this.route.url.subscribe(segments => {
          if (segments.length > 1 && segments[1].path === 'info') {
            // Show API info
            this.showApiInfo();
          }
        });
      }
    });
  }

  /**
   * Load tabs from the database
   */
  private loadTabs(): void {
    this.apiTabService.getAllTabs().subscribe({
      next: (tabs) => {
        this.tabs = tabs;

        // Get the active tab ID
        this.apiTabService.getActiveTabId().subscribe({
          next: (activeTabId) => {
            this.activeTabId = activeTabId;

            // If we have an active tab, select it
            if (activeTabId) {
              this.selectTabById(activeTabId);
            }
          }
        });
      },
      error: (err) => {
        console.error('Error loading tabs:', err);
      }
    });
  }

  /**
   * Select a tab by ID
   */
  selectTabById(id: string): void {
    // Find the tab
    const tab = this.tabs.find(t => t.id === id);
    if (!tab) return;

    // Set the active tab
    this.activeTabId = id;
    this.apiTabService.setActiveTab(id).subscribe();

    // Update the URL
    this.updateUrlWithTabId(id);

    // Set the selected endpoint from the tab
    if (tab.endpoint) {
      this.selectedEndpoint = tab.endpoint;
      this.showingApiInfo = false;

      // Set the response samples and selected response code
      if (tab.responseSamples) {
        this.responseSamples = tab.responseSamples;
      }

      if (tab.selectedResponseCode) {
        this.selectedResponseCode = tab.selectedResponseCode;
      }

      // Set the right pane active tab
      if (tab.rightPaneActiveTab) {
        this.rightPaneActiveTab = tab.rightPaneActiveTab;
      }
    }
  }

  /**
   * Update the URL to include the tab ID
   */
  private updateUrlWithTabId(tabId: string): void {
    // Navigate to the new URL without reloading the page
    this.router.navigate([`/api-docs/tab/${tabId}`], {
      replaceUrl: true, // Replace the current URL to avoid adding to browser history
      queryParamsHandling: 'preserve' // Preserve existing query parameters
    });
  }

  /**
   * Select an endpoint based on URL parameters
   */
  private selectEndpointFromUrl(tagName: string, pathUrl: string, methodType: string): void {
    // Find the tag
    const tag = this.tags.find(t => t.name === decodeURIComponent(tagName));
    if (!tag) return;

    // Find the endpoint in the tag
    const endpoint = tag.endpoints.find(e =>
      e.path === decodeURIComponent(pathUrl) &&
      e.method.type.toLowerCase() === decodeURIComponent(methodType).toLowerCase()
    );

    if (endpoint) {
      // Select the endpoint
      this.selectEndpoint(endpoint);

      // Expand the tag if it's not already expanded
      tag.isExpanded = true;
    }
  }

  /**
   * Toggle between light and dark theme
   */
  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  loadApiDocs(): Promise<void> {
    this.loading = true;
    this.error = null;
    this.paths = [];

    // Check if API documentation is enabled
    if (!this.apiDocsConfig.enabled) {
      this.loading = false;
      this.error = 'API documentation is disabled in the configuration.';
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.apiDocsService.getApiDocs().subscribe({
        next: (data) => {
          this.apiDocs = data;
          this.loading = false;

          // Process paths and methods
          this.processPaths();

          // Ensure API info is shown by default
          this.showingApiInfo = true;
          this.selectedEndpoint = null;

          // Check if we're using sample data but don't set an error
          // Just log it for debugging purposes
          if (this.apiDocsService.isUsingSampleData()) {
            console.log('Using sample API data for demonstration purposes.');
          }

          // Only trigger search if we have search tags (not just a query)
          if (this.docSearchTags.length > 0 && this.secondaryTabActiveTab === 'documentation') {
            this.searchDocumentation();
          }

          resolve();
        },
        error: (err) => {
          console.error('Error loading API docs:', err);
          this.error = 'Failed to load API documentation. Please check the server connection.';
          this.loading = false;
          resolve(); // Resolve even on error to continue execution
        }
      });
    });
  }

  /**
   * Toggle path expanded state
   */
  togglePathExpanded(path: any): void {
    path.isExpanded = !path.isExpanded;
  }

  /**
   * Toggle method expanded state
   */
  toggleMethodExpanded(method: any): void {
    method.isExpanded = !method.isExpanded;
    // Reset autoExpand when toggling manually
    method.autoExpand = false;

    // If expanding, enable try-it-out by default
    if (method.isExpanded) {
      method.autoExpand = true;
    }
  }

  /**
   * Toggle method accordion (expand/collapse)
   */
  toggleMethodAccordion(method: any): void {
    if (method.isExpanded) {
      // If already expanded, collapse it
      method.isExpanded = false;
      method.autoExpand = false;
    } else {
      // If collapsed, expand it and enable try-it-out
      method.isExpanded = true;
      method.autoExpand = true;
    }
  }

  /**
   * Start try-it-out directly from the header button
   */
  startTryItOut(method: any, _path: string): void {
    method.isExpanded = true;
    method.autoExpand = true;
  }

  /**
   * Close method accordion when cancel is clicked
   */
  closeMethodAccordion(method: any): void {
    method.isExpanded = false;
    method.autoExpand = false;
  }

  /**
   * Toggle dropdown menu
   */
  toggleDropdown(event: Event, item: any): void {
    event.stopPropagation();

    // Close main dropdown
    this.showMainDropdown = false;
    this.showExportMainDropdown = false;

    // Close all other dropdowns first
    this.paths.forEach(path => {
      // Close path dropdowns
      if (path !== item) {
        path.showDropdown = false;
        path.showExportDropdown = false;
      }

      // Close method dropdowns
      path.methods.forEach(method => {
        if (method !== item) {
          method.showDropdown = false;
        }
      });
    });

    // Toggle the dropdown
    item.showDropdown = !item.showDropdown;
  }

  /**
   * Handle document click to close dropdowns
   */
  @HostListener('document:click')
  onDocumentClick(): void {
    // Close all dropdowns
    this.showMainDropdown = false;
    this.showExportMainDropdown = false;

    this.paths.forEach(path => {
      path.showDropdown = false;
      path.showExportDropdown = false;

      path.methods.forEach(method => {
        method.showDropdown = false;
      });
    });
  }

  /**
   * Toggle main dropdown menu
   */
  toggleMainDropdown(event: Event): void {
    event.stopPropagation();

    // Close all other dropdowns first
    this.paths.forEach(path => {
      path.showDropdown = false;
      path.showExportDropdown = false;

      // Close method dropdowns
      path.methods.forEach(method => {
        method.showDropdown = false;
      });
    });

    // Toggle the main dropdown
    this.showMainDropdown = !this.showMainDropdown;

    // If we're closing the dropdown, also close the export dropdown
    if (!this.showMainDropdown) {
      this.showExportMainDropdown = false;
    }
  }

  /**
   * Toggle export dropdown
   */
  toggleExportDropdown(event: Event, path: any): void {
    event.stopPropagation();
    path.showExportDropdown = !path.showExportDropdown;
  }

  /**
   * Toggle main export dropdown
   */
  toggleExportMainDropdown(event: Event): void {
    event.stopPropagation();
    this.showExportMainDropdown = !this.showExportMainDropdown;
  }

  /**
   * Show curl popup
   */
  showCurlPopup(event: Event, pathUrl: string, method: any): void {
    event.stopPropagation();

    // Close all dropdowns
    this.paths.forEach(path => {
      path.showDropdown = false;
      path.showExportDropdown = false;

      // Close method dropdowns
      path.methods.forEach(m => {
        m.showDropdown = false;
      });
    });

    // Generate curl command
    this.curlCommand = this.generateCurlCommand(pathUrl, method.type, method.operation);
    this.showCurlModal = true;
    this.curlCopied = false;
  }

  /**
   * Close curl popup
   */
  closeCurlPopup(): void {
    this.showCurlModal = false;
  }

  /**
   * Toggle API info modal
   */
  toggleApiInfoModal(): void {
    this.showApiInfoModal = !this.showApiInfoModal;
    // Close other modals
    this.showAuthModal = false;
    this.showCurlModal = false;
  }

  /**
   * Close API info modal
   */
  closeApiInfoModal(): void {
    this.showApiInfoModal = false;
  }

  /**
   * Show API info in the center pane
   */
  showApiInfo(): void {
    this.showingApiInfo = true;
    this.selectedEndpoint = null;
    this.activeTabId = null;

    // Update the URL to reflect that we're showing API info
    this.router.navigate(['/api-docs/info'], {
      replaceUrl: true, // Replace the current URL to avoid adding to browser history
      queryParamsHandling: 'preserve' // Preserve existing query parameters
    });
  }

  /**
   * Handle tab selection from the tab bar
   */
  onTabSelected(tabId: string): void {
    this.selectTabById(tabId);
  }

  /**
   * Handle tab closing from the tab bar
   */
  onTabClosed(tabId: string): void {
    // Delete the tab
    this.apiTabService.deleteTab(tabId).subscribe({
      next: () => {
        // Remove the tab from the tabs array
        this.tabs = this.tabs.filter(t => t.id !== tabId);

        // If the closed tab was the active tab, select another tab or show API info
        if (this.activeTabId === tabId) {
          if (this.tabs.length > 0) {
            // Select the first tab
            this.selectTabById(this.tabs[0].id);
          } else {
            // Show API info
            this.showApiInfo();
          }
        }
      },
      error: (err) => {
        console.error('Error deleting tab:', err);
      }
    });
  }

  /**
   * Close the tab limit popup
   */
  closeTabLimitPopup(): void {
    this.showTabLimitPopup = false;
  }

  /**
   * Close all tabs
   */
  closeAllTabs(): void {
    this.apiTabService.clearAllTabs().subscribe({
      next: () => {
        this.tabs = [];
        this.activeTabId = null;
        this.showTabLimitPopup = false;
        this.showApiInfo();
      },
      error: (err) => {
        console.error('Error clearing tabs:', err);
      }
    });
  }

  /**
   * Handle tab reordering
   */
  onTabReordered(event: {tabId: string, newIndex: number}): void {
    this.apiTabService.reorderTabs(event.tabId, event.newIndex).subscribe({
      next: (updatedTabs) => {
        // Update the tabs array with the new order
        this.tabs = updatedTabs;
      },
      error: (err) => {
        console.error('Error reordering tabs:', err);
      }
    });
  }

  /**
   * Toggle authentication modal
   */
  toggleAuthModal(): void {
    this.showAuthModal = !this.showAuthModal;
    // Close other modals
    this.showApiInfoModal = false;
    this.showCurlModal = false;
  }

  /**
   * Close authentication modal
   */
  closeAuthModal(): void {
    this.showAuthModal = false;
  }

  /**
   * Set the active tab in the right pane
   */
  setRightPaneTab(tab: 'try-it-out' | 'response-samples'): void {
    // If trying to select response-samples but no response code is selected, stay on try-it-out
    if (tab === 'response-samples' && !this.selectedResponseCode) {
      return;
    }

    this.rightPaneActiveTab = tab;

    // Update the tab state if we have an active tab
    if (this.activeTabId) {
      this.apiTabService.updateTabRightPaneActiveTab(
        this.activeTabId,
        this.rightPaneActiveTab
      ).subscribe();
    }
  }

  /**
   * Clean up favorites that no longer exist in the API endpoints
   */
  cleanupFavorites(): void {
    if (!this.apiDocs || !this.apiDocs.paths) {
      return;
    }

    // Collect all endpoints from the API docs
    const allEndpoints: any[] = [];

    // Process all paths and methods to collect endpoints
    Object.entries(this.apiDocs.paths).forEach(([path, pathItem]: [string, any]) => {
      const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

      methods.forEach(method => {
        if (pathItem[method]) {
          allEndpoints.push({
            path,
            method: {
              type: method.toUpperCase(),
              operation: pathItem[method]
            }
          });
        }
      });
    });

    // Clean up favorites that no longer exist
    this.favoritesService.cleanupFavorites(allEndpoints).subscribe({
      next: () => {
        console.log('Favorites cleanup completed');
      },
      error: (err) => {
        console.error('Error cleaning up favorites:', err);
      }
    });
  }

  /**
   * Copy curl command to clipboard
   */
  copyCurlCommand(): void {
    if (navigator.clipboard && this.curlCommand) {
      navigator.clipboard.writeText(this.curlCommand)
        .then(() => {
          this.curlCopied = true;
          setTimeout(() => {
            this.curlCopied = false;
          }, 2000);
        })
        .catch(err => {
          console.error('Failed to copy curl command:', err);
        });
    }
  }

  /**
   * Show export Postman modal
   */
  showExportPostmanModal(): void {
    this.isExportPostmanModalVisible = true;
    this.selectedTagForExport = null;
  }

  /**
   * Close export Postman modal
   */
  closeExportPostmanModal(): void {
    this.isExportPostmanModalVisible = false;
    this.selectedTagForExport = null;
  }

  /**
   * Export a specific tag as Postman collection
   */
  exportTagAsPostman(tagName: string): void {
    // Close modal
    this.isExportPostmanModalVisible = false;

    // Generate Postman collection for the specific tag
    const postmanCollection = this.generatePostmanCollectionForTag(tagName);

    // Create a blob and download it
    const blob = new Blob([JSON.stringify(postmanCollection, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tagName}-postman-collection.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Export as Postman collection (full API)
   */
  exportAsPostman(): void {
    // Close all dropdowns
    this.showMainDropdown = false;
    this.showExportMainDropdown = false;

    // Generate Postman collection
    const postmanCollection = this.generatePostmanCollection();

    // Create a blob and download it
    const blob = new Blob([JSON.stringify(postmanCollection, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.apiDocs.info?.title || 'api'}-postman-collection.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Generate a Postman collection for a specific tag
   */
  private generatePostmanCollectionForTag(tagName: string): any {
    const collection: any = {
      info: {
        name: `${tagName} API Collection`,
        description: `Endpoints for ${tagName}`,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: []
    };

    // Get the server URL from the OpenAPI spec
    const serverUrl = this.apiDocs.servers && this.apiDocs.servers.length > 0
      ? this.apiDocs.servers[0].url
      : window.location.origin;

    // Find the tag
    const tag = this.tags.find(t => t.name === tagName);
    if (!tag) {
      return collection;
    }

    // Add endpoints from this tag
    tag.endpoints.forEach(endpoint => {
      const item: any = {
        name: `${endpoint.method.type} ${endpoint.method.operation.summary || endpoint.path}`,
        request: {
          method: endpoint.method.type,
          header: [
            {
              key: 'Content-Type',
              value: 'application/json'
            }
          ],
          url: {
            raw: `${serverUrl}${endpoint.path}`,
            host: [serverUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')],
            path: endpoint.path.split('/').filter(p => p)
          },
          description: endpoint.method.operation.description || ''
        },
        response: []
      };

      // Add request body if needed
      if (endpoint.method.type !== 'GET' && endpoint.method.type !== 'DELETE' && endpoint.method.operation.requestBody) {
        if (endpoint.method.operation.requestBody.content && endpoint.method.operation.requestBody.content['application/json']) {
          const schema = endpoint.method.operation.requestBody.content['application/json'].schema;
          if (schema) {
            item.request.body = {
              mode: 'raw',
              raw: this.generateSampleFromSchema(schema),
              options: {
                raw: {
                  language: 'json'
                }
              }
            };
          }
        }
      }

      // Add parameters if any
      if (endpoint.method.operation.parameters && endpoint.method.operation.parameters.length > 0) {
        item.request.url.query = endpoint.method.operation.parameters
          .filter((param: any) => param.in === 'query')
          .map((param: any) => ({
            key: param.name,
            value: this.getParameterExample(param),
            description: param.description || '',
            disabled: !param.required
          }));

        // Add path parameters to the URL
        endpoint.method.operation.parameters
          .filter((param: any) => param.in === 'path')
          .forEach((param: any) => {
            item.request.url.raw = item.request.url.raw.replace(`{${param.name}}`, `:${param.name}`);
            item.request.url.path = item.request.url.path.map((p: string) =>
              p.includes(`{${param.name}}`) ? p.replace(`{${param.name}}`, `:${param.name}`) : p
            );
          });
      }

      collection.item.push(item);
    });

    return collection;
  }

  /**
   * Get example value for a parameter
   */
  private getParameterExample(param: any): string {
    if (param.example !== undefined) {
      return param.example.toString();
    }

    if (param.schema) {
      if (param.schema.example !== undefined) {
        return param.schema.example.toString();
      }

      if (param.schema.type === 'string') {
        return param.schema.enum && param.schema.enum.length > 0 ? param.schema.enum[0] : 'string';
      } else if (param.schema.type === 'number' || param.schema.type === 'integer') {
        return param.schema.enum && param.schema.enum.length > 0 ? param.schema.enum[0].toString() : '0';
      } else if (param.schema.type === 'boolean') {
        return 'false';
      }
    }

    return '';
  }

  /**
   * Generate a Postman collection from the OpenAPI spec
   */
  private generatePostmanCollection(): any {
    const collection: any = {
      info: {
        name: this.apiDocs.info?.title || 'API Collection',
        description: this.apiDocs.info?.description || '',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: []
    };

    // Get the server URL from the OpenAPI spec
    const serverUrl = this.apiDocs.servers && this.apiDocs.servers.length > 0
      ? this.apiDocs.servers[0].url
      : window.location.origin;

    // Group items by path
    this.paths.forEach(path => {
      const folderItem: any = {
        name: path.path,
        item: []
      };

      // Add each method as an item
      path.methods.forEach(method => {
        const item: any = {
          name: `${method.type} ${method.operation.summary || path.path}`,
          request: {
            method: method.type,
            header: [
              {
                key: 'Content-Type',
                value: 'application/json'
              }
            ],
            url: {
              raw: `${serverUrl}${path.path}`,
              host: [serverUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')],
              path: path.path.split('/').filter(p => p)
            },
            description: method.operation.description || ''
          },
          response: []
        };

        // Add request body if needed
        if (method.type !== 'GET' && method.type !== 'DELETE' && method.operation.requestBody) {
          if (method.operation.requestBody.content && method.operation.requestBody.content['application/json']) {
            const schema = method.operation.requestBody.content['application/json'].schema;
            if (schema) {
              item.request.body = {
                mode: 'raw',
                raw: this.generateSampleFromSchema(schema),
                options: {
                  raw: {
                    language: 'json'
                  }
                }
              };
            }
          }
        }

        // Add parameters if any
        if (method.operation.parameters && method.operation.parameters.length > 0) {
          const queryParams = method.operation.parameters.filter((p: any) => p.in === 'query');
          const pathParams = method.operation.parameters.filter((p: any) => p.in === 'path');

          if (queryParams.length > 0) {
            item.request.url.query = queryParams.map((p: any) => ({
              key: p.name,
              value: '',
              description: p.description || '',
              disabled: !p.required
            }));
          }

          if (pathParams.length > 0) {
            // Replace path parameters in the URL
            pathParams.forEach((p: any) => {
              const placeholder = `:${p.name}`;
              item.request.url.raw = item.request.url.raw.replace(`{${p.name}}`, placeholder);
              item.request.url.path = item.request.url.path.map((segment: string) =>
                segment.includes(`{${p.name}}`) ? segment.replace(`{${p.name}}`, placeholder) : segment
              );
            });
          }
        }

        folderItem.item.push(item);
      });

      collection.item.push(folderItem);
    });

    return collection;
  }

  /**
   * Generate a curl command for the given path and method
   */
  private generateCurlCommand(pathUrl: string, methodType: string, operation: any): string {
    // Get the server URL from the OpenAPI spec
    const serverUrl = this.apiDocs.servers && this.apiDocs.servers.length > 0
      ? this.apiDocs.servers[0].url
      : window.location.origin;

    // Build the full URL
    const baseUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
    const path = pathUrl.startsWith('/') ? pathUrl : `/${pathUrl}`;
    const url = `${baseUrl}${path}`;

    // Start building the curl command
    let curl = `curl -X ${methodType} "${url}"`;

    // Add headers
    curl += ` \
  -H "Content-Type: application/json"`;

    // Add authorization header placeholder if security is required
    if (operation.security && operation.security.length > 0) {
      curl += ` \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"`;
    }

    // Add request body if needed
    if (methodType !== 'GET' && methodType !== 'DELETE' && operation.requestBody) {
      // Try to get a sample from the request body schema
      let sample = '{}';

      if (operation.requestBody.content && operation.requestBody.content['application/json']) {
        const schema = operation.requestBody.content['application/json'].schema;
        if (schema) {
          sample = this.generateSampleFromSchema(schema);
        }
      }

      curl += ` \
  -d '${sample}'`;
    }

    return curl;
  }

  /**
   * Generate a sample JSON object from a schema
   */
  private generateSampleFromSchema(schema: any): string {
    if (!schema) return '{}';

    // Handle reference
    if (schema.$ref) {
      const ref = schema.$ref.split('/').pop();
      const refSchema = this.apiDocs.components?.schemas?.[ref];
      if (refSchema) {
        return this.generateSampleFromSchema(refSchema);
      }
      return `{ "${ref}": "..." }`;
    }

    // Handle different types
    switch (schema.type) {
      case 'object':
        if (schema.properties) {
          const props = Object.entries(schema.properties).map(([key, prop]: [string, any]) => {
            return `"${key}": ${this.generateSampleValue(prop)}`;
          }).join(', ');
          return `{ ${props} }`;
        }
        return '{}';

      case 'array':
        if (schema.items) {
          return `[ ${this.generateSampleValue(schema.items)} ]`;
        }
        return '[]';

      default:
        return this.generateSampleValue(schema);
    }
  }

  /**
   * Generate a sample value for a schema property
   */
  private generateSampleValue(schema: any): string {
    if (!schema) return '""';

    // Handle reference
    if (schema.$ref) {
      const ref = schema.$ref.split('/').pop();
      return `{ "${ref}": "..." }`;
    }

    // Handle different types
    switch (schema.type) {
      case 'string':
        if (schema.enum && schema.enum.length > 0) {
          return `"${schema.enum[0]}"`;
        }
        if (schema.format === 'date-time') {
          return '"2023-01-01T00:00:00Z"';
        }
        if (schema.format === 'date') {
          return '"2023-01-01"';
        }
        if (schema.format === 'email') {
          return '"user@example.com"';
        }
        return '"string"';

      case 'integer':
      case 'number':
        return '0';

      case 'boolean':
        return 'false';

      case 'object':
        return '{}';

      case 'array':
        return '[]';

      default:
        return '""';
    }
  }

  /**
   * Process the API paths and methods
   */
  private processPaths(): void {
    if (!this.apiDocs || !this.apiDocs.paths) {
      this.paths = [];
      return;
    }

    // Process security schemes for global authentication
    this.processSecuritySchemes();

    // Get all paths
    this.paths = Object.entries(this.apiDocs.paths).map(([path, pathItem]) => {
      // Get methods for this path
      const methods = this.getMethodsArray(pathItem);

      return {
        path,
        pathItem,
        methods,
        isExpanded: true // Keep endpoints expanded by default
      };
    });

    // Process tags and organize endpoints by tag
    this.processTags();
  }

  /**
   * Process tags and organize endpoints by tag
   */
  private processTags(): void {
    // Get all tags from the API docs
    const apiTags = this.apiDocs.tags || [];
    const tagMap = new Map<string, any>();

    // Initialize tags from API docs
    apiTags.forEach((tag: any) => {
      tagMap.set(tag.name, {
        name: tag.name,
        description: tag.description,
        isExpanded: true,
        endpoints: []
      });
    });

    // Add a default tag for endpoints without tags
    if (!tagMap.has('default')) {
      tagMap.set('default', {
        name: 'default',
        description: 'API endpoints without tags',
        isExpanded: true,
        endpoints: []
      });
    }

    // Organize endpoints by tag
    this.paths.forEach(path => {
      path.methods.forEach(method => {
        const methodTags = method.operation.tags || ['default'];

        methodTags.forEach((tagName: string) => {
          // Create tag if it doesn't exist
          if (!tagMap.has(tagName)) {
            tagMap.set(tagName, {
              name: tagName,
              isExpanded: true,
              endpoints: []
            });
          }

          // Add endpoint to tag
          const tag = tagMap.get(tagName);
          tag.endpoints.push({
            path: path.path,
            method: method
          });
        });
      });
    });

    // Convert map to array and sort by tag name
    this.tags = Array.from(tagMap.values()).sort((a, b) => {
      if (a.name === 'default') return 1;
      if (b.name === 'default') return -1;
      return a.name.localeCompare(b.name);
    });

    // Initialize filtered tags
    this.filteredTags = [...this.tags];
  }

  /**
   * Get methods for a path item
   */
  private getMethodsArray(pathItem: any): Array<{type: string, operation: any, isExpanded: boolean, autoExpand: boolean}> {
    if (!pathItem) {
      return [];
    }

    const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];
    return methods
      .filter(method => pathItem[method])
      .map(method => ({
        type: method.toUpperCase(),
        operation: pathItem[method],
        isExpanded: this.apiDocsConfig.expandOperations, // Respect expandOperations configuration
        autoExpand: this.apiDocsConfig.expandOperations // Auto-expand if expandOperations is true
      }));
  }

  /**
   * Process security schemes for global authentication
   */
  private processSecuritySchemes(): void {
    if (!this.apiDocs || !this.apiDocs.components || !this.apiDocs.components.securitySchemes) {
      this.securitySchemes = {};
      this.securitySchemesArray = [];
      return;
    }

    this.securitySchemes = this.apiDocs.components.securitySchemes;
    this.securitySchemesArray = Object.entries(this.securitySchemes).map(([name, scheme]) => ({
      name,
      scheme
    }));
  }

  /**
   * Get tags with paths for the sidebar
   */
  getTagsWithPaths(): any[] {
    return this.filteredTags;
  }

  /**
   * Toggle tag expanded state
   */
  toggleTagExpanded(tag: any): void {
    tag.isExpanded = !tag.isExpanded;
  }

  /**
   * Set the active tab in the left sidebar
   */
  setLeftSidebarTab(tab: 'endpoints' | 'history' | 'favorites'): void {
    this.leftSidebarActiveTab = tab;

    // Update URL query parameters to persist the tab selection
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        ...this.route.snapshot.queryParams,
        leftSidebarTab: tab
      },
      queryParamsHandling: 'merge'
    });
  }

  /**
   * Check if an endpoint is active
   */
  isEndpointActive(endpoint: any): boolean {
    if (!this.selectedEndpoint) return false;

    return this.selectedEndpoint.path === endpoint.path &&
           this.selectedEndpoint.method.type === endpoint.method.type;
  }

  /**
   * Select an endpoint to display in the center pane
   */
  selectEndpoint(endpoint: any): void {
    // Find the tag that contains this endpoint
    const tag = this.findTagForEndpoint(endpoint);
    if (!tag) return;

    // Try to find or create a tab for this endpoint
    this.apiTabService.findOrCreateTab(endpoint, tag.name).subscribe({
      next: (tab) => {
        // Set the active tab
        this.activeTabId = tab.id;

        // Add the tab to the tabs array if it's not already there
        if (!this.tabs.some(t => t.id === tab.id)) {
          this.tabs = [...this.tabs, tab];
        }

        // Update the URL
        this.updateUrlWithTabId(tab.id);

        // Set the selected endpoint
        this.selectedEndpoint = endpoint;
        this.showingApiInfo = false;

        // Check if we're selecting a different endpoint
        const isNewEndpoint = !this.selectedEndpoint ||
                           this.selectedEndpoint.path !== endpoint.path ||
                           this.selectedEndpoint.method.type !== endpoint.method.type;

        if (isNewEndpoint) {
          // Clear previous response samples when selecting a new endpoint
          this.responseSamples = {};
          this.selectedResponseCode = null;
          console.log('Cleared response samples for new endpoint');

          // Always set the active tab to try-it-out when selecting a new endpoint
          this.rightPaneActiveTab = 'try-it-out';
        }

        // Get the responses for this endpoint
        const responses = this.getResponsesForSelectedEndpoint();

        // Select the first response by default
        if (responses.length > 0) {
          this.selectResponse(responses[0].code);
        }

        // Select the first request body content type by default
        const contentTypes = this.getRequestBodyContentTypes();
        if (contentTypes.length > 0) {
          this.selectRequestBodyContentType(contentTypes[0]);
        }
      },
      error: (err) => {
        if (err.message === 'Maximum number of tabs reached') {
          // Show the tab limit popup
          this.showTabLimitPopup = true;
        } else {
          console.error('Error creating tab:', err);
        }
      }
    });
  }

  /**
   * Find the tag that contains an endpoint
   */
  findTagForEndpoint(endpoint: any): any {
    return this.tags.find(tag =>
      tag.endpoints.some(e =>
        e.path === endpoint.path && e.method.type === endpoint.method.type
      )
    );
  }



  /**
   * Get all parameters for the selected endpoint
   */
  getEndpointParameters(): any[] {
    if (!this.selectedEndpoint || !this.selectedEndpoint.method.operation.parameters) {
      return [];
    }
    return this.selectedEndpoint.method.operation.parameters;
  }

  /**
   * Get the type of a parameter
   */
  getParameterType(param: any): string {
    if (!param.schema) {
      return 'string';
    }

    if (param.schema.$ref) {
      // Handle references
      const refName = param.schema.$ref.split('/').pop();
      return refName || 'object';
    }

    if (param.schema.type === 'array' && param.schema.items) {
      if (param.schema.items.$ref) {
        const refName = param.schema.items.$ref.split('/').pop();
        return `array[${refName || 'object'}]`;
      }
      return `array[${param.schema.items.type || 'object'}]`;
    }

    return param.schema.type || 'string';
  }

  /**
   * Get constraints for a parameter
   */
  getParameterConstraints(param: any): string {
    if (!param.schema) {
      return '';
    }

    const constraints = [];

    if (param.schema.minimum !== undefined) {
      constraints.push(`min: ${param.schema.minimum}`);
    }

    if (param.schema.maximum !== undefined) {
      constraints.push(`max: ${param.schema.maximum}`);
    }

    if (param.schema.minLength !== undefined) {
      constraints.push(`minLength: ${param.schema.minLength}`);
    }

    if (param.schema.maxLength !== undefined) {
      constraints.push(`maxLength: ${param.schema.maxLength}`);
    }

    if (param.schema.pattern) {
      constraints.push(`pattern: ${param.schema.pattern}`);
    }

    return constraints.join(', ');
  }

  /**
   * Check if the endpoint has a request body
   */
  hasRequestBody(): boolean {
    return !!this.selectedEndpoint &&
           !!this.selectedEndpoint.method.operation.requestBody &&
           !!this.selectedEndpoint.method.operation.requestBody.content;
  }

  /**
   * Get content types for the request body
   */
  getRequestBodyContentTypes(): string[] {
    if (!this.hasRequestBody() || !this.selectedEndpoint || !this.selectedEndpoint.method ||
        !this.selectedEndpoint.method.operation || !this.selectedEndpoint.method.operation.requestBody ||
        !this.selectedEndpoint.method.operation.requestBody.content) {
      return [];
    }

    return Object.keys(this.selectedEndpoint.method.operation.requestBody.content);
  }

  /**
   * Select a request body content type
   */
  selectRequestBodyContentType(contentType: string): void {
    this.selectedRequestBodyContentType = contentType;
  }

  /**
   * Get the schema for the selected request body content type
   */
  getRequestBodySchema(): any {
    if (!this.hasRequestBody() || !this.selectedRequestBodyContentType ||
        !this.selectedEndpoint || !this.selectedEndpoint.method ||
        !this.selectedEndpoint.method.operation || !this.selectedEndpoint.method.operation.requestBody ||
        !this.selectedEndpoint.method.operation.requestBody.content) {
      return null;
    }

    const content = this.selectedEndpoint.method.operation.requestBody.content[this.selectedRequestBodyContentType];
    if (!content || !content.schema) {
      return null;
    }

    return content.schema;
  }

  /**
   * Get properties for the request body schema
   */
  getRequestBodyProperties(): any {
    const schema = this.getRequestBodySchema();
    if (!schema) {
      return {};
    }

    // Handle references
    if (schema.$ref) {
      const refSchema = this.resolveSchemaRef(schema.$ref);
      return refSchema?.properties || {};
    }

    // Handle arrays
    if (schema.type === 'array' && schema.items) {
      if (schema.items.$ref) {
        const refSchema = this.resolveSchemaRef(schema.items.$ref);
        return refSchema?.properties || {};
      }
      return schema.items.properties || {};
    }

    return schema.properties || {};
  }

  /**
   * Get required properties for the request body schema
   */
  getRequestBodyRequired(): string[] {
    const schema = this.getRequestBodySchema();
    if (!schema) {
      return [];
    }

    // Handle references
    if (schema.$ref) {
      const refSchema = this.resolveSchemaRef(schema.$ref);
      return refSchema?.required || [];
    }

    // Handle arrays
    if (schema.type === 'array' && schema.items) {
      if (schema.items.$ref) {
        const refSchema = this.resolveSchemaRef(schema.items.$ref);
        return refSchema?.required || [];
      }
      return schema.items.required || [];
    }

    return schema.required || [];
  }

  /**
   * Resolve a schema reference
   */
  private resolveSchemaRef(ref: string): any {
    if (!ref || !this.apiDocs.components || !this.apiDocs.components.schemas) {
      return null;
    }

    const refParts = ref.split('/');
    const schemaName = refParts[refParts.length - 1];

    return this.apiDocs.components.schemas[schemaName];
  }

  /**
   * Get an example for the request body
   */
  getRequestBodyExample(): string {
    const schema = this.getRequestBodySchema();
    if (!schema) {
      return '{}';
    }

    // Check if there's an example in the content
    if (!this.selectedEndpoint || !this.selectedEndpoint.method ||
        !this.selectedEndpoint.method.operation || !this.selectedEndpoint.method.operation.requestBody ||
        !this.selectedEndpoint.method.operation.requestBody.content || !this.selectedRequestBodyContentType) {
      return '{}';
    }

    const content = this.selectedEndpoint.method.operation.requestBody.content[this.selectedRequestBodyContentType];
    if (content && content.example) {
      return JSON.stringify(content.example, null, 2);
    }

    // Generate an example from the schema
    const example = this.generateExampleFromSchema(schema);
    return JSON.stringify(example, null, 2);
  }

  /**
   * Generate an example from a schema
   */
  private generateExampleFromSchema(schema: any): any {
    // Handle references
    if (schema.$ref) {
      const refSchema = this.resolveSchemaRef(schema.$ref);
      return this.generateExampleFromSchema(refSchema);
    }

    // Use example if provided
    if (schema.example !== undefined) {
      return schema.example;
    }

    // Handle different types
    switch (schema.type) {
      case 'object':
        const obj: any = {};
        if (schema.properties) {
          Object.keys(schema.properties).forEach(propName => {
            obj[propName] = this.generateExampleFromSchema(schema.properties[propName]);
          });
        }
        return obj;

      case 'array':
        if (schema.items) {
          return [this.generateExampleFromSchema(schema.items)];
        }
        return [];

      case 'string':
        if (schema.enum && schema.enum.length > 0) {
          return schema.enum[0];
        }
        if (schema.format === 'date-time') {
          return new Date().toISOString();
        }
        if (schema.format === 'date') {
          return new Date().toISOString().split('T')[0];
        }
        if (schema.format === 'email') {
          return 'user@example.com';
        }
        if (schema.format === 'uuid') {
          return '00000000-0000-0000-0000-000000000000';
        }
        return 'string';

      case 'number':
      case 'integer':
        if (schema.enum && schema.enum.length > 0) {
          return schema.enum[0];
        }
        return 0;

      case 'boolean':
        return false;

      default:
        return null;
    }
  }

  /**
   * Copy the request body example to clipboard
   */
  copyRequestBodyExample(): void {
    const example = this.getRequestBodyExample();
    if (navigator.clipboard && example) {
      navigator.clipboard.writeText(example)
        .then(() => {
          this.requestBodyExampleCopied = true;
          setTimeout(() => {
            this.requestBodyExampleCopied = false;
          }, 2000);
        })
        .catch(err => {
          console.error('Failed to copy request body example:', err);
        });
    }
  }

  /**
   * Get the type of a property
   */
  getPropertyType(prop: any): string {
    if (!prop) {
      return 'string';
    }

    if (prop.$ref) {
      // Handle references
      const refName = prop.$ref.split('/').pop();
      return refName || 'object';
    }

    if (prop.type === 'array' && prop.items) {
      if (prop.items.$ref) {
        const refName = prop.items.$ref.split('/').pop();
        return `array[${refName || 'object'}]`;
      }
      return `array[${prop.items.type || 'object'}]`;
    }

    return prop.type || 'string';
  }

  /**
   * Check if a property is required
   */
  isPropertyRequired(propName: string, required: string[]): boolean {
    return required.includes(propName);
  }

  /**
   * Get constraints for a property
   */
  getPropertyConstraints(prop: any): string {
    if (!prop) {
      return '';
    }

    const constraints = [];

    if (prop.minimum !== undefined) {
      constraints.push(`min: ${prop.minimum}`);
    }

    if (prop.maximum !== undefined) {
      constraints.push(`max: ${prop.maximum}`);
    }

    if (prop.minLength !== undefined) {
      constraints.push(`minLength: ${prop.minLength}`);
    }

    if (prop.maxLength !== undefined) {
      constraints.push(`maxLength: ${prop.maxLength}`);
    }

    if (prop.pattern) {
      constraints.push(`pattern: ${prop.pattern}`);
    }

    return constraints.join(', ');
  }

  /**
   * Convert an object's entries to an array for ngFor
   */
  getObjectEntries(obj: any): [string, any][] {
    if (!obj) {
      return [];
    }
    return Object.entries(obj);
  }

  /**
   * Get responses for the selected endpoint
   */
  getResponsesForSelectedEndpoint(): Array<{code: string, description: string, content: any}> {
    if (!this.selectedEndpoint) return [];

    const operation = this.selectedEndpoint.method.operation;
    if (!operation.responses) return [];

    return Object.entries(operation.responses).map(([code, response]: [string, any]) => ({
      code,
      description: response.description || '',
      content: response.content || {}
    }));
  }

  /**
   * Check if a response is active
   */
  isResponseActive(code: string): boolean {
    return this.selectedResponseCode === code;
  }

  /**
   * Select a response to display in the right pane
   */
  selectResponse(code: string): void {
    this.selectedResponseCode = code;

    // Generate sample response if not already generated
    if (!this.responseSamples[code]) {
      this.generateResponseSample(code);
    }

    // Reset the JSON viewer expanded state to ensure proper rendering
    this.jsonViewerExpanded = false;
    setTimeout(() => {
      this.jsonViewerExpanded = true;
      // Force Angular change detection by accessing the JSON viewer
      if (this.jsonViewer) {
        console.log('Refreshing JSON viewer for response code:', code);
      }
    }, 50);

    // Switch to the response-samples tab when a response is selected
    this.setRightPaneTab('response-samples');

    // Update the tab state if we have an active tab
    if (this.activeTabId) {
      this.apiTabService.updateTabResponseSamples(
        this.activeTabId,
        this.responseSamples,
        this.selectedResponseCode
      ).subscribe();
    }
  }

  /**
   * Generate a sample response for the selected endpoint and response code
   */
  private generateResponseSample(code: string): void {
    if (!this.selectedEndpoint || !code) return;

    const operation = this.selectedEndpoint.method.operation;
    const response = operation.responses[code];

    if (!response || !response.content) {
      this.responseSamples[code] = { message: 'No content defined for this response' };
      return;
    }

    // Try to get content type
    const contentType = this.getSelectedResponseContentType();
    const content = response.content[contentType];

    if (!content || !content.schema) {
      this.responseSamples[code] = { message: 'No schema defined for this response' };
      return;
    }

    // Generate sample from schema
    try {
      const sampleJson = this.generateSampleObject(content.schema);
      this.responseSamples[code] = sampleJson;
    } catch (error) {
      console.error('Error generating sample response:', error);
      this.responseSamples[code] = { error: 'Failed to generate sample response' };
    }
  }

  /**
   * Generate a sample object from a schema
   */
  private generateSampleObject(schema: any): any {
    if (!schema) return null;

    // Handle references
    if (schema.$ref) {
      // Extract the reference name and try to resolve it
      const refName = schema.$ref.split('/').pop();

      // Try to resolve from components/schemas
      if (this.apiDocs?.components?.schemas?.[refName]) {
        return this.generateSampleObject(this.apiDocs.components.schemas[refName]);
      }

      // If we can't resolve, return a placeholder
      return { "reference": schema.$ref };
    }

    // Handle different types
    switch (schema.type) {
      case 'object':
        const obj: any = {};
        if (schema.properties) {
          Object.keys(schema.properties).forEach(propName => {
            obj[propName] = this.generateSampleObject(schema.properties[propName]);
          });
        }
        return obj;

      case 'array':
        if (schema.items) {
          return [this.generateSampleObject(schema.items)];
        }
        return [];

      case 'string':
        if (schema.enum && schema.enum.length > 0) {
          return schema.enum[0];
        }
        if (schema.example) return schema.example;
        if (schema.format === 'date-time') return new Date().toISOString();
        if (schema.format === 'date') return new Date().toISOString().split('T')[0];
        if (schema.format === 'email') return 'user@example.com';
        if (schema.format === 'uuid') return '00000000-0000-0000-0000-000000000000';
        return 'string';

      case 'number':
      case 'integer':
        if (schema.enum && schema.enum.length > 0) {
          return schema.enum[0];
        }
        if (schema.example !== undefined) return schema.example;
        return 0;

      case 'boolean':
        if (schema.example !== undefined) return schema.example;
        return false;

      default:
        return null;
    }
  }

  /**
   * Get available response codes for the selected endpoint
   */
  getAvailableResponseCodes(): string[] {
    if (!this.selectedEndpoint) return [];

    const operation = this.selectedEndpoint.method.operation;
    if (!operation.responses) return [];

    return Object.keys(operation.responses);
  }

  /**
   * Get the content type for the selected response
   */
  getSelectedResponseContentType(): string {
    if (!this.selectedEndpoint || !this.selectedResponseCode) return 'application/json';

    const operation = this.selectedEndpoint.method.operation;
    const response = operation.responses[this.selectedResponseCode];

    if (!response || !response.content) return 'application/json';

    // Get the first content type, preferring application/json
    const contentTypes = Object.keys(response.content);
    if (contentTypes.includes('application/json')) {
      return 'application/json';
    }

    return contentTypes[0] || 'application/json';
  }

  /**
   * Get formatted response sample
   */
  getFormattedResponseSample(): string {
    if (!this.selectedResponseCode || !this.responseSamples[this.selectedResponseCode]) {
      return 'No sample available';
    }

    return JSON.stringify(this.responseSamples[this.selectedResponseCode], null, 2);
  }

  /**
   * Copy response sample to clipboard
   */
  copyResponseSample(): void {
    const sample = this.getFormattedResponseSample();
    if (navigator.clipboard && sample) {
      navigator.clipboard.writeText(sample)
        .then(() => {
          // Show a toast or notification
          console.log('Response sample copied to clipboard');
        })
        .catch(err => {
          console.error('Failed to copy response sample:', err);
        });
    }
  }

  /**
   * Expand all nodes in the response sample
   */
  expandAll(): void {
    // Set expanded to true for the AndypfJsonViewer
    this.jsonViewerExpanded = true;
    if (this.jsonViewer) {
      // Update the expanded property
      setTimeout(() => {
        if (this.jsonViewer) {
          this.jsonViewer.expanded = true;
        }
      }, 0);
    }
  }

  /**
   * Collapse all nodes in the response sample
   */
  collapseAll(): void {
    // Set expanded to false for the AndypfJsonViewer
    this.jsonViewerExpanded = false;
    if (this.jsonViewer) {
      // Update the expanded property
      setTimeout(() => {
        if (this.jsonViewer) {
          this.jsonViewer.expanded = false;
        }
      }, 0);
    }
  }

  /**
   * Try the selected endpoint
   */
  trySelectedEndpoint(): void {
    this.isTryItOutVisible = true;
  }

  /**
   * Hide the try-it-out section
   */
  hideTryItOut(): void {
    this.isTryItOutVisible = false;
  }

  /**
   * Handle response from try-it-out component
   */
  handleResponse(response: any): void {
    this.currentResponse = response;

    // Update the response sample for the current response code
    if (response && response.status) {
      const code = response.status.toString();
      this.responseSamples[code] = response.body;

      // Select the response code and switch to the response-samples tab
      this.selectedResponseCode = code;

      // Reset the JSON viewer expanded state to ensure proper rendering
      this.jsonViewerExpanded = false;
      setTimeout(() => {
        this.jsonViewerExpanded = true;
        // Force Angular change detection by accessing the JSON viewer
        if (this.jsonViewer) {
          console.log('Refreshing JSON viewer for response from try-it-out');
        }
      }, 50);

      this.setRightPaneTab('response-samples');

      // Update the tab state if we have an active tab
      if (this.activeTabId) {
        this.apiTabService.updateTabResponseSamples(
          this.activeTabId,
          this.responseSamples,
          this.selectedResponseCode
        ).subscribe();
      }

      // Save the API call to history
      if (this.selectedEndpoint) {
        const historyEntry: ApiHistoryEntry = {
          applicationName: this.applicationName,
          path: this.selectedEndpoint.path,
          method: this.selectedEndpoint.method.type,
          timestamp: Date.now(),
          request: {
            headers: response.requestHeaders || {},
            queryParams: response.requestQueryParams || {},
            pathParams: response.requestPathParams || {},
            body: response.requestBody
          },
          response: {
            status: response.status,
            statusText: response.statusText || '',
            headers: this.convertHeadersToObject(response.headers),
            body: response.body
          }
        };

        this.apiHistoryService.saveApiCall(historyEntry).subscribe({
          next: () => {
            console.log('API call saved to history');
          },
          error: (err) => {
            console.error('Error saving API call to history:', err);
          }
        });
      }
    }
  }

  /**
   * Convert Headers object to a simple key-value object
   */
  private convertHeadersToObject(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};

    if (headers) {
      headers.forEach((value, key) => {
        result[key] = value;
      });
    }

    return result;
  }

  // This function is now defined above with updated signature

  /**
   * Set the active secondary tab in the API Playground
   */
  setSecondaryTab(tab: 'playground' | 'documentation'): void {
    // Store the current search state
    const previousTab = this.secondaryTabActiveTab;
    const previousTags = [...this.docSearchTags];

    // Update the active tab
    this.secondaryTabActiveTab = tab;

    // Update the URL query parameter to persist the tab selection
    this.updateUrlQueryParams();

    // If switching back to documentation tab, restore the previous search state
    if (tab === 'documentation' && previousTab === 'playground' && previousTags.length > 0) {
      this.docSearchTags = previousTags;

      // Trigger search with the restored tags
      this.searchDocumentation();
    }
  }

  /**
   * Update the URL with query parameters to persist state
   */
  private updateUrlQueryParams(): void {
    // Create query params object with current state
    const queryParams: any = {
      secondaryTab: this.secondaryTabActiveTab
    };

    // Only add tags parameter if there are tags and we're in documentation tab
    if (this.docSearchTags.length > 0 && this.secondaryTabActiveTab === 'documentation') {
      // Join all tags with a comma to preserve order
      queryParams.tags = this.docSearchTags.map(tag => tag.text).join(',');
    } else {
      // Explicitly set tags to null to remove it from the URL if it exists
      queryParams.tags = null;
    }

    // Get the current URL and preserve any existing path
    const urlTree = this.router.createUrlTree([], {
      queryParams: queryParams,
      // Don't merge with existing query params to ensure removed params are actually removed
      preserveFragment: true // Preserve any fragments
    });

    // Navigate to the updated URL without reloading the page
    this.router.navigateByUrl(urlTree, {
      replaceUrl: true // Replace the current URL to avoid adding to browser history
    });
  }

  /**
   * Toggle the right pane collapsed state
   */
  toggleRightPane(): void {
    this.rightPaneCollapsed = !this.rightPaneCollapsed;

    // If expanding the pane, make sure we have a valid tab selected
    if (!this.rightPaneCollapsed && !this.selectedResponseCode && this.rightPaneActiveTab === 'response-samples') {
      this.rightPaneActiveTab = 'try-it-out';

      // Update the tab in the database
      if (this.activeTabId) {
        this.apiTabService.updateTabRightPaneActiveTab(this.activeTabId, 'try-it-out').subscribe();
      }
    }
  }

  /**
   * View details of an API call history entry
   */
  viewHistoryDetails(entry: ApiHistoryEntry): void {
    this.selectedHistoryEntry = entry;
    this.showHistoryDetailModal = true;
  }

  /**
   * Close the history detail modal
   */
  closeHistoryDetailModal(): void {
    this.showHistoryDetailModal = false;
    this.selectedHistoryEntry = null;
  }

  /**
   * Rerun an API call from history
   */
  rerunApiCall(historyEntry: ApiHistoryEntry): void {
    // Find the endpoint that matches the history entry
    const matchingTag = this.tags.find(tag =>
      tag.endpoints.some(endpoint =>
        endpoint.path === historyEntry.path &&
        endpoint.method.type.toLowerCase() === historyEntry.method.toLowerCase()
      )
    );

    if (matchingTag) {
      const matchingEndpoint = matchingTag.endpoints.find(endpoint =>
        endpoint.path === historyEntry.path &&
        endpoint.method.type.toLowerCase() === historyEntry.method.toLowerCase()
      );

      if (matchingEndpoint) {
        // Select the endpoint
        this.selectEndpoint(matchingEndpoint);

        // Switch to the endpoints tab
        this.leftSidebarActiveTab = 'endpoints';

        // Close the history detail modal
        this.closeHistoryDetailModal();

        // TODO: Pre-fill the Try It Out form with the history entry data
        // This would require modifications to the TryItOutComponent
      }
    }
  }

  /**
   * Delete an API call from history
   */
  deleteHistoryEntry(id: number): void {
    this.apiHistoryService.deleteApiCall(id).subscribe({
      next: () => {
        console.log('API call deleted from history');
        this.closeHistoryDetailModal();
      },
      error: (err) => {
        console.error('Error deleting API call from history:', err);
      }
    });
  }

  /**
   * Filter endpoints based on search query
   */
  filterEndpoints(): void {
    if (!this.searchQuery.trim()) {
      this.filteredTags = [...this.tags];
      return;
    }

    const query = this.searchQuery.toLowerCase().trim();

    this.filteredTags = this.tags.map(tag => {
      // Filter endpoints within this tag
      const filteredEndpoints = tag.endpoints.filter(endpoint => {
        const path = endpoint.path.toLowerCase();
        const method = endpoint.method.type.toLowerCase();
        const summary = (endpoint.method.operation.summary || '').toLowerCase();
        const description = (endpoint.method.operation.description || '').toLowerCase();

        return path.includes(query) ||
               method.includes(query) ||
               summary.includes(query) ||
               description.includes(query);
      });

      // Return a new tag object with filtered endpoints
      return {
        ...tag,
        endpoints: filteredEndpoints,
        isExpanded: filteredEndpoints.length > 0 // Auto-expand tags with matching endpoints
      };
    }).filter(tag => tag.endpoints.length > 0); // Only include tags with matching endpoints
  }

  /**
   * Handle keydown events in the tag input
   */
  handleTagInputKeydown(event: KeyboardEvent, inputValue: string): void {
    // If Enter or comma is pressed, add a new tag
    if ((event.key === 'Enter' || event.key === ',') && inputValue.trim()) {
      event.preventDefault();
      this.addSearchTag(inputValue.trim());

      // Find the input element and clear it
      const inputElement = document.querySelector('.tag-input') as HTMLInputElement;
      if (inputElement) {
        inputElement.value = '';
        inputElement.focus();
      }
    }
  }

  /**
   * Generate a random color for a tag
   * Returns a color that's not too light (for readability on white background)
   * If the tag already has a color assigned, returns that color
   */
  generateRandomColor(tagText?: string): string {
    // If tag text is provided and we already have a color for it, return that color
    if (tagText && this.tagColorMap.has(tagText.toLowerCase())) {
      return this.tagColorMap.get(tagText.toLowerCase())!;
    }

    // Predefined set of vibrant colors that work well with white text
    const colors = [
      '#3498db', // Blue
      '#9b59b6', // Purple
      '#e74c3c', // Red
      '#16a085', // Green
      '#f39c12', // Orange
      '#2c3e50', // Navy
      '#1abc9c', // Turquoise
      '#d35400', // Pumpkin
      '#c0392b', // Pomegranate
      '#8e44ad', // Wisteria
      '#27ae60', // Nephritis
      '#2980b9', // Belize Hole
      '#f1c40f', // Sunflower
      '#e67e22'  // Carrot
    ];

    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    // If tag text is provided, store the color in the map
    if (tagText) {
      this.tagColorMap.set(tagText.toLowerCase(), randomColor);
    }

    return randomColor;
  }

  /**
   * Add a new search tag
   */
  addSearchTag(text: string): void {
    // Don't add empty tags or duplicate tags
    if (!text || this.docSearchTags.some(tag => tag.text.toLowerCase() === text.toLowerCase())) {
      return;
    }

    // Add the tag (no need for color as it's now set in CSS)
    this.docSearchTags.push({
      text,
      color: '' // Empty string as we're using CSS for color
    });

    // Trigger search with the new tag
    this.searchDocumentation();
  }

  /**
   * Remove a search tag by index
   */
  removeSearchTag(index: number): void {
    if (index >= 0 && index < this.docSearchTags.length) {
      // Check if this is the last tag
      const isLastTag = this.docSearchTags.length === 1;

      // Remove the tag
      this.docSearchTags.splice(index, 1);

      // If it was the last tag, directly update URL params to ensure they're cleared
      if (isLastTag) {
        this.docSearchResults = [];
        this.updateUrlQueryParams();
      } else {
        // Otherwise, use the normal search flow
        this.searchDocumentation();
      }
    }
  }

  /**
   * Search API documentation based on the search tags
   * Supports multiple tags with ordered filtering
   */
  searchDocumentation(): void {
    // Clear previous results
    this.docSearchResults = [];

    // Always update URL with tags (or lack thereof)
    this.updateUrlQueryParams();

    // Only perform search if we have tags
    if (this.docSearchTags.length === 0) {
      // Make sure loading state is cleared
      this.docSearchLoading = false;
      return;
    }

    // Set loading state
    this.docSearchLoading = true;

    // Use setTimeout to simulate async operation and avoid blocking UI
    setTimeout(() => {
      // Get search terms from tags
      const searchTerms: string[] = this.docSearchTags.map(tag => tag.text.toLowerCase());

      const results: Array<{tagName: string, endpoint: any, score: number, matchedTags: number}> = [];

      // Search through all tags and endpoints
      this.tags.forEach(tag => {
        tag.endpoints.forEach(endpoint => {
          const path = endpoint.path.toLowerCase();
          const method = endpoint.method.type.toLowerCase();
          const summary = (endpoint.method.operation.summary || '').toLowerCase();
          const description = (endpoint.method.operation.description || '').toLowerCase();

          // Track which tags match and their positions
          const tagMatches: {tag: string, score: number, position: number}[] = [];

          // Check each search tag against the endpoint
          searchTerms.forEach((searchTerm, index) => {
            let tagScore = 0;

            // Exact matches in path get highest score
            if (path.includes(searchTerm)) {
              tagScore += 10;
              // Bonus for exact path match
              if (path === searchTerm) {
                tagScore += 5;
              }
            }

            // Method matches
            if (method.includes(searchTerm)) {
              tagScore += 8;
            }

            // Summary matches (important)
            if (summary.includes(searchTerm)) {
              tagScore += 7;
              // Bonus for exact summary match
              if (summary === searchTerm) {
                tagScore += 3;
              }
            }

            // Description matches
            if (description.includes(searchTerm)) {
              tagScore += 5;
            }

            // If this tag matched, add it to the matches
            if (tagScore > 0) {
              tagMatches.push({
                tag: searchTerm,
                score: tagScore,
                position: index
              });
            }
          });

          // Only include results that match all search terms
          if (tagMatches.length === searchTerms.length) {
            // Calculate total score
            const totalScore = tagMatches.reduce((sum, match) => sum + match.score, 0);

            // Add to results
            results.push({
              tagName: tag.name,
              endpoint,
              score: totalScore,
              matchedTags: tagMatches.length
            });
          }
        });
      });

      // Sort results by:
      // 1. Number of matched tags (descending)
      // 2. Total score (descending)
      results.sort((a, b) => {
        // First sort by number of matched tags
        if (b.matchedTags !== a.matchedTags) {
          return b.matchedTags - a.matchedTags;
        }
        // Then by score
        return b.score - a.score;
      });

      // Update results
      this.docSearchResults = results;

      // Clear loading state
      this.docSearchLoading = false;
    }, 300); // Small delay for better UX
  }

  /**
   * Clear the documentation search
   */
  clearDocSearch(): void {
    this.docSearchResults = [];
    this.docSearchTags = [];

    // Update URL to remove tags
    this.updateUrlQueryParams();
  }

  /**
   * Set an example search term
   */
  setExampleSearch(example: string): void {
    // Clear existing search first
    this.clearDocSearch();

    // Add the example as a tag
    this.addSearchTag(example);

    // Note: addSearchTag calls searchDocumentation which calls updateUrlQueryParams
  }

  /**
   * Navigate to an endpoint in the playground tab
   */
  navigateToEndpoint(endpoint: any): void {
    // Use setSecondaryTab to properly handle tab switching and preserve search state
    this.setSecondaryTab('playground');

    // Select the endpoint
    this.selectEndpoint(endpoint);
  }

  /**
   * Convert response code string to number for comparison
   */
  getResponseCodeNumber(code: string): number {
    return parseInt(code, 10) || 0;
  }

  /**
   * Get response codes from the operation responses object
   */
  getResponseCodes(responses: any): string[] {
    if (!responses) {
      return [];
    }
    return Object.keys(responses);
  }

  /**
   * Check if the response sample for the given code is an array
   */
  isResponseArray(code: string): boolean {
    if (!code || !this.responseSamples[code]) {
      return false;
    }
    return Array.isArray(this.responseSamples[code]);
  }
}
