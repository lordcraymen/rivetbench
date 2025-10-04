import { OpenAPIV3 } from 'openapi-types';
import { AnyEndpointDefinition } from './endpoint.js';

export interface OpenApiGeneratorOptions {
  title: string;
  version: string;
  description?: string;
}

const placeholderSchema = (): OpenAPIV3.SchemaObject => ({
  type: 'object',
  additionalProperties: true
});

const buildRpcPathItem = (endpoint: AnyEndpointDefinition): OpenAPIV3.PathItemObject => ({
  post: {
    summary: endpoint.summary,
    description: endpoint.description,
    operationId: endpoint.name,
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: placeholderSchema()
        }
      }
    },
    responses: {
      '200': {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: placeholderSchema()
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
