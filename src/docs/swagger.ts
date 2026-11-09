import { CATEGORIES } from '../models/MenuItem';
import { ORDER_STATUSES } from '../models/Order';

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema: object) => ({ 'application/json': { schema } });
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'MongoDB ObjectId' };
const errorResponses = {
  400: { description: 'Validation error', content: json(ref('Error')) },
  404: { description: 'Not found', content: json(ref('Error')) },
};
const adminOnly = { security: [{ bearerAuth: [] }] };

export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Cafe Menu & Order Management API',
    version: '1.0.0',
    description:
      'REST API for the cafe ordering app. Customers browse the menu and place orders without logging in. ' +
      'Admin endpoints (menu CRUD, order management, stats) need a Bearer token from `POST /api/auth/login`.',
  },
  servers: [{ url: '/api' }],
  tags: [{ name: 'Health' }, { name: 'Menu' }, { name: 'Orders' }, { name: 'Auth' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Validation failed' },
          errors: {
            type: 'array',
            items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' } } },
          },
        },
      },
      MenuItemInput: {
        type: 'object',
        required: ['name', 'category', 'price'],
        properties: {
          name: { type: 'string', example: 'Cappuccino' },
          description: { type: 'string', example: 'Espresso with steamed milk foam' },
          category: { type: 'string', enum: [...CATEGORIES] },
          price: { type: 'number', example: 149 },
          imageUrl: { type: 'string', example: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d' },
          isAvailable: { type: 'boolean', example: true },
          isVeg: { type: 'boolean', example: true },
        },
      },
      MenuItem: {
        allOf: [
          { type: 'object', properties: { _id: { type: 'string' }, createdAt: { type: 'string' }, updatedAt: { type: 'string' } } },
          ref('MenuItemInput'),
        ],
      },
      OrderInput: {
        type: 'object',
        required: ['customer', 'items'],
        properties: {
          customer: {
            type: 'object',
            required: ['name', 'phone'],
            properties: {
              name: { type: 'string', example: 'Anil' },
              phone: { type: 'string', example: '9876543210' },
              notes: { type: 'string', example: 'Less sugar' },
            },
          },
          tableNumber: { type: 'integer', example: 4 },
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['menuItem', 'quantity'],
              properties: { menuItem: { type: 'string' }, quantity: { type: 'integer', example: 2 } },
            },
          },
        },
      },
      Order: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          orderNumber: { type: 'string', example: 'ORD-7K2M9Q' },
          customer: { type: 'object', properties: { name: { type: 'string' }, phone: { type: 'string' }, notes: { type: 'string' } } },
          tableNumber: { type: 'integer' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                menuItem: { type: 'string' },
                name: { type: 'string' },
                price: { type: 'number' },
                quantity: { type: 'integer' },
                subtotal: { type: 'number' },
              },
            },
          },
          totalAmount: { type: 'number' },
          status: { type: 'string', enum: [...ORDER_STATUSES] },
          createdAt: { type: 'string' },
          updatedAt: { type: 'string' },
        },
      },
      Pagination: {
        type: 'object',
        properties: { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' }, pages: { type: 'integer' } },
      },
    },
  },
  paths: {
    '/health': {
      get: { tags: ['Health'], summary: 'Health check (used by keep-alive cron)', responses: { 200: { description: 'OK' } } },
    },
    '/menu': {
      get: {
        tags: ['Menu'],
        summary: 'List menu items with search, filter, sort and pagination',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string', enum: [...CATEGORIES] } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['price_asc', 'price_desc', 'name', 'newest'] } },
          { name: 'available', in: 'query', schema: { type: 'string', enum: ['true', 'false', 'all'], default: 'true' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
        ],
        responses: {
          200: {
            description: 'Menu items',
            content: json({ type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: ref('MenuItem') }, pagination: ref('Pagination') } }),
          },
          400: errorResponses[400],
        },
      },
      post: {
        tags: ['Menu'],
        summary: 'Create a menu item (admin)',
        security: adminOnly.security,
        requestBody: { required: true, content: json(ref('MenuItemInput')) },
        responses: { 201: { description: 'Created', content: json(ref('MenuItem')) }, 400: errorResponses[400], 401: { description: 'Unauthorized' } },
      },
    },
    '/menu/categories': {
      get: { tags: ['Menu'], summary: 'Categories with available item counts', responses: { 200: { description: 'OK' } } },
    },
    '/menu/{id}': {
      get: { tags: ['Menu'], summary: 'Get a menu item', parameters: [idParam], responses: { 200: { description: 'OK', content: json(ref('MenuItem')) }, ...errorResponses } },
      put: {
        tags: ['Menu'],
        summary: 'Update a menu item (admin)',
        security: adminOnly.security,
        parameters: [idParam],
        requestBody: { required: true, content: json(ref('MenuItemInput')) },
        responses: { 200: { description: 'Updated' }, ...errorResponses, 401: { description: 'Unauthorized' } },
      },
      delete: {
        tags: ['Menu'],
        summary: 'Delete a menu item (admin)',
        security: adminOnly.security,
        parameters: [idParam],
        responses: { 200: { description: 'Deleted' }, ...errorResponses, 401: { description: 'Unauthorized' } },
      },
    },
    '/orders': {
      post: {
        tags: ['Orders'],
        summary: 'Place an order (no login). Prices and total are calculated on the server.',
        requestBody: { required: true, content: json(ref('OrderInput')) },
        responses: { 201: { description: 'Order placed', content: json(ref('Order')) }, 400: errorResponses[400], 429: { description: 'Too many orders' } },
      },
      get: {
        tags: ['Orders'],
        summary: 'List orders. Public callers must pass `phone`; admins can list all.',
        parameters: [
          { name: 'phone', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: [...ORDER_STATUSES] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        security: [{}, { bearerAuth: [] }],
        responses: { 200: { description: 'Orders' }, 400: errorResponses[400] },
      },
    },
    '/orders/stats': {
      get: { tags: ['Orders'], summary: 'Sales stats via aggregation pipeline (admin)', security: adminOnly.security, responses: { 200: { description: 'OK' }, 401: { description: 'Unauthorized' } } },
    },
    '/orders/{id}': {
      get: { tags: ['Orders'], summary: 'Get an order', parameters: [idParam], responses: { 200: { description: 'OK', content: json(ref('Order')) }, ...errorResponses } },
    },
    '/orders/{id}/status': {
      patch: {
        tags: ['Orders'],
        summary: 'Update order status (admin)',
        security: adminOnly.security,
        parameters: [idParam],
        requestBody: { required: true, content: json({ type: 'object', required: ['status'], properties: { status: { type: 'string', enum: [...ORDER_STATUSES] } } }) },
        responses: { 200: { description: 'Updated' }, ...errorResponses, 401: { description: 'Unauthorized' } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Admin login, returns JWT',
        requestBody: {
          required: true,
          content: json({ type: 'object', required: ['email', 'password'], properties: { email: { type: 'string' }, password: { type: 'string' } } }),
        },
        responses: { 200: { description: 'Token issued' }, 401: { description: 'Invalid credentials' } },
      },
    },
  },
};
