import { Component, EventEmitter, Input, Output, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-shortcuts-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shortcuts-dialog.component.html',
  styleUrls: ['./shortcuts-dialog.component.scss']
})
export class ShortcutsDialogComponent implements OnInit {
  @Input() currentRoute: string = '';
  @Input() showKafka: boolean = false;
  @Input() showMockServer: boolean = false;
  @Input() showActuatorInsights: boolean = false;
  @Output() close = new EventEmitter<void>();

  isMac: boolean = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Detect if user is on Mac
    this.isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeDialog();
    }
  }

  closeDialog(): void {
    this.close.emit();
  }

  getTabName(route: string): string {
    const tabNames: { [key: string]: string } = {
      '/': 'Home',
      '/overview': 'Overview',
      '/api-docs': 'API Playground',
      '/feign-clients': 'External Clients',
      '/kafka': 'Kafka',
      '/mock-server': 'Mock Server',
      '/actuator-insights': 'Actuator Insights',
      '/documentation': 'Documentation'
    };
    return tabNames[route] || 'Current Tab';
  }

  getTabNumber(pluginName: string): number {
    // Calculate dynamic tab numbers based on which plugins are enabled
    let tabNumber = 5; // Start after the base tabs (Home, Overview, API Playground, External Clients)

    if (pluginName === 'kafka') {
      return 5;
    }

    if (this.showKafka) tabNumber++;
    if (pluginName === 'mock-server') {
      return tabNumber;
    }

    if (this.showMockServer) tabNumber++;
    if (pluginName === 'actuator-insights') {
      return tabNumber;
    }

    return tabNumber;
  }
}
