import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../errors/app-error.js';

export interface UserTokenPayload {
  sub: string;
  email: string;
  username: string;
}

export interface SignUpDTO {
  username: string;
  email: string;
  password: string;
  address: string;
  state: string;
  city: string;
}

export interface EditUserDTO {
  username?: string;
  email?: string;
  password?: string;
  address?: string;
  state?: string;
  city?: string;
}

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export class AuthService {
  async signUp(dto: SignUpDTO, signToken: (payload: UserTokenPayload) => string) {
    const existingEmail = await prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() }
    });

    if (existingEmail) {
      throw new AppError('Este endereço de e-mail já está em uso.', 409);
    }

    const existingUsername = await prisma.user.findUnique({
      where: { username: dto.username }
    });

    if (existingUsername) {
      throw new AppError('Este nome de usuário já está em uso.', 409);
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email.toLowerCase(),
        password: hashedPassword,
        address: dto.address,
        state: dto.state,
        city: dto.city
      }
    });

    const accessToken = signToken({
      sub: user.id,
      email: user.email,
      username: user.username
    });

    const refreshToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt
      }
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        address: user.address,
        state: user.state,
        city: user.city,
        createdAt: user.createdAt.toISOString()
      },
      accessToken,
      refreshToken
    };
  }

  async signIn(identifier: string, rawPassword: string, signToken: (payload: UserTokenPayload) => string) {
    const normalizedIdentifier = identifier.trim();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedIdentifier.toLowerCase() },
          { username: normalizedIdentifier }
        ]
      }
    });

    if (!user) {
      throw new AppError('Credenciais inválidas.', 401);
    }

    const passwordMatches = await bcrypt.compare(rawPassword, user.password);

    if (!passwordMatches) {
      throw new AppError('Credenciais inválidas.', 401);
    }

    const accessToken = signToken({
      sub: user.id,
      email: user.email,
      username: user.username
    });

    const refreshToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt
      }
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        address: user.address,
        state: user.state,
        city: user.city
      },
      accessToken,
      refreshToken
    };
  }

  async refreshUserToken(token: string, signToken: (payload: UserTokenPayload) => string) {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      if (storedToken) {
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      }
      throw new AppError('Refresh token inválido ou expirado.', 401);
    }

    // Rotação de token: exclui o token anterior e cria um novo
    await prisma.refreshToken.delete({
      where: { id: storedToken.id }
    });

    const newAccessToken = signToken({
      sub: storedToken.user.id,
      email: storedToken.user.email,
      username: storedToken.user.username
    });

    const newRefreshToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: storedToken.user.id,
        expiresAt
      }
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  }

  async editUser(userId: string, dto: EditUserDTO) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError('Usuário não encontrado.', 404);
    }

    if (dto.email && dto.email.toLowerCase() !== user.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email: dto.email.toLowerCase() }
      });
      if (emailTaken) {
        throw new AppError('Este endereço de e-mail já está em uso.', 409);
      }
    }

    if (dto.username && dto.username !== user.username) {
      const usernameTaken = await prisma.user.findUnique({
        where: { username: dto.username }
      });
      if (usernameTaken) {
        throw new AppError('Este nome de usuário já está em uso.', 409);
      }
    }

    const dataToUpdate: Record<string, unknown> = {};

    if (dto.username) dataToUpdate.username = dto.username;
    if (dto.email) dataToUpdate.email = dto.email.toLowerCase();
    if (dto.address) dataToUpdate.address = dto.address;
    if (dto.state) dataToUpdate.state = dto.state;
    if (dto.city) dataToUpdate.city = dto.city;
    if (dto.password) {
      dataToUpdate.password = await bcrypt.hash(dto.password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate
    });

    return {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      address: updatedUser.address,
      state: updatedUser.state,
      city: updatedUser.city,
      updatedAt: updatedUser.updatedAt.toISOString()
    };
  }
}

export const authService = new AuthService();
