import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { PluginService } from '../../services/plugin.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  isDarkTheme = true;
  isSidebarCollapsed = false;
  showKafka = false;

  @Output() sidebarToggled = new EventEmitter<boolean>();

  constructor(
    private themeService: ThemeService,
    private pluginService: PluginService
  ) {
    this.themeService.theme$.subscribe(theme => {
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

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    this.sidebarToggled.emit(this.isSidebarCollapsed);
  }
}
