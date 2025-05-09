import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

export interface ActuatorTab {
  id: string;
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-actuator-tab-container',
  templateUrl: './actuator-tab-container.component.html',
  styleUrls: ['./actuator-tab-container.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class ActuatorTabContainerComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('tabsContainer') tabsContainer!: ElementRef;

  tabs: ActuatorTab[] = [
    { id: 'health', label: 'Health & Status', icon: 'fa-heartbeat', route: 'health' },
    { id: 'metrics', label: 'Metrics & Performance', icon: 'fa-chart-line', route: 'metrics' },
    { id: 'environment', label: 'Environment & Config', icon: 'fa-cogs', route: 'environment' },
    { id: 'beans', label: 'Beans & Dependencies', icon: 'fa-project-diagram', route: 'beans' },
    { id: 'threads', label: 'Thread Analysis', icon: 'fa-microchip', route: 'threads' },
    { id: 'conditions', label: 'Conditions Report', icon: 'fa-code-branch', route: 'conditions' }
  ];

  activeTabId: string;
  showScrollLeft = false;
  showScrollRight = false;
  private routeSubscription?: Subscription;

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Initialize activeTabId from localStorage if available, otherwise use default
    const savedTabId = localStorage.getItem('actuator-insights-active-tab');
    if (savedTabId && this.tabs.some(tab => tab.id === savedTabId)) {
      this.activeTabId = savedTabId;
    } else {
      this.activeTabId = 'health'; // Default tab
    }
  }

  ngOnInit(): void {
    // First, determine the active tab from the current URL
    this.determineActiveTabFromUrl();

    // Then subscribe to route changes to update active tab
    this.routeSubscription = this.route.children[0]?.url.subscribe(() => {
      this.determineActiveTabFromUrl();
    });
  }

  /**
   * Determine the active tab from the current URL
   */
  private determineActiveTabFromUrl(): void {
    // Get the current URL path
    const urlPath = this.router.url;

    // Find the tab that matches the current URL
    for (const tab of this.tabs) {
      if (urlPath.includes(`/${tab.route}`)) {
        this.activeTabId = tab.id;
        return;
      }
    }

    // If no matching tab is found, check localStorage
    const savedTabId = localStorage.getItem('actuator-insights-active-tab');
    if (savedTabId && this.tabs.some(tab => tab.id === savedTabId)) {
      this.activeTabId = savedTabId;
      // Navigate to the saved tab
      this.navigateToTab(savedTabId);
      return;
    }

    // If no matching tab is found in localStorage, use the default tab
    if (this.route.snapshot.firstChild === null) {
      // If no tab is specified in the URL, navigate to the default tab
      this.navigateToTab(this.activeTabId);
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.checkScroll();
      this.scrollToActiveTab();
    });
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  selectTab(tabId: string): void {
    if (this.activeTabId !== tabId) {
      this.activeTabId = tabId;

      // Store the active tab ID in localStorage
      localStorage.setItem('actuator-insights-active-tab', tabId);

      this.navigateToTab(tabId);
    }
  }

  navigateToTab(tabId: string): void {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      // Store the active tab ID in localStorage to persist across page refreshes
      localStorage.setItem('actuator-insights-active-tab', tabId);

      // Navigate to the tab route
      this.router.navigate([tab.route], { relativeTo: this.route.parent });
    }
  }

  scrollLeft(): void {
    if (this.tabsContainer) {
      const container = this.tabsContainer.nativeElement;
      container.scrollBy({ left: -200, behavior: 'smooth' });
    }
  }

  scrollRight(): void {
    if (this.tabsContainer) {
      const container = this.tabsContainer.nativeElement;
      container.scrollBy({ left: 200, behavior: 'smooth' });
    }
  }

  onScroll(): void {
    this.checkScroll();
  }

  private checkScroll(): void {
    if (!this.tabsContainer) return;

    const container = this.tabsContainer.nativeElement;
    this.showScrollLeft = container.scrollLeft > 0;
    this.showScrollRight = container.scrollLeft < (container.scrollWidth - container.clientWidth - 1);
  }

  private scrollToActiveTab(): void {
    if (!this.tabsContainer) return;

    const container = this.tabsContainer.nativeElement;
    const activeTab = container.querySelector(`[data-tab-id="${this.activeTabId}"]`);

    if (activeTab) {
      // Check if the active tab is fully visible
      const tabRect = activeTab.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      if (tabRect.left < containerRect.left || tabRect.right > containerRect.right) {
        // Scroll to make the active tab visible
        activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }
  }
}
