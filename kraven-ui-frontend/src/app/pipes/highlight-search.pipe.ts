import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'highlightSearch',
  standalone: true
})
export class HighlightSearchPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(text: any, searchTerm: string): SafeHtml {
    // If no search term or text is null/undefined, return as is
    if (!searchTerm || searchTerm.trim() === '' || text === null || text === undefined) {
      return this.sanitizer.bypassSecurityTrustHtml(text?.toString() || '');
    }

    // Convert to string if not already a string
    const textStr = typeof text === 'string' ? text : text.toString();

    // Escape the search term for use in a regex
    const searchTermEscaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Create a regex that's case insensitive
    const regex = new RegExp(`(${searchTermEscaped})`, 'gi');

    // Replace all occurrences with a highlighted version
    const newText = textStr.replace(regex, '<span class="highlight-search">$1</span>');

    // Return the HTML as a trusted value
    return this.sanitizer.bypassSecurityTrustHtml(newText);
  }
}
