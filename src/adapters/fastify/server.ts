import Fastify, { FastifyInstance } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import type { Logger as PinoLogger } from 'pino';
import type { EndpointRegistry } from '../../domain/registry.js';
import type { ServerConfig } from '../../config/index.js';
import type { LoggerPort } from '../../ports/logger.js';
import type { TransportPort } from '../../ports/transport.js';
import { createErrorHandler, createNotFoundHandler } from './error-handler.js';
import { createRestHandler } from '../rest/handler.js';
import { createMcpHandler } from '../mcp/handler.js';

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

  // Error handlers for Fastify-native routes (e.g. Swagger UI)
  fastify.setErrorHandler(createErrorHandler(loggerPort));
  fastify.setNotFoundHandler(createNotFoundHandler(loggerPort));

  // Framework-agnostic REST handler (ADR-0005)
  const restHandler = createRestHandler({
    transport,
    registry,
    logger: loggerPort,
    application,
  });

  // Swagger UI — Fastify-specific convenience fed by the shared OpenAPI doc
  await fastify.register(fastifySwagger, {
    mode: 'static',
    specification: { document: restHandler.getOpenApiDocument() },
  });

  await fastify.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

  // Delegate REST routes to framework-agnostic handler via reply.hijack()
  const restDelegate = async (
    request: { raw: import('node:http').IncomingMessage; body: unknown },
    reply: { raw: import('node:http').ServerResponse; hijack: () => void },
  ) => {
    reply.hijack();
    await restHandler.handleRequest(request.raw, reply.raw, request.body);
  };

  fastify.get('/health', restDelegate);
  fastify.get('/tools', restDelegate);
  fastify.get('/openapi.json', restDelegate);
  fastify.post('/rpc/:name', restDelegate);

  // MCP Streamable HTTP endpoint — delegates to SDK transport via raw HTTP.
  const mcpHandler = createMcpHandler({
    transport,
    registry,
    logger: loggerPort,
    application,
  });

  fastify.route({
    method: ['GET', 'POST', 'DELETE'],
    url: '/mcp',
    handler: async (request, reply) => {
      reply.hijack();
      await mcpHandler.handleRequest(request.raw, reply.raw, request.body);
    },
  });

  // Expose for graceful shutdown
  fastify.addHook('onClose', async () => {
    await mcpHandler.close();
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
