import { Directive, Input, ElementRef, HostListener, Renderer2, OnDestroy } from '@angular/core';

@Directive({
  selector: '[appTooltip]',
  standalone: true
})
export class TooltipDirective implements OnDestroy {
  @Input('appTooltip') tooltipText: string = '';
  @Input() position: 'top' | 'right' | 'bottom' | 'left' = 'top';
  @Input() delay: number = 300;
  
  private tooltipElement: HTMLElement | null = null;
  private showTimeout: any;
  private hideTimeout: any;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  @HostListener('mouseenter') onMouseEnter() {
    this.showTimeout = setTimeout(() => {
      this.show();
    }, this.delay);
  }

  @HostListener('mouseleave') onMouseLeave() {
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
    }
    
    this.hideTimeout = setTimeout(() => {
      this.hide();
    }, 100);
  }

  ngOnDestroy() {
    this.hide();
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
    }
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
  }

  private show() {
    if (this.tooltipElement) {
      return;
    }

    // Create tooltip element
    this.tooltipElement = this.renderer.createElement('div');
    this.renderer.addClass(this.tooltipElement, 'tooltip');
    this.renderer.addClass(this.tooltipElement, `tooltip-${this.position}`);
    
    // Create tooltip content
    const tooltipContent = this.renderer.createElement('div');
    this.renderer.addClass(tooltipContent, 'tooltip-content');
    
    // Support HTML content
    tooltipContent.innerHTML = this.tooltipText;
    
    // Append content to tooltip
    this.renderer.appendChild(this.tooltipElement, tooltipContent);
    
    // Append tooltip to body
    this.renderer.appendChild(document.body, this.tooltipElement);
    
    // Position the tooltip
    this.setPosition();
    
    // Add visible class after a small delay to trigger animation
    setTimeout(() => {
      if (this.tooltipElement) {
        this.renderer.addClass(this.tooltipElement, 'tooltip-visible');
      }
    }, 10);
  }

  private hide() {
    if (!this.tooltipElement) {
      return;
    }
    
    this.renderer.removeClass(this.tooltipElement, 'tooltip-visible');
    
    // Remove element after animation completes
    setTimeout(() => {
      if (this.tooltipElement) {
        this.renderer.removeChild(document.body, this.tooltipElement);
        this.tooltipElement = null;
      }
    }, 300);
  }

  private setPosition() {
    if (!this.tooltipElement) {
      return;
    }
    
    const hostPos = this.el.nativeElement.getBoundingClientRect();
    const tooltipPos = this.tooltipElement.getBoundingClientRect();
    
    // Calculate scroll position
    const scrollPos = {
      top: window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0,
      left: window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0
    };
    
    let top, left;
    
    switch (this.position) {
      case 'top':
        top = hostPos.top - tooltipPos.height - 10;
        left = hostPos.left + (hostPos.width - tooltipPos.width) / 2;
        break;
      case 'right':
        top = hostPos.top + (hostPos.height - tooltipPos.height) / 2;
        left = hostPos.right + 10;
        break;
      case 'bottom':
        top = hostPos.bottom + 10;
        left = hostPos.left + (hostPos.width - tooltipPos.width) / 2;
        break;
      case 'left':
        top = hostPos.top + (hostPos.height - tooltipPos.height) / 2;
        left = hostPos.left - tooltipPos.width - 10;
        break;
    }
    
    // Add scroll position
    top += scrollPos.top;
    left += scrollPos.left;
    
    // Set position
    this.renderer.setStyle(this.tooltipElement, 'top', `${top}px`);
    this.renderer.setStyle(this.tooltipElement, 'left', `${left}px`);
  }
}
