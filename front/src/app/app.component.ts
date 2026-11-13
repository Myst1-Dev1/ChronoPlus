import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PwaService } from './core/services/pwa.service';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'ChronoPlus';
  readonly pwaService = inject(PwaService);
  readonly authService = inject(AuthService);
  readonly themeService = inject(ThemeService);

  installPwa(): void {
    this.pwaService.promptInstall();
  }

  updatePwa(): void {
    this.pwaService.reloadApp();
  }
}
