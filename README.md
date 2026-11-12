# ⏱️ ChronoPlus — Backend API

O **ChronoPlus** é uma plataforma de alta performance para gerenciamento de tempo, tarefas, agendamentos (*reminders*) e produtividade contextual. A arquitetura foi projetada com base em **Node.js, Fastify, TypeScript, PostgreSQL (via Prisma ORM)** e mensageria orientada a eventos com **RabbitMQ**, incluindo enriquecimento meteorológico preventivo baseado em geolocalização.

---

## 🏛️ Arquitetura & Decisões de Engenharia

### 1. Paradigma Híbrido: REST + GraphQL
* **REST (Fastify Nativo):** Utilizado no módulo de **Autenticação** (`/auth`) para operações críticas e idempotentes de login, registro, rotação segura de refresh tokens e edição de perfil.
* **GraphQL (via Mercurius no Fastify):** Utilizado para os domínios centrais de negócio (**Tasks, Reminders e Weather**), proporcionando consultas flexíveis no endpoint `/graphql` e suporte à IDE interativa `/graphiql`.

### 2. Persistência & Modelagem Relacional (Prisma + PostgreSQL)
* PostgreSQL 16 provisionado via Docker.
* **Isolamento de Dados (Multi-tenancy por Usuário):** Todas as queries e mutations garantem que o usuário autenticado acesse e modifique estritamente suas próprias tarefas, agendamentos e notificações.
* **Integridade Referencial:** Configuração de deleções em cascata (`onDelete: Cascade`), garantindo consistência no banco sem órfãos.

### 3. Mensageria Orientada a Eventos (RabbitMQ)
* **Topologia:**
  * **Exchange Principal (Topic):** `chronoplus.events` (durável).
  * **Dead Letter Exchange (DLX):** `chronoplus.events.dlx` (direct, durável).
  * **Dead Letter Queue (DLQ):** `notifications.dlq` para absorver mensagens com erro e evitar filas travadas (*poison pills*).
  * **Fila de Notificações:** `notifications.send.queue` associada à routing key `notification.dispatch`.
* **Confiabilidade:** Confirmações explícitas (`channel.ack()`) e descarte seguro para a DLQ (`channel.nack(false, false)`) em falhas persistentes.
* **Scheduler Híbrido:** Agendador periódico que faz a varredura no PostgreSQL das notificações prontas para despacho e publica os eventos no RabbitMQ de forma desacoplada, preservando a memória do broker.

### 4. Geolocalização & Previsão Meteorológica Contextual
* Quando o usuário agenda um compromisso com coordenadas geográficas (`latitude` e `longitude`), o consumidor do RabbitMQ consulta a API **Open-Meteo** (sem dependências externas pesadas e com resiliência por timeout/abort controller).
* A notificação é automaticamente enriquecida com a condição do tempo e alertas preventivos:
  * Exemplo: *“Seu compromisso está agendado para às 14:30. Previsão do tempo: Chuva moderada, 18.2°C. 🌧️ Atenção: Previsão de chuva para o local do seu compromisso. Leve um guarda-chuva!”*

---

## 📁 Estrutura de Módulos (`back/src/modules`)

```text
src/
├── app.ts                         # Configuração central do Fastify e plugins
├── server.ts                      # Bootstrap, workers e graceful shutdown
├── lib/
│   ├── prisma.ts                  # Client singleton do Prisma ORM
│   └── rabbitmq.ts                # Conexão, topologia, DLX/DLQ e produtor/consumidor
├── errors/
│   └── app-error.ts               # Tratamento de exceções com status code explícito
├── middlewares/
│   └── authenticate.ts            # Middleware JWT para rotas REST
└── modules/
    ├── auth/                      # REST: SignUp, SignIn, RefreshToken, EditUser
    ├── tasks/                     # GraphQL: CRUD completo de tarefas e conclusão
    ├── reminders/                 # GraphQL: Agendamentos com suporte a coordenadas
    ├── notifications/             # Worker, scheduler e processamento via RabbitMQ
    └── weather/                   # Previsão Open-Meteo e query getWeatherForReminder
```

---

