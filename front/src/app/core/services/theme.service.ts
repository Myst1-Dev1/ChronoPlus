import { Injectable, signal, computed, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'chronoplus_theme';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly theme = signal<ThemeMode>(this.getInitialTheme());
  readonly isDark = computed(() => this.theme() === 'dark');

  constructor() {
    // Aplica o tema inicial imediatamente ao instanciar o serviço
    if (this.isBrowser) {
      this.applyTheme(this.theme());
    }

    // Efeito para sincronização reativa com mudanças do signal
    effect(() => {
      const mode = this.theme();
      if (this.isBrowser) {
        this.applyTheme(mode);
        try {
          localStorage.setItem(THEME_STORAGE_KEY, mode);
        } catch {
          // Previne erro se localStorage estiver inacessível
        }
      }
    });
  }

  toggleTheme(): void {
    const nextMode = this.theme() === 'light' ? 'dark' : 'light';
    this.setTheme(nextMode);
  }

  setTheme(mode: ThemeMode): void {
    this.theme.set(mode);
    if (this.isBrowser) {
      this.applyTheme(mode);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, mode);
      } catch {
        // Fallback silencioso
      }
    }
  }

  private applyTheme(mode: ThemeMode): void {
    const root = document.documentElement;
    const body = document.body;

    if (mode === 'dark') {
      root.classList.add('dark');
      body?.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      body?.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    }
  }

  private getInitialTheme(): ThemeMode {
    if (!this.isBrowser) {
      return 'light';
    }

    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    } catch {
      // Fallback
    }

    // Detecção da preferência do sistema operacional
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  }
}

