import type { IResolvers } from 'mercurius';
import { tasksService } from './tasks.service.js';
import { AppError } from '../../errors/app-error.js';

export interface GraphQLContext {
  user?: {
    sub: string;
    email: string;
    username: string;
  } | null;
}

function ensureAuthenticated(context: GraphQLContext): { sub: string; email: string; username: string } {
  if (!context.user?.sub) {
    throw new AppError('Não autorizado: token de autenticação ausente ou inválido.', 401);
  }
  return context.user;
}

export const taskResolvers: IResolvers<any, GraphQLContext> = {
  Query: {
    getAllTasks: async (_parent, _args, context: GraphQLContext) => {
      const user = ensureAuthenticated(context);
      return tasksService.getAllTasks(user.sub);
    },
    getTaskById: async (_parent, { id }: { id: string }, context: GraphQLContext) => {
      const user = ensureAuthenticated(context);
      return tasksService.getTaskById(user.sub, id);
    }
  },
  Mutation: {
    createTask: async (_parent, { input }: { input: unknown }, context: GraphQLContext) => {
      const user = ensureAuthenticated(context);
      return tasksService.createTask(user.sub, input);
    },
    editTask: async (_parent, { id, input }: { id: string; input: unknown }, context: GraphQLContext) => {
      const user = ensureAuthenticated(context);
      return tasksService.editTask(user.sub, id, input);
    },
    deleteTask: async (_parent, { id }: { id: string }, context: GraphQLContext) => {
      const user = ensureAuthenticated(context);
      return tasksService.deleteTask(user.sub, id);
    },
    markAsComplete: async (_parent, { id }: { id: string }, context: GraphQLContext) => {
      const user = ensureAuthenticated(context);
      return tasksService.markAsComplete(user.sub, id);
    },
    maskAsComplete: async (_parent, { id }: { id: string }, context: GraphQLContext) => {
      const user = ensureAuthenticated(context);
      return tasksService.markAsComplete(user.sub, id);
    }
  }
};
