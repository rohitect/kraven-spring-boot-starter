import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <h1>Test Component</h1>
      <p>This is a test component to verify the build process.</p>
    </div>
  `,
  styles: [`
    div {
      padding: 20px;
      background-color: #f0f0f0;
      border-radius: 8px;
    }
    h1 {
      color: #3f51b5;
    }
  `]
})
export class TestComponent {
}
