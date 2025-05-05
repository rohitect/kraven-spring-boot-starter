import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-static-background',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './static-background.component.html',
  styleUrls: ['./static-background.component.scss']
})
export class StaticBackgroundComponent implements OnInit {
  isDarkTheme = true;

  constructor(private themeService: ThemeService) {
    // Initialize theme state
    this.isDarkTheme = this.themeService.getCurrentTheme() === 'dark';
  }

  ngOnInit(): void {
    // Subscribe to theme changes
    this.themeService.theme$.subscribe(theme => {
      this.isDarkTheme = theme === 'dark';
    });
  }
}
