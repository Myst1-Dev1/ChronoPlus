import { authService } from './auth.service.js';
export class AuthController {
    async signUp(request, reply) {
        const result = await authService.signUp(request.body, (payload) => request.server.jwt.sign(payload, { expiresIn: '15m' }));
        return reply.status(201).send(result);
    }
    async signIn(request, reply) {
        const identifier = request.body.identifier || request.body.email || request.body.username;
        if (!identifier) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'Bad Request',
                message: 'É necessário informar email, username ou identifier para autenticação.'
            });
        }
        const result = await authService.signIn(identifier, request.body.password, (payload) => request.server.jwt.sign(payload, { expiresIn: '15m' }));
        return reply.status(200).send(result);
    }
    async refreshToken(request, reply) {
        const result = await authService.refreshUserToken(request.body.refreshToken, (payload) => request.server.jwt.sign(payload, { expiresIn: '15m' }));
        return reply.status(200).send(result);
    }
    async editUser(request, reply) {
        const userId = request.user.sub;
        const result = await authService.editUser(userId, request.body);
        return reply.status(200).send({ user: result });
    }
}
export const authController = new AuthController();
