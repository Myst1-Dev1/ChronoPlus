import { buildApp } from './app.js';
import { prisma } from './lib/prisma.js';

const isDev = process.env.NODE_ENV !== 'production';
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '0.0.0.0';

const app = buildApp({
  logger: isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname'
          }
        }
      }
    : {
        level: process.env.LOG_LEVEL || 'info'
      }
});

async function start(): Promise<void> {
  try {
    const address = await app.listen({ port, host });
    app.log.info(`Servidor ouvindo em ${address}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
for (const signal of signals) {
  process.on(signal, async () => {
    app.log.info({ signal }, 'Recebido sinal de encerramento. Finalizando Fastify e Prisma...');
    try {
      await app.close();
      await prisma.$disconnect();
      app.log.info('Servidor finalizado com sucesso.');
      process.exit(0);
    } catch (err) {
      app.log.error(err, 'Erro durante encerramento do servidor.');
      process.exit(1);
    }
  });
}

start();
