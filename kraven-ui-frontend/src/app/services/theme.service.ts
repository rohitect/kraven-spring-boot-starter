import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ConfigService } from './config.service';

export type Theme = 'dark' | 'light';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private themeSubject = new BehaviorSubject<Theme>('dark'); // Default to dark initially
  public theme$ = this.themeSubject.asObservable();

  constructor(private configService: ConfigService) {
    // Initialize theme after constructor
    setTimeout(() => {
      const initialTheme = this.getInitialTheme();
      this.themeSubject.next(initialTheme);
      this.applyTheme(initialTheme);
    }, 0);
  }

  private getInitialTheme(): Theme {
    try {
      // Check if theme is stored in localStorage first
      const savedTheme = localStorage.getItem('theme') as Theme;
      if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light')) {
        return savedTheme;
      }

      // Try to get config
      const config = this.configService.getConfig();
      if (!config || !config.theme) {
        console.warn('Theme configuration not available, using default theme');
        return 'dark';
      }

      // Check if we should respect system preference
      if (config.theme.respectSystemPreference) {
        // Check if user prefers dark mode
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          return 'dark';
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
          return 'light';
        }
      }

      // Use the default theme from configuration
      return (config.theme.defaultTheme as Theme) || 'dark';
    } catch (error) {
      console.error('Error getting initial theme:', error);
      return 'dark'; // Fallback to dark theme
    }
  }

  public toggleTheme(): void {
    const newTheme = this.themeSubject.value === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  public setTheme(theme: Theme): void {
    localStorage.setItem('theme', theme);
    this.themeSubject.next(theme);
    this.applyTheme(theme);
  }

  private applyTheme(theme: Theme): void {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark-theme');
      console.log('Applied light theme');
    } else {
      document.documentElement.classList.add('dark-theme');
      document.documentElement.classList.remove('light-theme');
      console.log('Applied dark theme');
    }
  }

  public getCurrentTheme(): Theme {
    return this.themeSubject.value;
  }
}
