const healthSchema = {
    response: {
        200: {
            type: 'object',
            properties: {
                status: { type: 'string' },
                uptime: { type: 'number' },
                timestamp: { type: 'string' }
            },
            required: ['status', 'uptime', 'timestamp'],
            additionalProperties: false
        }
    }
};
export const healthRoutes = async (fastify) => {
    fastify.get('/health', { schema: healthSchema }, async (_request, reply) => {
        return reply.status(200).send({
            status: 'ok',
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });
    });
};
