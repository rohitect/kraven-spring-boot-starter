import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ThemeService } from '../../../services/theme.service';
import { PluginService } from '../../../services/plugin.service';
import { PluginRegistryService, PluginStatus } from '../../../services/plugin-registry.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  exportAs: 'appHeader'
})
export class HeaderComponent implements OnInit, OnDestroy {
  isDarkTheme = false;
  showKafka = false;
  showMockServer = false;
  showActuatorInsights = false;
  private subscriptions: Subscription[] = [];

  constructor(
    private themeService: ThemeService,
    private router: Router,
    private pluginService: PluginService,
    private pluginRegistry: PluginRegistryService
  ) {}

  ngOnInit(): void {
    // Subscribe to theme changes
    const themeSub = this.themeService.theme$.subscribe((theme: 'dark' | 'light') => {
      this.isDarkTheme = theme === 'dark';
    });
    this.subscriptions.push(themeSub);

    // Check if plugins are available and running using the plugin registry
    this.checkKafkaPluginStatus();
    this.checkMockServerPluginStatus();
    this.checkActuatorInsightsPluginStatus();
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Checks if the Kafka plugin is registered and running
   */
  private checkKafkaPluginStatus(): void {


    // First, try to get the current status
    const isRegistered = this.pluginService.isPluginRegistered('kafka');
    const isRunning = this.pluginService.isPluginRunning('kafka');

    if (isRegistered && isRunning) {
      this.showKafka = true;
      return;
    }

    // If not immediately available, use the registry to check with retries
    const statusSub = this.pluginRegistry.observePluginStatus('kafka').subscribe(status => {
      this.showKafka = status === PluginStatus.READY;
    });
    this.subscriptions.push(statusSub);

    // Trigger a check
    this.pluginRegistry.checkPluginReady('kafka').subscribe();
  }

  /**
   * Checks if the Mock Server plugin is registered and running
   */
  private checkMockServerPluginStatus(): void {


    // First, try to get the current status
    const isRegistered = this.pluginService.isPluginRegistered('mock-server');
    const isRunning = this.pluginService.isPluginRunning('mock-server');

    if (isRegistered && isRunning) {
      this.showMockServer = true;
      return;
    }

    // If not immediately available, use the registry to check with retries
    const statusSub = this.pluginRegistry.observePluginStatus('mock-server').subscribe(status => {
      this.showMockServer = status === PluginStatus.READY;
    });
    this.subscriptions.push(statusSub);

    // Trigger a check
    this.pluginRegistry.checkPluginReady('mock-server').subscribe();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  isActive(route: string): boolean {
    // For the home route, require an exact match
    if (route === '/') {
      return this.router.url === route;
    }
    // For other routes, check if the URL starts with the route
    return this.router.url.startsWith(route);
  }

  /**
   * Checks if the Actuator Insights plugin is registered and running
   */
  private checkActuatorInsightsPluginStatus(): void {


    // First, try to get the current status
    const isRegistered = this.pluginService.isPluginRegistered('actuator-insights');
    const isRunning = this.pluginService.isPluginRunning('actuator-insights');

    if (isRegistered && isRunning) {
      this.showActuatorInsights = true;
      return;
    }

    // If not immediately available, use the registry to check with retries
    const statusSub = this.pluginRegistry.observePluginStatus('actuator-insights').subscribe(status => {
      this.showActuatorInsights = status === PluginStatus.READY;
    });
    this.subscriptions.push(statusSub);

    // Trigger a check
    this.pluginRegistry.checkPluginReady('actuator-insights').subscribe();
  }
}
