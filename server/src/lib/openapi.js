export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Boardgame Everyday API',
    version: '0.1.0',
    description: 'REST API for managing board game collection, play sessions, and reviews.',
  },
  servers: [{ url: '/api', description: 'current host' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          details: { type: 'object', additionalProperties: true, nullable: true },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          username: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string', enum: ['user', 'admin'] },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      Game: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          bggId: { type: 'integer', nullable: true },
          name: { type: 'string' },
          minPlayers: { type: 'integer' },
          maxPlayers: { type: 'integer' },
          playtimeMin: { type: 'integer' },
          yearPublished: { type: 'integer', nullable: true },
          thumbnail: { type: 'string', nullable: true },
          description: { type: 'string', nullable: true },
        },
      },
    },
  },
  security: [],
  paths: {
    '/health': {
      get: {
        tags: ['meta'],
        summary: 'Health check',
        responses: { 200: { description: 'ok' } },
      },
    },
    '/auth/register': {
      post: {
        tags: ['auth'],
        summary: 'Register new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'email', 'password'],
                properties: {
                  username: { type: 'string', minLength: 3 },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 6 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'created',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } },
            },
          },
          409: {
            description: 'user exists',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['auth'],
        summary: 'Login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: { email: { type: 'string' }, password: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'ok',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } },
            },
          },
          401: { description: 'invalid credentials' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['auth'],
        summary: 'Get current user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'ok',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
        },
      },
    },
    '/games': {
      get: {
        tags: ['games'],
        summary: 'List games',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
        ],
        responses: {
          200: {
            description: 'ok',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Game' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['games'],
        summary: 'Create game (admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Game' } } },
        },
        responses: { 201: { description: 'created' }, 403: { description: 'forbidden' } },
      },
    },
    '/games/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      get: {
        tags: ['games'],
        summary: 'Game detail',
        responses: { 200: { description: 'ok' }, 404: { description: 'not found' } },
      },
      put: {
        tags: ['games'],
        summary: 'Update (admin)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'ok' } },
      },
      delete: {
        tags: ['games'],
        summary: 'Delete (admin)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'ok' } },
      },
    },
    '/collection': {
      get: {
        tags: ['collection'],
        summary: 'My collection',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'ok' } },
      },
      post: {
        tags: ['collection'],
        summary: 'Add to collection',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'created' } },
      },
    },
    '/collection/{id}': {
      delete: {
        tags: ['collection'],
        summary: 'Remove',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'ok' } },
      },
    },
    '/plays': {
      get: {
        tags: ['plays'],
        summary: 'My plays',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'ok' } },
      },
      post: {
        tags: ['plays'],
        summary: 'Log play',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'created' } },
      },
    },
    '/plays/{id}': {
      put: {
        tags: ['plays'],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'ok' } },
      },
      delete: {
        tags: ['plays'],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'ok' } },
      },
    },
    '/reviews/{gameId}': {
      get: {
        tags: ['reviews'],
        summary: 'Reviews for game',
        responses: { 200: { description: 'ok' } },
      },
    },
    '/reviews': {
      post: {
        tags: ['reviews'],
        summary: 'Upsert my review',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'ok' } },
      },
    },
    '/bgg/search': {
      get: {
        tags: ['bgg'],
        summary: 'Search BoardGameGeek',
        parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'ok' } },
      },
    },
    '/bgg/game/{bggId}': {
      get: {
        tags: ['bgg'],
        summary: 'Fetch BGG game details',
        parameters: [{ name: 'bggId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'ok' }, 404: { description: 'not found' } },
      },
    },
  },
};
