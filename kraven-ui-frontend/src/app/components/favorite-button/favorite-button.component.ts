import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiFavoritesService } from '../../services/api-favorites.service';

@Component({
  selector: 'app-favorite-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './favorite-button.component.html',
  styleUrls: ['./favorite-button.component.scss']
})
export class FavoriteButtonComponent implements OnInit, OnChanges {
  @Input() endpoint: any;
  @Input() tagName: string = '';
  
  isFavorite: boolean = false;
  isLoading: boolean = false;

  constructor(private favoritesService: ApiFavoritesService) {}

  ngOnInit(): void {
    this.checkIfFavorite();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['endpoint'] || changes['tagName']) {
      this.checkIfFavorite();
    }
  }

  checkIfFavorite(): void {
    if (!this.endpoint || !this.endpoint.path || !this.endpoint.method || !this.endpoint.method.type) {
      return;
    }

    this.isLoading = true;
    this.favoritesService.isFavorite(this.endpoint.path, this.endpoint.method.type).subscribe({
      next: (isFavorite) => {
        this.isFavorite = isFavorite;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error checking if endpoint is favorite:', err);
        this.isLoading = false;
      }
    });
  }

  toggleFavorite(event: Event): void {
    event.stopPropagation();
    
    if (!this.endpoint || !this.endpoint.path || !this.endpoint.method || !this.endpoint.method.type) {
      return;
    }

    this.isLoading = true;

    if (this.isFavorite) {
      this.favoritesService.removeFavorite(this.endpoint.path, this.endpoint.method.type).subscribe({
        next: () => {
          this.isFavorite = false;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error removing favorite:', err);
          this.isLoading = false;
        }
      });
    } else {
      this.favoritesService.addFavorite(this.endpoint, this.tagName).subscribe({
        next: () => {
          this.isFavorite = true;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error adding favorite:', err);
          this.isLoading = false;
        }
      });
    }
  }
}
