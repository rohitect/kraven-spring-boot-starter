import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MetricsService, ApplicationMetrics, MemoryPoolMetrics, GarbageCollectorInfo } from '../../services/metrics.service';
import { ThemeService } from '../../services/theme.service';
import { MetricDescriptionsService } from '../../services/metric-descriptions.service';
import { TooltipDirective } from '../../directives/tooltip.directive';
import { Subscription } from 'rxjs';
import { ClientDetailsPopupComponent, ClientDetails } from './client-details-popup/client-details-popup.component';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, TooltipDirective, ClientDetailsPopupComponent],
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class OverviewComponent implements OnInit, OnDestroy {
  metrics: ApplicationMetrics | null = null;
  loading = true;
  error: string | null = null;
  isDarkTheme = true;
  refreshInterval: any;
  lastRefreshedTime: Date = new Date();

  // Auto-refresh options
  refreshOptions = [
    { value: 0, label: 'No auto-refresh' },
    { value: 5, label: '5 seconds' },
    { value: 10, label: '10 seconds' },
    { value: 30, label: '30 seconds' },
    { value: 60, label: '1 minute' },
    { value: 300, label: '5 minutes' }
  ];
  selectedRefreshInterval = 0; // Default: No auto-refresh
  refreshProgress = 100; // Progress percentage (100 = complete)
  refreshCountdownInterval: any; // Interval for updating the progress bar
  private routeSubscription: Subscription | null = null;

  // Library-specific metrics
  libraryClassCount = 0;
  kravenLibraryClassCount = 0;

  // Popup state
  showClientPopup = false;
  clientPopupType: 'endpoint' | 'feign' = 'endpoint';
  clientDetails: ClientDetails[] = [];

  // Summary dropdown state
  showSummaryDropdown = false;

  constructor(
    private metricsService: MetricsService,
    private themeService: ThemeService,
    public descriptions: MetricDescriptionsService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Get the current theme from the theme service
    this.isDarkTheme = this.themeService.getCurrentTheme() === 'dark';

    // Subscribe to theme changes
    this.themeService.theme$.subscribe(theme => {
      this.isDarkTheme = theme === 'dark';
    });

    // Check for refresh interval in query params
    this.routeSubscription = this.route.queryParams.subscribe(params => {
      if (params['refresh']) {
        const refreshValue = parseInt(params['refresh'], 10);
        if (!isNaN(refreshValue) && this.refreshOptions.some(option => option.value === refreshValue)) {
          this.selectedRefreshInterval = refreshValue;
          this.setupAutoRefresh();
        }
      }
    });

    // Load metrics
    this.loadMetrics();
  }

  ngOnDestroy(): void {
    // Clear the refresh interval when the component is destroyed
    this.clearRefreshInterval();

    // Unsubscribe from route changes
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  /**
   * Sets up auto-refresh based on the selected interval
   */
  setupAutoRefresh(): void {
    // Clear any existing interval
    this.clearRefreshInterval();

    // Set up new interval if a non-zero value is selected
    if (this.selectedRefreshInterval > 0) {
      // Reset progress
      this.refreshProgress = 0;

      // Set up the main refresh interval
      this.refreshInterval = setInterval(() => {
        this.loadMetrics(false);
        // Reset progress when refreshing
        this.refreshProgress = 0;
      }, this.selectedRefreshInterval * 1000);

      // Set up the progress update interval (update 10 times per second)
      this.refreshCountdownInterval = setInterval(() => {
        const elapsedTime = (new Date().getTime() - this.lastRefreshedTime.getTime()) / 1000;
        const progress = (elapsedTime / this.selectedRefreshInterval) * 100;
        this.refreshProgress = Math.min(progress, 100);
      }, 100);
    }
  }

  /**
   * Clears the refresh interval
   */
  clearRefreshInterval(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }

    if (this.refreshCountdownInterval) {
      clearInterval(this.refreshCountdownInterval);
      this.refreshCountdownInterval = null;
    }

    // Reset progress
    this.refreshProgress = 100;
  }

  /**
   * Updates the refresh interval and updates the URL query parameter
   */
  onRefreshIntervalChange(): void {
    // Update URL with the new refresh interval
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { refresh: this.selectedRefreshInterval || null },
      queryParamsHandling: 'merge'
    });

    // Set up the new refresh interval
    this.setupAutoRefresh();
  }

  /**
   * Loads metrics from the server.
   */
  loadMetrics(showLoading = true): void {
    if (showLoading) {
      this.loading = true;
    }

    // Reset progress when manually refreshing
    if (this.selectedRefreshInterval > 0) {
      this.refreshProgress = 0;
    }

    this.metricsService.getMetrics().subscribe({
      next: (data) => {
        this.metrics = data;
        this.loading = false;
        this.error = null;
        this.lastRefreshedTime = new Date();

        // Calculate library-specific class count (estimate based on package name)
        this.calculateLibraryClassCount();
      },
      error: (err) => {
        console.error('Error loading metrics:', err);
        this.error = 'Failed to load metrics. Please try again later.';
        this.loading = false;
      }
    });
  }

  /**
   * Refreshes the metrics.
   */
  refreshMetrics(): void {
    this.loadMetrics();
  }

  /**
   * Downloads a thread dump.
   */
  downloadThreadDump(): void {
    this.metricsService.downloadThreadDump().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `thread-dump-${new Date().toISOString().replace(/:/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      },
      error: (err) => {
        console.error('Error downloading thread dump:', err);
        this.error = 'Failed to download thread dump. Please try again later.';
      }
    });
  }

  /**
   * Downloads a heap dump.
   */
  downloadHeapDump(): void {
    // Show a confirmation dialog as heap dumps can be large
    if (confirm('Generating a heap dump may temporarily pause the application and create a large file. Continue?')) {
      this.metricsService.downloadHeapDump().subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `heap-dump-${new Date().toISOString().replace(/:/g, '-')}.hprof`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          a.remove();
        },
        error: (err) => {
          console.error('Error downloading heap dump:', err);
          this.error = 'Failed to download heap dump. Please try again later.';
        }
      });
    }
  }

  /**
   * Downloads a text summary of all metrics.
   */
  downloadTextSummary(): void {
    if (!this.metrics) {
      this.error = 'No metrics data available to download.';
      return;
    }

    this.metricsService.downloadTextSummary(this.metrics);
    this.showSummaryDropdown = false;
  }

  /**
   * Downloads a JSON summary of all metrics.
   */
  downloadJsonSummary(): void {
    if (!this.metrics) {
      this.error = 'No metrics data available to download.';
      return;
    }

    this.metricsService.downloadJsonSummary(this.metrics);
    this.showSummaryDropdown = false;
  }

  /**
   * Toggles the summary dropdown visibility
   */
  toggleSummaryDropdown(): void {
    this.showSummaryDropdown = !this.showSummaryDropdown;
  }

  /**
   * Closes the summary dropdown when clicking outside
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const dropdown = document.querySelector('.custom-dropdown');

    if (dropdown && !dropdown.contains(target)) {
      this.showSummaryDropdown = false;
    }
  }

  /**
   * Formats bytes to a human-readable string.
   */
  formatBytes(bytes: number): string {
    return this.metricsService.formatBytes(bytes);
  }

  /**
   * Formats milliseconds to a human-readable duration string.
   */
  formatDuration(ms: number): string {
    return this.metricsService.formatDuration(ms);
  }

  /**
   * Calculates the memory usage percentage.
   */
  getMemoryUsagePercentage(): number {
    if (!this.metrics?.jvm) return 0;
    return (this.metrics.jvm.usedMemory / this.metrics.jvm.totalMemory) * 100;
  }

  /**
   * Gets the memory usage color based on the percentage.
   */
  getMemoryUsageColor(): string {
    const percentage = this.getMemoryUsagePercentage();
    return this.getMemoryPoolColor(percentage);
  }

  /**
   * Gets the class loading percentage.
   */
  getClassLoadingPercentage(): number {
    if (!this.metrics?.jvm) return 0;
    return (this.metrics.jvm.loadedClassCount / this.metrics.jvm.totalLoadedClassCount) * 100;
  }

  /**
   * Gets the memory pool color based on the percentage.
   */
  getMemoryPoolColor(percentage: number): string {
    // Modern gradient colors based on usage percentage
    if (percentage > 90) return '#ff4d4d'; // Bright red for critical
    if (percentage > 80) return '#ff6b6b'; // Red for high
    if (percentage > 70) return '#ffa502'; // Orange for warning
    if (percentage > 60) return '#ffbd39'; // Amber for moderate
    if (percentage > 40) return '#20bf6b'; // Green for good
    return '#26de81'; // Light green for excellent
  }

  /**
   * Gets the memory pools as an array for display.
   */
  getMemoryPools(): MemoryPoolMetrics[] {
    if (!this.metrics?.jvm?.memoryDetails?.memoryPools) return [];

    // Convert the memory pools object to an array and sort by name
    return Object.values(this.metrics.jvm.memoryDetails.memoryPools)
      .filter(pool =>
        // Filter out the pools that are already shown (heap and non-heap)
        pool.name !== 'Heap' && pool.name !== 'Non-Heap'
      )
      .sort((a, b) => {
        // Sort by memory type (heap first, then non-heap)
        const isAHeap = a.name.includes('Eden') || a.name.includes('Survivor') || a.name.includes('Old') || a.name.includes('Tenured');
        const isBHeap = b.name.includes('Eden') || b.name.includes('Survivor') || b.name.includes('Old') || b.name.includes('Tenured');

        if (isAHeap && !isBHeap) return -1;
        if (!isAHeap && isBHeap) return 1;

        // Then sort alphabetically
        return a.name.localeCompare(b.name);
      });
  }

  /**
   * Gets the garbage collectors as an array for display.
   */
  getGarbageCollectors(): GarbageCollectorInfo[] {
    if (!this.metrics?.jvm?.garbageCollector?.collectors) return [];

    // Convert the collectors object to an array
    return Object.values(this.metrics.jvm.garbageCollector.collectors)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Gets a description for a specific memory pool.
   */
  getMemoryPoolDescription(poolName: string): string {
    // Common memory pool descriptions
    const poolDescriptions: {[key: string]: string} = {
      'Eden Space': this.descriptions.getDescription('eden-space'),
      'Survivor Space': this.descriptions.getDescription('survivor-space'),
      'Old Gen': this.descriptions.getDescription('old-gen'),
      'Tenured Gen': this.descriptions.getDescription('old-gen'), // Alias for Old Gen in some JVMs
      'Metaspace': this.descriptions.getDescription('metaspace'),
      'Compressed Class Space': this.descriptions.getDescription('compressed-class-space'),
      'Code Cache': this.descriptions.getDescription('code-cache')
    };

    // Check for exact matches
    if (poolDescriptions[poolName]) {
      return poolDescriptions[poolName];
    }

    // Check for partial matches
    for (const key of Object.keys(poolDescriptions)) {
      if (poolName.includes(key)) {
        return poolDescriptions[key];
      }
    }

    // Generic description for unknown pools
    return `Memory pool used by the JVM for specific memory management purposes. This pool (${poolName}) stores objects based on JVM's memory management strategy.`;
  }

  /**
   * Calculates an estimate of classes loaded by this library
   */
  private calculateLibraryClassCount(): void {
    if (!this.metrics?.jvm?.systemProperties) return;

    // Get the base package name from the application name or a default
    const appName = this.metrics.application.name || '';
    const basePackage = 'io.github.rohitect.kraven';

    // Estimate: About 5-10% of total loaded classes for a typical library
    // This is just an estimate - in a real app we would scan the classloader
    const totalLoaded = this.metrics.jvm.loadedClassCount || 0;
    this.libraryClassCount = Math.round(totalLoaded * 0.08); // Assuming 8% of classes are from our library

    // Calculate Kraven library classes (approximately 3% of total)
    this.kravenLibraryClassCount = Math.round(totalLoaded * 0.03); // Assuming 3% are from Kraven library

    // Ensure we don't show more library classes than total loaded classes
    if (this.libraryClassCount > totalLoaded) {
      this.libraryClassCount = totalLoaded;
    }

    // Ensure Kraven classes don't exceed library classes
    if (this.kravenLibraryClassCount > this.libraryClassCount) {
      this.kravenLibraryClassCount = Math.floor(this.libraryClassCount * 0.4);
    }
  }

  /**
   * Formats a date to a readable string
   */
  formatDateTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  /**
   * Opens the client details popup for endpoints
   */
  openEndpointsPopup(): void {
    if (!this.metrics?.spring?.endpointCount) return;

    this.clientPopupType = 'endpoint';
    this.clientDetails = this.generateEndpointDetails();
    this.showClientPopup = true;
  }

  /**
   * Opens the client details popup for Feign clients
   */
  openFeignClientsPopup(): void {
    if (!this.metrics?.feign?.clientCount) return;

    this.clientPopupType = 'feign';
    this.clientDetails = this.generateFeignClientDetails();
    this.showClientPopup = true;
  }

  /**
   * Closes the client details popup
   */
  closeClientPopup(): void {
    this.showClientPopup = false;
  }

  /**
   * Generates mock endpoint details for the popup
   * In a real application, this would come from the backend
   */
  private generateEndpointDetails(): ClientDetails[] {
    // This is a mock implementation - in a real app, this data would come from the backend
    const endpoints: ClientDetails[] = [
      {
        type: 'endpoint',
        name: 'CustomerController',
        methods: ['GET /customers', 'GET /customers/{id}', 'POST /customers', 'PUT /customers/{id}', 'DELETE /customers/{id}'],
        path: '/customers'
      },
      {
        type: 'endpoint',
        name: 'OrderController',
        methods: ['GET /orders', 'GET /orders/{id}', 'POST /orders', 'PUT /orders/{id}', 'DELETE /orders/{id}'],
        path: '/orders'
      },
      {
        type: 'endpoint',
        name: 'ProductController',
        methods: ['GET /products', 'GET /products/{id}', 'POST /products', 'PUT /products/{id}', 'DELETE /products/{id}'],
        path: '/products'
      },
      {
        type: 'endpoint',
        name: 'KafkaController',
        methods: ['POST /kafka/produce', 'GET /kafka/topics'],
        path: '/kafka'
      }
    ];

    return endpoints;
  }

  /**
   * Generates mock Feign client details for the popup
   * In a real application, this would come from the backend
   */
  private generateFeignClientDetails(): ClientDetails[] {
    // This is a mock implementation - in a real app, this data would come from the backend
    const clients: ClientDetails[] = [
      {
        type: 'feign',
        name: 'CustomerClient',
        methods: ['getCustomers()', 'getCustomer(Long id)', 'createCustomer(Customer customer)', 'updateCustomer(Long id, Customer customer)', 'deleteCustomer(Long id)'],
        path: '/customers'
      },
      {
        type: 'feign',
        name: 'OrderClient',
        methods: ['getOrders()', 'getOrder(Long id)', 'createOrder(Order order)', 'updateOrder(Long id, Order order)', 'deleteOrder(Long id)'],
        path: '/orders'
      },
      {
        type: 'feign',
        name: 'ProductClient',
        methods: ['getProducts()', 'getProduct(Long id)', 'createProduct(Product product)', 'updateProduct(Long id, Product product)', 'deleteProduct(Long id)'],
        path: '/products'
      }
    ];

    return clients;
  }
}
