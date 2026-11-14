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
  Pencil,
  FileText,
  MapPin,
  Calendar,
  Clock,
  Repeat,
  Bell,
  ChevronDown,
  Plus,
  X,
  Loader2
} from 'lucide-angular';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import {
  RemindersService,
  type Reminder,
  type CreateReminderInput
} from '../../../../core/services/reminders.service';
import { WeatherService } from '../../../../core/services/weather.service';
import { firstValueFrom } from 'rxjs';

function toInputDateFormat(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

@Component({
  selector: 'app-create-reminder-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    ModalComponent,
    LoadingSpinnerComponent
  ],
  templateUrl: './create-reminder-modal.component.html',
  styleUrl: './create-reminder-modal.component.css'
})
export class CreateReminderModalComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly remindersService = inject(RemindersService);
  private readonly weatherService = inject(WeatherService);

  @Input() isOpen = false;
  @Input() initialDate: Date | null = null;
  @Input() initialName = '';
  @Input() initialAddress = '';
  @Input() initialDescription = '';
  @Input() initialTime = '';
  @Input() initialNotify = '1_HOUR_BEFORE';
  @Input() initialRepeat = false;
  @Input() initialLatitude?: number | null = null;
  @Input() initialLongitude?: number | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() reminderCreated = new EventEmitter<Reminder>();

  // Ícones do design
  readonly PencilIcon = Pencil;
  readonly FileTextIcon = FileText;
  readonly MapPinIcon = MapPin;
  readonly CalendarIcon = Calendar;
  readonly ClockIcon = Clock;
  readonly RepeatIcon = Repeat;
  readonly BellIcon = Bell;
  readonly ChevronDownIcon = ChevronDown;
  readonly PlusIcon = Plus;
  readonly CloseIcon = X;
  readonly LoaderIcon = Loader2;

  // Estados
  readonly isSubmitting = signal<boolean>(false);
  readonly isGeocoding = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly extractedCoords = signal<{ lat: number; lng: number } | null>(null);

  // Formulário reativo com suporte a endereço e extração de coordenadas
  readonly reminderForm: FormGroup = this.fb.group({
    reminderName: ['', [Validators.required, Validators.maxLength(120)]],
    reminderAddress: [''],
    reminderDescription: [''],
    date: [toInputDateFormat(new Date()), [Validators.required]],
    time: ['14:30', [Validators.required, Validators.pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)]],
    reminderRepeat: [false],
    reminderNotify: ['1_HOUR_BEFORE', [Validators.required]]
  });

  // Signals para exibição visual fiel ao design
  readonly selectedDateInput = signal<string>(toInputDateFormat(new Date()));
  readonly selectedTimeInput = signal<string>('14:30');
  readonly selectedRepeatInput = signal<boolean>(false);
  readonly selectedNotifyInput = signal<string>('1_HOUR_BEFORE');

  // Formata a data para DD/MM/YYYY como no mockup
  readonly formattedDateDisplay = computed(() => {
    const raw = this.selectedDateInput();
    if (!raw) return toInputDateFormat(new Date());
    const parts = raw.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return raw;
  });

  // Label amigável de repetição
  readonly repeatLabelDisplay = computed(() => {
    return this.selectedRepeatInput() ? 'Repetir' : 'Não repetir';
  });

  // Label amigável de aviso
  readonly notifyLabelDisplay = computed(() => {
    const val = this.selectedNotifyInput();
    if (val === 'AT_TIME' || val === 'No horário') return 'No horário';
    if (val === '1_HOUR_BEFORE' || val === '1 hora antes') return '1 hora antes';
    if (val === '15_MIN_BEFORE' || val === '15 min antes') return '15 min antes';
    if (val === '30_MIN_BEFORE' || val === '30 min antes') return '30 min antes';
    return val || '1 hora antes';
  });

  constructor() {
    this.reminderForm.get('date')?.valueChanges.subscribe((val) => {
      this.selectedDateInput.set(val || '');
    });

    this.reminderForm.get('time')?.valueChanges.subscribe((val) => {
      this.selectedTimeInput.set(val || '');
    });

    this.reminderForm.get('reminderRepeat')?.valueChanges.subscribe((val) => {
      this.selectedRepeatInput.set(String(val) === 'true' || val === true);
    });

    this.reminderForm.get('reminderNotify')?.valueChanges.subscribe((val) => {
      this.selectedNotifyInput.set(val || '1_HOUR_BEFORE');
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

  // Limpa as coordenadas anteriores quando o usuário altera o campo de endereço
  onAddressInput(): void {
    this.extractedCoords.set(null);
  }

  // Extrai latitude e longitude automaticamente ao informar o endereço
  onAddressBlur(): void {
    const address = this.reminderForm.get('reminderAddress')?.value?.trim();
    if (!address || address.length < 3) return;

    this.isGeocoding.set(true);
    this.weatherService.getWeatherByDestination(address).subscribe({
      next: (res) => {
        if (res.latitude != null && res.longitude != null) {
          this.extractedCoords.set({ lat: res.latitude, lng: res.longitude });
        }
        this.isGeocoding.set(false);
      },
      error: (err) => {
        console.warn('[CreateReminderModal] Aviso ao geocodificar endereço:', err);
        this.isGeocoding.set(false);
      }
    });
  }

  async onSubmit(): Promise<void> {
    if (this.reminderForm.invalid || this.isSubmitting()) {
      this.reminderForm.markAllAsTouched();
      return;
    }

    const formVal = this.reminderForm.value;
    const reminderName = formVal.reminderName?.trim();

    if (!reminderName) {
      this.errorMessage.set('Por favor, informe o título do lembrete.');
      return;
    }

    const dateStr = formVal.date;
    const timeStr = formVal.time?.trim() || '14:30';
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);

    const reminderDate = new Date(
      year,
      (month ?? 1) - 1,
      day ?? 1,
      hours || 0,
      minutes || 0,
      0,
      0
    );

    const isRepeating = String(formVal.reminderRepeat) === 'true' || formVal.reminderRepeat === true;
    const notifyRule = formVal.reminderNotify || '1_HOUR_BEFORE';

    // Determina coordenadas extraídas do endereço
    let lat = this.extractedCoords()?.lat ?? null;
    let lon = this.extractedCoords()?.lng ?? null;

    const address = formVal.reminderAddress?.trim();

    // Se o usuário digitou um endereço e ainda não extraiu as coordenadas, busca antes de salvar
    if ((lat == null || lon == null) && address && address.length > 2) {
      this.isSubmitting.set(true);
      try {
        const geoRes = await firstValueFrom(this.weatherService.getWeatherByDestination(address));
        if (geoRes?.latitude != null && geoRes?.longitude != null) {
          lat = geoRes.latitude;
          lon = geoRes.longitude;
          this.extractedCoords.set({ lat, lng: lon });
        }
      } catch (e) {
        console.warn('[CreateReminderModal] Geocodificação síncrona não resolveu:', e);
      }
    }

    // Se não resolveu pelo endereço, recorre aos valores pré-configurados iniciais
    if (lat == null && this.initialLatitude != null) {
      lat = this.initialLatitude;
    }
    if (lon == null && this.initialLongitude != null) {
      lon = this.initialLongitude;
    }

    // Se houver endereço e a descrição estiver vazia, preenche com o endereço informado
    let description = formVal.reminderDescription?.trim() || null;
    if (!description && address) {
      description = `Local: ${address}`;
    }

    const payload: CreateReminderInput = {
      reminderName,
      reminderDescription: description,
      reminderTime: timeStr,
      reminderDate: reminderDate.toISOString(),
      reminderRepeat: isRepeating,
      reminderNotify: notifyRule,
      latitude: lat,
      longitude: lon
    };

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    // Se nenhuma coordenada foi extraída, tenta geolocalização do browser como último recurso
    if (payload.latitude === null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          payload.latitude = pos.coords.latitude;
          payload.longitude = pos.coords.longitude;
          this.executeCreate(payload);
        },
        () => {
          this.executeCreate(payload);
        },
        { timeout: 2000 }
      );
    } else {
      this.executeCreate(payload);
    }
  }

  private executeCreate(payload: CreateReminderInput): void {
    this.remindersService.createReminder(payload).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.reminderCreated.emit(created);
        this.closed.emit();
      },
      error: (err) => {
        console.error('[CreateReminderModal] Erro ao criar lembrete via GraphQL:', err);
        const serverMsg = err?.message || 'Falha ao salvar o lembrete. Tente novamente.';
        this.errorMessage.set(serverMsg);
        this.isSubmitting.set(false);
      }
    });
  }

  private resetForm(): void {
    // A data padrão é HOJE para aparecer imediatamente na agenda diária
    const defaultDate = this.initialDate ? new Date(this.initialDate) : new Date();
    const formattedDate = toInputDateFormat(defaultDate);
    const defaultName = this.initialName || '';
    const defaultAddr = this.initialAddress || '';
    const defaultDesc = this.initialDescription || '';
    const defaultTime = this.initialTime || '14:30';
    const defaultRepeat = this.initialRepeat || false;
    const defaultNotify = this.initialNotify || '1_HOUR_BEFORE';

    this.reminderForm.reset({
      reminderName: defaultName,
      reminderAddress: defaultAddr,
      reminderDescription: defaultDesc,
      date: formattedDate,
      time: defaultTime,
      reminderRepeat: defaultRepeat,
      reminderNotify: defaultNotify
    });

    this.selectedDateInput.set(formattedDate);
    this.selectedTimeInput.set(defaultTime);
    this.selectedRepeatInput.set(defaultRepeat);
    this.selectedNotifyInput.set(defaultNotify);
    this.errorMessage.set(null);
    this.isSubmitting.set(false);

    if (this.initialLatitude != null && this.initialLongitude != null) {
      this.extractedCoords.set({ lat: this.initialLatitude, lng: this.initialLongitude });
    } else if (defaultAddr) {
      this.onAddressBlur();
    } else {
      this.extractedCoords.set(null);
    }
  }
}
