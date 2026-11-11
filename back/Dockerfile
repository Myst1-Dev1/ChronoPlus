# -----------------------------------------------------------------------------
# Base stage: imagem Node Alpine minima e segura com openssl para Prisma
# -----------------------------------------------------------------------------
FROM node:22-alpine AS base
RUN apk add --no-cache openssl
WORKDIR /usr/src/app

# -----------------------------------------------------------------------------
# Dependencies stage: instalacao de dependencias
# -----------------------------------------------------------------------------
FROM base AS dependencies
COPY package*.json ./
COPY prisma ./prisma
RUN npm install

# -----------------------------------------------------------------------------
# Dev stage: ambiente de desenvolvimento com hot-reload (tsx watch)
# -----------------------------------------------------------------------------
FROM base AS dev
WORKDIR /usr/src/app
COPY package*.json ./
COPY prisma ./prisma
RUN npm install
COPY . .
RUN npx prisma generate
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "dev"]

# -----------------------------------------------------------------------------
# Build stage: compilacao TypeScript
# -----------------------------------------------------------------------------
FROM dependencies AS build
WORKDIR /usr/src/app
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

# -----------------------------------------------------------------------------
# Production stage: runtime enxuto com usuario sem privilegios
# -----------------------------------------------------------------------------
FROM base AS production
ENV NODE_ENV=production
WORKDIR /usr/src/app

USER node

COPY --chown=node:node package*.json ./
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/server.js"]
