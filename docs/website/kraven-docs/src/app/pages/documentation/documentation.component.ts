import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../services/theme.service';
import { StaticBackgroundComponent } from '../../components/static-background/static-background.component';
import { HeaderComponent } from '../../components/header/header.component';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { Subscription, filter } from 'rxjs';

// Define interfaces for navigation items
interface NavItem {
  title: string;
  route: string;
  icon: string;
  fragment?: string; // Optional fragment property
}

interface NavSection {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-documentation',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RouterLinkActive,
    MatIconModule,
    FormsModule,
    StaticBackgroundComponent,
    HeaderComponent
  ],
  templateUrl: './documentation.component.html',
  styleUrls: ['./documentation.component.scss', './documentation-mobile.scss'],
  animations: [
    trigger('fadeIn', [
      state('void', style({
        opacity: 0
      })),
      transition('void => *', animate('600ms ease-out')),
    ]),
    trigger('slideIn', [
      state('void', style({
        opacity: 0,
        transform: 'translateX(-20px)'
      })),
      transition('void => *', animate('600ms ease-out')),
    ])
  ]
})

export class DocumentationComponent implements OnInit, OnDestroy {
  isDarkTheme = true;
  isSidebarOpen = true;
  searchQuery = '';
  activeTab = 0;

  private subscriptions: Subscription[] = [];

  // Navigation items
  navItems: NavSection[] = [
    {
      title: 'Getting Started',
      items: [
        { title: 'Introduction', route: 'getting-started', fragment: 'introduction', icon: 'info' },
        { title: 'Installation', route: 'getting-started', fragment: 'installation', icon: 'play_arrow' },
        { title: 'Basic Configuration', route: 'getting-started', fragment: 'basic-configuration', icon: 'settings' },
        { title: 'Environment Variables', route: 'getting-started', fragment: 'environment-variables', icon: 'code' },
        { title: 'Running Your Application', route: 'getting-started', fragment: 'running-your-application', icon: 'play_circle' },
        { title: 'Next Steps', route: 'getting-started', fragment: 'next-steps', icon: 'bolt' }
      ]
    },
    {
      title: 'Features',
      items: [
        { title: 'API Documentation', route: 'features', fragment: 'api-documentation', icon: 'description' },
        { title: 'API Playground', route: 'features', fragment: 'api-playground', icon: 'sports_esports' },
        { title: 'Feign Explorer', route: 'features', fragment: 'feign-client-explorer', icon: 'explore' },
        { title: 'Kafka Management', route: 'features', fragment: 'kafka-management', icon: 'sync_alt' },
        { title: 'Application Monitoring', route: 'features', fragment: 'application-monitoring', icon: 'insights' },
        { title: 'Mock Server', route: 'features', fragment: 'mock-server', icon: 'dns' },
        { title: 'Actuator Insights', route: 'features', fragment: 'actuator-insights', icon: 'monitor_heart' }
      ]
    },
    {
      title: 'Configuration',
      items: [
        { title: 'Core Configuration', route: 'configuration', fragment: 'core-configuration', icon: 'settings' },
        { title: 'Theme Configuration', route: 'configuration', fragment: 'theme-configuration', icon: 'palette' },
        { title: 'API Docs Configuration', route: 'configuration', fragment: 'api-docs-configuration', icon: 'api' },
        { title: 'Feign Client Configuration', route: 'configuration', fragment: 'feign-client-configuration', icon: 'settings_ethernet' },
        { title: 'Kafka Configuration', route: 'configuration', fragment: 'kafka-configuration', icon: 'tune' },
        { title: 'Mock Server Configuration', route: 'configuration', fragment: 'mock-server-configuration', icon: 'build' }
      ]
    },
    {
      title: 'Plugins',
      items: [
        { title: 'Plugin Architecture', route: 'plugins', fragment: 'plugin-architecture', icon: 'extension' },
        { title: 'Available Plugins', route: 'plugins', fragment: 'available-plugins', icon: 'list' },
        { title: 'Kafka Plugin', route: 'plugins', fragment: 'kafka-plugin', icon: 'sync_alt' },
        { title: 'Mock Server Plugin', route: 'plugins', fragment: 'mock-server-plugin', icon: 'dns' },
        { title: 'Actuator Insights Plugin', route: 'plugins', fragment: 'actuator-insights-plugin', icon: 'monitor_heart' },
        { title: 'Creating Custom Plugins', route: 'plugins', fragment: 'creating-custom-plugins', icon: 'add_circle' }
      ]
    }
  ];

