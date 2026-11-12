import amqp, { type Channel, type ChannelModel, type ConsumeMessage } from 'amqplib';

export const EVENTS_EXCHANGE = 'chronoplus.events';
export const DLX_EXCHANGE = 'chronoplus.events.dlx';
export const NOTIFICATIONS_QUEUE = 'notifications.send.queue';
export const NOTIFICATIONS_DLQ = 'notifications.dlq';
export const NOTIFICATION_DISPATCH_KEY = 'notification.dispatch';

export class RabbitMQClient {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private isConnecting = false;
  private url: string;

  constructor() {
    this.url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
  }

  async connect(): Promise<Channel> {
    if (this.channel) {
      return this.channel;
    }

    if (this.isConnecting) {
      // Aguarda conexão em andamento
      while (this.isConnecting) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (this.channel) return this.channel;
    }

    this.isConnecting = true;

    try {
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();

      this.connection.on('error', (err) => {
        console.error('[RabbitMQ] Conexão com erro:', err);
        this.channel = null;
        this.connection = null;
      });

      this.connection.on('close', () => {
        console.warn('[RabbitMQ] Conexão fechada. Tentando reconectar...');
        this.channel = null;
        this.connection = null;
      });

      await this.setupTopology();
      return this.channel;
    } finally {
      this.isConnecting = false;
    }
  }

  private async setupTopology(): Promise<void> {
    if (!this.channel) return;

    // 1. Dead Letter Exchange (DLX) e Dead Letter Queue (DLQ)
    await this.channel.assertExchange(DLX_EXCHANGE, 'direct', { durable: true });
    await this.channel.assertQueue(NOTIFICATIONS_DLQ, { durable: true });
    await this.channel.bindQueue(NOTIFICATIONS_DLQ, DLX_EXCHANGE, NOTIFICATIONS_DLQ);

    // 2. Exchange Principal (Topic)
    await this.channel.assertExchange(EVENTS_EXCHANGE, 'topic', { durable: true });

    // 3. Fila de envio de notificações com redirecionamento para DLQ em caso de falha/rejeição
    await this.channel.assertQueue(NOTIFICATIONS_QUEUE, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': DLX_EXCHANGE,
        'x-dead-letter-routing-key': NOTIFICATIONS_DLQ
      }
    });

    // 4. Bind da fila de notificações na exchange principal
    await this.channel.bindQueue(NOTIFICATIONS_QUEUE, EVENTS_EXCHANGE, NOTIFICATION_DISPATCH_KEY);
  }

  async publish(routingKey: string, payload: unknown): Promise<boolean> {
    const channel = await this.connect();
    const content = Buffer.from(JSON.stringify(payload));

    return channel.publish(EVENTS_EXCHANGE, routingKey, content, {
      persistent: true,
      contentType: 'application/json',
      timestamp: Date.now()
    });
  }

  async consume<T>(
    queue: string,
    onMessage: (data: T, raw: ConsumeMessage) => Promise<void>
  ): Promise<void> {
    const channel = await this.connect();
    await channel.prefetch(10);

    await channel.consume(
      queue,
      async (msg) => {
        if (!msg) return;

        try {
          const content = JSON.parse(msg.content.toString()) as T;
          await onMessage(content, msg);
          channel.ack(msg);
        } catch (error) {
          console.error(`[RabbitMQ] Erro ao processar mensagem na fila ${queue}:`, error);
          // Rejeita a mensagem e encaminha para a DLQ (requeue = false)
          channel.nack(msg, false, false);
        }
      },
      { noAck: false }
    );
  }

  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
    } catch {
      // Ignora erro no shutdown se já fechado
    } finally {
      this.channel = null;
      this.connection = null;
    }
  }
}

export const rabbitmq = new RabbitMQClient();