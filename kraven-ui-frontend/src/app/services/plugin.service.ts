import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, shareReplay, catchError } from 'rxjs/operators';
import { ConfigService } from './config.service';

export interface Plugin {
  id: string;
  name: string;
  version: string;
  running: boolean;
}

export interface NavigationItem {
  id: string;
  label: string;
}

export interface PluginResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class PluginService {
  private baseUrl: string;
  private apiPath: string;
  private plugins$ = new BehaviorSubject<Plugin[]>([]);
  private navigationItems$ = new BehaviorSubject<NavigationItem[]>([]);

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {
    this.baseUrl = window.location.origin;
    this.apiPath = this.configService.getApiBasePath();
  }

  // Cache for the getPlugins request
  private pluginsCache$: Observable<Plugin[]> | null = null;
  private lastFetchTime = 0;
  private cacheDuration = 10000; // 10 seconds cache duration

  getPlugins(): Observable<Plugin[]> {
    const currentTime = Date.now();

    // If we have a cached observable and it's still valid, return it
    if (this.pluginsCache$ && (currentTime - this.lastFetchTime < this.cacheDuration)) {
      console.log('Using cached plugins data');
      return this.pluginsCache$;
    }

    // Otherwise, make a new request
    const url = `${this.baseUrl}${this.apiPath}/plugins`;
    console.log('Fetching plugins from:', url);

    // Create a new observable and cache it
    this.lastFetchTime = currentTime;
    this.pluginsCache$ = this.http.get<Plugin[]>(url).pipe(
      tap(plugins => {
        console.log('Received plugins:', plugins);
        this.plugins$.next(plugins);
      }),
      catchError(error => {
        console.error('Error fetching plugins:', error);
        // Return an empty array on error
        return of([]);
      }),
      // Use shareReplay to share the response with all subscribers
      shareReplay(1)
    );

    return this.pluginsCache$;
  }

  getNavigationItems(): Observable<NavigationItem[]> {
    const url = `${this.baseUrl}${this.apiPath}/plugins/navigation`;
    console.log('Fetching navigation items from:', url);

    return this.http.get<NavigationItem[]>(url).pipe(
      tap(items => {
        console.log('Received navigation items:', items);
        this.navigationItems$.next(items);
      }),
      catchError(error => {
        console.error('Error fetching navigation items:', error);
        // Return an empty array on error
        return of([]);
      }),
      shareReplay(1)
    );
  }

  startPlugin(pluginId: string): Observable<PluginResponse> {
    const url = `${this.baseUrl}${this.apiPath}/plugins/${pluginId}/start`;
    console.log(`Starting plugin ${pluginId} at:`, url);

    return this.http.post<PluginResponse>(url, {}).pipe(
      tap(response => {
        console.log(`Plugin ${pluginId} start response:`, response);
        this.refreshPlugins();
      }),
      catchError(error => {
        console.error(`Error starting plugin ${pluginId}:`, error);
        return of({ success: false, message: `Failed to start plugin: ${error.message || 'Unknown error'}` });
      })
    );
  }

  stopPlugin(pluginId: string): Observable<PluginResponse> {
    const url = `${this.baseUrl}${this.apiPath}/plugins/${pluginId}/stop`;
    console.log(`Stopping plugin ${pluginId} at:`, url);

    return this.http.post<PluginResponse>(url, {}).pipe(
      tap(response => {
        console.log(`Plugin ${pluginId} stop response:`, response);
        this.refreshPlugins();
      }),
      catchError(error => {
        console.error(`Error stopping plugin ${pluginId}:`, error);
        return of({ success: false, message: `Failed to stop plugin: ${error.message || 'Unknown error'}` });
      })
    );
  }

  isPluginRunning(pluginId: string): boolean {
    // Get the current plugins from the BehaviorSubject
    const plugins = this.plugins$.getValue();

    // If we don't have any plugins yet, try to fetch them
    if (plugins.length === 0) {
      // This is a synchronous method, so we can't wait for the HTTP request to complete
      // Instead, we'll trigger the request and return false for now
      this.getPlugins().subscribe();
      return false;
    }

    // Find the plugin with the given ID
    const plugin = plugins.find(p => p.id === pluginId);

    // Return true if the plugin exists and is running, false otherwise
    return plugin ? plugin.running : false;
  }

  /**
   * Checks if a plugin with the given ID is registered (exists), regardless of its running state.
   * @param pluginId The ID of the plugin to check
   * @returns True if the plugin exists, false otherwise
   */
  isPluginRegistered(pluginId: string): boolean {
    // Get the current plugins from the BehaviorSubject
    const plugins = this.plugins$.getValue();

    // If we don't have any plugins yet, try to fetch them
    if (plugins.length === 0) {
      // This is a synchronous method, so we can't wait for the HTTP request to complete
      // Instead, we'll trigger the request and return false for now
      this.getPlugins().subscribe();
      return false;
    }

    // Find the plugin with the given ID
    const plugin = plugins.find(p => p.id === pluginId);

    // Return true if the plugin exists, false otherwise
    return !!plugin;
  }

  /**
   * Refreshes the plugins by invalidating the cache and fetching fresh data
   * @private Used internally when plugin state changes
   */
  private refreshPlugins(): void {
    this.forceRefreshPlugins();
  }

  /**
   * Forces a refresh of the plugins by invalidating the cache and fetching fresh data
   * @returns An observable of the refreshed plugins
   */
  public forceRefreshPlugins(): Observable<Plugin[]> {
    // Invalidate the cache
    this.pluginsCache$ = null;
    this.lastFetchTime = 0;

    // Fetch fresh data and return the observable
    return this.getPlugins();
  }
}
