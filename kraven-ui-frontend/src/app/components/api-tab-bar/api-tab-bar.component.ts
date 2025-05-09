import { Component, EventEmitter, Input, Output, ElementRef, ViewChild, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiTab } from '../../models/api-tab.model';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { TooltipDirective } from '../../directives/tooltip.directive';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { ContextMenuComponent, ContextMenuItem } from '../context-menu/context-menu.component';

@Component({
  selector: 'app-api-tab-bar',
  standalone: true,
  imports: [CommonModule, DragDropModule, TooltipDirective, ConfirmationDialogComponent, ContextMenuComponent],
  templateUrl: './api-tab-bar.component.html',
  styleUrls: ['./api-tab-bar.component.scss']
})
export class ApiTabBarComponent implements AfterViewInit, OnChanges {
  @Input() tabs: ApiTab[] = [];
  @Input() activeTabId: string | null = null;
  @Output() tabSelected = new EventEmitter<string>();
  @Output() tabClosed = new EventEmitter<string>();
  @Output() showApiInfo = new EventEmitter<void>();
  @Output() tabReordered = new EventEmitter<{tabId: string, newIndex: number}>();
  @Output() closeAllTabs = new EventEmitter<void>();
  @Output() closeOtherTabs = new EventEmitter<string>();
  @Output() toggleFavorite = new EventEmitter<ApiTab>();

  @ViewChild('tabsContainer') tabsContainer!: ElementRef;

  showScrollLeft = false;
  showScrollRight = false;

  // Confirmation dialog properties
  showConfirmDialog = false;
  tabToClose: string | null = null;

  // Context menu properties
  contextMenuX = 0;
  contextMenuY = 0;
  showContextMenu = false;
  contextMenuItems: ContextMenuItem[] = [];
  contextMenuTabId: string | null = null;

  constructor() {}

