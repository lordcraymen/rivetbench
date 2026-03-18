import Fastify from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { buildOpenApiDocument } from './openapi.js';
import { EndpointRegistry } from '../../domain/registry.js';
import type { ServerConfig } from '../../config/index.js';
import { createLogger, createPinoLoggerPort } from '../pino/logger.js';
import { createErrorHandler, createNotFoundHandler } from './error-handler.js';
import { invokeEndpoint } from '../../application/invoke-endpoint.js';
import { listEndpoints } from '../../application/list-endpoints.js';

export interface RestServerOptions {
  registry: EndpointRegistry;
  config: ServerConfig;
}

export const createRestServer = async ({ registry, config }: RestServerOptions) => {
  const logger = createLogger(config);

  const fastify = Fastify({
    loggerInstance: logger,
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

  /**
   * Tool listing endpoint with ETag / If-None-Match cache validation.
   * Returns the (optionally enriched) list of registered endpoints.
   */
  fastify.get('/tools', async (request, reply) => {
    const currentEtag = registry.etag;

    // Conditional request: return 304 when client's cached version matches.
    const ifNoneMatch = request.headers['if-none-match'];
    if (ifNoneMatch && ifNoneMatch === currentEtag) {
      return reply.status(304).send();
    }

    const tools = listEndpoints(registry, {
      sessionId: request.id,
      transportType: 'rest',
    });

    return reply
      .header('ETag', currentEtag)
      .header('Cache-Control', 'no-cache')
      .send(tools);
  });

  const loggerPort = createPinoLoggerPort(logger);

  fastify.post('/rpc/:name', async (request) => {
    const endpointName = (request.params as { name: string }).name;
    const result = await invokeEndpoint(
      registry,
      endpointName,
      request.body,
      loggerPort,
      { requestId: request.id },
    );
    return result.output;
  });

  return {
    fastify,
    start: async () => {
      await fastify.listen({ host: config.rest.host, port: config.rest.port });
      return fastify;
    }
  };
};
