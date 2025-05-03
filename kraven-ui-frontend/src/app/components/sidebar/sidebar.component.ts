import { Component, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { PluginService } from '../../services/plugin.service';
import { PluginRegistryService, PluginStatus } from '../../services/plugin-registry.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit, OnDestroy {
  isDarkTheme = true;
  isSidebarCollapsed = false;
  showKafka = false;
  private subscriptions: Subscription[] = [];

  @Output() sidebarToggled = new EventEmitter<boolean>();

  constructor(
    private themeService: ThemeService,
    private pluginService: PluginService,
    private pluginRegistry: PluginRegistryService
  ) {}

  ngOnInit(): void {
    // Subscribe to theme changes
    const themeSub = this.themeService.theme$.subscribe(theme => {
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
    console.log('SidebarComponent: Checking Kafka plugin status');

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

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    this.sidebarToggled.emit(this.isSidebarCollapsed);
  }
}
