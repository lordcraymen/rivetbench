import { OpenAPIV3 } from 'openapi-types';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { AnyEndpointDefinition } from './endpoint.js';

export interface OpenApiGeneratorOptions {
  title: string;
  version: string;
  description?: string;
}

const zodSchemaToOpenApi = (zodSchema: AnyEndpointDefinition['input'] | AnyEndpointDefinition['output']): OpenAPIV3.SchemaObject => {
  const jsonSchema = zodToJsonSchema(zodSchema, { 
    target: 'openApi3',
    $refStrategy: 'none'
  });
  
  // Remove $schema property as it's not needed in OpenAPI
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { $schema, ...schemaWithoutDollar } = jsonSchema as { $schema?: string; [key: string]: unknown };
  
  return schemaWithoutDollar as OpenAPIV3.SchemaObject;
};

const buildRpcPathItem = (endpoint: AnyEndpointDefinition): OpenAPIV3.PathItemObject => ({
  post: {
    summary: endpoint.summary,
    description: endpoint.description,
    operationId: endpoint.name,
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: zodSchemaToOpenApi(endpoint.input)
        }
      }
    },
    responses: {
      '200': {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: zodSchemaToOpenApi(endpoint.output)
          }
        }
      },
      '400': {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string' },
                details: { type: 'object' }
              },
              required: ['error']
            }
          }
        }
      },
      '404': {
        description: 'Endpoint not found',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string' }
              },
              required: ['error']
            }
          }
        }
      }
    }
  }
});

export const buildOpenApiDocument = (
  endpoints: AnyEndpointDefinition[],
  options: OpenApiGeneratorOptions
): OpenAPIV3.Document => {
  const paths: OpenAPIV3.PathsObject = {};

  for (const endpoint of endpoints) {
    const path = `/rpc/${endpoint.name}`;
    paths[path] = buildRpcPathItem(endpoint);
  }

  return {
    openapi: '3.0.3',
    info: {
      title: options.title,
      version: options.version,
      description: options.description
    },
    paths,
    components: {}
  };
};
