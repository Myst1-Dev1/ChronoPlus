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

export const weatherResolvers: IResolvers<any, GraphQLContext> = {
  Query: {
    getWeatherByDestination: async (
      _parent,
      { destination, date }: { destination: string; date?: string },
      context: GraphQLContext
    ) => {
      ensureAuthenticated(context);

      const queryTerm = destination?.trim();
      if (!queryTerm) {
        throw new AppError('O destino para consulta meteorológica é obrigatório.', 400);
      }

      const forecast = await weatherService.getWeatherByDestination(
        queryTerm,
        date
      );

      if (!forecast) {
        throw new AppError(`Não foi possível localizar o destino "${destination}" ou o serviço meteorológico está indisponível.`, 404);
      }

      return forecast;
    },

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

      // Alinha a previsão com a data e horário agendados do compromisso
      let targetDateTime: string | undefined;
      if (reminder.reminderDate && reminder.reminderTime) {
        const datePart = reminder.reminderDate.toISOString().slice(0, 10);
        targetDateTime = `${datePart}T${reminder.reminderTime}:00`;
      }

      const forecast = await weatherService.getWeatherForecast(
        reminder.latitude,
        reminder.longitude,
        targetDateTime
      );

      if (!forecast) {
        throw new AppError('Serviço de previsão meteorológica temporariamente indisponível.', 503);
      }

      return forecast;
    },

    getWeatherForecast: async (
      _parent,
      { latitude, longitude, date }: { latitude: number; longitude: number; date?: string },
      context: GraphQLContext
    ) => {
      ensureAuthenticated(context);

      const forecast = await weatherService.getWeatherForecast(
        latitude,
        longitude,
        date
      );

      if (!forecast) {
        throw new AppError('Serviço de previsão meteorológica temporariamente indisponível.', 503);
      }

      return forecast;
    }
  }
};