  filteredNavItems: NavSection[] = [...this.navItems];

  constructor(private themeService: ThemeService, private router: Router) {}

  ngOnInit(): void {
    // Initialize theme state
    this.isDarkTheme = this.themeService.getCurrentTheme() === 'dark';

    // Subscribe to theme changes
    const themeSub = this.themeService.theme$.subscribe(theme => {
      this.isDarkTheme = theme === 'dark';
    });
    this.subscriptions.push(themeSub);

    // Subscribe to route changes
    const routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.setActiveTabFromRoute();
        this.scrollToFragment();
      });
    this.subscriptions.push(routerSub);

    // Set active tab based on current route
    this.setActiveTabFromRoute();

    // Initial scroll to fragment if present
    setTimeout(() => this.scrollToFragment(), 500);
  }

  private scrollToFragment(): void {
    const fragment = this.router.parseUrl(this.router.url).fragment;
    if (fragment) {
      setTimeout(() => {
        const element = document.getElementById(fragment);
        if (element) {
          // Get the header height to offset the scroll position
          let headerHeight = 64; // Default header height for desktop

          // Check if we're on mobile (max-width: 480px)
          if (window.innerWidth <= 480) {
            headerHeight = 56; // Smaller header height for mobile
          }

          const yOffset = -headerHeight - 20; // Additional 20px for spacing
          const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;

          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 300); // Delay to ensure the DOM is fully rendered
    }
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private setActiveTabFromRoute(): void {
    const currentUrl = this.router.url;

    // Find which tab contains the current route
    for (let i = 0; i < this.navItems.length; i++) {
      const section = this.navItems[i];
      const matchingItem = section.items.find(item =>
        currentUrl.includes(`/documentation/${item.route}`)
      );

      if (matchingItem) {
        this.activeTab = i;
        localStorage.setItem('kravenDocsActiveTab', i.toString());
        break;
      }
    }
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  setActiveTab(index: number): void {
    this.activeTab = index;
    localStorage.setItem('kravenDocsActiveTab', index.toString());

    // Navigate to the first item in the selected tab
    if (this.navItems[index] && this.navItems[index].items.length > 0) {
      const firstItem = this.navItems[index].items[0];

      // Make sure we're navigating to the documentation route
      const route = firstItem.route.startsWith('getting-started/')
        ? firstItem.route
        : firstItem.route;

      // Always navigate without fragment when clicking on tabs
      this.router.navigate(['/documentation', route]);
    }
  }

  filterNavItems(): void {
    if (!this.searchQuery.trim()) {
      this.filteredNavItems = [...this.navItems];
      return;
    }

    const query = this.searchQuery.toLowerCase().trim();

    this.filteredNavItems = this.navItems.map(section => {
      const filteredItems = section.items.filter(item =>
        item.title.toLowerCase().includes(query)
      );

      return filteredItems.length > 0 ? { ...section, items: filteredItems } : null;
    }).filter((section): section is NavSection => section !== null);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.filterNavItems();
  }

  isActive(route: string): boolean {
    return this.router.url === route;
  }

  isItemActive(item: NavItem): boolean {
    const currentUrl = this.router.url;
    const currentFragment = this.router.parseUrl(currentUrl).fragment;

    // Check if the current route matches the item's route
    const routeMatches = currentUrl.includes(`/documentation/${item.route}`);

    // If the item has a fragment, check if it matches the current fragment
    if (item.fragment) {
      return routeMatches && currentFragment === item.fragment;
    }

    // If the item doesn't have a fragment, just check the route
    return routeMatches;
  }
}
