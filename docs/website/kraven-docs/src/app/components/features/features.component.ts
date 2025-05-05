import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { ThemeService } from '../../services/theme.service';

interface Feature {
  icon: string;
  title: string;
  description: string;
  image: string;
  color: string;
}

@Component({
  selector: 'app-features',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule
  ],
  templateUrl: './features.component.html',
  styleUrls: ['./features.component.scss'],
  animations: [
    trigger('fadeInUp', [
      state('void', style({
        opacity: 0,
        transform: 'translateY(30px)'
      })),
      transition('void => *', animate('600ms ease-out')),
    ])
  ]
})
export class FeaturesComponent implements OnInit, AfterViewInit {
  selectedFeatureIndex = 0;
  isDarkTheme = true;

  constructor(private themeService: ThemeService) {
    // Initialize theme state
    this.isDarkTheme = this.themeService.getCurrentTheme() === 'dark';
  }

  features: Feature[] = [
    {
      icon: 'assets/icons/api-docs.svg',
      title: 'API Documentation',
      description: 'Beautiful, interactive API documentation with a modern UI. Try out API endpoints directly from the documentation. Kraven UI combines the elegant readability of Redoc with the interactive playground capabilities of Swagger UI.',
      image: 'assets/features/api-docs.png',
      color: '#3f51b5'
    },
    {
      icon: 'assets/icons/feign.svg',
      title: 'Feign Client Explorer',
      description: 'Discover and test your Feign clients with an intuitive interface. Search and filter through your clients with ease. Automatically scans and displays all your Feign clients with interactive testing capabilities.',
      image: 'assets/features/feign-client.png',
      color: '#00b894'
    },
    {
      icon: 'assets/icons/kafka.svg',
      title: 'Kafka Management',
      description: 'Manage Kafka topics, produce and consume messages, and monitor consumer groups all from a single interface. View messages in real-time with filtering and pagination capabilities.',
      image: 'assets/features/kafka.png',
      color: '#fd79a8'
    },
    {
      icon: 'assets/icons/monitoring.svg',
      title: 'Application Monitoring',
      description: 'Monitor your application\'s performance with real-time metrics, thread dumps, and memory usage visualization. Get insights into your application\'s health and performance at a glance.',
      image: 'assets/features/monitoring.png',
      color: '#e84393'
    },
    {
      icon: 'assets/icons/plugins.svg',
      title: 'Plugin Architecture',
      description: 'Extend Kraven UI with custom plugins to add new features and functionality to your application. The plugin-based architecture allows for easy extension and customization.',
      image: 'assets/features/plugins.png',
      color: '#55efc4'
    },
    {
      icon: 'assets/icons/docs.svg',
      title: 'Documentation Hub',
      description: 'Write beautiful documentation in Markdown format with support for Mermaid diagrams and business flow visualization. Organize documentation into logical sections with a clean, modern interface.',
      image: 'assets/features/docs.png',
      color: '#a29bfe'
    }
  ];

  ngOnInit(): void {
    // Initialize any data or state

    // Subscribe to theme changes
    this.themeService.theme$.subscribe(theme => {
      this.isDarkTheme = theme === 'dark';
    });
  }

  ngAfterViewInit(): void {
    // No GSAP animations for now
  }

  selectFeature(index: number): void {
    this.selectedFeatureIndex = index;
  }
}
