import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifySensible from '@fastify/sensible';
import fastifyJwt from '@fastify/jwt';
import { appRoutes } from './routes/index.js';
import { tasksGraphQLPlugin } from './modules/tasks/tasks.plugin.js';
import { AppError } from './errors/app-error.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; email: string; username: string };
    user: { sub: string; email: string; username: string };
  }
}

export function buildApp(opts: FastifyServerOptions = {}): FastifyInstance {
  const app = Fastify(opts);

  // Configuração de CORS para comunicação segura com o frontend
  app.register(fastifyCors, {
    origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
  });

  // Plugins centrais
  app.register(fastifySensible);
  app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'chrono_plus_super_secret_jwt_key_2026'
  });

  // Tratamento de erros centralizado
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        error: error.name,
        message: error.message
      });
    }

    const err = error as { validation?: unknown; message?: string; statusCode?: number };
    if (err.validation || err.statusCode === 400) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: err.message ?? 'Erro de validação nos dados fornecidos.'
      });
    }

    if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
      return reply.status(err.statusCode).send({
        statusCode: err.statusCode,
        error: 'Client Error',
        message: err.message ?? 'Requisição inválida.'
      });
    }

    request.log.error(error);
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Erro interno no servidor.'
    });
  });

  // GraphQL Mercurius
  app.register(tasksGraphQLPlugin);

  // Registro modular de rotas
  app.register(appRoutes);

  return app;
}
