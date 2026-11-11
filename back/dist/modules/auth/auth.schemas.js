const userResponseProperties = {
    id: { type: 'string' },
    username: { type: 'string' },
    email: { type: 'string' },
    address: { type: 'string' },
    state: { type: 'string' },
    city: { type: 'string' },
    createdAt: { type: 'string' }
};
export const signUpSchema = {
    body: {
        type: 'object',
        required: ['username', 'email', 'password', 'address', 'state', 'city'],
        properties: {
            username: { type: 'string', minLength: 3 },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
            address: { type: 'string', minLength: 1 },
            state: { type: 'string', minLength: 2 },
            city: { type: 'string', minLength: 1 }
        },
        additionalProperties: false
    },
    response: {
        201: {
            type: 'object',
            properties: {
                user: {
                    type: 'object',
                    properties: userResponseProperties,
                    required: ['id', 'username', 'email', 'address', 'state', 'city', 'createdAt']
                },
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' }
            },
            required: ['user', 'accessToken', 'refreshToken']
        }
    }
};
export const signInSchema = {
    body: {
        type: 'object',
        required: ['password'],
        properties: {
            email: { type: 'string' },
            username: { type: 'string' },
            identifier: { type: 'string' },
            password: { type: 'string', minLength: 1 }
        },
        additionalProperties: false
    },
    response: {
        200: {
            type: 'object',
            properties: {
                user: {
                    type: 'object',
                    properties: userResponseProperties,
                    required: ['id', 'username', 'email', 'address', 'state', 'city']
                },
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' }
            },
            required: ['user', 'accessToken', 'refreshToken']
        }
    }
};
export const refreshTokenSchema = {
    body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
            refreshToken: { type: 'string', minLength: 1 }
        },
        additionalProperties: false
    },
    response: {
        200: {
            type: 'object',
            properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' }
            },
            required: ['accessToken', 'refreshToken']
        }
    }
};
export const editUserSchema = {
    body: {
        type: 'object',
        properties: {
            username: { type: 'string', minLength: 3 },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
            address: { type: 'string', minLength: 1 },
            state: { type: 'string', minLength: 2 },
            city: { type: 'string', minLength: 1 }
        },
        additionalProperties: false
    },
    response: {
        200: {
            type: 'object',
            properties: {
                user: {
                    type: 'object',
                    properties: {
                        ...userResponseProperties,
                        updatedAt: { type: 'string' }
                    },
                    required: ['id', 'username', 'email', 'address', 'state', 'city', 'updatedAt']
                }
            },
            required: ['user']
        }
    }
};
