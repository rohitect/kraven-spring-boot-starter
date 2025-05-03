import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { PluginRegistryService } from '../services/plugin-registry.service';

@Injectable({
  providedIn: 'root'
})
export class PluginRouteGuard {
  constructor(
    private pluginRegistry: PluginRegistryService,
    private router: Router
  ) {}
  
  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    const pluginId = route.data['pluginId'];
    
    // If no plugin ID is specified, allow navigation
    if (!pluginId) {
      return of(true);
    }
    
    console.log(`PluginRouteGuard: Checking if plugin '${pluginId}' is ready...`);
    
    // Register the route with the plugin registry
    this.pluginRegistry.registerPluginRoute(pluginId, route.routeConfig?.path || '');
    
    // Check if the plugin is ready
    return this.pluginRegistry.checkPluginReady(pluginId).pipe(
      tap(isReady => {
        if (!isReady) {
          console.warn(`Plugin '${pluginId}' is not ready. Redirecting to home page.`);
        }
      }),
      map(isReady => isReady ? true : this.router.parseUrl('/')),
      catchError(error => {
        console.error(`Error checking plugin '${pluginId}' status:`, error);
        return of(this.router.parseUrl('/'));
      })
    );
  }
}
