import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { ThemeService } from '../../../services/theme.service';
import { MatIconModule } from '@angular/material/icon';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-plugins',
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
        <h1 class="page-title">Kraven UI Plugins</h1>
        <div class="version-badge">v1.0.7</div>
      </div>

      <div class="content-section" @fadeInUp>
        <h2 id="plugin-architecture">Plugin Architecture</h2>
        <p>
          Kraven UI features a powerful plugin architecture that allows you to extend its functionality.
          Plugins can add new features, integrate with external systems, and enhance the core capabilities
          of Kraven UI.
        </p>
        <p>
          The plugin system is designed to be simple and flexible, allowing you to pick and choose the
          features you need for your application. Each plugin is a separate dependency that you can add
          to your project.
        </p>
      </div>

      <div class="content-section" @fadeInUp>
        <h2 id="available-plugins">Available Plugins</h2>

        <div id="kafka-plugin" class="plugin-card">
          <div class="plugin-header">
            <div class="plugin-icon" style="background-color: rgba(0, 206, 201, 0.1);">
              <mat-icon style="color: #00cec9;">sync_alt</mat-icon>
            </div>
            <h3 class="plugin-name">Kafka Plugin</h3>
          </div>
          <p class="plugin-description">
            Provides Kafka management capabilities including topic browsing, message production, and consumer group monitoring.
          </p>
          <div class="plugin-features">
            <h4>Key Features</h4>
            <ul>
              <li>Topic browsing and management</li>
              <li>Message production and consumption</li>
              <li>Consumer group monitoring</li>
              <li>Schema registry integration</li>
              <li>Message payload visualization</li>
            </ul>
          </div>
          <div class="plugin-installation">
            <h4>Installation</h4>
            <div class="code-block">
              <pre><code>&lt;dependency&gt;
  &lt;groupId&gt;io.github.rohitect&lt;/groupId&gt;
  &lt;artifactId&gt;kraven-kafka-plugin&lt;/artifactId&gt;
  &lt;version&gt;1.0.7&lt;/version&gt;
&lt;/dependency&gt;</code></pre>
            </div>
          </div>
        </div>

        <div id="mock-server-plugin" class="plugin-card">
          <div class="plugin-header">
            <div class="plugin-icon" style="background-color: rgba(108, 92, 231, 0.1);">
              <mat-icon style="color: #6c5ce7;">dns</mat-icon>
            </div>
            <h3 class="plugin-name">Mock Server Plugin</h3>
          </div>
          <p class="plugin-description">
            Provides a mock server for integration testing with configurable responses and request validation.
          </p>
          <div class="plugin-features">
            <h4>Key Features</h4>
            <ul>
              <li>Mock HTTP responses</li>
              <li>Request validation</li>
              <li>Response templating</li>
              <li>Delay simulation</li>
              <li>UI-based configuration</li>
            </ul>
          </div>
          <div class="plugin-installation">
            <h4>Installation</h4>
            <div class="code-block">
              <pre><code>&lt;dependency&gt;
  &lt;groupId&gt;io.github.rohitect&lt;/groupId&gt;
  &lt;artifactId&gt;kraven-mock-server-plugin&lt;/artifactId&gt;
  &lt;version&gt;1.0.7&lt;/version&gt;
&lt;/dependency&gt;</code></pre>
            </div>
          </div>
        </div>
      </div>

      <div class="content-section" @fadeInUp>
        <h2 id="creating-custom-plugins">Creating Custom Plugins</h2>
        <p>
          You can create your own custom plugins to extend Kraven UI with your own functionality.
          The plugin SDK provides a simple API for creating plugins that integrate seamlessly with
          the core.
        </p>
        <p>
          See the documentation for more details on creating custom plugins.
        </p>
      </div>

      <div class="content-section" @fadeInUp>
        <h2>Next Steps</h2>
        <div class="next-steps">
          <a routerLink="/documentation/getting-started" class="next-step-card">
            <h3>Getting Started</h3>
            <p>Learn how to get started with Kraven UI</p>
            <span class="arrow-icon">→</span>
          </a>
          <a routerLink="/documentation/configuration" class="next-step-card">
            <h3>Configuration</h3>
            <p>Learn how to configure Kraven UI</p>
            <span class="arrow-icon">→</span>
          </a>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./plugins.component.scss']
})
export class PluginsComponent implements OnInit, OnDestroy {
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
