import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

// Use global variable
declare var marked: any;

@Pipe({
  name: 'markdown',
  standalone: true
})
export class MarkdownPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | null | undefined): SafeHtml {
    if (!value) {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }

    // Check if marked is available
    if (typeof marked === 'undefined' && typeof window !== 'undefined') {
      // Try to get marked from window object
      const windowMarked = (window as any).marked;
      if (windowMarked) {
        console.log('Using marked from window object');
        // Use the window.marked instance
        windowMarked.setOptions({
          gfm: true,
          breaks: true
        });
        const html = windowMarked.parse(value) as string;
        return this.sanitizer.bypassSecurityTrustHtml(html);
      } else {
        console.error('Marked library is not available');
        // Return the raw value as a fallback
        return this.sanitizer.bypassSecurityTrustHtml(`<pre>${value}</pre>`);
      }
    }

    try {
      // Configure marked options
      marked.setOptions({
        gfm: true,        // GitHub Flavored Markdown
        breaks: true     // Convert \n to <br>
      });

      // Convert markdown to HTML and sanitize
      const html = marked.parse(value) as string;
      return this.sanitizer.bypassSecurityTrustHtml(html);
    } catch (error) {
      console.error('Error parsing markdown:', error);
      // Return the raw value as a fallback
      return this.sanitizer.bypassSecurityTrustHtml(`<pre>${value}</pre>`);
    }
  }
}
