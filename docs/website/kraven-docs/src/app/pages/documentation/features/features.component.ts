import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { ThemeService } from '../../../services/theme.service';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-features',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule
  ],
  templateUrl: './features.component.html',
  styleUrls: ['./features.component.scss'],
  animations: [
    trigger('fadeIn', [
      state('void', style({
        opacity: 0
      })),
      transition('void => *', animate('600ms ease-out')),
    ]),
    trigger('fadeInUp', [
      state('void', style({
        opacity: 0,
        transform: 'translateY(20px)'
      })),
      transition('void => *', animate('600ms ease-out')),
    ]),
    trigger('staggered', [
      state('void', style({
        opacity: 0,
        transform: 'translateY(20px)'
      })),
      transition('void => *', [
        animate('600ms ease-out')
      ])
    ])
  ]
})
export class FeaturesComponent implements OnInit, OnDestroy {
  isDarkTheme = true;
  private subscriptions: Subscription[] = [];

  features = [
    {
      title: 'API Documentation',
      description: 'Beautiful, interactive documentation for your OpenAPI specifications. Combines the elegance of Redoc with the interactivity of Swagger UI.',
      icon: 'description',
      color: '#3f51b5'
    },
    {
      title: 'API Playground',
      description: 'Try out API endpoints directly from the documentation. Includes request history, authentication support, and response visualization.',
      icon: 'sports_esports',
      color: '#00b894'
    },
    {
      title: 'Feign Explorer',
      description: 'Discover and explore Feign clients in your application. See all external service dependencies in one place.',
      icon: 'explore',
      color: '#e84393'
    },
    {
      title: 'Kafka Management',
      description: 'Monitor and manage Kafka topics, consumers, and producers. View message payloads and publish test messages.',
      icon: 'sync_alt',
      color: '#00cec9'
    },
    {
      title: 'Business Flow Tracking',
      description: 'Track business flows across different layers of your application using the KravenTag annotation.',
      icon: 'account_tree',
      color: '#fdcb6e'
    },
    {
      title: 'Mock Server',
      description: 'Create mock responses for integration testing. Configure via JSON and manage through the UI.',
      icon: 'dns',
      color: '#6c5ce7'
    },
    {
      title: 'Actuator Insights',
      description: 'Visualize Spring Boot Actuator endpoints with an interactive UI. View thread dumps, memory metrics, and more.',
      icon: 'insights',
      color: '#ff7675'
    }
  ];

  constructor(
    private themeService: ThemeService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Initialize theme state
    this.isDarkTheme = this.themeService.getCurrentTheme() === 'dark';

    // Subscribe to theme changes
    const themeSub = this.themeService.theme$.subscribe(theme => {
      this.isDarkTheme = theme === 'dark';
    });
    this.subscriptions.push(themeSub);

    // Subscribe to route changes to handle fragment navigation
    const routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.scrollToFragment();
      });
    this.subscriptions.push(routerSub);

    // Initial scroll to fragment if present
    setTimeout(() => this.scrollToFragment(), 500);
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private scrollToFragment(): void {
    const fragment = this.route.snapshot.fragment;
    if (fragment) {
      setTimeout(() => {
        const element = document.getElementById(fragment);
        if (element) {
          // Get the header height to offset the scroll position
          const headerHeight = 64; // Default header height
          const yOffset = -headerHeight - 20; // Additional 20px for spacing
          const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;

          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 300); // Delay to ensure the DOM is fully rendered
    }
  }

  getAnimationDelay(index: number): string {
    return `${index * 0.1}s`;
  }
}
