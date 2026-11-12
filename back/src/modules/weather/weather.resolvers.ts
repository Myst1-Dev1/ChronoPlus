import type { IResolvers } from 'mercurius';
import { prisma } from '../../lib/prisma.js';
import { weatherService } from './weather.service.js';
import { AppError } from '../../errors/app-error.js';
import type { GraphQLContext } from '../tasks/tasks.resolvers.js';

function ensureAuthenticated(context: GraphQLContext): { sub: string; email: string; username: string } {
  if (!context.user?.sub) {
    throw new AppError('Não autorizado: token de autenticação ausente ou inválido.', 401);
  }
  return context.user;
}

export const weatherResolvers: IResolvers = {
  Query: {
    getWeatherForReminder: async (_parent, { id }: { id: string }, context: GraphQLContext) => {
      const user = ensureAuthenticated(context);

      const reminder = await prisma.reminder.findFirst({
        where: { id, userId: user.sub }
      });

      if (!reminder) {
        throw new AppError('Agendamento não encontrado ou não autorizado.', 404);
      }

      if (reminder.latitude === null || reminder.longitude === null) {
        throw new AppError('Este agendamento não possui coordenadas de geolocalização.', 400);
      }

      const forecast = await weatherService.getWeatherForecast(
        reminder.latitude,
        reminder.longitude
      );

      if (!forecast) {
        throw new AppError('Serviço de previsão meteorológica temporariamente indisponível.', 503);
      }

      return forecast;
    }
  }
};
