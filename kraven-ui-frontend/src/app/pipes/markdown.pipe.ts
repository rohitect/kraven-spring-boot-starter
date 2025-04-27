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

    // Configure marked options
    marked.setOptions({
      gfm: true,        // GitHub Flavored Markdown
      breaks: true     // Convert \n to <br>
    });

    // Convert markdown to HTML and sanitize
    const html = marked.parse(value) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
