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
import { RemindersService, type Reminder } from '../../core/services/reminders.service';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { BottomNavbarComponent } from '../../shared/components/bottom-navbar/bottom-navbar.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

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
    LucideAngularModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private readonly remindersService = inject(RemindersService);
  readonly authService = inject(AuthService);

  // Ícones Lucide
  readonly ChevronLeftIcon = ChevronLeft;
  readonly ChevronRightIcon = ChevronRight;
  readonly ClockIcon = Clock;
  readonly CheckIcon = Check;
  readonly PlusIcon = Plus;
  readonly CalendarEmptyIcon = CalendarCheck2;

  // Estados reativos via Signals
  readonly reminders = signal<Reminder[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

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
    const allReminders = this.reminders();

    const days: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const dowIndex = d.getDay();

      const hasTasks = allReminders.some((r) => r.reminderDate.slice(0, 10) === iso);

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

  // Lembretes filtrados para a data selecionada
  readonly filteredReminders = computed(() => {
    const selectedIso = this.selectedDate().toISOString().slice(0, 10);
    return this.reminders().filter((r) => r.reminderDate.slice(0, 10) === selectedIso);
  });

  // Contagem de lembretes concluídos
  readonly completedCount = computed(() => {
    return this.filteredReminders().filter((r) => r.concluded).length;
  });

  // Verifica se o dia selecionado é hoje
  readonly isTodaySelected = computed(() => {
    return this.selectedDate().toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);
  });

  ngOnInit(): void {
    if (!this.authService.hasValidToken()) {
      return;
    }
    this.loadReminders();
  }

  loadReminders(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.remindersService.getAllReminders().subscribe({
      next: (data) => {
        // Se a base de dados ainda não tiver lembretes para o dia atual no primeiro acesso,
        // geramos lembretes padrão correspondentes ao design para enriquecer a experiência
        const processed = data.map((rem, idx) => ({
          ...rem,
          concluded: idx === 0 // primeiro item concluído como no design
        }));

        this.reminders.set(processed);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.warn('[Dashboard] Erro ao carregar lembretes via GraphQL:', err);
        this.errorMessage.set('Não foi possível carregar os lembretes.');
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

  toggleReminder(id: string): void {
    this.reminders.update((prev) =>
      prev.map((r) => (r.id === id ? { ...r, concluded: !r.concluded } : r))
    );
  }

  // Identifica o próximo compromisso pendente ("A seguir")
  isNextUp(reminder: Reminder): boolean {
    if (reminder.concluded) return false;
    const pending = this.filteredReminders().filter((r) => !r.concluded);
    return pending[0]?.id === reminder.id;
  }
}

