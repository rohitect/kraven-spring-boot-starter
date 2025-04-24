import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { trigger, transition, style, animate, query, stagger, state } from '@angular/animations';

export interface ClientDetails {
  type: 'endpoint' | 'feign';
  name: string;
  methods?: string[];
  path?: string;
}

@Component({
  selector: 'app-client-details-popup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client-details-popup.component.html',
  styleUrls: ['./client-details-popup.component.scss'],
  animations: [
    trigger('fadeAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
      ])
    ]),
    trigger('scaleAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.92)' }),
        animate('400ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'scale(0.96)' }))
      ])
    ]),
    trigger('slideAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms 100ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('itemAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-10px)' }),
        animate('300ms {{delay}}ms ease-out',
          style({ opacity: 1, transform: 'translateX(0)' })
        )
      ])
    ])
  ]
})
export class ClientDetailsPopupComponent implements OnInit, OnChanges {
  @Input() isVisible = false;
  @Input() clientType: 'endpoint' | 'feign' = 'endpoint';
  @Input() clients: ClientDetails[] = [];
  @Output() close = new EventEmitter<void>();

  selectedClient: ClientDetails | null = null;
  filteredClients: ClientDetails[] = [];
  searchTerm = '';

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.updateClientsList();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Update when clients or clientType changes
    if (changes['clients'] || changes['isVisible']) {
      this.updateClientsList();
    }
  }

  private updateClientsList(): void {
    this.filteredClients = [...this.clients];
    this.searchTerm = '';

    if (this.clients.length > 0) {
      this.selectedClient = this.clients[0];
    } else {
      this.selectedClient = null;
    }
  }

  onClientSelect(client: ClientDetails): void {
    this.selectedClient = client;
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredClients = [...this.clients];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredClients = this.clients.filter(client =>
      client.name.toLowerCase().includes(term)
    );
  }

  /**
   * Clears the search input and resets the filtered clients list
   */
  clearSearch(): void {
    this.searchTerm = '';
    this.filteredClients = [...this.clients];
  }

  /**
   * Copies text to clipboard and shows a temporary success message
   */
  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      // Show a temporary toast or notification here if desired
      console.log('Copied to clipboard:', text);

      // You could implement a toast notification here
      this.showCopyFeedback();
    }).catch(err => {
      console.error('Could not copy text: ', err);
    });
  }

  /**
   * Shows a temporary visual feedback when something is copied
   * This is a simple implementation - in a real app you might use a toast service
   */
  private showCopyFeedback(): void {
    // Create a temporary toast element
    const toast = document.createElement('div');
    toast.textContent = 'Copied to clipboard!';
    toast.className = 'copy-toast';
    document.body.appendChild(toast);

    // Animate it
    setTimeout(() => {
      toast.classList.add('show');

      // Remove it after animation
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 300);
      }, 2000);
    }, 10);
  }

  navigateToPlayground(): void {
    if (!this.selectedClient) return;

    if (this.clientType === 'endpoint') {
      this.router.navigate(['/api-docs'], {
        queryParams: { endpoint: this.selectedClient.name }
      });
    } else {
      this.router.navigate(['/feign-clients'], {
        queryParams: { client: this.selectedClient.name }
      });
    }

    this.closePopup();
  }

  closePopup(): void {
    this.close.emit();
  }
}
