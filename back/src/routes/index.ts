import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { healthRoutes } from './health/health.route.js';
import { authRoutes } from '../modules/auth/auth.routes.js';

export const appRoutes: FastifyPluginAsync = async (fastify: FastifyInstance): Promise<void> => {
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes, { prefix: '/auth' });
};
