import type { IResolvers } from 'mercurius';
import { remindersService } from './reminders.service.js';
import { AppError } from '../../errors/app-error.js';
import type { GraphQLContext } from '../tasks/tasks.resolvers.js';

function ensureAuthenticated(context: GraphQLContext): { sub: string; email: string; username: string } {
  if (!context.user?.sub) {
    throw new AppError('Não autorizado: token de autenticação ausente ou inválido.', 401);
  }
  return context.user;
}

export const reminderResolvers: IResolvers = {
  Query: {
    getAllReminders: async (_parent, _args, context: GraphQLContext) => {
      const user = ensureAuthenticated(context);
      return remindersService.getAllReminders(user.sub);
    },
    getReminderById: async (_parent, { id }: { id: string }, context: GraphQLContext) => {
      const user = ensureAuthenticated(context);
      return remindersService.getReminderById(user.sub, id);
    }
  },
  Mutation: {
    createReminder: async (_parent, { input }: { input: unknown }, context: GraphQLContext) => {
      const user = ensureAuthenticated(context);
      return remindersService.createReminder(user.sub, input);
    },
    editReminder: async (_parent, { id, input }: { id: string; input: unknown }, context: GraphQLContext) => {
      const user = ensureAuthenticated(context);
      return remindersService.editReminder(user.sub, id, input);
    },
    deleteReminder: async (_parent, { id }: { id: string }, context: GraphQLContext) => {
      const user = ensureAuthenticated(context);
      return remindersService.deleteReminder(user.sub, id);
    }
  }
};
