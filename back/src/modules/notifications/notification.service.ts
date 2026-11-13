import { prisma } from '../../lib/prisma.js';
import { rabbitmq, NOTIFICATION_DISPATCH_KEY } from '../../lib/rabbitmq.js';
import { weatherService } from '../weather/weather.service.js';

export interface NotificationDispatchPayload {
  notificationId: string;
  userId: string;
  taskId?: string | null;
  reminderId?: string | null;
  title: string;
  message: string;
  scheduledFor: string;
}

function calculateReminderDateTime(date: Date, timeStr: string): Date {
  const [hours = 0, minutes = 0] = timeStr.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

export class NotificationService {
  async scheduleTaskNotification(
    taskId: string,
    userId: string,
    taskName: string,
    scheduledDate: Date
  ): Promise<void> {
    await prisma.notification.create({
      data: {
        userId,
        taskId,
        title: `Lembrete de Tarefa: ${taskName}`,
        message: `Sua tarefa "${taskName}" está programada para agora.`,
        scheduledFor: scheduledDate,
        status: 'PENDING'
      }
    });
  }

  async updateTaskNotification(
    taskId: string,
    scheduledDate?: Date,
    taskName?: string
  ): Promise<void> {
    const existing = await prisma.notification.findFirst({
      where: {
        taskId,
        status: 'PENDING'
      }
    });

    if (!existing) return;

    await prisma.notification.update({
      where: { id: existing.id },
      data: {
        ...(scheduledDate && { scheduledFor: scheduledDate }),
        ...(taskName && {
          title: `Lembrete de Tarefa: ${taskName}`,
          message: `Sua tarefa "${taskName}" está programada para agora.`
        })
      }
    });
  }

  async cancelTaskNotification(taskId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        taskId,
        status: 'PENDING'
      },
      data: {
        status: 'CANCELLED'
      }
    });
  }

  async scheduleReminderNotification(
    reminderId: string,
    userId: string,
    reminderName: string,
    reminderDate: Date,
    reminderTime: string
  ): Promise<void> {
    const scheduledFor = calculateReminderDateTime(reminderDate, reminderTime);

    await prisma.notification.create({
      data: {
        userId,
        reminderId,
        title: `Lembrete de Compromisso: ${reminderName}`,
        message: `Seu compromisso "${reminderName}" está agendado para às ${reminderTime}.`,
        scheduledFor,
        status: 'PENDING'
      }
    });
  }

  async updateReminderNotification(
    reminderId: string,
    reminderDate?: Date,
    reminderTime?: string,
    reminderName?: string
  ): Promise<void> {
    const existing = await prisma.notification.findFirst({
      where: {
        reminderId,
        status: 'PENDING'
      }
    });

    if (!existing) return;

    let newScheduledFor = existing.scheduledFor;
    if (reminderDate && reminderTime) {
      newScheduledFor = calculateReminderDateTime(reminderDate, reminderTime);
    } else if (reminderDate) {
      const hours = existing.scheduledFor.getHours();
      const minutes = existing.scheduledFor.getMinutes();
      newScheduledFor = new Date(reminderDate);
      newScheduledFor.setHours(hours, minutes, 0, 0);
    } else if (reminderTime) {
      newScheduledFor = calculateReminderDateTime(existing.scheduledFor, reminderTime);
    }

    await prisma.notification.update({
      where: { id: existing.id },
      data: {
        scheduledFor: newScheduledFor,
        ...(reminderName && {
          title: `Lembrete de Compromisso: ${reminderName}`,
          message: `Seu compromisso "${reminderName}" foi atualizado.`
        })
      }
    });
  }

  async cancelReminderNotification(reminderId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        reminderId,
        status: 'PENDING'
      },
      data: {
        status: 'CANCELLED'
      }
    });
  }

  async dispatchDueNotifications(): Promise<number> {
    const now = new Date();

    // Busca notificações pendentes que já atingiram ou ultrapassaram o horário agendado
    const dueNotifications = await prisma.notification.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: {
          lte: now
        }
      },
      take: 50 // lote controlado para manter alta performance
    });

    if (dueNotifications.length === 0) {
      return 0;
    }

    for (const notification of dueNotifications) {
      const payload: NotificationDispatchPayload = {
        notificationId: notification.id,
        userId: notification.userId,
        taskId: notification.taskId,
        reminderId: notification.reminderId,
        title: notification.title,
        message: notification.message,
        scheduledFor: notification.scheduledFor.toISOString()
      };

      try {
        await rabbitmq.publish(NOTIFICATION_DISPATCH_KEY, payload);
      } catch (err) {
        console.error(`[NotificationService] Falha ao despachar notificação ${notification.id} no RabbitMQ:`, err);
      }
    }

    return dueNotifications.length;
  }

  async processNotificationEvent(payload: NotificationDispatchPayload): Promise<void> {
    // Fail-Safe / Idempotência: verifica se a notificação já foi processada
    const current = await prisma.notification.findUnique({
      where: { id: payload.notificationId }
    });

    if (!current || current.status === 'SENT' || current.status === 'CANCELLED') {
      return;
    }

    let finalMessage = payload.message;

    // Se o lembrete possuir coordenadas de geolocalização, enriquece a mensagem com clima e recomendação
    if (payload.reminderId) {
      const reminder = await prisma.reminder.findUnique({
        where: { id: payload.reminderId }
      });

      if (reminder && reminder.latitude !== null && reminder.longitude !== null) {
        const forecast = await weatherService.getWeatherForecast(
          reminder.latitude,
          reminder.longitude
        );

        if (forecast) {
          finalMessage = `${payload.message} Previsão do tempo: ${forecast.condition}, ${forecast.temperature.toFixed(1)}°C. ${forecast.recommendation}`;
        }
      }
    }

    // Ponto de integração para disparos reais (Push Notification, Webhook, E-mail, WebSocket)
    console.log(`[Notification Worker] 🔔 Disparando notificação para o usuário ${payload.userId}:`);
    console.log(`[Notification Worker] Título: "${payload.title}" | Mensagem: "${finalMessage}"`);

    // Atualiza status no banco garantindo persistência, mensagem enriquecida e rastreabilidade
    await prisma.notification.update({
      where: { id: payload.notificationId },
      data: {
        message: finalMessage,
        status: 'SENT',
        sentAt: new Date()
      }
    });
  }
}

export const notificationService = new NotificationService();