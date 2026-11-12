import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-page">
      <header class="dashboard-header">
        <h2>Painel ChronoPlus</h2>
        <button type="button" class="btn-logout" (click)="logout()">Sair</button>
      </header>

      <section class="welcome-card">
        <h3>Olá, {{ authService.currentUser()?.username || 'Usuário' }}! 👋</h3>
        <p>Você está conectado com sucesso ao ChronoPlus.</p>
        <span class="badge">Sessão Ativa via JWT</span>
      </section>
    </div>
  `,
  styles: [`
    .dashboard-page {
      max-width: 800px;
      margin: 2rem auto;
      padding: 0 1rem;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 1rem;
    }

    .btn-logout {
      background-color: #ef4444;
      color: #ffffff;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }

    .welcome-card {
      background: #ffffff;
      border-radius: 16px;
      padding: 2rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      color: #1e293b;
    }

    .welcome-card h3 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }

    .welcome-card p {
      color: #64748b;
      margin-bottom: 1rem;
    }

    .badge {
      display: inline-block;
      background: #ecfdf5;
      color: #059669;
      font-weight: 600;
      font-size: 0.8rem;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
    }
  `]
})
export class DashboardComponent {
  readonly authService = inject(AuthService);

  logout(): void {
    this.authService.clearSession();
  }
}
