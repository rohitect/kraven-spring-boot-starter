import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { BusinessFlowService, BusinessFlowTag, BusinessFlow, TaggedMethod } from '../../services/business-flow.service';
import { ThemeService } from '../../services/theme.service';
import { trigger, transition, style, animate, state } from '@angular/animations';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-business-flow',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './business-flow.component.html',
  styleUrls: ['./business-flow.component.scss'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ opacity: 0 }))
      ])
    ]),
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateY(-10px)', opacity: 0 }),
        animate('300ms ease-in', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ transform: 'translateY(-10px)', opacity: 0 }))
      ])
    ]),
    trigger('expandCollapse', [
      state('collapsed', style({ height: '0', overflow: 'hidden', opacity: 0 })),
      state('expanded', style({ height: '*', overflow: 'visible', opacity: 1 })),
      transition('collapsed <=> expanded', [
        animate('300ms ease-in-out')
      ])
    ])
  ]
})
export class BusinessFlowComponent implements OnInit, OnDestroy {
  // Data
  tags: BusinessFlowTag[] = [];
  selectedTag: BusinessFlowTag | null = null;
  businessFlow: BusinessFlow | null = null;
  filteredTags: BusinessFlowTag[] = [];
  selectedMethod: TaggedMethod | null = null;

  // UI state
  loading = true;
  error: string | null = null;
  title = 'Business Flows';
  isDarkTheme = true;
  searchQuery: string = '';
  searchFocused: boolean = false;
  refreshing: boolean = false;
  tagColors: { [key: string]: string } = {};

  // Subscriptions
  private themeSubscription: Subscription | null = null;

  constructor(
    private businessFlowService: BusinessFlowService,
    private themeService: ThemeService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.themeSubscription = this.themeService.theme$.subscribe(theme => {
      this.isDarkTheme = theme === 'dark';
    });

    this.loadTags();

    // Check if a tag is specified in the route
    this.route.params.subscribe(params => {
      if (params['tagName']) {
        this.loadBusinessFlow(params['tagName']);
      }
    });

    // Initialize tag colors
    this.initializeTagColors();
  }

  ngOnDestroy(): void {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }

  /**
   * Loads all available business flow tags.
   */
  loadTags(): void {
    this.loading = true;
    this.businessFlowService.getAllTags().subscribe({
      next: (tags) => {
        this.tags = tags;
        this.filteredTags = [...tags];
        this.loading = false;

        // If a tag is selected in the route, find it in the loaded tags
        const tagName = this.route.snapshot.params['tagName'];
        if (tagName) {
          const tag = this.tags.find(t => t.name === tagName);
          if (tag) {
            this.selectedTag = tag;
          }
        }
      },
      error: (error) => {
        this.error = 'Failed to load business flow tags';
        this.loading = false;
        console.error('Error loading business flow tags:', error);
      }
    });
  }

  /**
   * Loads a business flow by tag name.
   *
   * @param tagName the tag name
   */
  loadBusinessFlow(tagName: string): void {
    this.loading = true;
    this.businessFlowService.getBusinessFlow(tagName).subscribe({
      next: (flow) => {
        this.businessFlow = flow;
        this.loading = false;

        // Update the URL to include the selected tag
        this.router.navigate(['/business-flows', tagName], { replaceUrl: true });

        // Find the tag in the list
        const tag = this.tags.find(t => t.name === tagName);
        if (tag) {
          this.selectedTag = tag;
        }
      },
      error: (error) => {
        this.error = `Failed to load business flow for tag ${tagName}`;
        this.loading = false;
        console.error(`Error loading business flow for tag ${tagName}:`, error);
      }
    });
  }

  /**
   * Refreshes the business flow data.
   */
  refreshBusinessFlows(): void {
    this.refreshing = true;
    this.businessFlowService.refreshBusinessFlows().subscribe({
      next: (message) => {
        console.log('Refresh result:', message);
        this.loadTags();
        if (this.selectedTag) {
          this.loadBusinessFlow(this.selectedTag.name);
        }
        this.refreshing = false;
      },
      error: (error) => {
        this.error = 'Failed to refresh business flows';
        this.refreshing = false;
        console.error('Error refreshing business flows:', error);
      }
    });
  }

  /**
   * Selects a tag and loads its business flow.
   *
   * @param tag the tag to select
   */
  selectTag(tag: BusinessFlowTag): void {
    this.selectedTag = tag;
    this.loadBusinessFlow(tag.name);
  }

  /**
   * Selects a method to display its details.
   *
   * @param method the method to select
   */
  selectMethod(method: TaggedMethod): void {
    this.selectedMethod = method;
  }

  /**
   * Filters the tags based on the search query.
   */
  filterTags(): void {
    if (!this.searchQuery.trim()) {
      this.filteredTags = [...this.tags];
      return;
    }

    const query = this.searchQuery.toLowerCase();
    this.filteredTags = this.tags.filter(tag =>
      tag.name.toLowerCase().includes(query)
    );
  }

  /**
   * Gets the ordered stereotypes for display.
   */
  getOrderedStereotypes(): string[] {
    if (!this.businessFlow || !this.businessFlow.methodsByStereotype) {
      return [];
    }

    return Object.keys(this.businessFlow.methodsByStereotype)
      .sort((a, b) => this.businessFlowService.getStereotypeOrder(a) - this.businessFlowService.getStereotypeOrder(b));
  }

  /**
   * Gets the color for a stereotype.
   */
  getStereotypeColor(stereotype: string): string {
    return this.businessFlowService.getStereotypeColor(stereotype);
  }

  /**
   * Gets the methods for a stereotype.
   */
  getMethodsForStereotype(stereotype: string): TaggedMethod[] {
    if (!this.businessFlow || !this.businessFlow.methodsByStereotype) {
      return [];
    }

    return this.businessFlow.methodsByStereotype[stereotype] || [];
  }

  /**
   * Clears the search query.
   */
  clearSearch(): void {
    this.searchQuery = '';
    this.filterTags();
  }

  /**
   * Initializes tag colors for visual variety.
   */
  initializeTagColors(): void {
    const colors = [
      '#6c5ce7', // Purple
      '#00b894', // Green
      '#0984e3', // Blue
      '#e17055', // Orange
      '#e84393', // Pink
      '#00cec9', // Teal
      '#fdcb6e', // Yellow
      '#d63031', // Red
      '#6c5ce7', // Purple (repeat for more tags)
    ];

    // Pre-assign colors to tags when they load
    this.businessFlowService.getAllTags().subscribe(tags => {
      tags.forEach((tag, index) => {
        this.tagColors[tag.name] = colors[index % colors.length];
      });
    });
  }

  /**
   * Gets a color for a tag.
   */
  getTagColor(tag: BusinessFlowTag): string {
    return this.tagColors[tag.name] || '#6c5ce7'; // Default to purple
  }
}
