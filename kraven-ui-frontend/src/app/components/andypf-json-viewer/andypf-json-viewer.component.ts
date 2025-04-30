import { Component, Input, OnChanges, SimpleChanges, AfterViewInit, ElementRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import '@andypf/json-viewer';

@Component({
  selector: 'app-andypf-json-viewer',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<andypf-json-viewer #jsonViewer></andypf-json-viewer>`,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `]
})
export class AndypfJsonViewerComponent implements OnChanges, AfterViewInit {
  @Input() json: any;
  @Input() expanded: boolean | number = true;
  @Input() theme: string = 'default-dark';
  @Input() showDataTypes: boolean = true;
  @Input() showToolbar: boolean = false;
  @Input() expandIconType: 'square' | 'circle' | 'arrow' = 'arrow';
  @Input() showCopy: boolean = true;
  @Input() showSize: boolean = true;
  @Input() indent: number = 2;

  constructor(private elementRef: ElementRef) {}

  ngAfterViewInit() {
    this.updateViewerProperties();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.isViewerInitialized()) {
      this.updateViewerProperties();
    }
  }

  private isViewerInitialized(): boolean {
    return !!this.getJsonViewerElement();
  }

  private getJsonViewerElement(): HTMLElement | null {
    return this.elementRef.nativeElement.querySelector('andypf-json-viewer');
  }

  private updateViewerProperties() {
    const viewer = this.getJsonViewerElement();
    if (!viewer) return;

    // Set all properties
    (viewer as any).data = this.json;
    (viewer as any).expanded = this.expanded;
    (viewer as any).theme = this.theme;
    (viewer as any).showDataTypes = this.showDataTypes;
    (viewer as any).showToolbar = this.showToolbar;
    (viewer as any).expandIconType = this.expandIconType;
    (viewer as any).showCopy = this.showCopy;
    (viewer as any).showSize = this.showSize;
    (viewer as any).indent = this.indent;
  }
}
