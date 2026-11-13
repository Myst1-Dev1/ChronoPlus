import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { z } from 'zod';
import {
  LucideAngularModule,
  User,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Check
} from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

export const baseRegisterSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'O nome é obrigatório.')
    .min(3, 'O nome deve conter pelo menos 3 caracteres.'),
  email: z
    .string()
    .trim()
    .min(1, 'O e-mail é obrigatório.')
    .email('Por favor, informe um endereço de e-mail válido.'),
  password: z
    .string()
    .min(1, 'A senha é obrigatória.')
    .min(8, 'Use pelo menos 8 caracteres na senha.'),
  confirmPassword: z
    .string()
    .min(1, 'A confirmação de senha é obrigatória.'),
  agreeTerms: z
    .boolean()
    .refine((val) => val === true, {
      message: 'Você deve aceitar os termos de uso e política de privacidade para continuar.'
    })
});

export const registerSchema = baseRegisterSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword']
  }
);

export type RegisterInput = z.infer<typeof registerSchema>;

type FormFieldKey = 'name' | 'email' | 'password' | 'confirmPassword' | 'agreeTerms';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LoadingSpinnerComponent,
    LucideAngularModule
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Ícones Lucide expostos para o template
  readonly UserIcon = User;
  readonly MailIcon = Mail;
  readonly EyeIcon = Eye;
  readonly EyeOffIcon = EyeOff;
  readonly ArrowRightIcon = ArrowRight;
  readonly CheckIcon = Check;

  // Estados reativos via Signals
  readonly name = signal<string>('');
  readonly email = signal<string>('');
  readonly password = signal<string>('');
  readonly confirmPassword = signal<string>('');
  readonly agreeTerms = signal<boolean>(false);

  readonly showPassword = signal<boolean>(false);
  readonly showConfirmPassword = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly validationErrors = signal<Partial<Record<FormFieldKey, string>>>({});

  togglePasswordVisibility(): void {
    this.showPassword.update((prev) => !prev);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((prev) => !prev);
  }

  toggleAgreeTerms(): void {
    const nextVal = !this.agreeTerms();
    this.agreeTerms.set(nextVal);
    this.validateSingleField('agreeTerms');
  }

  validateSingleField(field: FormFieldKey): void {
    const currentErrors = { ...this.validationErrors() };

    if (field === 'name') {
      const res = baseRegisterSchema.shape.name.safeParse(this.name());
      if (!res.success) {
        currentErrors.name = res.error.issues[0]?.message;
      } else {
        delete currentErrors.name;
      }
    } else if (field === 'email') {
      const res = baseRegisterSchema.shape.email.safeParse(this.email());
      if (!res.success) {
        currentErrors.email = res.error.issues[0]?.message;
      } else {
        delete currentErrors.email;
      }
    } else if (field === 'password') {
      const res = baseRegisterSchema.shape.password.safeParse(this.password());
      if (!res.success) {
        currentErrors.password = res.error.issues[0]?.message;
      } else {
        delete currentErrors.password;
      }
      if (this.confirmPassword().length > 0) {
        if (this.confirmPassword() !== this.password()) {
          currentErrors.confirmPassword = 'As senhas não coincidem.';
        } else {
          delete currentErrors.confirmPassword;
        }
      }
    } else if (field === 'confirmPassword') {
      const res = baseRegisterSchema.shape.confirmPassword.safeParse(this.confirmPassword());
      if (!res.success) {
        currentErrors.confirmPassword = res.error.issues[0]?.message;
      } else if (this.confirmPassword() !== this.password()) {
        currentErrors.confirmPassword = 'As senhas não coincidem.';
      } else {
        delete currentErrors.confirmPassword;
      }
    } else if (field === 'agreeTerms') {
      const res = baseRegisterSchema.shape.agreeTerms.safeParse(this.agreeTerms());
      if (!res.success) {
        currentErrors.agreeTerms = res.error.issues[0]?.message;
      } else {
        delete currentErrors.agreeTerms;
      }
    }

    this.validationErrors.set(currentErrors);
  }

  onSubmit(): void {
    this.errorMessage.set(null);

    const payload = {
      name: this.name(),
      email: this.email(),
      password: this.password(),
      confirmPassword: this.confirmPassword(),
      agreeTerms: this.agreeTerms()
    };

    const result = registerSchema.safeParse(payload);

    if (!result.success) {
      const errors: Partial<Record<FormFieldKey, string>> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as FormFieldKey;
        if (!errors[field]) {
          errors[field] = issue.message;
        }
      }
      this.validationErrors.set(errors);
      return;
    }

    this.validationErrors.set({});
    this.isLoading.set(true);

    this.authService
      .signUp({
        username: this.name().trim(),
        email: this.email().trim().toLowerCase(),
        password: this.password()
      })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.router.navigate(['/dashboard']);
        },
        error: (err: HttpErrorResponse) => {
          this.isLoading.set(false);
          if (err.status === 409) {
            this.errorMessage.set('Este e-mail ou nome de usuário já está cadastrado.');
          } else if (err.error?.message && typeof err.error.message === 'string') {
            this.errorMessage.set(err.error.message);
          } else {
            this.errorMessage.set('Não foi possível concluir o cadastro. Verifique os dados ou tente novamente.');
          }
        }
      });
  }
}

