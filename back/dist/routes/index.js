import { healthRoutes } from './health/health.route.js';
import { authRoutes } from '../modules/auth/auth.routes.js';
export const appRoutes = async (fastify) => {
    await fastify.register(healthRoutes);
    await fastify.register(authRoutes, { prefix: '/auth' });
};
