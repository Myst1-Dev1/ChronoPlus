import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../errors/app-error.js';
import { notificationService } from '../notifications/notification.service.js';
import {
  createReminderSchema,
  editReminderSchema
} from './reminders.schemas.js';

export interface FormattedReminder {
  id: string;
  reminderName: string;
  reminderDescription: string | null;
  reminderTime: string;
  reminderDate: string;
  reminderRepeat: boolean;
  reminderNotify: string;
  latitude: number | null;
  longitude: number | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

function formatReminder(reminder: {
  id: string;
  reminderName: string;
  reminderDescription: string | null;
  reminderTime: string;
  reminderDate: Date;
  reminderRepeat: boolean;
  reminderNotify: string;
  latitude: number | null;
  longitude: number | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}): FormattedReminder {
  return {
    ...reminder,
    reminderDate: reminder.reminderDate.toISOString(),
    createdAt: reminder.createdAt.toISOString(),
    updatedAt: reminder.updatedAt.toISOString()
  };
}

export class RemindersService {
  async getAllReminders(userId: string): Promise<FormattedReminder[]> {
    const reminders = await prisma.reminder.findMany({
      where: { userId },
      orderBy: [{ reminderDate: 'asc' }, { reminderTime: 'asc' }]
    });

    return reminders.map(formatReminder);
  }

  async getReminderById(userId: string, id: string): Promise<FormattedReminder | null> {
    const reminder = await prisma.reminder.findFirst({
      where: { id, userId }
    });

    if (!reminder) {
      return null;
    }

    return formatReminder(reminder);
  }

  async createReminder(userId: string, input: unknown): Promise<FormattedReminder> {
    const parsed = createReminderSchema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message || 'Dados inválidos para criação do agendamento/lembrete.';
      throw new AppError(issue, 400);
    }

    const {
      reminderName,
      reminderDescription,
      reminderTime,
      reminderDate,
      reminderRepeat,
      reminderNotify,
      latitude,
      longitude
    } = parsed.data;

    const parsedDate = new Date(reminderDate);

    const reminder = await prisma.reminder.create({
      data: {
        reminderName,
        reminderDescription: reminderDescription ?? null,
        reminderTime,
        reminderDate: parsedDate,
        reminderRepeat,
        reminderNotify,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        userId
      }
    });

    // Agenda a notificação do agendamento
    await notificationService.scheduleReminderNotification(
      reminder.id,
      userId,
      reminder.reminderName,
      reminder.reminderDate,
      reminder.reminderTime
    );

    return formatReminder(reminder);
  }

  async editReminder(userId: string, id: string, input: unknown): Promise<FormattedReminder> {
    const parsed = editReminderSchema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message || 'Dados inválidos para atualização do lembrete.';
      throw new AppError(issue, 400);
    }

    const existingReminder = await prisma.reminder.findFirst({
      where: { id, userId }
    });

    if (!existingReminder) {
      throw new AppError('Agendamento não encontrado ou não autorizado para edição.', 404);
    }

    const {
      reminderName,
      reminderDescription,
      reminderTime,
      reminderDate,
      reminderRepeat,
      reminderNotify,
      latitude,
      longitude
    } = parsed.data;

    const updatedDate = reminderDate ? new Date(reminderDate) : undefined;

    const updated = await prisma.reminder.update({
      where: { id },
      data: {
        ...(reminderName !== undefined && { reminderName }),
        ...(reminderDescription !== undefined && { reminderDescription }),
        ...(reminderTime !== undefined && { reminderTime }),
        ...(updatedDate !== undefined && { reminderDate: updatedDate }),
        ...(reminderRepeat !== undefined && { reminderRepeat }),
        ...(reminderNotify !== undefined && { reminderNotify }),
        ...(latitude !== undefined && { latitude }),
        ...(longitude !== undefined && { longitude })
      }
    });

    // Atualiza a notificação pendente
    if (reminderName !== undefined || updatedDate !== undefined || reminderTime !== undefined) {
      await notificationService.updateReminderNotification(
        id,
        updatedDate,
        reminderTime,
        reminderName
      );
    }

    return formatReminder(updated);
  }

  async deleteReminder(userId: string, id: string): Promise<boolean> {
    const existingReminder = await prisma.reminder.findFirst({
      where: { id, userId }
    });

    if (!existingReminder) {
      throw new AppError('Agendamento não encontrado ou não autorizado para exclusão.', 404);
    }

    // Cancela notificação pendente
    await notificationService.cancelReminderNotification(id);

    await prisma.reminder.delete({
      where: { id }
    });

    return true;
  }
}

export const remindersService = new RemindersService();
