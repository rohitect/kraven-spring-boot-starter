import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ThemeService } from './theme.service';
import { PluginService } from './plugin.service';

@Injectable({
  providedIn: 'root'
})
export class KeyboardShortcutsService {
  private isMac: boolean = false;
  private availableRoutes: string[] = [];
  private boundHandleKeyDown: (event: KeyboardEvent) => void;

  constructor(
    private router: Router,
    private themeService: ThemeService,
    private pluginService: PluginService
  ) {
    this.isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    this.updateAvailableRoutes();

    // Bind the event handler once to maintain the same reference
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
  }

  /**
   * Initialize keyboard shortcuts
   */
  initialize(): void {
    document.addEventListener('keydown', this.boundHandleKeyDown);
  }

  /**
   * Clean up keyboard shortcuts
   */
  destroy(): void {
    document.removeEventListener('keydown', this.boundHandleKeyDown);
  }

  /**
   * Update available routes based on enabled plugins
   */
  updateAvailableRoutes(): void {
    this.availableRoutes = [
      '/',           // Tab 1
      '/overview',   // Tab 2
      '/api-docs',   // Tab 3
      '/feign-clients', // Tab 4
      '/documentation'  // Tab 5
    ];

    // Note: Plugin routes are not included in keyboard shortcuts
    // to maintain consistent tab numbering
  }

  /**
   * Handle keyboard events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    const isCtrlOrCmd = this.isMac ? event.metaKey : event.ctrlKey;
    const isAltOrOption = this.isMac ? event.altKey : event.altKey;



    // Ignore shortcuts when user is typing in input fields
    if (this.isInputFocused()) {
      return;
    }

    // Tab navigation shortcuts - using bracket keys that work better cross-platform
    // Ctrl/Cmd + ] - Navigate forward through tabs
    if (isCtrlOrCmd && (event.key === ']' || event.keyCode === 221) && !event.shiftKey) {
      event.preventDefault();
      this.navigateToNextTab();
      return;
    }

    // Ctrl/Cmd + [ - Navigate backward through tabs
    if (isCtrlOrCmd && (event.key === '[' || event.keyCode === 219) && !event.shiftKey) {
      event.preventDefault();
      this.navigateToPreviousTab();
      return;
    }

    // Ctrl/Cmd + Alt/Option + Number - Switch to specific tab
    // Use keyCode instead of key because Option+number produces special characters on Mac
    if (isCtrlOrCmd && isAltOrOption && event.keyCode >= 49 && event.keyCode <= 53) {
      event.preventDefault();
      const tabNumber = event.keyCode - 48; // Convert keyCode to number (49-53 -> 1-5)
      this.navigateToTab(tabNumber);
      return;
    }

    // Ctrl/Cmd + Alt/Option + S - Open Settings
    // Use keyCode for reliable detection (S = 83)
    if (isCtrlOrCmd && isAltOrOption && event.keyCode === 83) {
      event.preventDefault();
      this.router.navigate(['/settings/plugins']);
      return;
    }

    // Ctrl/Cmd + Alt/Option + T - Toggle Theme
    // Use keyCode for reliable detection (T = 84)
    if (isCtrlOrCmd && isAltOrOption && event.keyCode === 84) {
      event.preventDefault();
      this.themeService.toggleTheme();
      return;
    }
  }

  /**
   * Check if an input field is currently focused
   */
  private isInputFocused(): boolean {
    const activeElement = document.activeElement;
    if (!activeElement) return false;

    const tagName = activeElement.tagName.toLowerCase();
    const isContentEditable = activeElement.getAttribute('contenteditable') === 'true';

    return tagName === 'input' ||
           tagName === 'textarea' ||
           tagName === 'select' ||
           isContentEditable;
  }

  /**
   * Navigate to the next tab
   */
  private navigateToNextTab(): void {
    this.updateAvailableRoutes();
    const currentRoute = this.router.url;
    const currentIndex = this.availableRoutes.findIndex(route =>
      route === '/' ? currentRoute === route : currentRoute.startsWith(route)
    );

    if (currentIndex === -1) return;

    const nextIndex = (currentIndex + 1) % this.availableRoutes.length;
    this.router.navigate([this.availableRoutes[nextIndex]]);
  }

  /**
   * Navigate to the previous tab
   */
  private navigateToPreviousTab(): void {
    this.updateAvailableRoutes();
    const currentRoute = this.router.url;
    const currentIndex = this.availableRoutes.findIndex(route =>
      route === '/' ? currentRoute === route : currentRoute.startsWith(route)
    );

    if (currentIndex === -1) return;

    const previousIndex = currentIndex === 0 ?
      this.availableRoutes.length - 1 :
      currentIndex - 1;
    this.router.navigate([this.availableRoutes[previousIndex]]);
  }

  /**
   * Navigate to a specific tab by number
   */
  private navigateToTab(tabNumber: number): void {
    this.updateAvailableRoutes();

    // Tab numbers are 1-based, array indices are 0-based
    const routeIndex = tabNumber - 1;

    if (routeIndex >= 0 && routeIndex < this.availableRoutes.length) {
      this.router.navigate([this.availableRoutes[routeIndex]]);
    }
  }

  /**
   * Get available routes for external use
   */
  getAvailableRoutes(): string[] {
    this.updateAvailableRoutes();
    return [...this.availableRoutes];
  }
}
