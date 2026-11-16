import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SwPush } from '@angular/service-worker';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface PushSubscriptionPayload {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly swPush = inject(SwPush, { optional: true });

  readonly isSupported = signal<boolean>(
    typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
  );

  readonly isSwPushEnabled = signal<boolean>(this.swPush?.isEnabled ?? false);

  readonly permission = signal<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'denied'
  );

  readonly isGranted = computed(() => this.permission() === 'granted');

  readonly currentSubscription = signal<PushSubscription | null>(null);

  constructor() {
    this.initExistingSubscription();
  }

  /**
   * Determina se o aplicativo deve exibir o diálogo de solicitação de notificações pós-login.
   */
  shouldPromptOnLogin(): boolean {
    if (!this.isSupported()) return false;
    this.refreshPermission();
    return this.permission() === 'default';
  }

  /**
   * Sincroniza a permissão atual com o estado do navegador.
   */
  refreshPermission(): NotificationPermission {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const current = Notification.permission;
      this.permission.set(current);
      return current;
    }
    return 'denied';
  }

  /**
   * Solicita autorização ao usuário, gera a PushSubscription via SwPush (PWA nativo)
   * e despacha a assinatura para o backend.
   */
  async requestSubscription(customVapidKey?: string): Promise<PushSubscription | null> {
    if (!this.isSupported()) {
      return null;
    }

    try {
      // 1. Solicita a permissão nativa do navegador/dispositivo
      const perm = await Notification.requestPermission();
      this.permission.set(perm);

      if (perm !== 'granted') {
        return null;
      }

      // 2. Se o Service Worker e SwPush estiverem habilitados, gera a PushSubscription
      if (this.swPush?.isEnabled) {
        const vapidKey = customVapidKey || environment.vapidPublicKey;

        if (vapidKey) {
          const sub = await this.swPush.requestSubscription({
            serverPublicKey: vapidKey
          });

          this.currentSubscription.set(sub);

          // 3. Envia os dados de assinatura ao backend para persistência
          this.sendSubscriptionToBackend(sub).subscribe();
          return sub;
        }
      }

      // Fallback gracioso caso esteja em ambiente dev sem service worker ativo
      return null;
    } catch (err) {
      console.warn('[NotificationService] Falha ao registrar assinatura Web Push:', err);
      return null;
    }
  }

  /**
   * Cancela a assinatura ativa do Web Push.
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.swPush?.isEnabled) return false;

    try {
      await this.swPush.unsubscribe();
      this.currentSubscription.set(null);
      return true;
    } catch (err) {
      console.warn('[NotificationService] Erro ao desinscrever Web Push:', err);
      return false;
    }
  }

  /**
   * Envia a PushSubscription gerada para o backend (disponibiliza contrato REST).
   */
  sendSubscriptionToBackend(subscription: PushSubscription | unknown): Observable<unknown> {
    const payload = typeof (subscription as PushSubscription)?.toJSON === 'function'
      ? (subscription as PushSubscription).toJSON()
      : subscription;

    return this.http
      .post(`${environment.apiUrl}/notifications/subscribe`, { subscription: payload })
      .pipe(
        tap(() => {
          console.info('[NotificationService] Assinatura Web Push sincronizada com o backend.');
        }),
        catchError((err) => {
          // Fail-Safe: não interrompe o fluxo do app caso o endpoint de push ainda não esteja ativo no backend
          console.warn('[NotificationService] Aviso: endpoint de push do backend indisponível ou em desenvolvimento.', err);
          return of(null);
        })
      );
  }

  /**
   * Inicializa ouvintes do Service Worker para mensagens push e cliques em notificações em primeiro plano.
   */
  initPushListeners(): void {
    if (!this.swPush?.isEnabled) return;

    // Mensagens recebidas enquanto o app está aberto em primeiro plano
    this.swPush.messages.subscribe((message) => {
      console.info('[NotificationService] Mensagem Web Push recebida em primeiro plano:', message);
    });

    // Cliques em notificações do sistema operacional acionadas pelo Service Worker
    this.swPush.notificationClicks.subscribe(({ action, notification }) => {
      console.info('[NotificationService] Notificação clicada pelo usuário:', { action, notification });
    });
  }

  /**
   * Carrega assinatura prévia se já existente no Service Worker.
   */
  private initExistingSubscription(): void {
    if (this.swPush?.isEnabled) {
      this.swPush.subscription.subscribe((sub) => {
        this.currentSubscription.set(sub);
      });
    }
  }
}
