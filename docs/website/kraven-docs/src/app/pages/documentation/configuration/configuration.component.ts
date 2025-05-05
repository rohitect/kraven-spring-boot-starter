import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { ThemeService } from '../../../services/theme.service';
import { MatIconModule } from '@angular/material/icon';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-configuration',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule
  ],
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
  ],
  template: `
    <div class="documentation-container" [class.light-theme]="!isDarkTheme">
      <div class="page-header" @fadeIn>
        <h1 class="page-title">Configuration Options</h1>
        <div class="version-badge">v1.0.7</div>
      </div>

      <div class="content-section" @fadeInUp>
        <h2>Overview</h2>
        <p>
          Kraven UI provides a wide range of configuration options to customize its behavior and appearance.
          This page documents all available configuration properties that can be set in your <code>application.properties</code>,
          <code>application.yml</code>, or via environment variables.
        </p>
        <div class="config-note">
          <mat-icon>info</mat-icon>
          <div class="note-content">
            <strong>Note:</strong> All configuration properties can be set using either property files or environment variables.
            For environment variables, use the format <code>KRAVEN_UI_CONFIG='{{ "{" }}"theme":{{ "{" }}"darkPrimaryColor":"#ff5722"{{ "}" }}{{ "}" }}'</code>.
          </div>
        </div>
      </div>

      <div class="content-section" @fadeInUp>
        <h2 id="core-configuration">Core Configuration</h2>
        <p>These are the core configuration options for Kraven UI:</p>
        <ul>
          <li><strong>kraven.ui.enabled</strong> - Enable or disable Kraven UI (default: true)</li>
          <li><strong>kraven.ui.path</strong> - The base path for the UI (hardcoded to /kraven/ui)</li>
          <li><strong>kraven.ui.api-path</strong> - The base path for the API (hardcoded to /kraven/api)</li>
          <li><strong>kraven.ui.title</strong> - The title displayed in the UI (default: Kraven UI)</li>
          <li><strong>kraven.ui.description</strong> - The description displayed in the UI (default: API Documentation & Development Toolkit)</li>
        </ul>
      </div>

      <div class="content-section" @fadeInUp>
        <h2 id="theme-configuration">Theme Configuration</h2>
        <p>These options control the appearance of Kraven UI:</p>
        <ul>
          <li><strong>kraven.ui.theme.default-theme</strong> - The default theme (dark or light) (default: dark)</li>
          <li><strong>kraven.ui.theme.dark-primary-color</strong> - Primary color for dark theme (default: #3f51b5)</li>
          <li><strong>kraven.ui.theme.dark-secondary-color</strong> - Secondary color for dark theme (default: #00b0ff)</li>
          <li><strong>kraven.ui.theme.dark-background-color</strong> - Background color for dark theme (default: #1a1b2e)</li>
          <li><strong>kraven.ui.theme.light-primary-color</strong> - Primary color for light theme (default: #1976d2)</li>
          <li><strong>kraven.ui.theme.light-secondary-color</strong> - Secondary color for light theme (default: #0288d1)</li>
          <li><strong>kraven.ui.theme.light-background-color</strong> - Background color for light theme (default: #ffffff)</li>
        </ul>
      </div>

      <div class="content-section" @fadeInUp>
        <h2 id="api-docs-configuration">API Documentation Configuration</h2>
        <p>These options control the API documentation features:</p>
        <ul>
          <li><strong>kraven.ui.api-docs.enabled</strong> - Enable or disable API documentation (default: true)</li>
          <li><strong>kraven.ui.api-docs.path</strong> - The path for API documentation (default: /api-docs)</li>
          <li><strong>kraven.ui.api-docs.title</strong> - The title for API documentation (default: API Documentation)</li>
          <li><strong>kraven.ui.api-docs.description</strong> - The description for API documentation (default: API Documentation)</li>
          <li><strong>kraven.ui.api-docs.version</strong> - The version for API documentation (default: 1.0.0)</li>
        </ul>
      </div>

      <div class="content-section" @fadeInUp>
        <h2 id="feign-client-configuration">Feign Explorer Configuration</h2>
        <p>These options control the Feign Explorer features:</p>
        <ul>
          <li><strong>kraven.ui.feign.enabled</strong> - Enable or disable Feign Explorer (default: true)</li>
          <li><strong>kraven.ui.feign.base-packages</strong> - Base packages to scan for Feign clients (default: com.example)</li>
          <li><strong>kraven.ui.feign.cache-ttl</strong> - Cache TTL in seconds for Feign client metadata (default: 3600)</li>
        </ul>
      </div>

      <div class="content-section" @fadeInUp>
        <h2 id="kafka-configuration">Kafka Management Configuration</h2>
        <p>These options control the Kafka Management features:</p>
        <ul>
          <li><strong>kraven.ui.kafka.enabled</strong> - Enable or disable Kafka Management (default: true)</li>
          <li><strong>kraven.ui.kafka.bootstrap-servers</strong> - Kafka bootstrap servers (default: localhost:9092)</li>
          <li><strong>kraven.ui.kafka.consumer-groups</strong> - Consumer groups to monitor (default: my-consumer-group)</li>
        </ul>
      </div>

      <div class="content-section" @fadeInUp>
        <h2 id="mock-server-configuration">Mock Server Configuration</h2>
        <p>These options control the Mock Server features:</p>
        <ul>
          <li><strong>kraven.ui.mock-server.enabled</strong> - Enable or disable Mock Server (default: false)</li>
          <li><strong>kraven.ui.mock-server.port</strong> - Port for Mock Server (default: 11000)</li>
          <li><strong>kraven.ui.mock-server.config-path</strong> - Path to Mock Server configuration file (default: classpath:mock-server.json)</li>
          <li><strong>kraven.ui.mock-server.auto-start</strong> - Auto-start Mock Server on application startup (default: false)</li>
        </ul>
      </div>

      <div class="content-section" @fadeInUp>
        <h2>Next Steps</h2>
        <div class="next-steps">
          <a routerLink="/documentation/plugins" class="next-step-card">
            <h3>Plugins</h3>
            <p>Explore the available plugins and how to use them</p>
            <span class="arrow-icon">→</span>
          </a>
          <a routerLink="/documentation/features" class="next-step-card">
            <h3>Features</h3>
            <p>Learn about the features of Kraven UI</p>
            <span class="arrow-icon">→</span>
          </a>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./configuration.component.scss']
})
export class ConfigurationComponent implements OnInit, OnDestroy {
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
