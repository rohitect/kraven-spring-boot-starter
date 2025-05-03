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

    // Check if Kafka plugin is available and running using the plugin registry
    this.checkKafkaPluginStatus();
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Checks if the Kafka plugin is registered and running
   */
  private checkKafkaPluginStatus(): void {
    console.log('HeaderComponent: Checking Kafka plugin status');

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
}
