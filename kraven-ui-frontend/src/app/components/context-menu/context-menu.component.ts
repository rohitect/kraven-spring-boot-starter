import { Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ContextMenuItem {
  label: string;
  icon?: string;
  action: string;
  disabled?: boolean;
  divider?: boolean;
}

@Component({
  selector: 'app-context-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.scss']
})
export class ContextMenuComponent {
  @Input() items: ContextMenuItem[] = [];
  @Input() x: number = 0;
  @Input() y: number = 0;
  @Input() visible: boolean = false;
  @Output() menuItemClicked = new EventEmitter<string>();
  @Output() menuClosed = new EventEmitter<void>();

  constructor(private elementRef: ElementRef) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Close the menu if clicked outside
    if (this.visible && !this.elementRef.nativeElement.contains(event.target)) {
      this.closeMenu();
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    // Close the menu when Escape key is pressed
    if (this.visible) {
      this.closeMenu();
    }
  }

  onMenuItemClick(action: string): void {
    this.menuItemClicked.emit(action);
    this.closeMenu();
  }

  closeMenu(): void {
    this.visible = false;
    this.menuClosed.emit();
  }
}
