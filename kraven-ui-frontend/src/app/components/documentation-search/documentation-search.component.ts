import { Component, OnInit, OnDestroy, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { DocumentationSearchService, SearchResult } from '../../services/documentation-search.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-documentation-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './documentation-search.component.html',
  styleUrls: ['./documentation-search.component.scss']
})
export class DocumentationSearchComponent implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  
  isVisible = false;
  searchQuery = '';
  searchResults: SearchResult[] = [];
  loading = false;
  noResults = false;
  isDarkTheme = true;
  
  private searchSubject = new Subject<string>();
  private searchSubscription: Subscription | null = null;
  private themeSubscription: Subscription | null = null;
  
  constructor(
    private searchService: DocumentationSearchService,
    private themeService: ThemeService,
    private router: Router,
    private elementRef: ElementRef
  ) {}
  
  ngOnInit(): void {
    // Subscribe to search input changes
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.performSearch(query);
    });
    
    // Subscribe to theme changes
    this.themeSubscription = this.themeService.theme$.subscribe(theme => {
      this.isDarkTheme = theme === 'dark';
    });
  }
  
  ngOnDestroy(): void {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
    
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }
  
  /**
   * Open the search popup
   */
  open(): void {
    this.isVisible = true;
    
    // Focus the search input after a short delay
    setTimeout(() => {
      if (this.searchInput) {
        this.searchInput.nativeElement.focus();
      }
    }, 100);
  }
  
  /**
   * Close the search popup
   */
  close(): void {
    this.isVisible = false;
    this.searchQuery = '';
    this.searchResults = [];
    this.noResults = false;
  }
  
  /**
   * Handle search input changes
   */
  onSearchInput(): void {
    this.searchSubject.next(this.searchQuery);
  }
  
  /**
   * Perform the search
   */
  private performSearch(query: string): void {
    if (!query || query.trim().length < 2) {
      this.searchResults = [];
      this.noResults = false;
      return;
    }
    
    this.loading = true;
    
    this.searchService.searchDocumentation(query).subscribe({
      next: (results) => {
        this.searchResults = results;
        this.noResults = results.length === 0;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error searching documentation:', error);
        this.searchResults = [];
        this.noResults = true;
        this.loading = false;
      }
    });
  }
  
  /**
   * Navigate to a search result
   */
  navigateToResult(result: SearchResult, matchIndex: number = 0): void {
    this.close();
    
    // Navigate to the document
    this.router.navigate(['/documentation', result.groupId, result.fileId]);
  }
  
  /**
   * Handle clicks outside the search popup to close it
   */
  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent): void {
    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    
    if (this.isVisible && !clickedInside) {
      this.close();
    }
  }
  
  /**
   * Handle escape key to close the popup
   */
  @HostListener('document:keydown.escape')
  handleEscapeKey(): void {
    if (this.isVisible) {
      this.close();
    }
  }
}
