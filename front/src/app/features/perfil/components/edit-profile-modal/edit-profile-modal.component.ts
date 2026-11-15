import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  signal,
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
  User as UserIconLucide,
  Mail,
  MapPin,
  Building,
  Lock,
  X,
  Check
} from 'lucide-angular';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { AuthService, type User, type EditUserData } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-edit-profile-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    ModalComponent,
    LoadingSpinnerComponent
  ],
  templateUrl: './edit-profile-modal.component.html',
  styleUrl: './edit-profile-modal.component.css'
})
export class EditProfileModalComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  @Input() isOpen = false;
  @Input() user: User | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() userUpdated = new EventEmitter<User>();

  // Ícones Lucide
  readonly UserIcon = UserIconLucide;
  readonly MailIcon = Mail;
  readonly MapPinIcon = MapPin;
  readonly BuildingIcon = Building;
  readonly LockIcon = Lock;
  readonly CloseIcon = X;
  readonly CheckIcon = Check;

  // Estados
  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Formulário reativo
  readonly profileForm: FormGroup = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    address: ['', [Validators.required]],
    city: ['', [Validators.required]],
    state: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(2)]],
    password: ['']
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.resetForm();
    }
  }

  onCancel(): void {
    if (this.isSubmitting()) return;
    this.closed.emit();
  }

  onSubmit(): void {
    if (this.profileForm.invalid || this.isSubmitting()) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const formVal = this.profileForm.value;
    const payload: EditUserData = {
      username: formVal.username?.trim(),
      email: formVal.email?.trim().toLowerCase(),
      address: formVal.address?.trim(),
      city: formVal.city?.trim(),
      state: formVal.state?.trim().toUpperCase()
    };

    if (formVal.password?.trim()) {
      if (formVal.password.trim().length < 6) {
        this.errorMessage.set('A nova senha deve ter no mínimo 6 caracteres.');
        return;
      }
      payload.password = formVal.password.trim();
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.authService.editUser(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.userUpdated.emit(res.user);
        this.closed.emit();
      },
      error: (err) => {
        console.error('[EditProfileModal] Erro ao editar perfil:', err);
        this.isSubmitting.set(false);
        if (err.status === 409) {
          this.errorMessage.set('E-mail ou nome de usuário já está em uso.');
        } else if (err.error?.message) {
          this.errorMessage.set(err.error.message);
        } else {
          this.errorMessage.set('Não foi possível atualizar o perfil. Tente novamente.');
        }
      }
    });
  }

  private resetForm(): void {
    const u = this.user || this.authService.currentUser();
    this.profileForm.reset({
      username: u?.username || '',
      email: u?.email || '',
      address: u?.address && u.address !== 'Não informado' ? u.address : '',
      city: u?.city || '',
      state: u?.state || '',
      password: ''
    });
    this.errorMessage.set(null);
    this.isSubmitting.set(false);
  }
}

