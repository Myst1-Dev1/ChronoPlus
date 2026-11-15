import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  Pencil,
  Check,
  Bell,
  ShieldCheck,
  LogOut,
  ChevronRight,
  User as UserIcon,
  X
} from 'lucide-angular';
import { AuthService, type User } from '../../core/services/auth.service';
import { TasksService, type Task } from '../../core/services/tasks.service';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { BottomNavbarComponent } from '../../shared/components/bottom-navbar/bottom-navbar.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { EditProfileModalComponent } from './components/edit-profile-modal/edit-profile-modal.component';

export interface RecentHistoryItem {
  id: string;
  name: string;
  formattedSubtitle: string;
}

function getWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    HeaderComponent,
    BottomNavbarComponent,
    ModalComponent,
    EditProfileModalComponent,
    LucideAngularModule
  ],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css'
})
export class PerfilComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly tasksService = inject(TasksService);
  private readonly router = inject(Router);

  // Ícones Lucide
  readonly PencilIcon = Pencil;
  readonly CheckIcon = Check;
  readonly BellIcon = Bell;
  readonly ShieldCheckIcon = ShieldCheck;
  readonly LogOutIcon = LogOut;
  readonly ChevronRightIcon = ChevronRight;
  readonly UserIcon = UserIcon;
  readonly CloseIcon = X;

  // Estados
  readonly tasks = signal<Task[]>([]);
  readonly isEditModalOpen = signal<boolean>(false);
  readonly isPrivacyModalOpen = signal<boolean>(false);
  readonly notificationPermission = signal<NotificationPermission>('default');
  readonly notificationSuccessAlert = signal<string | null>(null);

  // Dados do usuário logado
  readonly currentUser = computed(() => this.authService.currentUser());

  // Inicial do nome para o avatar (ex: 'M' para Marina)
  readonly userInitial = computed(() => {
    const name = this.currentUser()?.username || 'Marina';
    return name.trim().charAt(0).toUpperCase() || 'M';
  });

  // Nome de exibição
  readonly displayName = computed(() => {
    return this.currentUser()?.username || 'Marina';
  });

  // E-mail de exibição
  readonly displayEmail = computed(() => {
    return this.currentUser()?.email || 'marina@email.com';
  });

  // Contagem de tarefas concluídas nesta semana (Segunda a Domingo com taskConcluded === true)
  readonly weeklyCompletedCount = computed(() => {
    const monday = getWeekMonday(new Date());
    const nextSunday = new Date(monday);
    nextSunday.setDate(monday.getDate() + 7);

    return this.tasks().filter((t) => {
      if (!t.taskConcluded) return false;
      const tDate = new Date(t.scheduledDate);
      return tDate >= monday && tDate < nextSunday;
    }).length;
  });

  // Contagem de tarefas pendentes hoje (taskConcluded === false e scheduledDate de hoje)
  readonly todayPendingCount = computed(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();

    return this.tasks().filter((t) => {
      if (t.taskConcluded) return false;
      const tDate = new Date(t.scheduledDate);
      return (
        tDate.getFullYear() === y &&
        tDate.getMonth() === m &&
        tDate.getDate() === d
      );
    }).length;
  });

  // Histórico recente com dados 100% reais do usuário (taskConcluded === true, mais recentes primeiro)
  readonly recentHistoryList = computed<RecentHistoryItem[]>(() => {
    return this.tasks()
      .filter((t) => t.taskConcluded)
      .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())
      .slice(0, 5)
      .map((t) => ({
        id: t.id,
        name: t.name,
        formattedSubtitle: this.formatTaskHistoryDate(t.scheduledDate)
      }));
  });

  // Rótulo dinâmico do status de notificações
  readonly notificationStatusLabel = computed(() => {
    const perm = this.notificationPermission();
    if (perm === 'granted') return 'Ativadas';
    if (perm === 'denied') return 'Bloqueadas';
    return 'Ativar';
  });

  ngOnInit(): void {
    this.checkNotificationStatus();
    this.loadTasks();
  }

  loadTasks(): void {
    this.tasksService.getAllTasks().subscribe({
      next: (data) => {
        this.tasks.set(data);
      },
      error: (err) => {
        console.warn('[Perfil] Aviso ao carregar tarefas para estatísticas:', err);
      }
    });
  }

  checkNotificationStatus(): void {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.notificationPermission.set(Notification.permission);
    }
  }

  // Ativa e solicita permissão de notificações do navegador
  async toggleOrRequestNotifications(): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Seu navegador não oferece suporte a notificações push.');
      return;
    }

    if (Notification.permission === 'granted') {
      try {
        new Notification('ChronoPlus', {
          body: 'Notificações estão ativas e funcionando perfeitamente!',
          icon: '/favicon.ico'
        });
      } catch {
        // Fallback silencioso em navegadores com restrições
      }
      this.notificationSuccessAlert.set('Notificações push estão ativadas.');
      setTimeout(() => this.notificationSuccessAlert.set(null), 3500);
      return;
    }

    try {
      const result = await Notification.requestPermission();
      this.notificationPermission.set(result);

      if (result === 'granted') {
        this.notificationSuccessAlert.set('Notificações ativadas com sucesso!');
        setTimeout(() => this.notificationSuccessAlert.set(null), 3500);
        try {
          new Notification('ChronoPlus', {
            body: 'Agora você receberá alertas pontuais para suas tarefas e saídas!',
            icon: '/favicon.ico'
          });
        } catch {
          // Ignora se restrito
        }
      } else if (result === 'denied') {
        alert('As notificações foram bloqueadas nas configurações do navegador.');
      }
    } catch (e) {
      console.warn('[Perfil] Erro ao requisitar permissão de notificação:', e);
    }
  }

  openEditModal(): void {
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
  }

  onUserUpdated(_updatedUser: User): void {
    this.notificationSuccessAlert.set('Perfil atualizado com sucesso!');
    setTimeout(() => this.notificationSuccessAlert.set(null), 3500);
  }

  openPrivacyModal(): void {
    this.isPrivacyModalOpen.set(true);
  }

  closePrivacyModal(): void {
    this.isPrivacyModalOpen.set(false);
  }

  logout(): void {
    if (confirm('Deseja realmente sair da sua conta?')) {
      this.authService.clearSession();
    }
  }

  private formatTaskHistoryDate(scheduledDate: string): string {
    try {
      const d = new Date(scheduledDate);
      if (isNaN(d.getTime())) return 'Concluída';

      const today = new Date();
      const isToday =
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear();

      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      const isYesterday =
        d.getDate() === yesterday.getDate() &&
        d.getMonth() === yesterday.getMonth() &&
        d.getFullYear() === yesterday.getFullYear();

      const timeStr = new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(d);

      const dayMonth = new Intl.DateTimeFormat('pt-BR', {
        day: 'numeric',
        month: 'short'
      }).format(d);

      let prefix = dayMonth;
      if (isToday) prefix = `Hoje, ${dayMonth}`;
      else if (isYesterday) prefix = `Ontem, ${dayMonth}`;

      return `${prefix} · ${timeStr} · Concluída`;
    } catch {
      return 'Concluída';
    }
  }
}

