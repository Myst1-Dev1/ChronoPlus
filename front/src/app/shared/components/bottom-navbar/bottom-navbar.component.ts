import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule, House, Calendar, CloudSun, User } from 'lucide-angular';

@Component({
  selector: 'app-bottom-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, LucideAngularModule],
  template: `
    <nav class="bottom-navbar" aria-label="Navegação inferior principal">
      <div class="nav-container">
        <a
          routerLink="/dashboard"
          routerLinkActive="is-active"
          [routerLinkActiveOptions]="{ exact: true }"
          class="nav-item"
          aria-label="Início"
        >
          <lucide-icon [img]="HouseIcon" [size]="20" [strokeWidth]="2"></lucide-icon>
          <span class="nav-label">Início</span>
        </a>

        <a
          routerLink="/dashboard"
          class="nav-item"
          aria-label="Agenda"
        >
          <lucide-icon [img]="CalendarIcon" [size]="20" [strokeWidth]="2"></lucide-icon>
          <span class="nav-label">Agenda</span>
        </a>

        <a
          routerLink="/dashboard"
          class="nav-item"
          aria-label="Clima"
        >
          <lucide-icon [img]="CloudSunIcon" [size]="20" [strokeWidth]="2"></lucide-icon>
          <span class="nav-label">Clima</span>
        </a>

        <a
          routerLink="/dashboard"
          class="nav-item"
          aria-label="Perfil"
        >
          <lucide-icon [img]="UserIcon" [size]="20" [strokeWidth]="2"></lucide-icon>
          <span class="nav-label">Perfil</span>
        </a>
      </div>
    </nav>
  `,
  styles: [`
    .bottom-navbar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background-color: var(--color-surface);
      border-top: 1px solid var(--color-border);
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.04);
      z-index: 50;
      padding: 0.65rem 1rem max(0.65rem, env(safe-area-inset-bottom));
      backdrop-filter: blur(12px);
      transition: background-color 0.25s ease, border-color 0.25s ease;
    }

    .nav-container {
      max-width: 460px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-around;
      gap: 0.5rem;
    }

    .nav-item {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      padding: 0.5rem 0.85rem;
      border-radius: 9999px;
      color: var(--color-text-secondary);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
    }

    .nav-item:hover {
      color: var(--color-primary);
    }

    .nav-item.is-active {
      background-color: var(--color-primary-light);
      color: var(--color-primary);
      font-weight: 700;
      padding: 0.55rem 1.15rem;
      box-shadow: 0 1px 2px rgba(89, 84, 216, 0.08);
    }

    .nav-label {
      line-height: 1;
    }
  `]
})
export class BottomNavbarComponent {
  readonly HouseIcon = House;
  readonly CalendarIcon = Calendar;
  readonly CloudSunIcon = CloudSun;
  readonly UserIcon = User;
}

