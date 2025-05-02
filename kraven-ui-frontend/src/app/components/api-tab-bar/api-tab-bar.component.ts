import { Component, EventEmitter, Input, Output, ElementRef, ViewChild, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiTab } from '../../models/api-tab.model';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { TooltipDirective } from '../../directives/tooltip.directive';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-api-tab-bar',
  standalone: true,
  imports: [CommonModule, DragDropModule, TooltipDirective, ConfirmationDialogComponent],
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

  @ViewChild('tabsContainer') tabsContainer!: ElementRef;

  showScrollLeft = false;
  showScrollRight = false;

  // Confirmation dialog properties
  showConfirmDialog = false;
  tabToClose: string | null = null;

  constructor() {}

  ngAfterViewInit(): void {
    this.checkScroll();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['tabs'] || changes['activeTabId']) && this.tabsContainer) {
      setTimeout(() => {
        this.checkScroll();
        this.scrollToActiveTab();
      });
    }
  }

  selectTab(id: string, event: Event): void {
    event.preventDefault();
    this.tabSelected.emit(id);
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
    if (this.tabsContainer) {
      this.tabsContainer.nativeElement.scrollBy({ left: -200, behavior: 'smooth' });
      setTimeout(() => this.checkScroll(), 300);
    }
  }

  scrollRight(): void {
    if (this.tabsContainer) {
      this.tabsContainer.nativeElement.scrollBy({ left: 200, behavior: 'smooth' });
      setTimeout(() => this.checkScroll(), 300);
    }
  }

  private checkScroll(): void {
    if (!this.tabsContainer) return;

    const container = this.tabsContainer.nativeElement;
    this.showScrollLeft = container.scrollLeft > 0;
    this.showScrollRight = container.scrollLeft < (container.scrollWidth - container.clientWidth);
  }

  private scrollToActiveTab(): void {
    if (!this.tabsContainer || !this.activeTabId) return;

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
}
