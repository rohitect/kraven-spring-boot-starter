import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ThemeService } from '../../../services/theme.service';
import { PluginService } from '../../../services/plugin.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  exportAs: 'appHeader'
})
export class HeaderComponent implements OnInit {
  isDarkTheme = false;
  showKafka = false;

  constructor(
    private themeService: ThemeService,
    private router: Router,
    private pluginService: PluginService
  ) {}

  ngOnInit(): void {
    this.themeService.theme$.subscribe((theme: 'dark' | 'light') => {
      this.isDarkTheme = theme === 'dark';
    });

    // Check if Kafka plugin is available and running
    this.pluginService.getPlugins().subscribe(plugins => {
      const kafkaPlugin = plugins.find(p => p.id === 'kafka');
      this.showKafka = !!(kafkaPlugin && kafkaPlugin.running);
    });
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  isActive(route: string): boolean {
    // For the home route, require an exact match
    if (route === '/') {
      return this.router.url === route;
    }
    // For other routes, check if the URL starts with the route
    return this.router.url.startsWith(route);
  }
}
