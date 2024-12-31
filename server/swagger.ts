import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Vehicle Validation API',
      version: '1.0.0',
      description: 'API for validating vehicles against business rules. This API provides endpoints for managing validation rules, condition groups, and performing vehicle validations.',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: '/api',
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'Rules',
        description: 'Operations for managing validation rules'
      },
      {
        name: 'Validation',
        description: 'Endpoints for validating vehicles against rules'
      },
      {
        name: 'Vehicle Data',
        description: 'Reference data for vehicles (makes, models, etc.)'
      }
    ],
    components: {
      schemas: {
        Rule: {
          type: 'object',
          properties: {
            ruleId: { type: 'integer' },
            ruleName: { type: 'string' },
            ruleType: { type: 'string', enum: ['Global', 'Local'] },
            status: { type: 'string', enum: ['Active', 'Inactive', 'Draft'] },
            action: { 
              type: 'string', 
              enum: ['POZVI - NESLIBUJ', 'POZVI SWAPEM - NESLIBUJ', 'NEZVI - NECHCEME'] 
            },
            actionMessage: { type: 'string' },
            customer: { type: 'string', enum: ['Private', 'Company', 'Any'] },
            country: { type: 'string', enum: ['CZ', 'SK', 'PL', 'Any'] },
            opportunitySource: { type: 'string', enum: ['Ticking', 'Webform', 'SMS', 'Any'] }
          }
        },
        ConditionGroup: {
          type: 'object',
          properties: {
            conditionGroupId: { type: 'integer' },
            ruleId: { type: 'integer' },
            description: { type: 'string' },
            conditions: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Condition'
              }
            }
          }
        },
        Condition: {
          type: 'object',
          properties: {
            conditionId: { type: 'integer' },
            conditionGroupId: { type: 'integer' },
            parameter: { type: 'string' },
            operator: { 
              type: 'string',
              enum: ['=', '!=', 'IN', 'NOT IN', '>', '<', '>=', '<=', 'BETWEEN']
            },
            value: { type: 'string' },
            orGroup: { 
              type: 'integer', 
              nullable: true,
              description: 'When not null, conditions with the same orGroup within a condition group are evaluated using OR logic'
            }
          }
        }
      }
    }
  },
  apis: ['./server/routes.ts'], // Path to the API docs
};

export const specs = swaggerJsdoc(options);