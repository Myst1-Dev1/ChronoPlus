import type { IResolvers } from 'mercurius';
import { authService, type EditUserDTO } from './auth.service.js';
import { AppError } from '../../errors/app-error.js';
import type { GraphQLContext } from '../tasks/tasks.resolvers.js';
import { prisma } from '../../lib/prisma.js';

export const authGqlSchema = `
  type UserProfile {
    id: ID!
    username: String!
    email: String!
    address: String
    state: String
    city: String
    createdAt: String!
  }

  input EditUserInput {
    username: String
    email: String
    password: String
    address: String
    state: String
    city: String
  }

  extend type Query {
    me: UserProfile
  }

  extend type Mutation {
    editUser(input: EditUserInput!): UserProfile!
  }
`;

function ensureAuthenticated(context: GraphQLContext): { sub: string; email: string; username: string } {
  if (!context.user?.sub) {
    throw new AppError('Não autorizado: token de autenticação ausente ou inválido.', 401);
  }
  return context.user;
}

export const authResolvers: IResolvers<any, GraphQLContext> = {
  Query: {
    me: async (_parent, _args, context: GraphQLContext) => {
      const user = ensureAuthenticated(context);
      const dbUser = await prisma.user.findUnique({
        where: { id: user.sub }
      });
      if (!dbUser) {
        throw new AppError('Usuário não encontrado.', 404);
      }
      return {
        id: dbUser.id,
        username: dbUser.username,
        email: dbUser.email,
        address: dbUser.address,
        state: dbUser.state,
        city: dbUser.city,
        createdAt: dbUser.createdAt.toISOString()
      };
    }
  },
  Mutation: {
    editUser: async (_parent, { input }: { input: EditUserDTO }, context: GraphQLContext) => {
      const user = ensureAuthenticated(context);
      const updated = await authService.editUser(user.sub, input);
      return {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        address: updated.address,
        state: updated.state,
        city: updated.city,
        createdAt: updated.updatedAt
      };
    }
  }
};

