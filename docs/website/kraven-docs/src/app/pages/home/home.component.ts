import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../components/header/header.component';
import { HeroComponent } from '../../components/hero/hero.component';
import { FeaturesComponent } from '../../components/features/features.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { AnimatedBackgroundComponent } from '../../components/animated-background/animated-background.component';
import { trigger, state, style, animate, transition } from '@angular/animations';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    HeroComponent,
    FeaturesComponent,
    FooterComponent,
    AnimatedBackgroundComponent
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  animations: [
    trigger('fadeIn', [
      state('void', style({
        opacity: 0
      })),
      transition('void => *', animate('800ms ease-out')),
    ])
  ]
})
export class HomeComponent implements OnInit {
  ngOnInit(): void {
    // Initialize any data or state
  }
}
