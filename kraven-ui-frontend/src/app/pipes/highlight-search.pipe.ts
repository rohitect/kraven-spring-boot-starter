import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'highlightSearch',
  standalone: true
})
export class HighlightSearchPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(text: any, searchTerms: string | string[] | Array<{text: string, color: string}>): SafeHtml {
    // If no search terms or text is null/undefined, return as is
    if (!searchTerms || text === null || text === undefined) {
      return this.sanitizer.bypassSecurityTrustHtml(text?.toString() || '');
    }

    // Convert to string if not already a string
    let textStr = typeof text === 'string' ? text : text.toString();

    // Handle different types of search terms
    let terms: string[] = [];

    if (typeof searchTerms === 'string') {
      // Single string search term
      if (searchTerms.trim() !== '') {
        terms = [searchTerms];
      }
    } else if (Array.isArray(searchTerms)) {
      // Array of search terms
      if (searchTerms.length > 0) {
        if (typeof searchTerms[0] === 'string') {
          // Array of strings
          terms = searchTerms as string[];
        } else {
          // Array of objects with text property (tags)
          terms = (searchTerms as Array<{text: string, color: string}>).map(tag => tag.text);
        }
      }
    }

    // If no valid terms, return original text
    if (terms.length === 0) {
      return this.sanitizer.bypassSecurityTrustHtml(textStr);
    }

    // Process each search term
    for (const term of terms) {
      if (term.trim() === '') continue;

      // Escape the search term for use in a regex
      const termEscaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Create a regex that's case insensitive
      const regex = new RegExp(`(${termEscaped})`, 'gi');

      // Replace all occurrences with a highlighted version
      textStr = textStr.replace(regex, '<span class="highlight-search">$1</span>');
    }

    // Return the HTML as a trusted value
    return this.sanitizer.bypassSecurityTrustHtml(textStr);
  }
}
