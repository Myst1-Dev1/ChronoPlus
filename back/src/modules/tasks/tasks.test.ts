import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';

describe('Tasks GraphQL Integration Tests', () => {
  let app: FastifyInstance;
  let user1Token = '';
  let user2Token = '';
  let createdTaskId = '';
  const timestamp = Date.now();

  const user1 = {
    username: `task_user1_${timestamp}`,
    email: `task_user1_${timestamp}@example.com`,
    password: 'password123',
    address: 'Rua Alfa, 100',
    state: 'SP',
    city: 'São Paulo'
  };

  const user2 = {
    username: `task_user2_${timestamp}`,
    email: `task_user2_${timestamp}@example.com`,
    password: 'password123',
    address: 'Rua Beta, 200',
    state: 'RJ',
    city: 'Rio de Janeiro'
  };

  beforeAll(async () => {
    app = buildApp({ logger: false });
    await app.ready();

    // Cria os usuários de teste via endpoint de autenticação
    const resUser1 = await app.inject({
      method: 'POST',
      url: '/auth/sign-up',
      payload: user1
    });
    user1Token = resUser1.json().accessToken;

    const resUser2 = await app.inject({
      method: 'POST',
      url: '/auth/sign-up',
      payload: user2
    });
    user2Token = resUser2.json().accessToken;
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

  it('deve rejeitar query GraphQL sem autenticação', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `
          query {
            getAllTasks {
              id
              name
            }
          }
        `
      }
    });

    const body = response.json();
    expect(body.errors).toBeDefined();
    expect(body.errors[0].message).toContain('Não autorizado');
  });

  it('deve criar uma nova tarefa com sucesso via mutation createTask', async () => {
    const scheduledDate = new Date(Date.now() + 86400000).toISOString();
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        authorization: `Bearer ${user1Token}`
      },
      payload: {
        query: `
          mutation CreateTask($input: CreateTaskInput!) {
            createTask(input: $input) {
              id
              name
              description
              scheduledDate
              taskConcluded
              userId
            }
          }
        `,
        variables: {
          input: {
            name: 'Finalizar relatório de sprint',
            description: 'Detalhar métricas de entrega e bugs resolvidos',
            scheduledDate
          }
        }
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.createTask).toBeDefined();
    expect(body.data.createTask.name).toBe('Finalizar relatório de sprint');
    expect(body.data.createTask.description).toBe('Detalhar métricas de entrega e bugs resolvidos');
    expect(body.data.createTask.taskConcluded).toBe(false);
    expect(body.data.createTask.id).toBeDefined();

    createdTaskId = body.data.createTask.id;
  });

  it('deve listar todas as tarefas pertencentes apenas ao usuário autenticado', async () => {
    // User 1 lista tarefas
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        authorization: `Bearer ${user1Token}`
      },
      payload: {
        query: `
          query {
            getAllTasks {
              id
              name
              taskConcluded
            }
          }
        `
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.errors).toBeUndefined();
    expect(Array.isArray(body.data.getAllTasks)).toBe(true);
    expect(body.data.getAllTasks.length).toBeGreaterThanOrEqual(1);
    expect(body.data.getAllTasks.some((t: { id: string }) => t.id === createdTaskId)).toBe(true);

    // User 2 não deve ver a tarefa do User 1
    const responseUser2 = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        authorization: `Bearer ${user2Token}`
      },
      payload: {
        query: `
          query {
            getAllTasks {
              id
            }
          }
        `
      }
    });

    const bodyUser2 = responseUser2.json();
    expect(bodyUser2.errors).toBeUndefined();
    expect(bodyUser2.data.getAllTasks.some((t: { id: string }) => t.id === createdTaskId)).toBe(false);
  });

  it('deve buscar uma tarefa específica pelo ID', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        authorization: `Bearer ${user1Token}`
      },
      payload: {
        query: `
          query GetTask($id: ID!) {
            getTaskById(id: $id) {
              id
              name
              description
              taskConcluded
            }
          }
        `,
        variables: {
          id: createdTaskId
        }
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.getTaskById).toBeDefined();
    expect(body.data.getTaskById.id).toBe(createdTaskId);
    expect(body.data.getTaskById.name).toBe('Finalizar relatório de sprint');
  });

  it('deve retornar null ao buscar ID que pertence a outro usuário', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        authorization: `Bearer ${user2Token}`
      },
      payload: {
        query: `
          query GetTask($id: ID!) {
            getTaskById(id: $id) {
              id
            }
          }
        `,
        variables: {
          id: createdTaskId
        }
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.getTaskById).toBeNull();
  });

  it('deve editar uma tarefa existente via mutation editTask', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        authorization: `Bearer ${user1Token}`
      },
      payload: {
        query: `
          mutation EditTask($id: ID!, $input: EditTaskInput!) {
            editTask(id: $id, input: $input) {
              id
              name
              description
            }
          }
        `,
        variables: {
          id: createdTaskId,
          input: {
            name: 'Relatório de sprint atualizado',
            description: 'Descrição complementada com gráficos'
          }
        }
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.editTask.name).toBe('Relatório de sprint atualizado');
    expect(body.data.editTask.description).toBe('Descrição complementada com gráficos');
  });

  it('deve marcar a tarefa como concluída via markAsComplete', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        authorization: `Bearer ${user1Token}`
      },
      payload: {
        query: `
          mutation CompleteTask($id: ID!) {
            markAsComplete(id: $id) {
              id
              taskConcluded
            }
          }
        `,
        variables: {
          id: createdTaskId
        }
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.markAsComplete.taskConcluded).toBe(true);
  });

  it('deve suportar o alias maskAsComplete conforme requisitado', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        authorization: `Bearer ${user1Token}`
      },
      payload: {
        query: `
          mutation MaskTask($id: ID!) {
            maskAsComplete(id: $id) {
              id
              taskConcluded
            }
          }
        `,
        variables: {
          id: createdTaskId
        }
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.maskAsComplete.taskConcluded).toBe(true);
  });

  it('deve deletar a tarefa com sucesso via mutation deleteTask', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        authorization: `Bearer ${user1Token}`
      },
      payload: {
        query: `
          mutation DeleteTask($id: ID!) {
            deleteTask(id: $id)
          }
        `,
        variables: {
          id: createdTaskId
        }
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.deleteTask).toBe(true);

    // Garantir que a tarefa não existe mais
    const checkResponse = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        authorization: `Bearer ${user1Token}`
      },
      payload: {
        query: `
          query GetTask($id: ID!) {
            getTaskById(id: $id) {
              id
            }
          }
        `,
        variables: {
          id: createdTaskId
        }
      }
    });

    const checkBody = checkResponse.json();
    expect(checkBody.data.getTaskById).toBeNull();
  });
});
