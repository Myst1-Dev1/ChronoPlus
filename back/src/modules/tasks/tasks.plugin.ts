import mercurius from 'mercurius';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { taskGqlSchema } from './tasks.schemas.js';
import { taskResolvers } from './tasks.resolvers.js';
import { reminderGqlSchema } from '../reminders/reminders.schemas.js';
import { reminderResolvers } from '../reminders/reminders.resolvers.js';
import { weatherGqlSchema } from '../weather/weather.schemas.js';
import { weatherResolvers } from '../weather/weather.resolvers.js';

export const appGraphQLPlugin: FastifyPluginAsync = async (fastify: FastifyInstance): Promise<void> => {
  const unifiedSchema = `
    ${taskGqlSchema}
    ${reminderGqlSchema}
    ${weatherGqlSchema}
  `;

  const unifiedResolvers = {
    Query: {
      ...taskResolvers.Query,
      ...reminderResolvers.Query,
      ...weatherResolvers.Query
    },
    Mutation: {
      ...taskResolvers.Mutation,
      ...reminderResolvers.Mutation
    }
  };

  await fastify.register(mercurius, {
    schema: unifiedSchema,
    resolvers: unifiedResolvers,
    graphiql: true,
    context: async (request) => {
      let user = null;
      try {
        await request.jwtVerify();
        user = request.user;
      } catch {
        // Usuário não autenticado; resolvers lançarão AppError se a query/mutation exigir auth
      }
      return { user };
    }
  });
};

export const tasksGraphQLPlugin = appGraphQLPlugin;

