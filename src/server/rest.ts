import Fastify from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { buildOpenApiDocument } from '../core/openapi.js';
import { EndpointRegistry } from '../core/registry.js';
import { loadConfig } from '../config/index.js';
import { createLogger } from '../core/logger.js';
import { errorHandler, notFoundHandler } from '../core/error-handler.js';
import { EndpointNotFoundError, ValidationError } from '../core/errors.js';

export interface RestServerOptions {
  registry: EndpointRegistry;
}

export const createRestServer = async ({ registry }: RestServerOptions) => {
  const config = loadConfig();
  const logger = createLogger();

  const fastify = Fastify({
    logger,
    genReqId: () => crypto.randomUUID(),
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'reqId'
  });

  // Set error handlers
  fastify.setErrorHandler(errorHandler);
  fastify.setNotFoundHandler(notFoundHandler);

  const document = buildOpenApiDocument(registry.list(), {
    title: config.application.name,
    version: config.application.version,
    description: config.application.description
  });

  // Register Swagger plugin with the generated OpenAPI document
  await fastify.register(fastifySwagger, {
    mode: 'static',
    specification: {
      document
    }
  });

  // Register Swagger UI
  await fastify.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true
    },
    staticCSP: true,
    transformStaticCSP: (header) => header
  });

  fastify.get('/health', async () => ({ status: 'ok' }));

  fastify.post('/rpc/:name', async (request) => {
    const endpointName = (request.params as { name: string }).name;
    const endpoint = registry.get(endpointName);
    
    if (!endpoint) {
      throw new EndpointNotFoundError(endpointName);
    }

    const parsedInput = endpoint.input.safeParse(request.body);
    if (!parsedInput.success) {
      throw new ValidationError('Invalid endpoint input', {
        endpoint: endpointName,
        issues: parsedInput.error.format()
      });
    }

    const result = await endpoint.handler({
      input: parsedInput.data,
      config: { requestId: request.id }
    });

    return endpoint.output.parse(result);
  });

  return {
    fastify,
    start: async () => {
      await fastify.listen({ host: config.rest.host, port: config.rest.port });
      return fastify;
    }
  };
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const logger = createLogger();
  
  import('../endpoints/index.js').then(async ({ createDefaultRegistry }) => {
    const registry = createDefaultRegistry();
    const server = await createRestServer({ registry });
    
    await server.start();
    
    logger.info(
      {
        host: loadConfig().rest.host,
        port: loadConfig().rest.port,
        endpoints: registry.list().map(e => e.name)
      },
      'REST server started'
    );
  }).catch((error) => {
    logger.error({ error }, 'Failed to start REST server');
    process.exit(1);
  });
}
