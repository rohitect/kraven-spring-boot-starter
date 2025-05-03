import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PluginService } from '../../../services/plugin.service';
import { RouterModule } from '@angular/router';

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
export class PluginsComponent implements OnInit {
  plugins: Plugin[] = [];
  loading = true;
  error: string | null = null;

  constructor(private pluginService: PluginService) { }

  ngOnInit(): void {
    this.loadPlugins();
  }

  loadPlugins(): void {
    this.loading = true;
    this.error = null;

    console.log('Loading plugins...');

    this.pluginService.getPlugins().subscribe({
      next: (plugins) => {
        console.log('Plugins loaded successfully:', plugins);
        this.plugins = plugins;
        this.loading = false;
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

    this.pluginService.startPlugin(plugin.id).subscribe({
      next: (response) => {
        console.log(`Start plugin response:`, response);
        plugin.loading = false;

        if (response.success) {
          plugin.running = true;
          console.log(`Plugin ${plugin.id} started successfully`);
        } else {
          console.error('Failed to start plugin:', response.message);
          this.error = `Failed to start plugin: ${response.message}`;
          setTimeout(() => this.error = null, 5000); // Clear error after 5 seconds
        }
      },
      error: (err) => {
        console.error('Error starting plugin', err);
        plugin.loading = false;
        this.error = `Error starting plugin: ${err.message || 'Unknown error'}`;
        setTimeout(() => this.error = null, 5000); // Clear error after 5 seconds
      }
    });
  }

  stopPlugin(plugin: Plugin): void {
    console.log(`Stopping plugin: ${plugin.id}`);

    // Show loading state
    plugin.loading = true;

    this.pluginService.stopPlugin(plugin.id).subscribe({
      next: (response) => {
        console.log(`Stop plugin response:`, response);
        plugin.loading = false;

        if (response.success) {
          plugin.running = false;
          console.log(`Plugin ${plugin.id} stopped successfully`);
        } else {
          console.error('Failed to stop plugin:', response.message);
          this.error = `Failed to stop plugin: ${response.message}`;
          setTimeout(() => this.error = null, 5000); // Clear error after 5 seconds
        }
      },
      error: (err) => {
        console.error('Error stopping plugin', err);
        plugin.loading = false;
        this.error = `Error stopping plugin: ${err.message || 'Unknown error'}`;
        setTimeout(() => this.error = null, 5000); // Clear error after 5 seconds
      }
    });
  }
}
