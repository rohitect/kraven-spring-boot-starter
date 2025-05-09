import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule, ParamMap } from '@angular/router';
import { Subscription } from 'rxjs';
import { DocumentationService, DocumentationGroup, DocumentationFile, BusinessFlowTag } from '../../services/documentation.service';
import { ThemeService } from '../../services/theme.service';
import { trigger, transition, style, animate } from '@angular/animations';
import { MarkdownComponent } from '../markdown/markdown.component';

@Component({
  selector: 'app-documentation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MarkdownComponent],
  templateUrl: './documentation.component.html',
  styleUrls: ['./documentation.component.scss'],
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
        style({ transform: 'translateY(20px)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateY(20px)', opacity: 0 }))
      ])
    ])
  ]
})
export class DocumentationComponent implements OnInit, OnDestroy, AfterViewChecked {
  // Data
  groups: DocumentationGroup[] = [];
  selectedGroup: DocumentationGroup | null = null;
  selectedFile: DocumentationFile | null = null;
  businessFlowTags: BusinessFlowTag[] = [];
  selectedBusinessFlowTag: BusinessFlowTag | null = null;

  // UI state
  loading = true;
  error: string | null = null;
  searchQuery = '';
  searchFocused = false;
  refreshing = false;
  showBusinessFlowDialog = false;
  isDarkTheme = true;

  // Filtered data
  filteredGroups: DocumentationGroup[] = [];

  // Subscriptions
  private themeSubscription: Subscription | null = null;
  private routeSubscription: Subscription | null = null;

  // Cache for business flow tags
  private businessFlowTagsCache: Map<string, BusinessFlowTag[]> = new Map();

  @ViewChild('businessFlowDialog') businessFlowDialog!: ElementRef;
  @ViewChild('markdownContent') markdownContent!: ElementRef;

  // Table of contents
  tocItems: { id: string; title: string; level: number }[] = [];
  activeSection: string = '';

