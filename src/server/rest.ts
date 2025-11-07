import Fastify from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { buildOpenApiDocument } from '../core/openapi.js';
import { EndpointRegistry } from '../core/registry.js';
import type { ServerConfig } from '../config/index.js';
import { createLogger } from '../core/logger.js';
import { createErrorHandler, createNotFoundHandler } from '../core/error-handler.js';
import { EndpointNotFoundError, ValidationError } from '../core/errors.js';

export interface RestServerOptions {
  registry: EndpointRegistry;
  config: ServerConfig;
}

export const createRestServer = async ({ registry, config }: RestServerOptions) => {
  const logger = createLogger(config);

  const fastify = Fastify({
    logger,
    genReqId: () => crypto.randomUUID(),
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'reqId'
  });

  // Set error handlers with logger dependency
  fastify.setErrorHandler(createErrorHandler(logger));
  fastify.setNotFoundHandler(createNotFoundHandler(logger));

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

// Start server when this file is run directly
async function startServer() {
  const { loadConfig } = await import('../config/index.js');
  const config = loadConfig();
  const logger = createLogger(config);
  
  const { createDefaultRegistry } = await import('../endpoints/index.js');
  const registry = createDefaultRegistry();
  const server = await createRestServer({ registry, config });
  
  await server.start();
  
  logger.info(
    {
      host: config.rest.host,
      port: config.rest.port,
      endpoints: registry.list().map(e => e.name)
    },
    'REST server started'
  );
}

// Simple check: if this file is being run directly (not imported)
// We check if the process argv includes this file name
const isMainModule = process.argv.some(arg => 
  arg.includes('rest.ts') || arg.includes('rest.js')
);

if (isMainModule) {
  startServer().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to start REST server', error);
    process.exit(1);
  });
}
