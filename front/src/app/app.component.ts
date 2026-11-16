import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PwaService } from './core/services/pwa.service';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';
import { NotificationService } from './core/services/notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'ChronoPlus';
  readonly pwaService = inject(PwaService);
  readonly authService = inject(AuthService);
  readonly themeService = inject(ThemeService);
  readonly notificationService = inject(NotificationService);

  ngOnInit(): void {
    this.notificationService.initPushListeners();
  }

  installPwa(): void {
    this.pwaService.promptInstall();
  }

  updatePwa(): void {
    this.pwaService.reloadApp();
  }
}