## 🐳 Ambiente de Desenvolvimento (100% Docker)

O projeto é executado inteiramente em containers orquestrados via `docker-compose.yml`.

### Serviços Docker
| Serviço | Container | Imagem | Portas |
| :--- | :--- | :--- | :--- |
| **postgres** | `chronoplus_postgres` | `postgres:16-alpine` | `5432:5432` |
| **rabbitmq** | `chronoplus_rabbitmq` | `rabbitmq:3.13-management-alpine` | `5672:5672` (AMQP)<br>`15672:15672` (Web UI) |
| **app** | `chronoplus_api` | Node.js 22 (Alpine) | `3000:3000` |
| **front** | `chronoplus_front` | Node.js 22 (Alpine) / Angular 19 | `4200:4200` |

### Comandos de Execução

1. **Subir os containers:**
   ```bash
   docker compose up -d
   # ou usando o alias: dup
   ```

2. **Acessar o terminal da aplicação:**
   ```bash
   docker compose exec app sh
   # ou usando o alias: dshell app
   ```

3. **Sincronizar o banco de dados (Prisma):**
   ```bash
   npx prisma db push
   ```

4. **Executar a suíte completa de testes:**
   ```bash
   npm test
   ```

5. **Derrubar os containers:**
   ```bash
   docker compose down
   # ou usando o alias: ddown
   ```

---

## 🧪 Suíte de Testes Automatizados (Vitest)

O projeto conta com testes unitários e de integração utilizando **Vitest** e a API nativa `.inject()` do Fastify (sem necessidade de bind de portas reais durante a execução dos testes):

* **`auth.test.ts`:** Registro, autenticação com e-mail/username, integridade de hash bcrypt, rotação e expiração de refresh tokens.
* **`tasks.test.ts`:** Operações GraphQL de criação, listagem filtrada por usuário, busca por ID, edição, marcação como concluída e deleção.
* **`reminders.test.ts`:** Agendamentos com e sem geolocalização, recálculo de lembretes e exclusão segura.
* **`notification.test.ts`:** Agendamento no banco, cancelamento e processamento idempotente.
* **`weather.test.ts`:** Integração da previsão meteorológica e enriquecimento das notificações.

---

## 🔌 Guia de Uso da API

### Autenticação (REST)

* `POST /auth/sign-up`: Cadastro de novo usuário.
* `POST /auth/sign-in`: Login (retorna `accessToken` e `refreshToken`).
* `POST /auth/refresh-token`: Rotação segura de tokens.
* `PUT /auth/edit-user`: Atualização de dados cadastrais (requer `Authorization: Bearer <token>`).

---

### Domínio (GraphQL)

* **Endpoint:** `POST http://localhost:3000/graphql`
* **GraphiQL (Navegador):** `http://localhost:3000/graphiql`
* **Header obrigatório para operações autenticadas:**
  ```http
  Authorization: Bearer <SEU_ACCESS_TOKEN>
  Content-Type: application/json
  ```

#### Exemplo: Criar Compromisso com Geolocalização
```graphql
mutation {
  createReminder(input: {
    reminderName: "Consulta Médica"
    reminderDescription: "Hospital Albert Einstein"
    reminderTime: "14:30"
    reminderDate: "2026-11-20T14:30:00.000Z"
    reminderRepeat: false
    reminderNotify: "1_HOUR_BEFORE"
    latitude: -23.5998
    longitude: -46.7145
  }) {
    id
    reminderName
    reminderTime
    latitude
    longitude
  }
}
```

#### Exemplo: Consultar Previsão do Clima para um Compromisso
```graphql
query {
  getWeatherForReminder(id: "ID_DO_LEMBRETE") {
    temperature
    condition
    willRain
    recommendation
  }
}
```

---

## 📊 Monitoramento do RabbitMQ

O painel de controle do RabbitMQ pode ser acessado no navegador:
* **URL:** `http://localhost:15672`
* **Usuário:** `guest`
* **Senha:** `guest`
* **Exchanges visíveis:** `chronoplus.events`, `chronoplus.events.dlx`
* **Queues visíveis:** `notifications.send.queue`, `notifications.dlq`
