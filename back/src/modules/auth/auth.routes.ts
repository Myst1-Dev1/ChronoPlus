import type { FastifyPluginAsync } from 'fastify';
import {
  authController,
  type SignInBody,
  type RefreshTokenBody
} from './auth.controller.js';
import type { SignUpDTO, EditUserDTO } from './auth.service.js';
import {
  signUpSchema,
  signInSchema,
  refreshTokenSchema,
  editUserSchema
} from './auth.schemas.js';
import { authenticate } from '../../middlewares/authenticate.js';

export const authRoutes: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.post<{ Body: SignUpDTO }>('/sign-up', { schema: signUpSchema }, (req, reply) =>
    authController.signUp(req, reply)
  );

  fastify.post<{ Body: SignInBody }>('/sign-in', { schema: signInSchema }, (req, reply) =>
    authController.signIn(req, reply)
  );

  fastify.post<{ Body: RefreshTokenBody }>('/refresh-token', { schema: refreshTokenSchema }, (req, reply) =>
    authController.refreshToken(req, reply)
  );

  fastify.put<{ Body: EditUserDTO }>(
    '/edit-user',
    { schema: editUserSchema, onRequest: [authenticate] },
    (req, reply) => authController.editUser(req, reply)
  );
};
