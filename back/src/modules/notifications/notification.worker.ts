import { rabbitmq, NOTIFICATIONS_QUEUE } from '../../lib/rabbitmq.js';
import {
  notificationService,
  type NotificationDispatchPayload
} from './notification.service.js';

let intervalTimer: NodeJS.Timeout | null = null;
let isRunning = false;

export async function initNotificationWorker(intervalMs = 15000): Promise<void> {
  if (isRunning) return;
  isRunning = true;

  // 1. Inicializa o Consumer RabbitMQ com retry resiliente
  const startConsumerWithRetry = async () => {
    let retries = 5;
    while (retries > 0 && isRunning) {
      try {
        await rabbitmq.consume<NotificationDispatchPayload>(
          NOTIFICATIONS_QUEUE,
          async (data) => {
            await notificationService.processNotificationEvent(data);
          }
        );
        console.log('[Notification Worker] Consumer RabbitMQ conectado à fila:', NOTIFICATIONS_QUEUE);
        break;
      } catch (err) {
        retries--;
        console.warn(`[Notification Worker] Tentando conectar RabbitMQ (${retries} tentativas restantes)...`);
        await new Promise((res) => setTimeout(res, 4000));
      }
    }
  };

  // Inicia o consumer de forma assíncrona desacoplada
  startConsumerWithRetry().catch((err) => {
    console.error('[Notification Worker] Falha crítica ao inicializar consumer RabbitMQ:', err);
  });

  // 2. Inicializa o Scheduler que faz o sweep no banco e publica no RabbitMQ
  intervalTimer = setInterval(async () => {
    try {
      const dispatched = await notificationService.dispatchDueNotifications();
      if (dispatched > 0) {
        console.log(`[Notification Scheduler] 🚀 ${dispatched} notificação(ões) despachada(s) para o RabbitMQ.`);
      }
    } catch (err) {
      console.error('[Notification Scheduler] Erro ao varrer notificações pendentes:', err);
    }
  }, intervalMs);
}

export async function stopNotificationWorker(): Promise<void> {
  isRunning = false;
  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
  }
  await rabbitmq.close();
}
