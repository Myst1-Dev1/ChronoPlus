import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { z } from 'zod';
import { LucideAngularModule, Mail, Eye, EyeOff, ArrowRight, Sparkles, Check, Bell } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'O e-mail é obrigatório.')
    .email('Por favor, informe um e-mail válido.'),
  password: z
    .string()
    .min(1, 'A senha é obrigatória.')
    .min(6, 'A senha deve conter no mínimo 6 caracteres.')
});

export type LoginInput = z.infer<typeof loginSchema>;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LoadingSpinnerComponent,
    ModalComponent,
    LucideAngularModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  readonly BellIcon = Bell;

  // Estados reativos via Signals
  readonly email = signal<string>('');
  readonly password = signal<string>('');
  readonly showPassword = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly validationErrors = signal<{ email?: string; password?: string }>({});
  readonly isNotificationPromptOpen = signal<boolean>(false);

  togglePasswordVisibility(): void {
    this.showPassword.update((prev) => !prev);
  }

  validateSingleField(field: 'email' | 'password'): void {
    const data = {
      email: this.email(),
      password: this.password()
    };

    const result = loginSchema.safeParse(data);
    const currentErrors = { ...this.validationErrors() };

    if (!result.success) {
      const fieldIssue = result.error.issues.find((issue) => issue.path[0] === field);
      if (fieldIssue) {
        currentErrors[field] = fieldIssue.message;
      } else {
        delete currentErrors[field];
      }
    } else {
      delete currentErrors[field];
    }

    this.validationErrors.set(currentErrors);
  }

  onSubmit(): void {
    this.errorMessage.set(null);

    const data = {
      email: this.email(),
      password: this.password()
    };

    const result = loginSchema.safeParse(data);

    if (!result.success) {
      const errors: { email?: string; password?: string } = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as 'email' | 'password';
        if (!errors[field]) {
          errors[field] = issue.message;
        }
      }
      this.validationErrors.set(errors);
      return;
    }

    this.validationErrors.set({});
    this.isLoading.set(true);

    this.authService.signIn({
      email: result.data.email,
      password: result.data.password
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        if (this.notificationService.shouldPromptOnLogin()) {
          this.isNotificationPromptOpen.set(true);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        if (err.status === 401) {
          this.errorMessage.set('Credenciais incorretas. Verifique seu e-mail e senha.');
        } else if (err.error?.message) {
          this.errorMessage.set(err.error.message);
        } else {
          this.errorMessage.set('Não foi possível conectar ao servidor. Tente novamente mais tarde.');
        }
      }
    });
  }

  async allowNotifications(): Promise<void> {
    try {
      await this.notificationService.requestSubscription();
    } finally {
      this.isNotificationPromptOpen.set(false);
      this.router.navigate(['/dashboard']);
    }
  }

  skipNotifications(): void {
    this.isNotificationPromptOpen.set(false);
    this.router.navigate(['/dashboard']);
  }
}
