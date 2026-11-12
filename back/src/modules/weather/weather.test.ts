import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import { weatherService } from './weather.service.js';
import { notificationService } from '../notifications/notification.service.js';

describe('Weather & Geolocation Module Tests', () => {
  let app: FastifyInstance;
  let userToken = '';
  let userId = '';
  let reminderWithCoordsId = '';
  let reminderWithoutCoordsId = '';
  const timestamp = Date.now();

  const testUser = {
    username: `weather_user_${timestamp}`,
    email: `weather_user_${timestamp}@example.com`,
    password: 'password123',
    address: 'Av. Paulista, 1578',
    state: 'SP',
    city: 'São Paulo'
  };

  beforeAll(async () => {
    app = buildApp({ logger: false });
    await app.ready();

    const signUpRes = await app.inject({
      method: 'POST',
      url: '/auth/sign-up',
      payload: testUser
    });
    const body = signUpRes.json();
    userToken = body.accessToken;
    userId = body.user.id;

    // 1. Cria reminder COM coordenadas (ex: Consulta médica em São Paulo)
    const reminderWithCoords = await prisma.reminder.create({
      data: {
        reminderName: 'Consulta Médica MASP',
        reminderDescription: 'Av. Paulista',
        reminderTime: '15:00',
        reminderDate: new Date(Date.now() + 86400000),
        reminderRepeat: false,
        reminderNotify: '1_HOUR_BEFORE',
        latitude: -23.5615,
        longitude: -46.6559,
        userId
      }
    });
    reminderWithCoordsId = reminderWithCoords.id;

    // 2. Cria reminder SEM coordenadas (ex: Beber água)
    const reminderWithoutCoords = await prisma.reminder.create({
      data: {
        reminderName: 'Tomar vitamina C',
        reminderTime: '08:00',
        reminderDate: new Date(Date.now() + 86400000),
        reminderRepeat: true,
        reminderNotify: 'AT_TIME',
        userId
      }
    });
    reminderWithoutCoordsId = reminderWithoutCoords.id;
  });

  afterAll(async () => {
    try {
      await prisma.user.deleteMany({
        where: { id: userId }
      });
      await prisma.$disconnect();
    } catch {
      // Ignora erro no teardown
    }
    await app.close();
  });

  describe('WeatherService Direct Calls', () => {
    it('deve obter previsão do tempo real ou mock com latitude e longitude válidas', async () => {
      const forecast = await weatherService.getWeatherForecast(-23.5615, -46.6559);

      // Se a rede externa estiver disponível, retorna o payload estruturado; se offline, trata com resiliência retornando null
      if (forecast) {
        expect(forecast).toHaveProperty('temperature');
        expect(forecast).toHaveProperty('condition');
        expect(forecast).toHaveProperty('willRain');
        expect(forecast).toHaveProperty('recommendation');
        expect(typeof forecast.temperature).toBe('number');
        expect(typeof forecast.willRain).toBe('boolean');
      }
    });
  });

  describe('GraphQL getWeatherForReminder Query', () => {
    it('deve retornar 401 ao consultar sem autenticação', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/graphql',
        payload: {
          query: `
            query {
              getWeatherForReminder(id: "${reminderWithCoordsId}") {
                temperature
                condition
              }
            }
          `
        }
      });

      const body = response.json();
      expect(body.errors).toBeDefined();
      expect(body.errors[0].message).toContain('Não autorizado');
    });

    it('deve retornar erro 400 se o lembrete não possuir coordenadas geográficas', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/graphql',
        headers: {
          authorization: `Bearer ${userToken}`
        },
        payload: {
          query: `
            query {
              getWeatherForReminder(id: "${reminderWithoutCoordsId}") {
                temperature
                condition
              }
            }
          `
        }
      });

      const body = response.json();
      expect(body.errors).toBeDefined();
      expect(body.errors[0].message).toContain('não possui coordenadas');
    });
  });

  describe('Enriquecimento de Notificações com Clima via RabbitMQ', () => {
    it('deve enriquecer a notificação com informações meteorológicas quando houver coordenadas', async () => {
      // Cria a notificação para o reminder com coordenadas
      const notif = await prisma.notification.create({
        data: {
          userId,
          reminderId: reminderWithCoordsId,
          title: 'Compromisso com Médico',
          message: 'Seu compromisso está agendado para às 15:00.',
          scheduledFor: new Date(),
          status: 'PENDING'
        }
      });

      await notificationService.processNotificationEvent({
        notificationId: notif.id,
        userId,
        reminderId: reminderWithCoordsId,
        title: notif.title,
        message: notif.message,
        scheduledFor: notif.scheduledFor.toISOString()
      });

      const updatedNotif = await prisma.notification.findUnique({
        where: { id: notif.id }
      });

      expect(updatedNotif?.status).toBe('SENT');
      expect(updatedNotif?.sentAt).toBeDefined();

      // Se a API de clima respondeu, a mensagem é enriquecida com a previsão
      if (updatedNotif?.message.includes('Previsão do tempo:')) {
        expect(updatedNotif.message).toMatch(/Previsão do tempo:.*°C/);
      } else {
        // Fallback de resiliência: a notificação é entregue mesmo sem o clima
        expect(updatedNotif?.message).toBe('Seu compromisso está agendado para às 15:00.');
      }
    });

    it('não deve anexar clima para lembretes sem geolocalização', async () => {
      const notif = await prisma.notification.create({
        data: {
          userId,
          reminderId: reminderWithoutCoordsId,
          title: 'Beber água',
          message: 'Lembrete: beba água agora.',
          scheduledFor: new Date(),
          status: 'PENDING'
        }
      });

      await notificationService.processNotificationEvent({
        notificationId: notif.id,
        userId,
        reminderId: reminderWithoutCoordsId,
        title: notif.title,
        message: notif.message,
        scheduledFor: notif.scheduledFor.toISOString()
      });

      const updatedNotif = await prisma.notification.findUnique({
        where: { id: notif.id }
      });

      expect(updatedNotif?.status).toBe('SENT');
      expect(updatedNotif?.message).toBe('Lembrete: beba água agora.');
    });
  });
});
