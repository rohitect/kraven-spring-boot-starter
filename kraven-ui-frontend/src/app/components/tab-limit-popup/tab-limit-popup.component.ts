import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiTab } from '../../models/api-tab.model';

@Component({
  selector: 'app-tab-limit-popup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tab-limit-popup.component.html',
  styleUrls: ['./tab-limit-popup.component.scss']
})
export class TabLimitPopupComponent {
  @Input() isVisible = false;
  @Input() tabs: ApiTab[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() closeTab = new EventEmitter<string>();
  @Output() closeAllTabs = new EventEmitter<void>();

  searchTerm = '';
  filteredTabs: ApiTab[] = [];

  ngOnChanges(): void {
    this.filteredTabs = [...this.tabs];
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredTabs = [...this.tabs];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredTabs = this.tabs.filter(tab =>
      tab.title.toLowerCase().includes(term) ||
      tab.path.toLowerCase().includes(term) ||
      tab.method.toLowerCase().includes(term)
    );
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filteredTabs = [...this.tabs];
  }

  closePopup(): void {
    this.close.emit();
  }

  onCloseTab(id: string, event: Event): void {
    event.stopPropagation();
    this.closeTab.emit(id);
  }

  onCloseAllTabs(): void {
    this.closeAllTabs.emit();
  }

  formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString();
  }
}
