/**
 * OpenAPI spec fragment for the "A" scope: auth polish, games filter/pagination,
 * BGG expansion + hot, admin user management.
 * Merged into src/lib/openapi.js.
 */

const bearer = [{ bearerAuth: [] }];

const jsonResp = (schemaRef) => ({
  200: {
    description: 'ok',
    content: { 'application/json': { schema: { $ref: schemaRef } } },
  },
});

export const aSchemas = {
  Paginated: {
    type: 'object',
    properties: {
      items: { type: 'array', items: {} },
      total: { type: 'integer' },
      page: { type: 'integer' },
      limit: { type: 'integer' },
    },
  },
  BggSearchItem: {
    type: 'object',
    properties: {
      bggId: { type: 'integer' },
      name: { type: 'string' },
      yearPublished: { type: 'integer', nullable: true },
    },
  },
  BggHotItem: {
    type: 'object',
    properties: {
      rank: { type: 'integer' },
      bggId: { type: 'integer' },
      name: { type: 'string' },
      yearPublished: { type: 'integer', nullable: true },
      thumbnail: { type: 'string', nullable: true },
    },
  },
  BggDetail: {
    type: 'object',
    properties: {
      bggId: { type: 'integer' },
      name: { type: 'string' },
      minPlayers: { type: 'integer' },
      maxPlayers: { type: 'integer' },
      playtimeMin: { type: 'integer' },
      minPlaytime: { type: 'integer', nullable: true },
      maxPlaytime: { type: 'integer', nullable: true },
      minAge: { type: 'integer', nullable: true },
      yearPublished: { type: 'integer', nullable: true },
      thumbnail: { type: 'string' },
      image: { type: 'string' },
      description: { type: 'string' },
      bggAverage: { type: 'number', nullable: true },
      bggRating: { type: 'number', nullable: true },
      bggWeight: { type: 'number', nullable: true },
      usersRated: { type: 'integer', nullable: true },
      categories: { type: 'array', items: { type: 'string' } },
      mechanics: { type: 'array', items: { type: 'string' } },
      designers: { type: 'array', items: { type: 'string' } },
    },
  },
};

export const aPaths = {
  '/auth/logout': {
    post: {
      tags: ['auth'],
      summary: 'Logout (stateless — client discards token)',
      security: bearer,
      responses: { 204: { description: 'no content' } },
    },
  },
  '/auth/password': {
    put: {
      tags: ['auth'],
      summary: 'Change password',
      security: bearer,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['oldPassword', 'newPassword'],
              properties: {
                oldPassword: { type: 'string' },
                newPassword: { type: 'string', minLength: 6 },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'ok' },
        400: { description: 'validation error' },
        401: { description: 'wrong old password' },
      },
    },
  },
  '/bgg/hot': {
    get: {
      tags: ['bgg'],
      summary: 'BoardGameGeek hot list',
      responses: {
        200: {
          description: 'ok',
          content: {
            'application/json': {
              schema: { type: 'array', items: { $ref: '#/components/schemas/BggHotItem' } },
            },
          },
        },
      },
    },
  },
  '/admin/users': {
    get: {
      tags: ['admin'],
      summary: 'List users (admin)',
      security: bearer,
      parameters: [
        { name: 'q', in: 'query', schema: { type: 'string' } },
        { name: 'role', in: 'query', schema: { type: 'string', enum: ['user', 'admin'] } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
      ],
      responses: jsonResp('#/components/schemas/Paginated'),
    },
  },
  '/admin/users/{id}/role': {
    put: {
      tags: ['admin'],
      summary: 'Change user role (admin)',
      security: bearer,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['role'],
              properties: { role: { type: 'string', enum: ['user', 'admin'] } },
            },
          },
        },
      },
      responses: { 200: { description: 'ok' }, 400: { description: 'cannot change own role' } },
    },
  },
  '/admin/users/{id}': {
    delete: {
      tags: ['admin'],
      summary: 'Delete user (admin)',
      security: bearer,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'ok' }, 400: { description: 'cannot delete self' } },
    },
  },
};
