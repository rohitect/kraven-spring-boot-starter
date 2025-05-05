import { Component, ElementRef, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-animated-background',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './animated-background.component.html',
  styleUrls: ['./animated-background.component.scss']
})
export class AnimatedBackgroundComponent implements OnInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private animationFrameId: number = 0;
  private resizeHandler: () => void;
  private isDarkTheme = true;

  constructor(private themeService: ThemeService) {
    this.resizeHandler = this.resizeCanvas.bind(this);

    // Initialize theme state
    this.isDarkTheme = this.themeService.getCurrentTheme() === 'dark';
  }

  ngOnInit(): void {
    this.initCanvas();
    this.createParticles();
    this.animate();

    window.addEventListener('resize', this.resizeHandler);

    // Subscribe to theme changes
    this.themeService.theme$.subscribe(theme => {
      this.isDarkTheme = theme === 'dark';
      // Redraw with new theme colors
      this.clearCanvas();
      this.createParticles();
    });
  }

  private clearCanvas(): void {
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
    }
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.resizeHandler);
  }

  private initCanvas(): void {
    this.ctx = this.canvas.nativeElement.getContext('2d')!;
    this.resizeCanvas();
  }

  private resizeCanvas(): void {
    this.canvas.nativeElement.width = window.innerWidth;
    this.canvas.nativeElement.height = window.innerHeight;
    this.createParticles();
  }

  private createParticles(): void {
    this.particles = [];
    const particleCount = Math.floor(window.innerWidth / 20);

    for (let i = 0; i < particleCount; i++) {
      this.particles.push(new Particle(
        Math.random() * this.canvas.nativeElement.width,
        Math.random() * this.canvas.nativeElement.height,
        Math.random() * 2 + 1,
        this.getRandomColor()
      ));
    }
  }

  private getRandomColor(): string {
    if (this.isDarkTheme) {
      // Dark theme colors
      const colors = ['#3f51b5', '#00b0ff', '#5c6bc0', '#7986cb', '#4fc3f7'];
      return colors[Math.floor(Math.random() * colors.length)];
    } else {
      // Light theme colors
      const colors = ['#1976d2', '#0288d1', '#2196f3', '#42a5f5', '#64b5f6'];
      return colors[Math.floor(Math.random() * colors.length)];
    }
  }

  private animate(): void {
    this.ctx.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);

    // Draw gradient background based on theme
    const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);

    if (this.isDarkTheme) {
      // Dark theme gradient
      gradient.addColorStop(0, '#151929'); // Darker blue
      gradient.addColorStop(0.5, '#1a1b2e'); // Middle tone
      gradient.addColorStop(1, '#1e2233'); // Slightly lighter dark blue
    } else {
      // Light theme gradient
      gradient.addColorStop(0, '#e8f0fe'); // Light blue
      gradient.addColorStop(0.5, '#f5f7fa'); // Almost white
      gradient.addColorStop(1, '#edf2f7'); // Light gray-blue
    }

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);

    // Update and draw particles
    for (const particle of this.particles) {
      particle.update();
      particle.draw(this.ctx);

      // Connect particles that are close to each other
      for (const otherParticle of this.particles) {
        if (particle !== otherParticle) {
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            this.ctx.beginPath();
            // Line color based on theme
            const lineColor = this.isDarkTheme ?
              `rgba(63, 81, 181, ${1 - distance / 150})` :
              `rgba(25, 118, 210, ${1 - distance / 150})`;
            this.ctx.strokeStyle = lineColor;
            this.ctx.lineWidth = 0.5;
            this.ctx.moveTo(particle.x, particle.y);
            this.ctx.lineTo(otherParticle.x, otherParticle.y);
            this.ctx.stroke();
          }
        }
      }
    }

    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }
}

class Particle {
  private vx: number;
  private vy: number;
  private size: number;

  constructor(
    public x: number,
    public y: number,
    public speed: number,
    public color: string
  ) {
    this.vx = (Math.random() - 0.5) * this.speed;
    this.vy = (Math.random() - 0.5) * this.speed;
    this.size = Math.random() * 3 + 1;
  }

  update(): void {
    this.x += this.vx;
    this.y += this.vy;

    // Bounce off edges
    if (this.x < 0 || this.x > window.innerWidth) {
      this.vx = -this.vx;
    }

    if (this.y < 0 || this.y > window.innerHeight) {
      this.vy = -this.vy;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}
