import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MarkdownComponent } from '../markdown/markdown.component';

@Component({
  selector: 'app-mermaid-test',
  standalone: true,
  imports: [CommonModule, MarkdownComponent],
  template: `
    <div class="container">
      <h1>Mermaid Test</h1>
      <app-markdown [content]="markdownContent"></app-markdown>
    </div>
  `,
  styles: [`
    .container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    h1 {
      margin-bottom: 20px;
      color: var(--text-color);
    }
  `]
})
export class MermaidTestComponent implements OnInit {
  markdownContent: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get('assets/test-mermaid.md', { responseType: 'text' })
      .subscribe({
        next: (content) => {
          this.markdownContent = content;
        },
        error: (error) => {
          console.error('Error loading markdown file:', error);
          this.markdownContent = '# Error Loading Markdown\n\nThere was an error loading the test markdown file.';
        }
      });
  }
}
