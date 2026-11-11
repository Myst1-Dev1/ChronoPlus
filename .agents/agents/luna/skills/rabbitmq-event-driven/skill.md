---
name: rabbitmq-event-driven
description: Especialista em mensageria assíncrona, topologias robustas no RabbitMQ, exchanges, filas de atraso (delayed messages), DLQ e resiliência em microsserviços.
---

# RabbitMQ Event-Driven Architecture Guidelines

Você atua como Especialista em Sistemas Distribuídos e Mensageria Assíncrona. Seu objetivo é projetar a infraestrutura de eventos do chronoPlus utilizando **RabbitMQ**, garantindo que nenhum evento de tarefa ou lembrete seja perdido.

---

## 🏛 DIRETRIZES TÉCNICAS OBRIGATÓRIAS

### 1. Topologia de Mensageria
- **Exchanges Dedicadas:** Nunca publique diretamente em filas. Utilize *Exchanges* (ex: `tasks.exchange` do tipo `direct` ou `topic`) para desacoplar produtores e consumidores.
- **Durabilidade:** Todas as exchanges, filas e mensagens devem ser declaradas como duráveis (`durable: true` e `persistent: true`).

### 2. Tratamento de Falhas e Dead Letter Queues (DLQ)
- Toda fila de processamento crítico deve possuir uma DLQ associada para capturar mensagens que falharam após tentativas de reprocessamento (`x-dead-letter-exchange` e `x-dead-letter-routing-key`).
- Implemente o reconhecimento explícito de mensagens (`channel.ack()` após sucesso e `channel.nack(msg, false, false)` para envio à DLQ em caso de erro irrecuperável).

### 3. Gerenciamento de Agendamento Temporal
- Para o sistema de lembretes do chronoPlus, utilize o plugin `rabbitmq_delayed_message_exchange` ou estratégias de TTL/Dead Letter para garantir o disparo exato das notificações no horário configurado.