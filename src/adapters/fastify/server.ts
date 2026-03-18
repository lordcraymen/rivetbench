import Fastify, { FastifyInstance } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import type { Logger as PinoLogger } from 'pino';
import { buildOpenApiDocument } from './openapi.js';
import type { EndpointRegistry } from '../../domain/registry.js';
import type { ServerConfig } from '../../config/index.js';
import type { LoggerPort } from '../../ports/logger.js';
import type { TransportPort } from '../../ports/transport.js';
import { createErrorHandler, createNotFoundHandler } from './error-handler.js';

/**
 * Options for the Fastify plugin that registers RivetBench routes.
 */
export interface RivetBenchPluginOptions {
  /** TransportPort driving interface (invoke + list). */
  transport: TransportPort;
  /** Endpoint registry for OpenAPI generation and ETag computation. */
  registry: EndpointRegistry;
  /** LoggerPort for error handler logging. */
  loggerPort: LoggerPort;
  /** Application metadata for OpenAPI docs. */
  application: { name: string; version: string; description?: string };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFastifyInstance = FastifyInstance<any, any, any, any>;

/**
 * Fastify plugin that registers all RivetBench routes on an existing instance.
 *
 * This is the primary adapter entry point per ADR-0005: the plugin does NOT
 * own server lifecycle — it only registers routes, error handlers, and Swagger
 * docs on the Fastify instance it receives.
 *
 * @param fastify - An existing Fastify instance to register routes on.
 * @param options - Plugin configuration.
 *
 * @example
 * ```typescript
 * const app = Fastify({ logger: pinoInstance });
 * await rivetBenchPlugin(app, { transport, registry, loggerPort, application: cfg.application });
 * await app.listen({ port: 3000 });
 * ```
 */
export async function rivetBenchPlugin(
  fastify: AnyFastifyInstance,
  options: RivetBenchPluginOptions,
): Promise<void> {
  const { transport, registry, loggerPort, application } = options;

  // Error handlers use LoggerPort (ADR-0004, ADR-0006)
  fastify.setErrorHandler(createErrorHandler(loggerPort));
  fastify.setNotFoundHandler(createNotFoundHandler(loggerPort));

  const document = buildOpenApiDocument(registry.list(), {
    title: application.name,
    version: application.version,
    description: application.description,
  });

  await fastify.register(fastifySwagger, {
    mode: 'static',
    specification: { document },
  });

  await fastify.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

  fastify.get('/health', async () => ({ status: 'ok' }));

  /**
   * Tool listing endpoint with ETag / If-None-Match cache validation.
   */
  fastify.get('/tools', async (request, reply) => {
    const currentEtag = registry.etag;

    const ifNoneMatch = request.headers['if-none-match'];
    if (ifNoneMatch && ifNoneMatch === currentEtag) {
      return reply.status(304).send();
    }

    const tools = transport.list({
      sessionId: request.id,
      transportType: 'rest',
    });

    return reply
      .header('ETag', currentEtag)
      .header('Cache-Control', 'no-cache')
      .send(tools);
  });

  fastify.post('/rpc/:name', async (request) => {
    const endpointName = (request.params as { name: string }).name;
    const result = await transport.invoke(endpointName, request.body, {
      requestId: request.id,
    });
    return result.output;
  });
}

/**
 * Options for the standalone REST server convenience wrapper.
 */
export interface RestServerOptions {
  registry: EndpointRegistry;
  config: ServerConfig;
  /** Pino logger instance for Fastify internals. Injected by composition root. */
  logger: PinoLogger;
  /** Port-based logger for application service calls. Injected by composition root. */
  loggerPort: LoggerPort;
  /** Optional TransportPort override. When omitted, the composition root should provide one. */
  transport?: TransportPort;
}

/**
 * Convenience wrapper: creates a Fastify instance, registers the RivetBench
 * plugin, and returns a start handle.
 *
 * For embedding in an existing Fastify app, use {@link rivetBenchPlugin} directly.
 *
 * @example
 * ```typescript
 * const server = await createRestServer({ registry, config, logger, loggerPort, transport });
 * await server.start();
 * ```
 */
export const createRestServer = async ({
  registry,
  config,
  logger,
  loggerPort,
  transport,
}: RestServerOptions) => {
  const fastify = Fastify({
    loggerInstance: logger,
    genReqId: () => crypto.randomUUID(),
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'reqId',
  });

  // When no TransportPort is provided, build one from the application services.
  // This keeps backward compatibility; composition root should provide one.
  let resolvedTransport = transport;
  if (!resolvedTransport) {
    const { createTransportPort } = await import('../../application/create-transport-port.js');
    resolvedTransport = createTransportPort(registry, loggerPort);
  }

  await rivetBenchPlugin(fastify, {
    transport: resolvedTransport,
    registry,
    loggerPort,
    application: config.application,
  });

  return {
    fastify,
    start: async () => {
      await fastify.listen({ host: config.rest.host, port: config.rest.port });
      return fastify;
    },
  };
};