  constructor(
    private documentationService: DocumentationService,
    private themeService: ThemeService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  // Flag to track initialization state
  private initialized = false;

  // Flag to track if we're currently handling a route change
  private handlingRoute = false;

  // Request ID to track the latest request
  private currentRequestId = 0;

  // Scroll event handler
  private scrollHandler: (() => void) | null = null;

  ngOnInit(): void {
    console.log('Documentation component initializing');

    // Subscribe to theme changes
    this.themeSubscription = this.themeService.theme$.subscribe(theme => {
      this.isDarkTheme = theme === 'dark';
    });

    // First, load all groups before subscribing to route changes
    // This prevents race conditions where route changes happen before groups are loaded
    this.loading = true;

    console.log('Loading initial groups data');
    this.documentationService.getAllGroups().subscribe({
      next: (groups) => {
        console.log('Initial groups loaded:', groups.length);
        this.groups = groups;
        this.filteredGroups = [...groups];
        this.loading = false;

        // Mark as initialized
        this.initialized = true;

        // Now that we have the groups, subscribe to route changes
        this.subscribeToRouteChanges();

        // Handle the initial route
        const groupId = this.route.snapshot.paramMap.get('groupId');
        const fileId = this.route.snapshot.paramMap.get('fileId');

        console.log('Initial route params:', { groupId, fileId });

        // if (groupId) {
        //   this.handleGroupNavigation(groupId, fileId);
        // } else if (groups.length > 0) {
        //   // If no group ID in route, select the first group
        //   this.selectGroup(groups[0], true);
        // }
      },
      error: (error) => {
        console.error('Error loading initial groups:', error);
        this.error = 'Failed to load documentation groups.';
        this.loading = false;

        // Even if there's an error, we should subscribe to route changes
        this.subscribeToRouteChanges();
      }
    });
  }

  /**
   * Subscribes to route changes after initialization
   */
  private subscribeToRouteChanges(): void {
    console.log('Subscribing to route changes');

    this.routeSubscription = this.route.paramMap.subscribe(params => {

      // Skip if we're already handling a route change
      if (this.handlingRoute) {
        console.log('Already handling a route change, skipping');
        return;
      }

      // Skip if we're not initialized yet
      if (!this.initialized) {
        console.log('Not initialized yet, skipping route change');
        return;
      }

      const groupId = params.get('groupId');
      const fileId = params.get('fileId');

      console.log('Route params changed:', { groupId, fileId });

      // Set flag to prevent concurrent handling
      this.handlingRoute = true;

      try {
        if (groupId) {
          this.handleGroupNavigation(groupId, fileId);
        } else if (this.groups.length > 0) {
          // If no group ID in route, select the first group
          this.selectGroup(this.groups[0], true);
        }
      } finally {
        // Always reset the flag when done
        this.handlingRoute = false;
      }
    });
  }

  ngAfterViewChecked(): void {
    // Generate table of contents after view is checked
    this.generateTableOfContents();

    // Set up scroll handler if not already set
    if (!this.scrollHandler && this.tocItems.length > 0) {
      this.scrollHandler = () => this.checkActiveSection();
      window.addEventListener('scroll', this.scrollHandler);
    }
  }

  ngOnDestroy(): void {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }

    // Remove scroll event listener
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
      this.scrollHandler = null;
    }
  }

  /**
   * Generates the table of contents from the headings in the markdown content
   */
  generateTableOfContents(): void {
    if (!this.markdownContent) return;

    const contentElement = this.markdownContent.nativeElement;
    const headings = contentElement.querySelectorAll('h1, h2, h3, h4, h5, h6');

    if (headings.length === 0) return;

    // Clear existing TOC items
    this.tocItems = [];

    // Process each heading
    headings.forEach((heading: HTMLElement) => {
      // Get the heading level (h1 = 1, h2 = 2, etc.)
      const level = parseInt(heading.tagName.substring(1));

      // Get or create an ID for the heading
      let id = heading.id;
      if (!id) {
        // Create an ID from the heading text
        id = heading.textContent?.trim().toLowerCase().replace(/\s+/g, '-') || '';
        heading.id = id;
      }

      // Add to TOC items
      this.tocItems.push({
        id,
        title: heading.textContent || '',
        level
      });
    });

    // Check which section is currently active
    this.checkActiveSection();
  }

  /**
   * Checks which section is currently in view and marks it as active
   */
  checkActiveSection(): void {
    if (!this.markdownContent || this.tocItems.length === 0) return;

    const contentElement = this.markdownContent.nativeElement;
    const headings = this.tocItems.map(item => contentElement.querySelector(`#${item.id}`));

    // Find the first heading that's in the viewport or above it
    let activeId = '';

    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];
      if (!heading) continue;

      const rect = heading.getBoundingClientRect();

      // If the heading is at the top of the viewport or above it
      if (rect.top <= 100) {
        activeId = this.tocItems[i].id;
      } else {
        // If we've found a heading below the viewport, stop
        break;
      }
    }

    // Only update if the active section has changed
    if (activeId && this.activeSection !== activeId) {
      this.activeSection = activeId;
    }
  }

  /**
   * Scrolls to a section when a TOC link is clicked
   */
  scrollToSection(sectionId: string, event: Event): void {
    event.preventDefault();

    // console.log(`Attempting to scroll to section: ${sectionId}`);

    // Try to find the element by ID
    const element = document.getElementById(sectionId);

    // Get the middle pane element which is the scrollable container
    const middlePaneElement = document.querySelector('.middle-pane') as HTMLElement;

    if (!middlePaneElement) {
      console.error('Could not find the middle pane element');
      return;
    }

    if (element) {
      // console.log(`Found element with ID: ${sectionId}`);

      // Define header offset for scrolling
      const headerOffset = 80; // Adjust this value based on your header height

      // Get the position of the element relative to the middle pane
      const middlePaneRect = middlePaneElement.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      // Calculate the scroll position within the middle pane
      const scrollTop = elementRect.top - middlePaneRect.top + middlePaneElement.scrollTop - headerOffset;

      // console.log(`Scrolling middle pane to position: ${scrollTop}`);

      // Scroll the middle pane to the element
      middlePaneElement.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      });

      // Update active section
      this.activeSection = sectionId;
    } else {
      console.error(`Element with ID ${sectionId} not found`);

      // Try to find the element using a query selector with the ID
      const elementBySelector = document.querySelector(`#${sectionId}`);
      if (elementBySelector) {
        // console.log(`Found element with selector #${sectionId}`);

        // Get the position of the element relative to the middle pane
        const middlePaneRect = middlePaneElement.getBoundingClientRect();
        const elementRect = elementBySelector.getBoundingClientRect();

        // Calculate the scroll position within the middle pane
        const scrollTop = elementRect.top - middlePaneRect.top + middlePaneElement.scrollTop - 80;

        // console.log(`Scrolling middle pane to position: ${scrollTop}`);

        // Scroll the middle pane to the element
        middlePaneElement.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });

        // Update active section
        this.activeSection = sectionId;
      } else {
        console.error(`Element with selector #${sectionId} not found either`);
      }
    }
  }





  /**
   * Handles navigation to a specific group
   */
  private handleGroupNavigation(groupId: string, fileId?: string | null): void {
    // console.log(`Handling navigation to group: ${groupId}, file: ${fileId || 'none'}`);


    // Generate a new request ID to track this navigation
    const requestId = ++this.currentRequestId;

    // Find the group in our loaded groups
    const group = this.groups.find(g => g.id === groupId);

    if (group) {
      // console.log(`Group ${groupId} found in loaded data`);

      // If we already have the group, select it
      this.selectedGroup = group;

      // If we have a file ID, try to select that file
      if (fileId) {
        const file = group.files.find(f => f.id === fileId);

        if (file) {
          // console.log(`File ${fileId} found in loaded data`);

          // If we have the file, select it
          this.selectedFile = file;
          this.loadBusinessFlowTags(file.id);
        } else {
          // console.log(`File ${fileId} not found in loaded data, loading group details`);

          // If we don't have the file, load the group details to get updated files
          this.loadGroupDetails(groupId, fileId, requestId);
        }
      } else if (group.overview) {
        // console.log('No file ID specified, selecting overview file');

        // If no file ID but we have an overview, select it
        this.selectedFile = group.overview;
        this.loadBusinessFlowTags(group.overview.id);
      } else if (group.files.length > 0) {
        // console.log('No overview file, selecting first file');

        // Otherwise select the first file
        this.selectedFile = group.files[0];
        this.loadBusinessFlowTags(group.files[0].id);
      } else {
        // console.log('Group has no files, loading group details');

        // If the group has no files, load the group details
        this.loadGroupDetails(groupId, fileId, requestId);
      }
    } else {
      // console.log(`Group ${groupId} not found in loaded data, loading group details`);

      // If we don't have the group, load it
      this.loadGroupDetails(groupId, fileId, requestId);
    }
  }

  /**
   * Loads detailed information for a group
   */
  private loadGroupDetails(groupId: string, fileId?: string | null, requestId?: number): void {
    // console.log(`Loading group details for: ${groupId}, file: ${fileId || 'none'}, requestId: ${requestId || 'none'}`);

    // If no request ID was provided, generate one
    const currentRequestId = requestId || ++this.currentRequestId;

    this.loading = true;

    this.documentationService.getGroup(groupId).subscribe({
      next: (group) => {
        // Check if this is still the current request
        if (requestId && currentRequestId !== this.currentRequestId) {
          // console.log(`Ignoring stale response for request ${currentRequestId}, current is ${this.currentRequestId}`);
          return;
        }

        // console.log(`Loaded group details for: ${groupId}`);

        // Update the group in our groups array
        const index = this.groups.findIndex(g => g.id === groupId);
        if (index >= 0) {
          this.groups[index] = group;
        } else {
          this.groups.push(group);
        }

        // Update filtered groups
        this.filteredGroups = [...this.groups];

        // Select the group
        this.selectedGroup = group;

        // Handle file selection
        if (fileId) {
          const file = group.files.find(f => f.id === fileId);

          if (file) {
            // console.log(`File ${fileId} found in loaded group data`);

            // If we have the file, select it
            this.selectedFile = file;
            this.loadBusinessFlowTags(file.id);
          } else if (group.overview) {
            // console.log(`File ${fileId} not found, selecting overview file`);

            // If we don't have the file but have an overview, select it
            this.selectedFile = group.overview;
            this.loadBusinessFlowTags(group.overview.id);
          } else if (group.files.length > 0) {
            // console.log(`File ${fileId} not found, no overview, selecting first file`);

            // Otherwise select the first file
            this.selectedFile = group.files[0];
            this.loadBusinessFlowTags(group.files[0].id);
          } else {
            // console.log('Group has no files');
            this.selectedFile = null;
            this.businessFlowTags = [];
          }
        } else if (group.overview) {
          // console.log('No file ID specified, selecting overview file');

          // If no file ID but we have an overview, select it
          this.selectedFile = group.overview;
          this.loadBusinessFlowTags(group.overview.id);
        } else if (group.files.length > 0) {
          // console.log('No overview file, selecting first file');

          // Otherwise select the first file
          this.selectedFile = group.files[0];
          this.loadBusinessFlowTags(group.files[0].id);
        } else {
          // console.log('Group has no files');
          this.selectedFile = null;
          this.businessFlowTags = [];
        }

        this.loading = false;
      },
      error: (error) => {
        // Check if this is still the current request
        if (requestId && currentRequestId !== this.currentRequestId) {
          // console.log(`Ignoring error for stale request ${currentRequestId}, current is ${this.currentRequestId}`);
          return;
        }

        console.error(`Error loading group ${groupId}:`, error);
        this.error = `Failed to load documentation group ${groupId}.`;
        this.loading = false;
      }
    });
  }

  /**
   * Loads business flow tags for a file
   */
  loadBusinessFlowTags(fileId: string): void {
    // console.log(`Loading business flow tags for file: ${fileId}`);

    // Generate a new request ID
    const requestId = ++this.currentRequestId;

    // Check if we already have the tags in cache
    if (this.businessFlowTagsCache.has(fileId)) {
      // console.log(`Using cached business flow tags for file ${fileId}`);
      this.businessFlowTags = this.businessFlowTagsCache.get(fileId) || [];
      return;
    }

    this.documentationService.getBusinessFlowTags(fileId).subscribe({
      next: (tags) => {
        // Check if this is still the current request
        if (requestId !== this.currentRequestId) {
          // console.log(`Ignoring stale business flow tags for request ${requestId}, current is ${this.currentRequestId}`);
          return;
        }

        // console.log(`Loaded ${tags.length} business flow tags for file ${fileId}`);
        this.businessFlowTags = tags;

        // Cache the tags
        this.businessFlowTagsCache.set(fileId, tags);

        // Set up view flow buttons after a short delay to ensure the DOM is updated
        setTimeout(() => {
          this.setupViewFlowButtons();
        }, 100);
      },
      error: (error) => {
        // Check if this is still the current request
        if (requestId !== this.currentRequestId) {
          // console.log(`Ignoring error for stale business flow tags request ${requestId}, current is ${this.currentRequestId}`);
          return;
        }

        console.error(`Error loading business flow tags for file ${fileId}:`, error);
        this.businessFlowTags = [];
      }
    });
  }

  /**
   * Sets up view flow buttons in the markdown content
   */
  private setupViewFlowButtons(): void {
    const viewFlowButtons = document.querySelectorAll('.view-flow-button');
    // console.log(`Found ${viewFlowButtons.length} view flow buttons`);

    viewFlowButtons.forEach(button => {
      button.addEventListener('click', (event) => {
        const tagName = (event.currentTarget as HTMLElement).getAttribute('data-tag-id');
        if (tagName) {
          const tag = this.businessFlowTags.find(t => t.name === tagName);
          if (tag) {
            this.openBusinessFlowDialog(tag);
          }
        }
      });
    });
  }

  /**
   * Selects a documentation group
   */
  selectGroup(group: DocumentationGroup, skipRouteUpdate: boolean = false): void {

    if (this.selectedGroup?.id === group.id) {
      return; // Already selected
    }

    this.selectedGroup = group;
    this.selectedFile = null;
    this.businessFlowTags = [];
    this.selectedBusinessFlowTag = null;

    // Update the route if not skipping
    if (!skipRouteUpdate) {
      this.router.navigate(['/documentation', group.id]);
      return; // Let the route handler take care of file selection
    }

    // If skipping route update, handle file selection directly
    if (group.overview) {
      this.selectedFile = group.overview;
      this.loadBusinessFlowTags(group.overview.id);
    } else if (group.files && group.files.length > 0) {
      this.selectedFile = group.files[0];
      this.loadBusinessFlowTags(group.files[0].id);
    }
  }

  /**
   * Selects a documentation file
   */
  selectFile(file: DocumentationFile, skipRouteUpdate: boolean = false): void {
    if (this.selectedFile?.id === file.id) {
      return; // Already selected
    }

    this.selectedFile = file;
    this.businessFlowTags = [];
    this.selectedBusinessFlowTag = null;

    // Update the route if not skipping
    if (!skipRouteUpdate) {
      this.router.navigate(['/documentation', file.groupId, file.id]);
      return; // Let the route handler take care of loading tags
    }

    // If skipping route update, load tags directly
    this.loadBusinessFlowTags(file.id);
  }

  /**
   * Public method to load all groups (for refresh button)
   */
  loadGroups(): void {
    // console.log('Refreshing all groups');

    // Generate a new request ID
    const requestId = ++this.currentRequestId;

    // Clear the cache when refreshing
    this.businessFlowTagsCache.clear();

    // Remember current selection
    const currentGroupId = this.selectedGroup?.id;
    const currentFileId = this.selectedFile?.id;

    // Show loading indicator
    this.loading = true;

    // Load all groups
    this.documentationService.getAllGroups().subscribe({
      next: (groups) => {
        // Check if this is still the current request
        if (requestId !== this.currentRequestId) {
          // console.log(`Ignoring stale groups response for request ${requestId}, current is ${this.currentRequestId}`);
          return;
        }

        // console.log(`Loaded ${groups.length} groups`);
        this.groups = groups;
        this.filteredGroups = [...groups];
        this.loading = false;

        // If we had a group selected before, try to reselect it
        if (currentGroupId) {
          const previousGroup = groups.find(g => g.id === currentGroupId);

          if (previousGroup) {
            // console.log(`Reselecting previously selected group: ${currentGroupId}`);
            this.selectedGroup = previousGroup;

            // If we had a file selected before, try to reselect it
            if (currentFileId) {
              const previousFile = previousGroup.files.find(f => f.id === currentFileId);

              if (previousFile) {
                // console.log(`Reselecting previously selected file: ${currentFileId}`);
                this.selectedFile = previousFile;
                this.loadBusinessFlowTags(previousFile.id);
              } else if (previousGroup.overview) {
                // console.log('Previously selected file not found, selecting overview');
                this.selectedFile = previousGroup.overview;
                this.loadBusinessFlowTags(previousGroup.overview.id);
              } else if (previousGroup.files.length > 0) {
                // console.log('No overview, selecting first file');
                this.selectedFile = previousGroup.files[0];
                this.loadBusinessFlowTags(previousGroup.files[0].id);
              } else {
                // console.log('Group has no files');
                this.selectedFile = null;
                this.businessFlowTags = [];
              }
            } else if (previousGroup.overview) {
              // console.log('No file was selected, selecting overview');
              this.selectedFile = previousGroup.overview;
              this.loadBusinessFlowTags(previousGroup.overview.id);
            } else if (previousGroup.files.length > 0) {
              // console.log('No overview, selecting first file');
              this.selectedFile = previousGroup.files[0];
              this.loadBusinessFlowTags(previousGroup.files[0].id);
            } else {
              // console.log('Group has no files');
              this.selectedFile = null;
              this.businessFlowTags = [];
            }
          } else if (groups.length > 0) {
            // console.log('Previously selected group not found, selecting first group');
            this.selectGroup(groups[0], true);
          } else {
            // console.log('No groups available');
            this.selectedGroup = null;
            this.selectedFile = null;
            this.businessFlowTags = [];
          }
        } else if (groups.length > 0) {
          // console.log('No group was selected, selecting first group');
          this.selectGroup(groups[0], true);
        } else {
          // console.log('No groups available');
          this.selectedGroup = null;
          this.selectedFile = null;
          this.businessFlowTags = [];
        }
      },
      error: (error) => {
        // Check if this is still the current request
        if (requestId !== this.currentRequestId) {
          // console.log(`Ignoring error for stale groups request ${requestId}, current is ${this.currentRequestId}`);
          return;
        }

        console.error('Error loading groups:', error);
        this.error = 'Failed to load documentation groups.';
        this.loading = false;
      }
    });
  }

  /**
   * Public method to load a group (for UI)
   */
  loadGroup(groupId: string, fileId?: string | null): void {
    // console.log(`Public method loadGroup called for: ${groupId}, file: ${fileId || 'none'}`);

    // Generate a new request ID
    const requestId = ++this.currentRequestId;

    this.loadGroupDetails(groupId, fileId, requestId);
  }

  /**
   * Public method to load a file (for UI)
   */
  loadFile(fileId: string): void {
    // console.log(`Public method loadFile called for: ${fileId}`);

    // Generate a new request ID
    const requestId = ++this.currentRequestId;

    this.loading = true;

    this.documentationService.getFile(fileId).subscribe({
      next: (file) => {
        // Check if this is still the current request
        if (requestId !== this.currentRequestId) {
          // console.log(`Ignoring stale file response for request ${requestId}, current is ${this.currentRequestId}`);
          return;
        }

        // console.log(`Loaded file: ${file.id}`);
        this.selectedFile = file;
        this.loadBusinessFlowTags(file.id);
        this.loading = false;
      },
      error: (error) => {
        // Check if this is still the current request
        if (requestId !== this.currentRequestId) {
          // console.log(`Ignoring error for stale file request ${requestId}, current is ${this.currentRequestId}`);
          return;
        }

        console.error(`Error loading file ${fileId}:`, error);
        this.error = `Failed to load documentation file ${fileId}.`;
        this.loading = false;
      }
    });
  }

  /**
   * Opens the business flow dialog for a tag
   */
  openBusinessFlowDialog(tag: BusinessFlowTag): void {
    // Mark the last method in the flow
    if (tag.methods && tag.methods.length > 0) {
      // Reset isLast for all methods
      tag.methods.forEach(method => method.isLast = false);

      // Set isLast for the last method
      tag.methods[tag.methods.length - 1].isLast = true;
    }

    this.selectedBusinessFlowTag = tag;
    this.showBusinessFlowDialog = true;

    // Force change detection
    setTimeout(() => {
      if (this.businessFlowDialog) {
        const dialogElement = this.businessFlowDialog.nativeElement;
        dialogElement.style.display = 'flex';
      }
    }, 0);
  }

  /**
   * Closes the business flow dialog
   */
  closeBusinessFlowDialog(): void {
    this.showBusinessFlowDialog = false;
    this.selectedBusinessFlowTag = null;
  }

  /**
   * Filters groups and files based on the search query
   */
  filterDocumentation(): void {
    if (!this.searchQuery) {
      this.filteredGroups = [...this.groups];
      return;
    }

    const query = this.searchQuery.toLowerCase();

    this.filteredGroups = this.groups.filter(group => {
      // Check if the group title or description matches
      if (group.title.toLowerCase().includes(query) ||
        (group.description && group.description.toLowerCase().includes(query))) {
        return true;
      }

      // Check if any file in the group matches
      return group.files.some(file =>
        file.title.toLowerCase().includes(query) ||
        file.content.toLowerCase().includes(query)
      );
    });
  }

  /**
   * Clears the search query
   */
  clearSearch(): void {
    this.searchQuery = '';
    this.filterDocumentation();
  }

  /**
   * Refreshes the documentation
   */
  refreshDocumentation(): void {
    if (this.refreshing) {
      // console.log('Already refreshing documentation, skipping');
      return;
    }

    // console.log('Refreshing documentation');
    this.refreshing = true;

    // Generate a new request ID
    const requestId = ++this.currentRequestId;

    this.documentationService.refreshDocumentation().subscribe({
      next: () => {
        // Check if this is still the current request
        if (requestId !== this.currentRequestId) {
          // console.log(`Ignoring stale refresh response for request ${requestId}, current is ${this.currentRequestId}`);
          this.refreshing = false;
          return;
        }

        // console.log('Documentation refreshed successfully');

        // Clear the cache
        this.businessFlowTagsCache.clear();

        // Reload groups
        this.loadGroups();

        this.refreshing = false;
      },
      error: (error) => {
        // Check if this is still the current request
        if (requestId !== this.currentRequestId) {
          // console.log(`Ignoring error for stale refresh request ${requestId}, current is ${this.currentRequestId}`);
          this.refreshing = false;
          return;
        }

        console.error('Error refreshing documentation:', error);
        this.error = 'Failed to refresh documentation.';
        this.refreshing = false;
      }
    });
  }

  /**
   * Gets the stereotype color for a method
   */
  getStereotypeColor(stereotype: string): string {
    switch (stereotype.toLowerCase()) {
      case 'controller':
        return '#6c5ce7'; // Purple
      case 'service':
        return '#00b894'; // Green
      case 'repository':
        return '#0984e3'; // Blue
      case 'component':
        return '#e17055'; // Orange
      default:
        return '#b2bec3'; // Gray
    }
  }

  /**
   * Gets the icon for a group
   */
  getGroupIcon(group: DocumentationGroup): string {
    if (group.icon) {
      return group.icon;
    }

    // Default icon
    return 'description';
  }

  /**
   * Handles the business flow tag click event from the markdown component
   */
  onBusinessFlowTagClick(tag: BusinessFlowTag): void {
    this.openBusinessFlowDialog(tag);
  }

  /**
   * Copies the link to the current document to the clipboard
   */
  copyDocumentLink(): void {
    if (!this.selectedFile) return;

    // Create the URL for the current document
    const url = `${window.location.origin}/documentation/${this.selectedFile.groupId}/${this.selectedFile.id}`;

    // Copy to clipboard
    navigator.clipboard.writeText(url)
      .then(() => {
        // Show a temporary success message
        const linkButton = document.querySelector('.action-button[title="Copy link to this document"]');
        if (linkButton) {
          const originalTitle = linkButton.getAttribute('title');
          linkButton.setAttribute('title', 'Link copied!');

          // Reset the title after 2 seconds
          setTimeout(() => {
            linkButton.setAttribute('title', originalTitle || 'Copy link to this document');
          }, 2000);
        }

        // console.log('Document link copied to clipboard:', url);
      })
      .catch(err => {
        console.error('Failed to copy link:', err);
      });
  }

  /**
   * Prints the current document
   */
  printDocument(): void {
    if (!this.selectedFile) return;

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      console.error('Failed to open print window. Pop-up might be blocked.');
      return;
    }

    // Get the markdown content
    const markdownContent = this.markdownContent?.nativeElement;
    if (!markdownContent) {
      console.error('Markdown content not found');
      printWindow.close();
      return;
    }

    // Create the print document
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${this.selectedFile.title}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          h1, h2, h3, h4, h5, h6 {
            margin-top: 1.5em;
            margin-bottom: 0.5em;
          }
          p {
            margin: 1em 0;
          }
          pre {
            background-color: #f5f5f5;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
          }
          code {
            font-family: monospace;
            background-color: #f5f5f5;
            padding: 2px 4px;
            border-radius: 3px;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f5f5f5;
          }
          img {
            max-width: 100%;
          }
          .business-flow-tag {
            display: none; /* Hide business flow tags in print */
          }
          @media print {
            body {
              font-size: 12pt;
            }
          }
        </style>
      </head>
      <body>
        <h1>${this.selectedFile.title}</h1>
        <div class="content">
          ${markdownContent.innerHTML}
        </div>
        <script>
          // Print and close after the content is loaded
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 500);
          };
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
  }
}
