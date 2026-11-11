import { authController } from './auth.controller.js';
import { signUpSchema, signInSchema, refreshTokenSchema, editUserSchema } from './auth.schemas.js';
import { authenticate } from '../../middlewares/authenticate.js';
export const authRoutes = async (fastify) => {
    fastify.post('/sign-up', { schema: signUpSchema }, (req, reply) => authController.signUp(req, reply));
    fastify.post('/sign-in', { schema: signInSchema }, (req, reply) => authController.signIn(req, reply));
    fastify.post('/refresh-token', { schema: refreshTokenSchema }, (req, reply) => authController.refreshToken(req, reply));
    fastify.put('/edit-user', { schema: editUserSchema, onRequest: [authenticate] }, (req, reply) => authController.editUser(req, reply));
};
