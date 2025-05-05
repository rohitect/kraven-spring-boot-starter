import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { ThemeService } from '../../../services/theme.service';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { MarkdownModule } from 'ngx-markdown';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-getting-started',
  standalone: true,
  imports: [CommonModule, RouterModule, MarkdownModule],
  templateUrl: './getting-started.component.html',
  styleUrls: ['./getting-started.component.scss'],
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
    ])
  ]
})
export class GettingStartedComponent implements OnInit, OnDestroy {
  isDarkTheme = true;
  private subscriptions: Subscription[] = [];

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
}
