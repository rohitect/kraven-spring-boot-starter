import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, timer } from 'rxjs';
import { catchError, map, switchMap, take, tap } from 'rxjs/operators';
import { PluginService } from './plugin.service';
import { Router } from '@angular/router';

export interface PluginInfo {
  id: string;
  routes: string[];
  status: PluginStatus;
}

export enum PluginStatus {
  UNKNOWN = 'unknown',
  CHECKING = 'checking',
  READY = 'ready',
  NOT_REGISTERED = 'not_registered',
  NOT_RUNNING = 'not_running',
  ERROR = 'error'
}

@Injectable({
  providedIn: 'root'
})
export class PluginRegistryService {
  private plugins = new Map<string, PluginInfo>();
  private pluginStatus = new BehaviorSubject<Map<string, PluginStatus>>(new Map());
  private maxRetries = 10;
  private retryDelay = 1000; // ms

  constructor(
    private pluginService: PluginService,
    private router: Router
  ) {
    // Initialize with empty status map
    this.pluginStatus.next(new Map());
  }

  /**
   * Registers a plugin route
   * @param pluginId The ID of the plugin
   * @param route The route associated with the plugin
   */
  registerPluginRoute(pluginId: string, route: string): void {
    const plugin = this.plugins.get(pluginId);

    if (plugin) {
      // Add route if it doesn't exist
      if (!plugin.routes.includes(route)) {
        plugin.routes.push(route);
      }
    } else {
      // Create new plugin info
      this.plugins.set(pluginId, {
        id: pluginId,
        routes: [route],
        status: PluginStatus.UNKNOWN
      });
    }

    console.log(`Registered route '${route}' for plugin '${pluginId}'`);
  }

  /**
   * Gets the plugin ID for a route
   * @param route The route to check
   * @returns The plugin ID or null if not found
   */
  getPluginIdForRoute(route: string): string | null {
    for (const [pluginId, plugin] of this.plugins.entries()) {
      if (plugin.routes.some(r => route.startsWith(r))) {
        return pluginId;
      }
    }
    return null;
  }

  /**
   * Checks if a plugin is ready (registered and running)
   * @param pluginId The ID of the plugin to check
   * @returns An observable that emits true if the plugin is ready, false otherwise
   */
  checkPluginReady(pluginId: string): Observable<boolean> {
    console.log(`Checking if plugin '${pluginId}' is ready...`);

    // Update status to checking
    this.updatePluginStatus(pluginId, PluginStatus.CHECKING);

    // First, try to get the current status
    const isRegistered = this.pluginService.isPluginRegistered(pluginId);
    const isRunning = this.pluginService.isPluginRunning(pluginId);

    console.log(`Initial check - Plugin '${pluginId}' registered: ${isRegistered}, running: ${isRunning}`);

    // If the plugin is already registered and running, return true immediately
    if (isRegistered && isRunning) {
      this.updatePluginStatus(pluginId, PluginStatus.READY);
      return of(true);
    }

    // Otherwise, fetch the plugins and retry checking
    return this.retryPluginCheck(pluginId, 0);
  }

  /**
   * Gets the current status of a plugin
   * @param pluginId The ID of the plugin
   * @returns The current status
   */
  getPluginStatus(pluginId: string): PluginStatus {
    const statusMap = this.pluginStatus.getValue();
    return statusMap.get(pluginId) || PluginStatus.UNKNOWN;
  }

  /**
   * Gets the plugin status as an observable
   * @param pluginId The ID of the plugin
   * @returns An observable of the plugin status
   */
  observePluginStatus(pluginId: string): Observable<PluginStatus> {
    return this.pluginStatus.pipe(
      map(statusMap => statusMap.get(pluginId) || PluginStatus.UNKNOWN)
    );
  }

  /**
   * Retries checking the plugin status with a delay between retries
   * @param pluginId The ID of the plugin to check
   * @param retryCount The current retry count
   * @returns An observable that emits true if the plugin is ready, false otherwise
   */
  private retryPluginCheck(pluginId: string, retryCount: number): Observable<boolean> {
    if (retryCount >= this.maxRetries) {
      console.warn(`Maximum retries reached for plugin '${pluginId}'. Giving up.`);

      // Update status based on last check
      const isRegistered = this.pluginService.isPluginRegistered(pluginId);
      if (!isRegistered) {
        this.updatePluginStatus(pluginId, PluginStatus.NOT_REGISTERED);
      } else {
        this.updatePluginStatus(pluginId, PluginStatus.NOT_RUNNING);
      }

      return of(false);
    }

    console.log(`Retry ${retryCount + 1}/${this.maxRetries} for plugin '${pluginId}'`);

    // Fetch the plugins
    return this.pluginService.getPlugins().pipe(
      // Wait for the response
      switchMap(() => {
        // Check if the plugin is registered and running
        const isRegistered = this.pluginService.isPluginRegistered(pluginId);
        const isRunning = this.pluginService.isPluginRunning(pluginId);

        console.log(`Retry ${retryCount + 1} - Plugin '${pluginId}' registered: ${isRegistered}, running: ${isRunning}`);

        if (isRegistered && isRunning) {
          // Plugin is registered and running, return true
          this.updatePluginStatus(pluginId, PluginStatus.READY);
          return of(true);
        } else {
          // Plugin is not registered or not running, retry after delay
          return timer(this.retryDelay).pipe(
            switchMap(() => this.retryPluginCheck(pluginId, retryCount + 1))
          );
        }
      }),
      catchError(error => {
        console.error(`Error checking plugin '${pluginId}' status:`, error);
        this.updatePluginStatus(pluginId, PluginStatus.ERROR);
        return of(false);
      })
    );
  }

  /**
   * Updates the status of a plugin
   * @param pluginId The ID of the plugin
   * @param status The new status
   */
  updatePluginStatus(pluginId: string, status: PluginStatus): void {
    console.log(`Updating plugin '${pluginId}' status to '${status}'`);

    // Update plugin info
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.status = status;
    } else {
      this.plugins.set(pluginId, {
        id: pluginId,
        routes: [],
        status
      });
    }

    // Update status map
    const statusMap = this.pluginStatus.getValue();
    statusMap.set(pluginId, status);
    this.pluginStatus.next(statusMap);
  }
}
