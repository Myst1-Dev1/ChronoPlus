import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../errors/app-error.js';
import { notificationService } from '../notifications/notification.service.js';
import {
  createTaskSchema,
  editTaskSchema,
  type CreateTaskDTO,
  type EditTaskDTO
} from './tasks.schemas.js';

export interface FormattedTask {
  id: string;
  name: string;
  description: string | null;
  scheduledDate: string;
  taskConcluded: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

function formatTask(task: {
  id: string;
  name: string;
  description: string | null;
  scheduledDate: Date;
  taskConcluded: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}): FormattedTask {
  return {
    ...task,
    scheduledDate: task.scheduledDate.toISOString(),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString()
  };
}

export class TasksService {
  async getAllTasks(userId: string): Promise<FormattedTask[]> {
    const tasks = await prisma.task.findMany({
      where: { userId },
      orderBy: { scheduledDate: 'asc' }
    });

    return tasks.map(formatTask);
  }

  async getTaskById(userId: string, id: string): Promise<FormattedTask | null> {
    const task = await prisma.task.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!task) {
      return null;
    }

    return formatTask(task);
  }

  async createTask(userId: string, input: unknown): Promise<FormattedTask> {
    const parsed = createTaskSchema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message || 'Dados inválidos para criação da tarefa.';
      throw new AppError(issue, 400);
    }

    const { name, description, scheduledDate } = parsed.data;

    const task = await prisma.task.create({
      data: {
        name,
        description: description ?? null,
        scheduledDate: new Date(scheduledDate),
        userId
      }
    });

    // Agenda a notificação vinculada à tarefa no banco
    await notificationService.scheduleTaskNotification(
      task.id,
      userId,
      task.name,
      task.scheduledDate
    );

    return formatTask(task);
  }

  async editTask(userId: string, id: string, input: unknown): Promise<FormattedTask> {
    const parsed = editTaskSchema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message || 'Dados inválidos para atualização da tarefa.';
      throw new AppError(issue, 400);
    }

    const existingTask = await prisma.task.findFirst({
      where: { id, userId }
    });

    if (!existingTask) {
      throw new AppError('Tarefa não encontrada ou não autorizada para edição.', 404);
    }

    const { name, description, scheduledDate, taskConcluded } = parsed.data;

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(scheduledDate !== undefined && { scheduledDate: new Date(scheduledDate) }),
        ...(taskConcluded !== undefined && { taskConcluded })
      }
    });

    // Atualiza a notificação pendente caso o nome ou a data tenham sido alterados
    if (name !== undefined || scheduledDate !== undefined) {
      await notificationService.updateTaskNotification(
        id,
        scheduledDate ? new Date(scheduledDate) : undefined,
        name
      );
    }

    return formatTask(updatedTask);
  }

  async deleteTask(userId: string, id: string): Promise<boolean> {
    const existingTask = await prisma.task.findFirst({
      where: { id, userId }
    });

    if (!existingTask) {
      throw new AppError('Tarefa não encontrada ou não autorizada para exclusão.', 404);
    }

    // Cancela a notificação pendente associada
    await notificationService.cancelTaskNotification(id);

    await prisma.task.delete({
      where: { id }
    });

    return true;
  }

  async markAsComplete(userId: string, id: string): Promise<FormattedTask> {
    const existingTask = await prisma.task.findFirst({
      where: { id, userId }
    });

    if (!existingTask) {
      throw new AppError('Tarefa não encontrada ou não autorizada.', 404);
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: { taskConcluded: true }
    });

    return formatTask(updatedTask);
  }
}

export const tasksService = new TasksService();
