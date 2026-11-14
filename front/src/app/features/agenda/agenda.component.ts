import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {
  LucideAngularModule,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  CalendarCheck2,
  Trash2,
  MapPin,
  Bell
} from 'lucide-angular';
import { RemindersService, type Reminder } from '../../core/services/reminders.service';
import { AuthService } from '../../core/services/auth.service';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { BottomNavbarComponent } from '../../shared/components/bottom-navbar/bottom-navbar.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { CreateReminderModalComponent } from './components/create-reminder-modal/create-reminder-modal.component';

export interface CalendarDay {
  date: Date;
  isoDate: string;
  dayOfWeek: string;
  dayNumber: number;
  isSelected: boolean;
  isToday: boolean;
  hasReminders: boolean;
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

function toLocalDateIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseReminderDateToLocalIso(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr.slice(0, 10);
  return toLocalDateIso(d);
}

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    BottomNavbarComponent,
    LoadingSpinnerComponent,
    LucideAngularModule,
    CreateReminderModalComponent
  ],
  templateUrl: './agenda.component.html',
  styleUrl: './agenda.component.css'
})
export class AgendaComponent implements OnInit {
  private readonly remindersService = inject(RemindersService);
  private readonly route = inject(ActivatedRoute);
  readonly authService = inject(AuthService);

  // Ícones Lucide
  readonly ChevronLeftIcon = ChevronLeft;
  readonly ChevronRightIcon = ChevronRight;
  readonly ClockIcon = Clock;
  readonly PlusIcon = Plus;
  readonly CalendarEmptyIcon = CalendarCheck2;
  readonly TrashIcon = Trash2;
  readonly MapPinIcon = MapPin;
  readonly BellIcon = Bell;

  // Estados reativos
  readonly reminders = signal<Reminder[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly isCreateModalOpen = signal<boolean>(false);

  // Segunda-feira de referência da semana
  readonly referenceWeekDate = signal<Date>(getWeekMonday(new Date()));
  // Data selecionada
  readonly selectedDate = signal<Date>(new Date());

  // Mês e Ano do cabeçalho do calendário (ex: "Outubro 2026")
  readonly calendarMonthTitle = computed(() => {
    const d = this.referenceWeekDate();
    const month = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(d);
    const year = d.getFullYear();
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
    return `${capitalizedMonth} ${year}`;
  });

  // Legenda do dia de hoje (ex: "Hoje, terça-feira")
  readonly todayHeaderLabel = computed(() => {
    const selectedIso = toLocalDateIso(this.selectedDate());
    const todayIso = toLocalDateIso(new Date());

    if (selectedIso === todayIso) {
      const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(new Date());
      return `Hoje, ${weekday}`;
    }

    const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' }).format(this.selectedDate());
    return weekday.charAt(0).toUpperCase() + weekday.slice(1);
  });

  // Faixa dos 7 dias da semana (SEG a DOM)
  readonly weekDays = computed<CalendarDay[]>(() => {
    const monday = this.referenceWeekDate();
    const selectedIso = toLocalDateIso(this.selectedDate());
    const todayIso = toLocalDateIso(new Date());
    const allReminders = this.reminders();

    const days: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = toLocalDateIso(d);
      const dowIndex = d.getDay();

      const hasReminders = allReminders.some((r) => parseReminderDateToLocalIso(r.reminderDate) === iso);

      days.push({
        date: d,
        isoDate: iso,
        dayOfWeek: DOW_LABELS[dowIndex] ?? '',
        dayNumber: d.getDate(),
        isSelected: iso === selectedIso,
        isToday: iso === todayIso,
        hasReminders
      });
    }

    return days;
  });

  // Lembretes filtrados para a data selecionada
  readonly filteredReminders = computed(() => {
    const selectedIso = toLocalDateIso(this.selectedDate());
    return this.reminders()
      .filter((r) => parseReminderDateToLocalIso(r.reminderDate) === selectedIso)
      .sort((a, b) => a.reminderTime.localeCompare(b.reminderTime));
  });

  // Contador de lembretes (ex: "2 lembretes" ou "1 lembrete")
  readonly remindersCountLabel = computed(() => {
    const count = this.filteredReminders().length;
    if (count === 1) return '1 lembrete';
    return `${count} lembretes`;
  });

  ngOnInit(): void {
    if (!this.authService.hasValidToken()) {
      return;
    }

    // Se houver parâmetro ?date=YYYY-MM-DD na rota, foca na data indicada
    this.route.queryParamMap.subscribe((params) => {
      const dateParam = params.get('date');
      if (dateParam) {
        const parts = dateParam.split('-').map(Number);
        if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
          const target = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
          this.selectedDate.set(target);
          this.referenceWeekDate.set(getWeekMonday(target));
        }
      }
    });

    this.loadReminders();
  }

  loadReminders(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.remindersService.getAllReminders().subscribe({
      next: (data) => {
        this.reminders.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.warn('[Agenda] Erro ao carregar agendamentos via GraphQL:', err);
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

  openCreateModal(): void {
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  onReminderCreated(newReminder: Reminder): void {
    this.loadReminders();

    if (newReminder.reminderDate) {
      const reminderDate = new Date(newReminder.reminderDate);
      if (!isNaN(reminderDate.getTime())) {
        this.selectedDate.set(reminderDate);
        this.referenceWeekDate.set(getWeekMonday(reminderDate));
      }
    }
  }

  deleteReminder(id: string, event: Event): void {
    event.stopPropagation();
    if (!confirm('Deseja excluir este agendamento?')) {
      return;
    }

    this.remindersService.deleteReminder(id).subscribe({
      next: () => {
        this.reminders.update((prev) => prev.filter((r) => r.id !== id));
      },
      error: (err) => {
        console.error('[Agenda] Erro ao excluir lembrete:', err);
      }
    });
  }

  getReminderSubtitle(reminder: Reminder): string {
    if (reminder.reminderDescription && reminder.reminderDescription.trim().length > 0) {
      return reminder.reminderDescription;
    }
    return `Aviso às ${reminder.reminderTime} · Não repete`;
  }
}
