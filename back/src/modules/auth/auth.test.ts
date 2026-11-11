import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';

describe('Auth Module Integration Tests', () => {
  let app: FastifyInstance;
  let testUserToken = '';
  let testRefreshToken = '';
  const uniqueId = Date.now();
  const testUser = {
    username: `user_${uniqueId}`,
    email: `user_${uniqueId}@example.com`,
    password: 'password123',
    address: 'Av. Paulista, 1000',
    state: 'SP',
    city: 'São Paulo'
  };

  beforeAll(async () => {
    app = buildApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    // Limpeza dos dados criados no teste
    try {
      await prisma.user.deleteMany({
        where: {
          email: { in: [testUser.email, `second_${uniqueId}@example.com`] }
        }
      });
      await prisma.$disconnect();
    } catch {
      // Ignora se o banco não estiver disponível neste ciclo de teardown
    }
    await app.close();
  });

  describe('POST /auth/sign-up', () => {
    it('deve registrar um novo usuário com sucesso e retornar tokens', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/sign-up',
        payload: testUser
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();

      expect(body).toHaveProperty('user');
      expect(body.user.email).toBe(testUser.email.toLowerCase());
      expect(body.user.username).toBe(testUser.username);
      expect(body.user.address).toBe(testUser.address);
      expect(body.user.state).toBe(testUser.state);
      expect(body.user.city).toBe(testUser.city);
      expect(body.user).not.toHaveProperty('password');
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('refreshToken');

      testUserToken = body.accessToken;
      testRefreshToken = body.refreshToken;
    });

    it('deve retornar 409 ao tentar cadastrar o mesmo e-mail', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/sign-up',
        payload: {
          ...testUser,
          username: `diff_${uniqueId}`
        }
      });

      expect(response.statusCode).toBe(409);
      const body = response.json();
      expect(body.message).toContain('e-mail já está em uso');
    });

    it('deve retornar 409 ao tentar cadastrar o mesmo username', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/sign-up',
        payload: {
          ...testUser,
          email: `diff_${uniqueId}@example.com`
        }
      });

      expect(response.statusCode).toBe(409);
      const body = response.json();
      expect(body.message).toContain('nome de usuário já está em uso');
    });

    it('deve retornar 400 se faltar campo obrigatório', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/sign-up',
        payload: {
          email: 'invalid@example.com'
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /auth/sign-in', () => {
    it('deve autenticar por e-mail e retornar novos tokens', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/sign-in',
        payload: {
          email: testUser.email,
          password: testUser.password
        }
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.user.email).toBe(testUser.email.toLowerCase());
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('refreshToken');
    });

    it('deve autenticar por username e retornar novos tokens', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/sign-in',
        payload: {
          username: testUser.username,
          password: testUser.password
        }
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.user.username).toBe(testUser.username);
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('refreshToken');
    });

    it('deve retornar 401 com senha incorreta', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/sign-in',
        payload: {
          email: testUser.email,
          password: 'wrongpassword'
        }
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.message).toBe('Credenciais inválidas.');
    });

    it('deve retornar 401 para usuário inexistente', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/sign-in',
        payload: {
          email: 'nonexistent@example.com',
          password: 'password123'
        }
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.message).toBe('Credenciais inválidas.');
    });
  });

  describe('POST /auth/refresh-token', () => {
    it('deve rotacionar o refresh token e retornar novo par de tokens', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh-token',
        payload: {
          refreshToken: testRefreshToken
        }
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('refreshToken');
      expect(body.refreshToken).not.toBe(testRefreshToken);

      // Atualiza token para os testes subsequentes
      testUserToken = body.accessToken;
      testRefreshToken = body.refreshToken;
    });

    it('deve retornar 401 ao tentar reutilizar o token anterior já consumido', async () => {
      const oldToken = 'fake-or-already-used-token';
      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh-token',
        payload: {
          refreshToken: oldToken
        }
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.message).toContain('Refresh token inválido ou expirado');
    });
  });

  describe('PUT /auth/edit-user', () => {
    it('deve retornar 401 ao tentar editar usuário sem token Bearer', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/auth/edit-user',
        payload: {
          city: 'Campinas'
        }
      });

      expect(response.statusCode).toBe(401);
    });

    it('deve editar os dados do usuário autenticado com sucesso', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/auth/edit-user',
        headers: {
          authorization: `Bearer ${testUserToken}`
        },
        payload: {
          city: 'Campinas',
          state: 'SP',
          address: 'Rua das Flores, 50'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.user.city).toBe('Campinas');
      expect(body.user.address).toBe('Rua das Flores, 50');
      expect(body.user).toHaveProperty('updatedAt');
    });
  });
});
