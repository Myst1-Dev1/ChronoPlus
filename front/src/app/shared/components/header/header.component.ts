import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Sun, Moon } from 'lucide-angular';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  template: `
    <header class="app-header">
      <a routerLink="/dashboard" class="brand-link" aria-label="ChonoPlus Início">
        <div class="brand-badge" aria-hidden="true">
          <svg class="brand-star" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
          </svg>
        </div>
        <span class="brand-title">ChronoPlus</span>
      </a>

      <!-- Seletor de Tema / Dark Mode -->
      <div class="theme-wrapper">
        <span class="theme-label">Tema</span>
        <div
          class="theme-toggle-pill"
          (click)="themeService.toggleTheme()"
          role="button"
          tabindex="0"
          (keydown.enter)="themeService.toggleTheme()"
          (keydown.space)="themeService.toggleTheme()"
          [attr.aria-label]="themeService.isDark() ? 'Mudar para tema claro' : 'Mudar para tema escuro'"
          [title]="themeService.isDark() ? 'Mudar para tema claro' : 'Mudar para tema escuro'"
        >
          <span
            class="pill-item"
            [class.active]="!themeService.isDark()"
            (click)="selectTheme('light', $event)"
            title="Tema claro"
          >
            <lucide-icon [img]="SunIcon" [size]="16" [strokeWidth]="2.2"></lucide-icon>
          </span>
          <span
            class="pill-item"
            [class.active]="themeService.isDark()"
            (click)="selectTheme('dark', $event)"
            title="Tema escuro"
          >
            <lucide-icon [img]="MoonIcon" [size]="16" [strokeWidth]="2.2"></lucide-icon>
          </span>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .app-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 0;
      width: 100%;
    }

    .brand-link {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
      color: inherit;
    }

    .brand-badge {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      background: linear-gradient(135deg, #5345eb, #6366f1);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      box-shadow: 0 4px 10px rgba(83, 69, 235, 0.25);
    }

    .brand-star {
      width: 22px;
      height: 22px;
    }

    .brand-title {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--color-text-primary);
      letter-spacing: -0.02em;
    }

    .theme-wrapper {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .theme-label {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      font-weight: 500;
    }

    .theme-toggle-pill {
      display: inline-flex;
      align-items: center;
      background-color: var(--color-surface);
      border: 1.5px solid var(--color-border);
      border-radius: 9999px;
      padding: 3px;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      transition: all 0.2s ease;
    }

    .theme-toggle-pill:hover {
      border-color: var(--color-primary);
    }

    .pill-item {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 9999px;
      color: var(--color-text-muted);
      transition: all 0.2s ease;
    }

    .pill-item.active {
      background-color: var(--color-primary);
      color: #ffffff;
      box-shadow: 0 2px 6px rgba(89, 84, 216, 0.35);
    }
  `]
})
export class HeaderComponent {
  readonly themeService = inject(ThemeService);

  readonly SunIcon = Sun;
  readonly MoonIcon = Moon;

  selectTheme(mode: 'light' | 'dark', event: Event): void {
    event.stopPropagation();
    this.themeService.setTheme(mode);
  }
}
