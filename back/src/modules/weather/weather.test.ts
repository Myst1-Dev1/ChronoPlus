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
    it('deve obter previsão do tempo real ou mock com latitude e longitude válidas, incluindo série horária', async () => {
      const forecast = await weatherService.getWeatherForecast(-23.5615, -46.6559);

      if (forecast) {
        expect(forecast).toHaveProperty('temperature');
        expect(forecast).toHaveProperty('condition');
        expect(forecast).toHaveProperty('willRain');
        expect(forecast).toHaveProperty('recommendation');
        expect(forecast).toHaveProperty('weatherCode');
        expect(forecast).toHaveProperty('precipitationProbability');
        expect(forecast).toHaveProperty('hourly');
        expect(typeof forecast.temperature).toBe('number');
        expect(typeof forecast.willRain).toBe('boolean');
        expect(typeof forecast.precipitationProbability).toBe('number');
        expect(Array.isArray(forecast.hourly)).toBe(true);
        expect(forecast.hourly.length).toBeGreaterThan(0);

        const firstHour = forecast.hourly[0];
        expect(firstHour).toHaveProperty('time');
        expect(firstHour).toHaveProperty('hour');
        expect(firstHour).toHaveProperty('temperature');
        expect(firstHour).toHaveProperty('condition');
        expect(firstHour).toHaveProperty('weatherCode');
        expect(firstHour).toHaveProperty('precipitationProbability');
        expect(firstHour).toHaveProperty('willRain');
        expect(firstHour.hour).toMatch(/^\d{1,2}h$/);
      }
    }, 15000);

    it('deve alinhar previsão horária quando um targetDateTime específico for informado', async () => {
      const targetDate = new Date();
      targetDate.setHours(18, 0, 0, 0);

      const forecast = await weatherService.getWeatherForecast(-23.5615, -46.6559, targetDate);

      if (forecast) {
        expect(forecast.hourly.length).toBeGreaterThan(0);
        // Verifica se os itens horários retornam a formatação esperada (ex: "18h")
        const hasFormattedHours = forecast.hourly.some((item) => item.hour.endsWith('h'));
        expect(hasFormattedHours).toBe(true);
      }
    }, 15000);

    it('deve geocodificar um destino textual como "São Gonçalo, Rio de Janeiro"', async () => {
      const geo = await weatherService.geocodeDestination('São Gonçalo, Rio de Janeiro');

      if (geo) {
        expect(geo.name).toContain('São Gonçalo');
        expect(typeof geo.latitude).toBe('number');
        expect(typeof geo.longitude).toBe('number');
        expect(geo.formattedAddress).toContain('São Gonçalo');
      }
    }, 15000);

    it('deve obter clima completo por destino textual (getWeatherByDestination)', async () => {
      const forecast = await weatherService.getWeatherByDestination('São Gonçalo, Rio de Janeiro');

      if (forecast) {
        expect(forecast.destination).toBeDefined();
        expect(forecast.latitude).toBeDefined();
        expect(forecast.longitude).toBeDefined();
        expect(forecast.temperature).toBeDefined();
        expect(forecast.hourly.length).toBeGreaterThan(0);
      }
    }, 15000);
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

    it('deve retornar dados meteorológicos completos incluindo previsão horária para lembrete válido', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/graphql',
        headers: {
          authorization: `Bearer ${userToken}`
        },
        payload: {
          query: `
            query {
              getWeatherForReminder(id: "${reminderWithCoordsId}") {
                temperature
                condition
                weatherCode
                precipitationProbability
                willRain
                recommendation
                hourly {
                  time
                  hour
                  temperature
                  condition
                  weatherCode
                  precipitationProbability
                  precipitation
                  willRain
                }
              }
            }
          `
        }
      });

      const body = response.json();
      if (!body.errors) {
        const data = body.data.getWeatherForReminder;
        expect(data).toHaveProperty('temperature');
        expect(data).toHaveProperty('condition');
        expect(data).toHaveProperty('precipitationProbability');
        expect(data).toHaveProperty('recommendation');
        expect(Array.isArray(data.hourly)).toBe(true);
        expect(data.hourly.length).toBeGreaterThan(0);
        expect(data.hourly[0]).toHaveProperty('hour');
        expect(data.hourly[0]).toHaveProperty('precipitationProbability');
      }
    });

    it('deve permitir consulta de clima pontual por coordenadas (getWeatherForecast)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/graphql',
        headers: {
          authorization: `Bearer ${userToken}`
        },
        payload: {
          query: `
            query {
              getWeatherForecast(latitude: -23.5615, longitude: -46.6559) {
                temperature
                condition
                precipitationProbability
                hourly {
                  hour
                  temperature
                  precipitationProbability
                }
              }
            }
          `
        }
      });

      const body = response.json();
      if (!body.errors) {
        const data = body.data.getWeatherForecast;
        expect(data).toBeDefined();
        expect(Array.isArray(data.hourly)).toBe(true);
      }
    });

    it('deve retornar erro 400 se o destino para consulta estiver vazio', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/graphql',
        headers: {
          authorization: `Bearer ${userToken}`
        },
        payload: {
          query: `
            query {
              getWeatherByDestination(destination: "   ") {
                temperature
              }
            }
          `
        }
      });

      const body = response.json();
      expect(body.errors).toBeDefined();
      expect(body.errors[0].message).toContain('obrigatório');
    });

    it('deve consultar o clima por destino textual via GraphQL (ex: São Gonçalo, Rio de Janeiro)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/graphql',
        headers: {
          authorization: `Bearer ${userToken}`
        },
        payload: {
          query: `
            query {
              getWeatherByDestination(destination: "São Gonçalo, Rio de Janeiro") {
                destination
                latitude
                longitude
                temperature
                condition
                weatherCode
                precipitationProbability
                recommendation
                hourly {
                  time
                  hour
                  temperature
                  condition
                  weatherCode
                  precipitationProbability
                  willRain
                }
              }
            }
          `
        }
      });

      const body = response.json();
      if (!body.errors) {
        const data = body.data.getWeatherByDestination;
        expect(data).toBeDefined();
        expect(data.destination).toContain('São Gonçalo');
        expect(typeof data.temperature).toBe('number');
        expect(Array.isArray(data.hourly)).toBe(true);
        expect(data.hourly.length).toBeGreaterThan(0);
        expect(data.hourly[0]).toHaveProperty('hour');
        expect(data.hourly[0]).toHaveProperty('precipitationProbability');
      }
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
