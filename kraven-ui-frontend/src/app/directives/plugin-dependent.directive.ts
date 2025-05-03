import { Directive, ElementRef, Input, OnInit, Renderer2, TemplateRef, ViewContainerRef } from '@angular/core';
import { PluginRegistryService } from '../services/plugin-registry.service';

@Directive({
  selector: '[appPluginDependent]',
  standalone: true
})
export class PluginDependentDirective implements OnInit {
  @Input('appPluginDependent') pluginId!: string;
  @Input('appPluginDependentShowLoading') showLoading = true;
  
  private hasView = false;
  private loadingElement: HTMLElement | null = null;
  
  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private pluginRegistry: PluginRegistryService,
    private renderer: Renderer2,
    private elementRef: ElementRef
  ) {}
  
  ngOnInit(): void {
    if (!this.pluginId) {
      console.error('Plugin ID is required for appPluginDependent directive');
      return;
    }
    
    this.checkPluginStatus();
  }
  
  private checkPluginStatus(): void {
    console.log(`PluginDependentDirective: Checking status for plugin '${this.pluginId}'`);
    
    // Show loading if enabled
    if (this.showLoading) {
      this.showLoadingOverlay();
    }
    
    // Check if the plugin is ready
    this.pluginRegistry.checkPluginReady(this.pluginId).subscribe({
      next: (isReady) => {
        // Remove loading overlay
        this.removeLoadingOverlay();
        
        if (isReady) {
          // Plugin is ready, show the content
          if (!this.hasView) {
            this.viewContainer.createEmbeddedView(this.templateRef);
            this.hasView = true;
          }
        } else {
          // Plugin is not ready, hide the content
          this.viewContainer.clear();
          this.hasView = false;
        }
      },
      error: (error) => {
        console.error(`Error checking plugin '${this.pluginId}' status:`, error);
        
        // Remove loading overlay
        this.removeLoadingOverlay();
        
        // Hide the content
        this.viewContainer.clear();
        this.hasView = false;
      }
    });
  }
  
  private showLoadingOverlay(): void {
    // Create loading overlay
    this.loadingElement = this.renderer.createElement('div');
    this.renderer.addClass(this.loadingElement, 'plugin-loading-overlay');
    
    // Add spinner
    const spinner = this.renderer.createElement('div');
    this.renderer.addClass(spinner, 'plugin-loading-spinner');
    this.renderer.appendChild(this.loadingElement, spinner);
    
    // Add text
    const text = this.renderer.createElement('div');
    this.renderer.addClass(text, 'plugin-loading-text');
    const textContent = this.renderer.createText(`Loading ${this.pluginId} plugin...`);
    this.renderer.appendChild(text, textContent);
    this.renderer.appendChild(this.loadingElement, text);
    
    // Add styles
    this.renderer.setStyle(this.loadingElement, 'position', 'absolute');
    this.renderer.setStyle(this.loadingElement, 'top', '0');
    this.renderer.setStyle(this.loadingElement, 'left', '0');
    this.renderer.setStyle(this.loadingElement, 'width', '100%');
    this.renderer.setStyle(this.loadingElement, 'height', '100%');
    this.renderer.setStyle(this.loadingElement, 'display', 'flex');
    this.renderer.setStyle(this.loadingElement, 'flex-direction', 'column');
    this.renderer.setStyle(this.loadingElement, 'align-items', 'center');
    this.renderer.setStyle(this.loadingElement, 'justify-content', 'center');
    this.renderer.setStyle(this.loadingElement, 'background-color', 'rgba(0, 0, 0, 0.7)');
    this.renderer.setStyle(this.loadingElement, 'color', 'white');
    this.renderer.setStyle(this.loadingElement, 'z-index', '9999');
    
    // Add to host element
    this.renderer.appendChild(this.elementRef.nativeElement, this.loadingElement);
  }
  
  private removeLoadingOverlay(): void {
    if (this.loadingElement) {
      this.renderer.removeChild(this.elementRef.nativeElement, this.loadingElement);
      this.loadingElement = null;
    }
  }
}
