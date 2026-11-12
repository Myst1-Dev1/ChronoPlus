import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';

describe('Reminders GraphQL Integration Tests', () => {
  let app: FastifyInstance;
  let user1Token = '';
  let user2Token = '';
  let createdReminderId = '';
  const timestamp = Date.now();

  const user1 = {
    username: `rem_user1_${timestamp}`,
    email: `rem_user1_${timestamp}@example.com`,
    password: 'password123',
    address: 'Av. Brasil, 500',
    state: 'SP',
    city: 'São Paulo'
  };

  const user2 = {
    username: `rem_user2_${timestamp}`,
    email: `rem_user2_${timestamp}@example.com`,
    password: 'password123',
    address: 'Rua das Palmeiras, 10',
    state: 'RJ',
    city: 'Rio de Janeiro'
  };

  beforeAll(async () => {
    app = buildApp({ logger: false });
    await app.ready();

    const res1 = await app.inject({
      method: 'POST',
      url: '/auth/sign-up',
      payload: user1
    });
    user1Token = res1.json().accessToken;

    const res2 = await app.inject({
      method: 'POST',
      url: '/auth/sign-up',
      payload: user2
    });
    user2Token = res2.json().accessToken;
  });

  afterAll(async () => {
    try {
      await prisma.user.deleteMany({
        where: {
          email: { in: [user1.email, user2.email] }
        }
      });
      await prisma.$disconnect();
    } catch {
      // Ignora erro no teardown se desconectado
    }
    await app.close();
  });

  it('deve rejeitar consulta a lembretes sem autenticação', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `
          query {
            getAllReminders {
              id
              reminderName
            }
          }
        `
      }
    });

    const body = response.json();
    expect(body.errors).toBeDefined();
    expect(body.errors[0].message).toContain('Não autorizado');
  });

  it('deve criar um agendamento com geolocalização e agendar notificação', async () => {
    const reminderDate = new Date(Date.now() + 86400000).toISOString();
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        authorization: `Bearer ${user1Token}`
      },
      payload: {
        query: `
          mutation CreateReminder($input: CreateReminderInput!) {
            createReminder(input: $input) {
              id
              reminderName
              reminderDescription
              reminderTime
              reminderDate
              reminderRepeat
              reminderNotify
              latitude
              longitude
              userId
            }
          }
        `,
        variables: {
          input: {
            reminderName: 'Consulta com Cardiologista',
            reminderDescription: 'Levar exames de sangue e eletrocardiograma',
            reminderTime: '14:30',
            reminderDate,
            reminderRepeat: false,
            reminderNotify: '1_HOUR_BEFORE',
            latitude: -23.55052,
            longitude: -46.633308
          }
        }
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.createReminder).toBeDefined();
    expect(body.data.createReminder.reminderName).toBe('Consulta com Cardiologista');
    expect(body.data.createReminder.latitude).toBeCloseTo(-23.55052);
    expect(body.data.createReminder.longitude).toBeCloseTo(-46.633308);

    createdReminderId = body.data.createReminder.id;

    // Verifica se a notificação pendente foi agendada no banco
    const notification = await prisma.notification.findFirst({
      where: {
        reminderId: createdReminderId,
        status: 'PENDING'
      }
    });
    expect(notification).toBeDefined();
    expect(notification?.title).toContain('Consulta com Cardiologista');
  });

  it('deve criar um lembrete simples sem geolocalização (ex: beber água)', async () => {
    const reminderDate = new Date(Date.now() + 86400000).toISOString();
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        authorization: `Bearer ${user1Token}`
      },
      payload: {
        query: `
          mutation CreateReminder($input: CreateReminderInput!) {
            createReminder(input: $input) {
              id
              reminderName
              latitude
              longitude
            }
          }
        `,
        variables: {
          input: {
            reminderName: 'Beber 500ml de água',
            reminderTime: '10:00',
            reminderDate,
            reminderNotify: 'AT_TIME'
          }
        }
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.createReminder.latitude).toBeNull();
    expect(body.data.createReminder.longitude).toBeNull();
  });

  it('deve listar todos os agendamentos isolados por usuário autenticado', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        authorization: `Bearer ${user1Token}`
      },
      payload: {
        query: `
          query {
            getAllReminders {
              id
              reminderName
            }
          }
        `
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.errors).toBeUndefined();
    expect(Array.isArray(body.data.getAllReminders)).toBe(true);
    expect(body.data.getAllReminders.some((r: { id: string }) => r.id === createdReminderId)).toBe(true);

    // User 2 não deve ver lembretes do User 1
    const resUser2 = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        authorization: `Bearer ${user2Token}`
      },
      payload: {
        query: `
          query {
            getAllReminders {
              id
            }
          }
        `
      }
    });

    const bodyUser2 = resUser2.json();
    expect(bodyUser2.data.getAllReminders.some((r: { id: string }) => r.id === createdReminderId)).toBe(false);
  });

  it('deve buscar um lembrete por ID', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        authorization: `Bearer ${user1Token}`
      },
      payload: {
        query: `
          query GetReminder($id: ID!) {
            getReminderById(id: $id) {
              id
              reminderName
              reminderTime
            }
          }
        `,
        variables: {
          id: createdReminderId
        }
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.getReminderById.id).toBe(createdReminderId);
    expect(body.data.getReminderById.reminderTime).toBe('14:30');
  });

  it('deve editar um agendamento existente e atualizar notificação pendente', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        authorization: `Bearer ${user1Token}`
      },
      payload: {
        query: `
          mutation EditReminder($id: ID!, $input: EditReminderInput!) {
            editReminder(id: $id, input: $input) {
              id
              reminderName
              reminderTime
            }
          }
        `,
        variables: {
          id: createdReminderId,
          input: {
            reminderName: 'Consulta com Cardiologista - Reagendada',
            reminderTime: '16:00'
          }
        }
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.editReminder.reminderName).toBe('Consulta com Cardiologista - Reagendada');
    expect(body.data.editReminder.reminderTime).toBe('16:00');
  });

  it('deve excluir um agendamento e cancelar sua notificação pendente', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        authorization: `Bearer ${user1Token}`
      },
      payload: {
        query: `
          mutation DeleteReminder($id: ID!) {
            deleteReminder(id: $id)
          }
        `,
        variables: {
          id: createdReminderId
        }
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.deleteReminder).toBe(true);

    // Garante que o lembrete foi removido
    const checkResponse = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        authorization: `Bearer ${user1Token}`
      },
      payload: {
        query: `
          query GetReminder($id: ID!) {
            getReminderById(id: $id) {
              id
            }
          }
        `,
        variables: {
          id: createdReminderId
        }
      }
    });

    const checkBody = checkResponse.json();
    expect(checkBody.data.getReminderById).toBeNull();

    // Com onDelete: Cascade no banco, as notificações vinculadas ao lembrete são limpas
    const notification = await prisma.notification.findFirst({
      where: {
        reminderId: createdReminderId
      }
    });
    expect(notification).toBeNull();
  });
});
