import { Component, Input, OnChanges, SimpleChanges, ElementRef, ViewChild, AfterViewInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarkdownModule } from 'ngx-markdown';
import { BusinessFlowTag, DocumentationService } from '../../services/documentation.service';
import { ThemeService } from '../../services/theme.service';
import { Subscription } from 'rxjs';

// Use global variables for mermaid
declare var mermaid: any;

@Component({
  selector: 'app-markdown',
  standalone: true,
  imports: [CommonModule, MarkdownModule],
  templateUrl: './markdown.component.html',
  styleUrls: ['./markdown.component.scss']
})
export class MarkdownComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() content: string = '';
  @Input() businessFlowTags: BusinessFlowTag[] = [];
  @Output() businessFlowTagClick = new EventEmitter<BusinessFlowTag>();

  @ViewChild('markdownContainer') markdownContainer!: ElementRef;

  processedContent: string = '';
  isDarkTheme = true;
  private themeSubscription: Subscription | null = null;

  constructor(
    private themeService: ThemeService,
    private documentationService: DocumentationService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['content']) {
      this.processContent();
    }
  }

  ngAfterViewInit(): void {
    this.themeSubscription = this.themeService.theme$.subscribe(theme => {
      this.isDarkTheme = theme === 'dark';
      this.initializeMermaid();
    });
  }

  ngOnDestroy(): void {
    // Clean up event listeners
    if (this.markdownContainer && this.clickHandler) {
      this.markdownContainer.nativeElement.removeEventListener('click', this.clickHandler);
      this.clickHandler = null;
    }

    // Clean up subscriptions
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
      this.themeSubscription = null;
    }
  }

  /**
   * Process the Markdown content.
   */
  processContent(): void {
    if (!this.content) {
      this.processedContent = '';
      return;
    }

    // Try to decode the content as base64
    let decodedContent: string;
    try {
      // Use the documentationService to decode the base64 content
      decodedContent = this.documentationService.decodeBase64Content(this.content);
      console.log('Successfully decoded base64 content');
    } catch (error) {
      // If decoding fails, use the original content (for backward compatibility)
      console.warn('Failed to decode content as base64, using original content:', error);
      decodedContent = this.content;
    }

    // Pre-process content
    let content = decodedContent;

    // Instead of using &nbsp;, we'll rely on CSS to preserve whitespace
    // We'll just make sure consecutive newlines are preserved
    // by ensuring there are no more than 2 consecutive newlines
    // content = content.replace(/\n{3,}/g, '\n\n');

    // Process business flow tags
    this.processedContent = content;//this.processBusinessFlowTags(content);

    console.log('Processed content length:', this.processedContent.length);
  }

  /**
   * Called when markdown rendering is complete
   */
  onMarkdownReady(): void {
    // Set up business flow tag click handlers and render mermaid diagrams
    setTimeout(() => {
      this.setupBusinessFlowTagClickHandlers();
      this.renderMermaidDiagrams();
    }, 100);
  }

  /**
   * Renders Mermaid diagrams in the Markdown content.
   */
  renderMermaidDiagrams(): void {
    if (!this.markdownContainer || typeof (window as any).mermaid === 'undefined') {
      console.log('Mermaid not available or container not found');
      return;
    }

    try {
      // Initialize mermaid with proper configuration
      const mermaid = (window as any).mermaid;

      // Log the mermaid version to help with debugging
      console.log('Mermaid version:', mermaid.version || 'unknown');

      // Log available methods on mermaid object
      console.log('Available mermaid methods:', Object.keys(mermaid));

      // Check if we're dealing with an older version of Mermaid
      const isOlderVersion = mermaid.version &&
        (mermaid.version.startsWith('8.') || mermaid.version.startsWith('9.'));

      console.log('Is older Mermaid version:', isOlderVersion);

      // Use a simpler configuration for older versions
      if (isOlderVersion) {
        mermaid.initialize({
          startOnLoad: false,
          theme: this.isDarkTheme ? 'dark' : 'default',
          securityLevel: 'loose'
        });
      } else {
        // More detailed configuration for newer versions
        mermaid.initialize({
          startOnLoad: false,
          theme: this.isDarkTheme ? 'dark' : 'default',
          securityLevel: 'loose',
          fontFamily: 'inherit',
          logLevel: 'debug',
          flowchart: {
            htmlLabels: true,
            curve: 'basis'
          },
          er: {
            useMaxWidth: false
          },
          sequence: {
            useMaxWidth: false
          },
          gantt: {
            useMaxWidth: false
          }
        });
      }

      const element = this.markdownContainer.nativeElement;
      const diagrams = element.querySelectorAll('code.language-mermaid');

      console.log(`Found ${diagrams.length} mermaid diagrams`);

      if (diagrams.length === 0) {
        return;
      }

      // Process each diagram
      diagrams.forEach((diagram: HTMLElement, index: number) => {
        try {
          // Create a new div for the diagram
          const container = document.createElement('div');
          container.className = 'mermaid-container';
          container.id = `mermaid-diagram-${index}`;

          // Get the diagram content
          const content = diagram.textContent || '';

          // Replace the pre>code element with our container
          if (diagram.parentNode && diagram.parentNode.parentNode) {
            diagram.parentNode.parentNode.replaceChild(container, diagram.parentNode);
          }

          console.log(`Rendering diagram ${index} with content length: ${content.length}`);

          try {
            // Check if we're dealing with an older version of Mermaid
            const isOlderVersion = mermaid.version &&
              (mermaid.version.startsWith('8.') || mermaid.version.startsWith('9.'));

            // For older versions (8.x, 9.x), use a simpler approach
            if (isOlderVersion) {
              console.log(`Using older Mermaid approach for diagram ${index}`);

              // For older versions, we need to adapt the syntax
              let adaptedContent = content;

              // If content starts with "flowchart", change it to "graph" for older versions
              if (content.trim().startsWith('flowchart')) {
                adaptedContent = content.replace(/^flowchart/, 'graph');
                console.log(`Adapted content for older Mermaid version:`, adaptedContent);
              }

              // Insert the diagram content with the mermaid class
              container.innerHTML = `<div class="mermaid">${adaptedContent}</div>`;

              // Use the appropriate method based on what's available
              if (typeof mermaid.init === 'function') {
                mermaid.init(undefined, container);
              } else if (typeof mermaid.run === 'function') {
                const id = `mermaid-${index}`;
                container.querySelector('.mermaid')?.setAttribute('id', id);
                mermaid.run({
                  nodes: [id]
                });
              }
            }
            // For newer versions (10.x, 11.x), use the more advanced approach
            else {
              // Check if parse method exists (for v11.6.0)
              if (typeof mermaid.parse === 'function') {
                console.log(`Using mermaid.parse for diagram ${index}`);

                // First parse the diagram to check for syntax errors
                mermaid.parse(content);

                // Insert the diagram content with the mermaid class
                container.innerHTML = `<div class="mermaid">${content}</div>`;

                // Run mermaid on this specific container
                mermaid.init(undefined, container);
              }
              // Fallback to render method if it exists
              else if (typeof mermaid.render === 'function') {
                console.log(`Using mermaid.render for diagram ${index}`);

                try {
                  // Try the synchronous render API first
                  const result = mermaid.render(`mermaid-svg-${index}`, content);
                  if (result && result.svg) {
                    container.innerHTML = result.svg;
                  } else {
                    console.error(`Unexpected result format from mermaid.render:`, result);
                    container.innerHTML = `<div class="mermaid-error">Error: Unexpected result format</div>`;
                  }
                } catch (renderError) {
                  console.error(`Error with synchronous render, trying Promise-based API:`, renderError);

                  // Try the Promise-based render API as a fallback
                  try {
                    const renderPromise = mermaid.render(`mermaid-svg-${index}`, content);
                    if (renderPromise && typeof renderPromise.then === 'function') {
                      renderPromise.then((result: any) => {
                        container.innerHTML = result.svg;
                      }).catch((promiseError: any) => {
                        console.error(`Promise-based render error:`, promiseError);
                        container.innerHTML = `<div class="mermaid-error">Error: ${promiseError.message || 'Render failed'}</div>`;
                      });
                    } else {
                      console.error(`Render did not return a Promise:`, renderPromise);
                      container.innerHTML = `<div class="mermaid-error">Error: Render method did not return expected result</div>`;
                    }
                  } catch (error) {
                    const promiseError = error as Error;
                    console.error(`Error trying Promise-based render:`, promiseError);
                    container.innerHTML = `<div class="mermaid-error">Error: ${promiseError.message || 'All render attempts failed'}</div>`;
                  }
                }
              }
              // Last resort: try the old run method
              else if (typeof mermaid.run === 'function') {
                console.log(`Using mermaid.run for diagram ${index}`);

                // Insert the diagram content with the mermaid class
                container.innerHTML = `<div class="mermaid" id="mermaid-${index}">${content}</div>`;

                // Use the old API
                mermaid.run({
                  nodes: [`mermaid-${index}`]
                });
              }
              else {
                console.error('No suitable mermaid rendering method found');
                container.innerHTML = `<div class="mermaid-error">Error: No suitable mermaid rendering method found</div>`;
              }
            }
          } catch (error: any) {
            console.error(`Error rendering mermaid diagram ${index}:`, error);

            // Create a more helpful error message
            let errorMessage = error.message || 'Unknown error';
            let errorDetails = '';

            // Check if it's a syntax error
            if (errorMessage.includes('syntax error') || errorMessage.includes('Syntax error')) {
              errorDetails = `
                <p>Check your Mermaid syntax. Common issues include:</p>
                <ul>
                  <li>For Mermaid 11.x: Use 'flowchart' instead of 'graph'</li>
                  <li>For styling: Use 'classDef' and 'class' instead of 'style'</li>
                  <li>Missing arrows or incorrect node definitions</li>
                  <li>Invalid characters or whitespace issues</li>
                </ul>
                <p>Try the <a href="https://mermaid.live/" target="_blank">Mermaid Live Editor</a> to debug your diagram.</p>
              `;

              // Try to fix common syntax issues
              let fixedContent = content;

              // Try to render with fixed content as a last resort
              try {
                console.log('Attempting to fix and render diagram with common fixes');

                // Replace 'graph' with 'flowchart' for newer versions
                if (mermaid.version && !mermaid.version.startsWith('8.') && !mermaid.version.startsWith('9.')) {
                  if (content.trim().startsWith('graph')) {
                    fixedContent = content.replace(/^graph/, 'flowchart');
                  }
                }

                // Convert style syntax to classDef syntax
                const styleRegex = /style\s+(\w+)\s+([^;]+)/g;
                let match;
                let styleIndex = 0;
                let classDefMap = new Map();

                while ((match = styleRegex.exec(content)) !== null) {
                  const nodeId = match[1];
                  const styleProps = match[2];
                  const className = `autoClass${styleIndex++}`;

                  if (!classDefMap.has(styleProps)) {
                    classDefMap.set(styleProps, className);
                  }

                  const existingClass = classDefMap.get(styleProps);
                  fixedContent = fixedContent.replace(match[0], '');

                  if (!fixedContent.includes(`class ${nodeId} ${existingClass}`)) {
                    fixedContent += `\nclass ${nodeId} ${existingClass};`;
                  }
                }

                // Add classDef declarations
                for (const [styleProps, className] of classDefMap.entries()) {
                  if (!fixedContent.includes(`classDef ${className}`)) {
                    fixedContent += `\nclassDef ${className} ${styleProps};`;
                  }
                }

                console.log('Fixed content:', fixedContent);

                // Try to render with the fixed content
                container.innerHTML = `<div class="mermaid">${fixedContent}</div>`;
                mermaid.init(undefined, container);

                // If we get here, the fix worked, so we don't need to show the error
                return;
              } catch (fixError) {
                console.error('Error rendering with fixed content:', fixError);
                // Continue to show the error message
              }
            }

            // Create an error display with the diagram source for debugging
            container.innerHTML = `
              <div class="mermaid-error">
                <div class="error-title">Error rendering diagram: ${errorMessage}</div>
                ${errorDetails ? `<div class="error-details">${errorDetails}</div>` : ''}
                <div class="error-source">
                  <details>
                    <summary>Diagram Source</summary>
                    <pre>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                  </details>
                </div>
              </div>
            `;
          }
        } catch (err) {
          console.error(`Error preparing mermaid diagram ${index}:`, err);
        }
      });
    } catch (error) {
      console.error('Error in mermaid rendering process:', error);
    }
  }

  /**
   * Processes business flow tags in the Markdown content.
   */
  processBusinessFlowTags(content: string): string {
    // Replace ```businessflow blocks with custom HTML
    return content.replace(
      /```businessflow\s+([^\s]+)(?:\s+"([^"]+)")?\s*\n([\s\S]*?)```/g,
      (_match, tagName, description, _methodsBlock) => {
        const tag = this.businessFlowTags.find(t => t.name === tagName);

        if (tag) {
          return `<div class="business-flow-tag" data-tag-name="${tagName}">
            <div class="business-flow-tag-header">
              <span class="tag-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                </svg>
              </span>
              <span class="tag-name">${tagName}</span>
              <span class="tag-description">${description || ''}</span>
              <button class="view-flow-btn" type="button">View Flow</button>
            </div>
          </div>`;
        }

        // If tag not found, return the original block as a pre-formatted code block
        // Use HTML directly to avoid markdown processing issues with nested backticks
        return `<pre><code class="language-businessflow">${_methodsBlock.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
      }
    );
  }

  /**
   * Initializes Mermaid.
   */
  initializeMermaid(): void {
    if (typeof mermaid !== 'undefined') {
      mermaid.initialize({
        startOnLoad: false,
        theme: this.isDarkTheme ? 'dark' : 'default',
        securityLevel: 'loose',
        fontFamily: 'inherit'
      });
    }
  }



  // Store the click handler reference so we can remove it later
  private clickHandler: ((event: Event) => void) | null = null;

  /**
   * Sets up click handlers for business flow tags.
   */
  setupBusinessFlowTagClickHandlers(): void {
    if (!this.markdownContainer) {
      return;
    }

    const element = this.markdownContainer.nativeElement;

    // Remove any existing event listener to prevent duplicates
    if (this.clickHandler) {
      element.removeEventListener('click', this.clickHandler);
      this.clickHandler = null;
    }

    // Create a new click handler
    this.clickHandler = (event: Event) => {
      const target = event.target as HTMLElement;

      // Check if the clicked element is a view flow button
      if (target && target.classList.contains('view-flow-btn')) {
        event.preventDefault();
        event.stopPropagation();

        // Find the parent business flow tag element
        const tagElement = target.closest('.business-flow-tag') as HTMLElement;
        if (!tagElement) return;

        const tagName = tagElement.getAttribute('data-tag-name');
        if (!tagName) return;

        console.log('Business flow tag clicked:', tagName);

        const tag = this.businessFlowTags.find(t => t.name === tagName);
        if (tag) {
          console.log('Emitting business flow tag:', tag);
          this.businessFlowTagClick.emit(tag);
        } else {
          console.warn('Business flow tag not found:', tagName);
        }
      }
    };

    // Add the new event listener
    element.addEventListener('click', this.clickHandler);

    // Log all business flow tags for debugging
    console.log('Available business flow tags:', this.businessFlowTags);

    // Log all view flow buttons
    const viewButtons = element.querySelectorAll('.view-flow-btn');
    console.log(`Found ${viewButtons.length} view flow buttons`);
  }
}
