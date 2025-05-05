import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { ThemeService } from '../../services/theme.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule],
  templateUrl: './hero.component.html',
  styleUrls: ['./hero.component.scss'],
  animations: [
    trigger('fadeIn', [
      state('void', style({
        opacity: 0,
        transform: 'translateY(30px)'
      })),
      transition('void => *', animate('800ms ease-out')),
    ]),
    trigger('slideIn', [
      state('void', style({
        opacity: 0,
        transform: 'translateX(-50px)'
      })),
      transition('void => *', animate('800ms 300ms ease-out')),
    ]),
    trigger('slideInRight', [
      state('void', style({
        opacity: 0,
        transform: 'translateX(50px)'
      })),
      transition('void => *', animate('800ms 300ms ease-out')),
    ])
  ]
})
export class HeroComponent implements OnInit, AfterViewInit, OnDestroy {
  isDarkTheme = true;
  private themeSubscription: Subscription;

  constructor(private themeService: ThemeService) {
    this.themeSubscription = this.themeService.theme$.subscribe(theme => {
      this.isDarkTheme = theme === 'dark';
    });
  }

  ngOnInit(): void {
    // Initialize any data or state
    this.isDarkTheme = this.themeService.getCurrentTheme() === 'dark';
  }

  ngAfterViewInit(): void {
    // No GSAP animations for now
  }

  ngOnDestroy(): void {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }
}
