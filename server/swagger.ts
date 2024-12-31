
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Vehicle Validation API',
      version: '1.0.0',
      description: 'API for validating vehicles against business rules',
    },
    servers: [
      {
        url: 'http://0.0.0.0:80',
        description: 'Development server',
      },
    ],
  },
  apis: ['./server/routes.ts'],
};

export const specs = swaggerJsdoc(options);
