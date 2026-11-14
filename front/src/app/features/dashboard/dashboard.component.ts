import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideAngularModule,
  ChevronLeft,
  ChevronRight,
  Clock,
  Check,
  Plus,
  CalendarCheck2
} from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { TasksService, type Task } from '../../core/services/tasks.service';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { BottomNavbarComponent } from '../../shared/components/bottom-navbar/bottom-navbar.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { CreateTaskModalComponent } from './components/create-task-modal/create-task-modal.component';

export interface CalendarDay {
  date: Date;
  isoDate: string;
  dayOfWeek: string;
  dayNumber: number;
  isSelected: boolean;
  isToday: boolean;
  hasTasks: boolean;
}

const DOW_LABELS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

function getWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    BottomNavbarComponent,
    LoadingSpinnerComponent,
    LucideAngularModule,
    CreateTaskModalComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private readonly tasksService = inject(TasksService);
  readonly authService = inject(AuthService);

  // Ícones Lucide
  readonly ChevronLeftIcon = ChevronLeft;
  readonly ChevronRightIcon = ChevronRight;
  readonly ClockIcon = Clock;
  readonly CheckIcon = Check;
  readonly PlusIcon = Plus;
  readonly CalendarEmptyIcon = CalendarCheck2;

  // Estados reativos via Signals
  readonly tasks = signal<Task[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly isCreateModalOpen = signal<boolean>(false);

  // Data de referência do calendário (segunda-feira da semana visível)
  readonly referenceWeekDate = signal<Date>(getWeekMonday(new Date()));
  // Data selecionada pelo usuário
  readonly selectedDate = signal<Date>(new Date());

  // Saudação contextual por horário
  readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  });

  // Primeiro nome do usuário logado
  readonly userFirstName = computed(() => {
    const user = this.authService.currentUser();
    if (user?.username) {
      return user.username.split(/[\s_]/)[0] ?? user.username;
    }
    return 'Marina';
  });

  // Data por extenso (ex: "Terça-feira, 6 de outubro")
  readonly formattedDateHeader = computed(() => {
    const d = this.selectedDate();
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
    const formatted = formatter.format(d);
    // Capitaliza o dia da semana
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  });

  // Título do mês do calendário (ex: "Outubro 2026")
  readonly calendarMonthTitle = computed(() => {
    const d = this.referenceWeekDate();
    const month = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(d);
    const year = d.getFullYear();
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
    return `${capitalizedMonth} ${year}`;
  });

  // Dias da semana para a faixa do calendário
  readonly weekDays = computed<CalendarDay[]>(() => {
    const monday = this.referenceWeekDate();
    const selectedIso = this.selectedDate().toISOString().slice(0, 10);
    const todayIso = new Date().toISOString().slice(0, 10);
    const allTasks = this.tasks();

    const days: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const dowIndex = d.getDay();

      const hasTasks = allTasks.some((t) => t.scheduledDate.slice(0, 10) === iso);

      days.push({
        date: d,
        isoDate: iso,
        dayOfWeek: DOW_LABELS[dowIndex] ?? '',
        dayNumber: d.getDate(),
        isSelected: iso === selectedIso,
        isToday: iso === todayIso,
        hasTasks
      });
    }

    return days;
  });

  // Tarefas filtradas para a data selecionada
  readonly filteredTasks = computed(() => {
    const selectedIso = this.selectedDate().toISOString().slice(0, 10);
    return this.tasks().filter((t) => t.scheduledDate.slice(0, 10) === selectedIso);
  });

  // Contagem de tarefas concluídas
  readonly completedCount = computed(() => {
    return this.filteredTasks().filter((t) => t.taskConcluded).length;
  });

  // Verifica se o dia selecionado é hoje
  readonly isTodaySelected = computed(() => {
    return this.selectedDate().toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);
  });

  ngOnInit(): void {
    if (!this.authService.hasValidToken()) {
      return;
    }
    this.loadTasks();
  }

  loadTasks(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.tasksService.getAllTasks().subscribe({
      next: (data) => {
        this.tasks.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.warn('[Dashboard] Erro ao carregar tarefas via GraphQL:', err);
        this.errorMessage.set('Não foi possível carregar as tarefas.');
        this.isLoading.set(false);
      }
    });
  }

  selectDay(date: Date): void {
    this.selectedDate.set(new Date(date));
  }

  navigateWeek(direction: number): void {
    const currentMonday = this.referenceWeekDate();
    const newMonday = new Date(currentMonday);
    newMonday.setDate(currentMonday.getDate() + direction * 7);
    this.referenceWeekDate.set(newMonday);
  }

  toggleTask(id: string): void {
    const task = this.tasks().find((t) => t.id === id);
    if (!task) return;

    const nextState = !task.taskConcluded;

    // Atualização otimista
    this.tasks.update((prev) =>
      prev.map((t) => (t.id === id ? { ...t, taskConcluded: nextState } : t))
    );

    this.tasksService.editTask(id, { taskConcluded: nextState }).subscribe({
      error: (err) => {
        console.error('[Dashboard] Erro ao atualizar status da tarefa:', err);
        // Reverte em caso de falha
        this.tasks.update((prev) =>
          prev.map((t) => (t.id === id ? { ...t, taskConcluded: !nextState } : t))
        );
      }
    });
  }

  // Identifica a próxima tarefa pendente ("A seguir")
  isNextUp(task: Task): boolean {
    if (task.taskConcluded) return false;
    const pending = this.filteredTasks().filter((t) => !t.taskConcluded);
    return pending[0]?.id === task.id;
  }

  formatTaskTime(scheduledDate: string): string {
    try {
      const d = new Date(scheduledDate);
      if (isNaN(d.getTime())) return '20:00';
      return new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(d);
    } catch {
      return '20:00';
    }
  }

  openCreateTaskModal(): void {
    this.isCreateModalOpen.set(true);
  }

  closeCreateTaskModal(): void {
    this.isCreateModalOpen.set(false);
  }

  onTaskCreated(newTask: Task): void {
    this.loadTasks();

    // Sincroniza a data selecionada do calendário para o dia da tarefa criada
    if (newTask.scheduledDate) {
      const taskDate = new Date(newTask.scheduledDate);
      if (!isNaN(taskDate.getTime())) {
        this.selectedDate.set(taskDate);
        this.referenceWeekDate.set(getWeekMonday(taskDate));
      }
    }
  }
}

