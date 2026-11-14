import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  signal,
  computed,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import {
  LucideAngularModule,
  Calendar,
  Clock,
  CalendarCheck2
} from 'lucide-angular';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import {
  TasksService,
  type Task,
  type CreateTaskInput
} from '../../../../core/services/tasks.service';

@Component({
  selector: 'app-create-task-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    ModalComponent,
    LoadingSpinnerComponent
  ],
  templateUrl: './create-task-modal.component.html',
  styleUrl: './create-task-modal.component.css'
})
export class CreateTaskModalComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly tasksService = inject(TasksService);

  @Input() isOpen = false;
  @Input() initialDate: Date | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() taskCreated = new EventEmitter<Task>();

  // Ícones do Lucide
  readonly CalendarIcon = Calendar;
  readonly ClockIcon = Clock;
  readonly CalendarCheckIcon = CalendarCheck2;

  // Estados
  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Formulário reativo
  readonly taskForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: [''],
    date: [this.toInputDateFormat(new Date()), [Validators.required]],
    time: ['20:00']
  });

  // Signals reativos para preview dinâmico em tempo real
  readonly selectedDateInput = signal<string>(this.toInputDateFormat(new Date()));
  readonly selectedTimeInput = signal<string>('20:00');

  // Resumo contextual formatado: Para terça, 6 de outubro, às 20:00.
  readonly scheduleSummary = computed(() => {
    const rawDate = this.selectedDateInput();
    const rawTime = this.selectedTimeInput();

    if (!rawDate) {
      return '';
    }

    const parts = rawDate.split('-').map(Number);
    if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
      return '';
    }

    // Criamos no timezone local para evitar shifts
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);

    // Dia da semana simplificado (ex: terça em vez de terça-feira)
    const weekdayRaw = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(dateObj);
    const weekdayClean = weekdayRaw.replace('-feira', '').trim();

    const dayNumber = dateObj.getDate();
    const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(dateObj);

    if (rawTime && rawTime.trim().length > 0) {
      return `Para ${weekdayClean}, ${dayNumber} de ${monthName}, às ${rawTime.trim()}.`;
    }

    return `Para ${weekdayClean}, ${dayNumber} de ${monthName}.`;
  });

  constructor() {
    // Sincroniza signals com as alterações dos campos do form
    this.taskForm.get('date')?.valueChanges.subscribe((val) => {
      this.selectedDateInput.set(val || '');
    });

    this.taskForm.get('time')?.valueChanges.subscribe((val) => {
      this.selectedTimeInput.set(val || '');
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.resetForm();
    }
  }

  onCancel(): void {
    if (this.isSubmitting()) {
      return;
    }
    this.closed.emit();
  }

  onSubmit(): void {
    if (this.taskForm.invalid || this.isSubmitting()) {
      this.taskForm.markAllAsTouched();
      return;
    }

    const formVal = this.taskForm.value;
    const name = formVal.name?.trim();

    if (!name) {
      this.errorMessage.set('Por favor, informe o título da tarefa.');
      return;
    }

    const dateStr = formVal.date;
    const timeStr = formVal.time?.trim() || '20:00';

    // Monta o objeto Date combinado para enviar no formato ISO 8601
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);

    const scheduledDate = new Date(
      year,
      (month ?? 1) - 1,
      day ?? 1,
      hours || 0,
      minutes || 0,
      0,
      0
    );

    const payload: CreateTaskInput = {
      name,
      description: formVal.description?.trim() || null,
      scheduledDate: scheduledDate.toISOString()
    };

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.tasksService.createTask(payload).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.taskCreated.emit(created);
        this.closed.emit();
      },
      error: (err) => {
        console.error('[CreateTaskModal] Erro ao cadastrar tarefa:', err);
        const serverMsg = err?.message || 'Falha ao salvar a tarefa. Tente novamente.';
        this.errorMessage.set(serverMsg);
        this.isSubmitting.set(false);
      }
    });
  }

  private resetForm(): void {
    const defaultDate = this.initialDate ? new Date(this.initialDate) : new Date();
    const formattedDate = this.toInputDateFormat(defaultDate);

    this.taskForm.reset({
      name: '',
      description: '',
      date: formattedDate,
      time: '20:00'
    });

    this.selectedDateInput.set(formattedDate);
    this.selectedTimeInput.set('20:00');
    this.errorMessage.set(null);
    this.isSubmitting.set(false);
  }

  private toInputDateFormat(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
