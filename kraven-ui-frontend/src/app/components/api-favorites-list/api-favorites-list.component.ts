import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiFavoritesService } from '../../services/api-favorites.service';
import { ApiFavorite } from '../../models/api-favorite.model';

@Component({
  selector: 'app-api-favorites-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './api-favorites-list.component.html',
  styleUrls: ['./api-favorites-list.component.scss']
})
export class ApiFavoritesListComponent implements OnInit {
  @Input() applicationName: string = '';
  @Output() selectEndpoint = new EventEmitter<any>();
  
  favorites: ApiFavorite[] = [];
  loading: boolean = true;
  error: string | null = null;

  constructor(private favoritesService: ApiFavoritesService) {}

  ngOnInit(): void {
    this.loadFavorites();
  }

  loadFavorites(): void {
    this.loading = true;
    this.error = null;

    this.favoritesService.getAllFavorites().subscribe({
      next: (favorites) => {
        this.favorites = favorites;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading favorites:', err);
        this.error = 'Failed to load favorites';
        this.loading = false;
      }
    });
  }

  onSelectEndpoint(favorite: ApiFavorite): void {
    if (favorite.endpoint) {
      this.selectEndpoint.emit(favorite.endpoint);
    }
  }

  removeFavorite(event: Event, favorite: ApiFavorite): void {
    event.stopPropagation();
    
    this.favoritesService.removeFavorite(favorite.path, favorite.method).subscribe({
      next: () => {
        this.favorites = this.favorites.filter(f => f.id !== favorite.id);
      },
      error: (err) => {
        console.error('Error removing favorite:', err);
      }
    });
  }
}
