import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ConfigService } from './services/config.service';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  template: `<router-outlet></router-outlet>`,
  styles: []
})
export class AppComponent implements OnInit {
  constructor(
    private configService: ConfigService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    try {
      const config = this.configService.getConfig();

      if (!config || !config.theme) {
        console.warn('Theme configuration not available, using default values');
        // Set default values
        document.documentElement.style.setProperty('--primary-color-dark', '#1976d2');
        document.documentElement.style.setProperty('--secondary-color-dark', '#424242');
        document.documentElement.style.setProperty('--background-color-dark', '#121212');
        document.documentElement.style.setProperty('--primary-color-light', '#1976d2');
        document.documentElement.style.setProperty('--secondary-color-light', '#424242');
        document.documentElement.style.setProperty('--background-color-light', '#ffffff');

      } else {
        // Apply dark theme colors
        document.documentElement.style.setProperty('--primary-color-dark', config.theme.darkPrimaryColor);
        document.documentElement.style.setProperty('--secondary-color-dark', config.theme.darkSecondaryColor);
        document.documentElement.style.setProperty('--background-color-dark', config.theme.darkBackgroundColor);

        // Apply light theme colors
        document.documentElement.style.setProperty('--primary-color-light', config.theme.lightPrimaryColor);
        document.documentElement.style.setProperty('--secondary-color-light', config.theme.lightSecondaryColor);
        document.documentElement.style.setProperty('--background-color-light', config.theme.lightBackgroundColor);


      }
    } catch (error) {
      console.error('Error applying theme configuration:', error);
      // Set default values
      document.documentElement.style.setProperty('--primary-color-dark', '#1976d2');
      document.documentElement.style.setProperty('--secondary-color-dark', '#424242');
      document.documentElement.style.setProperty('--background-color-dark', '#121212');
      document.documentElement.style.setProperty('--primary-color-light', '#1976d2');
      document.documentElement.style.setProperty('--secondary-color-light', '#424242');
      document.documentElement.style.setProperty('--background-color-light', '#ffffff');

    }

    // Apply initial theme
    this.applyThemeColors(this.themeService.getCurrentTheme());

    // Subscribe to theme changes
    this.themeService.theme$.subscribe(theme => {
      this.applyThemeColors(theme);
    });
  }


  private applyThemeColors(theme: 'dark' | 'light'): void {
    if (theme === 'dark') {
      document.documentElement.style.setProperty('--primary-color', 'var(--primary-color-dark)');
      document.documentElement.style.setProperty('--secondary-color', 'var(--secondary-color-dark)');
      document.documentElement.style.setProperty('--background-color', 'var(--background-color-dark)');
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    } else {
      document.documentElement.style.setProperty('--primary-color', 'var(--primary-color-light)');
      document.documentElement.style.setProperty('--secondary-color', 'var(--secondary-color-light)');
      document.documentElement.style.setProperty('--background-color', 'var(--background-color-light)');
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    }
  }
}
