import { Component, OnInit, OnDestroy } from '@angular/core';
import { MockServerService, MockServerStatus, MockServerConfig, MockEndpoint } from '../../../services/mock-server.service';
import { interval, Subscription } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { ThemeService } from '../../../services/theme.service';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-mock-server-dashboard',
  templateUrl: './mock-server-dashboard.component.html',
  styleUrls: ['./mock-server-dashboard.component.scss'],
  standalone: false,
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class MockServerDashboardComponent implements OnInit, OnDestroy {
  // Server status
  serverStatus: MockServerStatus | null = null;
  serverConfig: MockServerConfig | null = null;
  endpoints: MockEndpoint[] = [];

  // UI state
  loading = true;
  error: string | null = null;
  isDarkTheme = true;

  // Active tab
  activeTabIndex = 0;

  // Selected endpoint
  selectedEndpoint: MockEndpoint | null = null;

  // Status polling
  private statusPolling: Subscription | null = null;

  constructor(
    private mockServerService: MockServerService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    // Get the current theme
    this.isDarkTheme = this.themeService.getCurrentTheme() === 'dark';

    // Subscribe to theme changes
    this.themeService.theme$.subscribe(theme => {
      this.isDarkTheme = theme === 'dark';
    });

    // Load initial data
    this.loadServerStatus();
    this.loadServerConfig();
    this.loadEndpoints();

    // Start polling for server status
    this.startStatusPolling();
  }

  ngOnDestroy(): void {
    // Stop polling when component is destroyed
    if (this.statusPolling) {
      this.statusPolling.unsubscribe();
    }
  }

  /**
   * Load the server status
   */
  loadServerStatus(): void {
    this.mockServerService.getServerStatus().subscribe({
      next: (status) => {
        this.serverStatus = status;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading server status:', error);
        this.error = 'Failed to load server status';
        this.loading = false;
      }
    });
  }

  /**
   * Load the server configuration
   */
  loadServerConfig(): void {
    this.mockServerService.getServerConfig().subscribe({
      next: (config) => {
        this.serverConfig = config;
      },
      error: (error) => {
        console.error('Error loading server configuration:', error);
      }
    });
  }

  /**
   * Load all endpoints
   */
  loadEndpoints(): void {
    this.mockServerService.getEndpoints().subscribe({
      next: (endpoints) => {
        this.endpoints = endpoints;
      },
      error: (error) => {
        console.error('Error loading endpoints:', error);
      }
    });
  }

  /**
   * Start polling for server status
   */
  startStatusPolling(): void {
    // Poll every 5 seconds
    this.statusPolling = interval(5000)
      .pipe(
        switchMap(() => this.mockServerService.getServerStatus()),
        catchError(error => {
          console.error('Error polling server status:', error);
          throw error;
        })
      )
      .subscribe({
        next: (status) => {
          this.serverStatus = status;
        },
        error: (error) => {
          console.error('Error in status polling:', error);
        }
      });
  }

  /**
   * Start the server
   */
  startServer(): void {
    this.loading = true;
    this.mockServerService.startServer().subscribe({
      next: (result) => {
        if (result.success) {
          this.loadServerStatus();
        } else {
          this.error = result.message;
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error starting server:', error);
        this.error = 'Failed to start server';
        this.loading = false;
      }
    });
  }

  /**
   * Stop the server
   */
  stopServer(): void {
    this.loading = true;
    this.mockServerService.stopServer().subscribe({
      next: (result) => {
        if (result.success) {
          this.loadServerStatus();
        } else {
          this.error = result.message;
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error stopping server:', error);
        this.error = 'Failed to stop server';
        this.loading = false;
      }
    });
  }

  /**
   * Select an endpoint
   */
  selectEndpoint(endpoint: MockEndpoint): void {
    this.selectedEndpoint = endpoint;
  }

  /**
   * Set the active tab
   */
  setActiveTab(index: number): void {
    this.activeTabIndex = index;
  }

  /**
   * Toggle the theme
   */
  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  /**
   * Refresh all data
   */
  refreshData(): void {
    this.loading = true;
    this.loadServerStatus();
    this.loadServerConfig();
    this.loadEndpoints();
  }
}
