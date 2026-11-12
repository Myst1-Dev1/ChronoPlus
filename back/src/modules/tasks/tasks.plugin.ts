import mercurius from 'mercurius';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { taskGqlSchema } from './tasks.schemas.js';
import { taskResolvers } from './tasks.resolvers.js';

export const tasksGraphQLPlugin: FastifyPluginAsync = async (fastify: FastifyInstance): Promise<void> => {
  await fastify.register(mercurius, {
    schema: taskGqlSchema,
    resolvers: taskResolvers,
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
