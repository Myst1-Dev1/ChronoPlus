import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../lib/prisma.js';
import { notificationService } from './notification.service.js';

describe('Notification Service Unit/Integration Tests', () => {
  const timestamp = Date.now();
  let testUserId = '';
  let testTaskId = '';

  beforeAll(async () => {
    // Cria usuário e tarefa para o teste
    const user = await prisma.user.create({
      data: {
        username: `notif_user_${timestamp}`,
        email: `notif_user_${timestamp}@example.com`,
        password: 'hash_password',
        address: 'Rua das Notificações, 1',
        state: 'SP',
        city: 'São Paulo'
      }
    });
    testUserId = user.id;

    const task = await prisma.task.create({
      data: {
        name: 'Tarefa com Notificação',
        description: 'Testando fluxo de evento',
        scheduledDate: new Date(Date.now() + 60000),
        userId: testUserId
      }
    });
    testTaskId = task.id;
  });

  afterAll(async () => {
    try {
      await prisma.user.deleteMany({
        where: { id: testUserId }
      });
      await prisma.$disconnect();
    } catch {
      // Ignora erro no teardown
    }
  });

  it('deve agendar uma notificação pendente vinculada à tarefa', async () => {
    const scheduledDate = new Date(Date.now() + 120000);
    await notificationService.scheduleTaskNotification(
      testTaskId,
      testUserId,
      'Tarefa com Notificação',
      scheduledDate
    );

    const notification = await prisma.notification.findFirst({
      where: { taskId: testTaskId, status: 'PENDING' }
    });

    expect(notification).toBeDefined();
    expect(notification?.userId).toBe(testUserId);
    expect(notification?.status).toBe('PENDING');
    expect(notification?.title).toContain('Tarefa com Notificação');
  });

  it('deve atualizar data e título da notificação pendente', async () => {
    const newScheduledDate = new Date(Date.now() + 300000);
    await notificationService.updateTaskNotification(
      testTaskId,
      newScheduledDate,
      'Tarefa Renomeada'
    );

    const notification = await prisma.notification.findFirst({
      where: { taskId: testTaskId, status: 'PENDING' }
    });

    expect(notification?.title).toContain('Tarefa Renomeada');
    expect(notification?.scheduledFor.getTime()).toBe(newScheduledDate.getTime());
  });

  it('deve processar o evento de notificação de forma idempotente e marcar como SENT', async () => {
    const notification = await prisma.notification.findFirst({
      where: { taskId: testTaskId, status: 'PENDING' }
    });
    expect(notification).toBeDefined();

    if (notification) {
      await notificationService.processNotificationEvent({
        notificationId: notification.id,
        userId: testUserId,
        taskId: testTaskId,
        title: notification.title,
        message: notification.message,
        scheduledFor: notification.scheduledFor.toISOString()
      });

      const updated = await prisma.notification.findUnique({
        where: { id: notification.id }
      });

      expect(updated?.status).toBe('SENT');
      expect(updated?.sentAt).toBeDefined();
    }
  });

  it('deve cancelar a notificação pendente quando a tarefa for excluída', async () => {
    // Cria outra notificação pendente para testar cancelamento
    await notificationService.scheduleTaskNotification(
      testTaskId,
      testUserId,
      'Tarefa a Cancelar',
      new Date(Date.now() + 60000)
    );

    await notificationService.cancelTaskNotification(testTaskId);

    const cancelled = await prisma.notification.findFirst({
      where: { taskId: testTaskId, status: 'CANCELLED' }
    });

    expect(cancelled).toBeDefined();
    expect(cancelled?.status).toBe('CANCELLED');
  });

  it('deve cancelar a notificação de um agendamento/reminder', async () => {
    const reminder = await prisma.reminder.create({
      data: {
        reminderName: 'Compromisso Temporário',
        reminderTime: '15:00',
        reminderDate: new Date(Date.now() + 180000),
        reminderNotify: 'AT_TIME',
        userId: testUserId
      }
    });

    await notificationService.scheduleReminderNotification(
      reminder.id,
      testUserId,
      reminder.reminderName,
      reminder.reminderDate,
      reminder.reminderTime
    );

    await notificationService.cancelReminderNotification(reminder.id);

    const cancelledNotif = await prisma.notification.findFirst({
      where: { reminderId: reminder.id }
    });

    expect(cancelledNotif).toBeDefined();
    expect(cancelledNotif?.status).toBe('CANCELLED');
  });
});
