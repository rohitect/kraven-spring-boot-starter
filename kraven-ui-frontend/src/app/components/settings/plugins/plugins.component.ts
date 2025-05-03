import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PluginService } from '../../../services/plugin.service';
import { RouterModule } from '@angular/router';
import { PluginRegistryService, PluginStatus } from '../../../services/plugin-registry.service';
import { Subscription } from 'rxjs';

interface Plugin {
  id: string;
  name: string;
  version: string;
  running: boolean;
  loading?: boolean;
}

@Component({
  selector: 'app-plugins',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './plugins.component.html',
  styleUrls: ['./plugins.component.scss']
})
export class PluginsComponent implements OnInit, OnDestroy {
  plugins: Plugin[] = [];
  loading = true;
  error: string | null = null;
  private subscriptions: Subscription[] = [];

  constructor(
    private pluginService: PluginService,
    private pluginRegistry: PluginRegistryService
  ) { }

  ngOnInit(): void {
    this.loadPlugins();
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadPlugins(): void {
    this.loading = true;
    this.error = null;

    console.log('Loading plugins...');

    // Use the plugin service to get the initial list of plugins
    const pluginSub = this.pluginService.getPlugins().subscribe({
      next: (plugins) => {
        console.log('Plugins loaded successfully:', plugins);
        this.plugins = plugins;
        this.loading = false;

        // Update plugin registry with the current plugins
        plugins.forEach(plugin => {
          if (plugin.running) {
            this.pluginRegistry.updatePluginStatus(plugin.id, PluginStatus.READY);
          } else {
            this.pluginRegistry.updatePluginStatus(plugin.id, PluginStatus.NOT_RUNNING);
          }
        });
      },
      error: (err) => {
        console.error('Error loading plugins', err);
        this.error = `Failed to load plugins: ${err.message || 'Unknown error'}. Please try again.`;
        this.loading = false;
        // Show empty plugins list on error
        this.plugins = [];
      },
      complete: () => {
        console.log('Plugins loading complete');
        this.loading = false;
      }
    });

    this.subscriptions.push(pluginSub);
  }

  togglePlugin(plugin: Plugin): void {
    if (plugin.running) {
      this.stopPlugin(plugin);
    } else {
      this.startPlugin(plugin);
    }
  }

  startPlugin(plugin: Plugin): void {
    console.log(`Starting plugin: ${plugin.id}`);

    // Show loading state
    plugin.loading = true;

    // Update plugin registry status to checking
    this.pluginRegistry.updatePluginStatus(plugin.id, PluginStatus.CHECKING);

    const startSub = this.pluginService.startPlugin(plugin.id).subscribe({
      next: (response) => {
        console.log(`Start plugin response:`, response);
        plugin.loading = false;

        if (response.success) {
          plugin.running = true;
          console.log(`Plugin ${plugin.id} started successfully`);

          // Update plugin registry status to ready
          this.pluginRegistry.updatePluginStatus(plugin.id, PluginStatus.READY);
        } else {
          console.error('Failed to start plugin:', response.message);
          this.error = `Failed to start plugin: ${response.message}`;
          setTimeout(() => this.error = null, 5000); // Clear error after 5 seconds

          // Update plugin registry status to not running
          this.pluginRegistry.updatePluginStatus(plugin.id, PluginStatus.NOT_RUNNING);
        }
      },
      error: (err) => {
        console.error('Error starting plugin', err);
        plugin.loading = false;
        this.error = `Error starting plugin: ${err.message || 'Unknown error'}`;
        setTimeout(() => this.error = null, 5000); // Clear error after 5 seconds

        // Update plugin registry status to error
        this.pluginRegistry.updatePluginStatus(plugin.id, PluginStatus.ERROR);
      }
    });

    this.subscriptions.push(startSub);
  }

  stopPlugin(plugin: Plugin): void {
    console.log(`Stopping plugin: ${plugin.id}`);

    // Show loading state
    plugin.loading = true;

    // Update plugin registry status to checking
    this.pluginRegistry.updatePluginStatus(plugin.id, PluginStatus.CHECKING);

    const stopSub = this.pluginService.stopPlugin(plugin.id).subscribe({
      next: (response) => {
        console.log(`Stop plugin response:`, response);
        plugin.loading = false;

        if (response.success) {
          plugin.running = false;
          console.log(`Plugin ${plugin.id} stopped successfully`);

          // Update plugin registry status to not running
          this.pluginRegistry.updatePluginStatus(plugin.id, PluginStatus.NOT_RUNNING);
        } else {
          console.error('Failed to stop plugin:', response.message);
          this.error = `Failed to stop plugin: ${response.message}`;
          setTimeout(() => this.error = null, 5000); // Clear error after 5 seconds

          // Keep the current status since we don't know if it's running or not
          // We'll refresh the plugins to get the current status
          this.loadPlugins();
        }
      },
      error: (err) => {
        console.error('Error stopping plugin', err);
        plugin.loading = false;
        this.error = `Error stopping plugin: ${err.message || 'Unknown error'}`;
        setTimeout(() => this.error = null, 5000); // Clear error after 5 seconds

        // Update plugin registry status to error
        this.pluginRegistry.updatePluginStatus(plugin.id, PluginStatus.ERROR);
      }
    });

    this.subscriptions.push(stopSub);
  }
}
