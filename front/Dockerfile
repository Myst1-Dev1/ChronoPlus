# -----------------------------------------------------------------------------
# Base stage: imagem Node 22 Alpine minima e segura
# -----------------------------------------------------------------------------
FROM node:22-alpine AS base
WORKDIR /usr/src/app

# -----------------------------------------------------------------------------
# Dependencies stage: instalacao de pacotes
# -----------------------------------------------------------------------------
FROM base AS dependencies
COPY package*.json .npmrc* ./
RUN npm install

# -----------------------------------------------------------------------------
# Dev stage: servidor de desenvolvimento Angular com hot-reload
# -----------------------------------------------------------------------------
FROM base AS dev
WORKDIR /usr/src/app
COPY package*.json .npmrc* ./
RUN npm install
COPY . .
ENV NODE_ENV=development
EXPOSE 4200
CMD ["npx", "ng", "serve", "--host", "0.0.0.0", "--port", "4200", "--poll", "2000"]

# -----------------------------------------------------------------------------
# Build stage: compilacao de producao com Service Worker / PWA
# -----------------------------------------------------------------------------
FROM dependencies AS build
WORKDIR /usr/src/app
COPY . .
RUN npm run build

# -----------------------------------------------------------------------------
# Production stage: servidor Nginx estatico leve para SPA / PWA
# -----------------------------------------------------------------------------
FROM nginx:alpine AS production
COPY --from=build /usr/src/app/dist/chronoplus-front/browser /usr/share/nginx/html
# Configuracao Nginx para SPA (roteamento Angular)
RUN echo 'server { \
  listen 80; \
  location / { \
    root /usr/share/nginx/html; \
    index index.html index.htm; \
    try_files $uri $uri/ /index.html; \
  } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