  ngAfterViewInit(): void {
    this.checkScroll();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['tabs'] || changes['activeTabId']) && this.tabsContainer) {
      // Use a slightly longer timeout to ensure DOM is fully updated
      setTimeout(() => {
        this.checkScroll();

        // If activeTabId changed, scroll to the active tab
        if (changes['activeTabId'] && this.activeTabId) {
          this.scrollToActiveTab();
        }
      }, 100);
    }
  }

  selectTab(id: string, event: Event): void {
    event.preventDefault();
    this.tabSelected.emit(id);

    // Set a timeout to scroll to the tab after it's been selected
    setTimeout(() => {
      this.activeTabId = id;
      this.scrollToActiveTab();
    }, 50);
  }

  closeTab(id: string, event: Event): void {
    event.stopPropagation();
    this.tabToClose = id;
    this.showConfirmDialog = true;
  }

  confirmCloseTab(): void {
    if (this.tabToClose) {
      this.tabClosed.emit(this.tabToClose);
      this.tabToClose = null;
    }
    this.showConfirmDialog = false;
  }

  cancelCloseTab(): void {
    this.tabToClose = null;
    this.showConfirmDialog = false;
  }

  onShowApiInfo(): void {
    this.showApiInfo.emit();
  }

  scrollLeft(): void {
    if (this.tabsContainer && this.showScrollLeft) {
      const container = this.tabsContainer.nativeElement;

      // Find the tabs that are partially or fully visible
      const visibleTabs = this.findVisibleTabs();

      // If we have visible tabs, scroll to the previous tab that's not fully visible
      if (visibleTabs.firstFullyVisible > 0) {
        // Scroll to the previous tab
        const targetTab = container.querySelectorAll('.tab, .api-info-tab')[visibleTabs.firstFullyVisible - 1];
        if (targetTab) {
          // Scroll to center the tab
          const tabCenter = targetTab.offsetLeft + (targetTab.offsetWidth / 2);
          const containerCenter = container.clientWidth / 2;
          container.scrollTo({
            left: Math.max(0, tabCenter - containerCenter),
            behavior: 'smooth'
          });
        }
      } else {
        // If the first visible tab is already the first tab, just scroll a fixed amount
        const scrollAmount = Math.max(150, Math.floor(container.clientWidth / 2));
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      }

      setTimeout(() => this.checkScroll(), 300);
    }
  }

  scrollRight(): void {
    if (this.tabsContainer && this.showScrollRight) {
      const container = this.tabsContainer.nativeElement;

      // Find the tabs that are partially or fully visible
      const visibleTabs = this.findVisibleTabs();

      // If we have visible tabs, scroll to the next tab that's not fully visible
      if (visibleTabs.lastFullyVisible < container.querySelectorAll('.tab, .api-info-tab').length - 1) {
        // Scroll to the next tab
        const targetTab = container.querySelectorAll('.tab, .api-info-tab')[visibleTabs.lastFullyVisible + 1];
        if (targetTab) {
          // Scroll to center the tab
          const tabCenter = targetTab.offsetLeft + (targetTab.offsetWidth / 2);
          const containerCenter = container.clientWidth / 2;
          container.scrollTo({
            left: Math.max(0, tabCenter - containerCenter),
            behavior: 'smooth'
          });
        }
      } else {
        // If the last visible tab is already the last tab, just scroll a fixed amount
        const scrollAmount = Math.max(150, Math.floor(container.clientWidth / 2));
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }

      setTimeout(() => this.checkScroll(), 300);
    }
  }

  /**
   * Find which tabs are visible in the container
   */
  private findVisibleTabs(): { firstPartiallyVisible: number, firstFullyVisible: number, lastFullyVisible: number, lastPartiallyVisible: number } {
    if (!this.tabsContainer) {
      return { firstPartiallyVisible: 0, firstFullyVisible: 0, lastFullyVisible: 0, lastPartiallyVisible: 0 };
    }

    const container = this.tabsContainer.nativeElement;
    const containerRect = container.getBoundingClientRect();
    const tabs = container.querySelectorAll('.tab, .api-info-tab');

    let firstPartiallyVisible = -1;
    let firstFullyVisible = -1;
    let lastFullyVisible = -1;
    let lastPartiallyVisible = -1;

    for (let i = 0; i < tabs.length; i++) {
      const tabRect = tabs[i].getBoundingClientRect();

      // Check if the tab is partially visible
      const isPartiallyVisible =
        (tabRect.left < containerRect.right && tabRect.right > containerRect.left);

      // Check if the tab is fully visible
      const isFullyVisible =
        (tabRect.left >= containerRect.left && tabRect.right <= containerRect.right);

      if (isPartiallyVisible) {
        if (firstPartiallyVisible === -1) firstPartiallyVisible = i;
        lastPartiallyVisible = i;
      }

      if (isFullyVisible) {
        if (firstFullyVisible === -1) firstFullyVisible = i;
        lastFullyVisible = i;
      }
    }

    // If no tabs are fully visible, use partially visible ones
    if (firstFullyVisible === -1) firstFullyVisible = firstPartiallyVisible;
    if (lastFullyVisible === -1) lastFullyVisible = lastPartiallyVisible;

    return {
      firstPartiallyVisible,
      firstFullyVisible,
      lastFullyVisible,
      lastPartiallyVisible
    };
  }

  private checkScroll(): void {
    if (!this.tabsContainer) return;

    const container = this.tabsContainer.nativeElement;

    // Add a small buffer (1px) to account for rounding errors
    this.showScrollLeft = container.scrollLeft > 1;

    // Check if there's more content to scroll to (with a small buffer)
    const maxScroll = container.scrollWidth - container.clientWidth;
    this.showScrollRight = container.scrollLeft < (maxScroll - 1);

    // Force a check after a short delay to handle edge cases
    if (!this.showScrollRight && container.scrollLeft >= maxScroll - 5) {
      setTimeout(() => {
        const updatedMaxScroll = container.scrollWidth - container.clientWidth;
        this.showScrollRight = container.scrollLeft < (updatedMaxScroll - 1);
      }, 100);
    }
  }

  private scrollToActiveTab(): void {
    if (!this.tabsContainer || !this.activeTabId) return;

    const container = this.tabsContainer.nativeElement;
    const activeTab = container.querySelector(`[data-tab-id="${this.activeTabId}"]`);

    if (activeTab) {
      // Get the positions and dimensions
      const tabRect = activeTab.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // Calculate if the tab is fully visible
      const isTabFullyVisible =
        tabRect.left >= containerRect.left &&
        tabRect.right <= containerRect.right;

      if (!isTabFullyVisible) {
        // Calculate the scroll position to center the tab
        const tabCenter = activeTab.offsetLeft + (activeTab.offsetWidth / 2);
        const containerCenter = container.clientWidth / 2;
        const scrollPosition = tabCenter - containerCenter;

        // Scroll with animation
        container.scrollTo({
          left: Math.max(0, scrollPosition),
          behavior: 'smooth'
        });

        // Update scroll buttons after scrolling
        setTimeout(() => this.checkScroll(), 300);
      }
    }
  }

  onScroll(): void {
    this.checkScroll();
  }

  getMethodClass(method: string): string {
    return method.toLowerCase();
  }

  /**
   * Generate tooltip content for a tab
   */
  getTabTooltip(tab: ApiTab): string {
    let tooltip = `<strong>${tab.method} ${tab.path}</strong>`;

    if (tab.endpoint?.summary) {
      tooltip += `<br><br>${tab.endpoint.summary}`;
    }

    if (tab.endpoint?.description) {
      tooltip += `<br><br>${tab.endpoint.description}`;
    }

    return tooltip;
  }

  /**
   * Handle tab drop event for reordering
   */
  onTabDrop(event: CdkDragDrop<ApiTab[]>): void {
    if (event.previousIndex !== event.currentIndex) {
      const tabId = this.tabs[event.previousIndex].id;
      this.tabReordered.emit({ tabId, newIndex: event.currentIndex });
    }
  }

  /**
   * Handle right-click on a tab to show context menu
   */
  onTabRightClick(event: MouseEvent, tabId: string): void {
    event.preventDefault();
    event.stopPropagation();

    // Set the context menu position
    this.contextMenuX = event.clientX;
    this.contextMenuY = event.clientY;
    this.contextMenuTabId = tabId;

    // Find the tab
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;

    // Build the context menu items
    this.contextMenuItems = [
      {
        label: 'Close',
        icon: 'close',
        action: 'close'
      },
      {
        label: 'Close All',
        icon: 'close-all',
        action: 'close-all'
      },
      {
        label: 'Close Others',
        icon: 'close-others',
        action: 'close-others',
        disabled: this.tabs.length <= 1
      },
      {
        divider: true,
        label: '',
        action: ''
      },
      {
        label: tab.isFavorite ? 'Remove from Favorites' : 'Add to Favorites',
        icon: tab.isFavorite ? 'unfavorite' : 'favorite',
        action: 'toggle-favorite'
      },
      {
        divider: true,
        label: '',
        action: ''
      },
      {
        label: 'Copy URL',
        icon: 'copy',
        action: 'copy-url'
      }
    ];

    // Show the context menu
    this.showContextMenu = true;
  }

  /**
   * Handle context menu item click
   */
  onContextMenuItemClick(action: string): void {
    if (!this.contextMenuTabId) return;

    const tab = this.tabs.find(t => t.id === this.contextMenuTabId);
    if (!tab) return;

    switch (action) {
      case 'close':
        this.closeTab(this.contextMenuTabId, new Event('click'));
        break;
      case 'close-all':
        this.closeAllTabs.emit();
        break;
      case 'close-others':
        this.closeOtherTabs.emit(this.contextMenuTabId);
        break;
      case 'toggle-favorite':
        this.toggleFavorite.emit(tab);
        break;
      case 'copy-url':
        this.copyTabUrl(tab);
        break;
    }

    // Reset context menu
    this.contextMenuTabId = null;
  }

  /**
   * Copy the tab URL to clipboard
   */
  private copyTabUrl(tab: ApiTab): void {
    // Create the URL for the tab
    const url = `/api-docs/tab/${tab.id}`;

    // Copy to clipboard
    navigator.clipboard.writeText(window.location.origin + url)
      .then(() => {
        console.log('URL copied to clipboard');
      })
      .catch(err => {
        console.error('Could not copy URL: ', err);
      });
  }

  /**
   * Close the context menu
   */
  onContextMenuClosed(): void {
    this.showContextMenu = false;
    this.contextMenuTabId = null;
  }
}
