import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PluginRegistryService, PluginStatus } from '../../../services/plugin-registry.service';
import { LoadingOverlayComponent } from '../loading-overlay/loading-overlay.component';

@Component({
  selector: 'app-plugin-loader',
  standalone: true,
  imports: [CommonModule, LoadingOverlayComponent],
  template: `
    <app-loading-overlay
      [show]="loading"
      [message]="'Checking Plugin Status'"
      [pluginId]="pluginId">
    </app-loading-overlay>

    <div *ngIf="error" class="plugin-error">
      <div class="error-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <div class="error-title">Plugin Error</div>
      <div class="error-message">{{ errorMessage }}</div>
      <button class="btn btn-primary" (click)="navigateHome()">
        Go to Home
      </button>
    </div>

    <ng-content *ngIf="!loading && !error"></ng-content>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      overflow-y: auto;
    }

    .plugin-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100%;
      padding: 2rem;
      text-align: center;
    }

    .error-icon {
      color: var(--danger-color, #dc3545);
      margin-bottom: 1rem;
    }

    .error-title {
      font-size: 1.5rem;
      font-weight: bold;
      margin-bottom: 0.5rem;
    }

    .error-message {
      margin-bottom: 1.5rem;
      max-width: 600px;
    }

    .btn {
      padding: 0.5rem 1rem;
      border-radius: 0.25rem;
      background-color: var(--primary-color, #007bff);
      color: white;
      border: none;
      cursor: pointer;
    }

    .btn:hover {
      background-color: var(--primary-color-dark, #0069d9);
    }
  `]
})
export class PluginLoaderComponent implements OnInit, OnDestroy {
  @Input() pluginId!: string;
  @Input() autoNavigateHome = true;

  loading = true;
  error = false;
  errorMessage = '';

  private subscription: Subscription | null = null;

  constructor(
    private pluginRegistry: PluginRegistryService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.pluginId) {
      console.error('Plugin ID is required for PluginLoaderComponent');
      this.error = true;
      this.errorMessage = 'Plugin ID is required';
      this.loading = false;
      return;
    }

    this.checkPluginStatus();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  navigateHome(): void {
    this.router.navigate(['/']);
  }

  private checkPluginStatus(): void {
    console.log(`PluginLoaderComponent: Checking status for plugin '${this.pluginId}'`);
    this.loading = true;
    this.error = false;

    this.subscription = this.pluginRegistry.checkPluginReady(this.pluginId).subscribe({
      next: (isReady) => {
        this.loading = false;

        if (!isReady) {
          this.error = true;
          const status = this.pluginRegistry.getPluginStatus(this.pluginId);

          switch (status) {
            case PluginStatus.NOT_REGISTERED:
              this.errorMessage = `The ${this.pluginId} plugin is not registered. Please check the plugin settings.`;
              break;
            case PluginStatus.NOT_RUNNING:
              this.errorMessage = `The ${this.pluginId} plugin is registered but not running. Please start the plugin from the settings page.`;
              break;
            case PluginStatus.ERROR:
              this.errorMessage = `An error occurred while checking the ${this.pluginId} plugin status. Please try again later.`;
              break;
            default:
              this.errorMessage = `The ${this.pluginId} plugin is not available. Please check the plugin settings.`;
          }

          if (this.autoNavigateHome) {
            console.warn(`Plugin '${this.pluginId}' is not ready. Navigating to home page...`);
            this.router.navigate(['/']);
          }
        }
      },
      error: (error) => {
        console.error(`Error checking plugin '${this.pluginId}' status:`, error);
        this.loading = false;
        this.error = true;
        this.errorMessage = `An error occurred while checking the ${this.pluginId} plugin status: ${error.message || 'Unknown error'}`;

        if (this.autoNavigateHome) {
          this.router.navigate(['/']);
        }
      }
    });
  }
}
