import type { FastifyReply, FastifyRequest } from 'fastify';
import { authService, type SignUpDTO, type EditUserDTO, type UserTokenPayload } from './auth.service.js';

export interface SignInBody {
  email?: string;
  username?: string;
  identifier?: string;
  password: string;
}

export interface RefreshTokenBody {
  refreshToken: string;
}

export class AuthController {
  async signUp(request: FastifyRequest<{ Body: SignUpDTO }>, reply: FastifyReply) {
    const result = await authService.signUp(request.body, (payload: UserTokenPayload) =>
      request.server.jwt.sign(payload, { expiresIn: '15m' })
    );
    return reply.status(201).send(result);
  }

  async signIn(request: FastifyRequest<{ Body: SignInBody }>, reply: FastifyReply) {
    const identifier = request.body.identifier || request.body.email || request.body.username;
    if (!identifier) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'É necessário informar email, username ou identifier para autenticação.'
      });
    }

    const result = await authService.signIn(identifier, request.body.password, (payload: UserTokenPayload) =>
      request.server.jwt.sign(payload, { expiresIn: '15m' })
    );
    return reply.status(200).send(result);
  }

  async refreshToken(request: FastifyRequest<{ Body: RefreshTokenBody }>, reply: FastifyReply) {
    const result = await authService.refreshUserToken(request.body.refreshToken, (payload: UserTokenPayload) =>
      request.server.jwt.sign(payload, { expiresIn: '15m' })
    );
    return reply.status(200).send(result);
  }

  async editUser(request: FastifyRequest<{ Body: EditUserDTO }>, reply: FastifyReply) {
    const userId = request.user.sub;
    const result = await authService.editUser(userId, request.body);
    return reply.status(200).send({ user: result });
  }
}

export const authController = new AuthController();
