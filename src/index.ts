/**
 * RivetBench - Lightweight TypeScript framework for dual-exposed endpoints (REST + MCP)
 *
 * @example
 * ```typescript
 * import { makeEndpoint, InMemoryEndpointRegistry, createRestServer, loadConfig } from '@lordcraymen/rivetbench';
 * import { z } from 'zod';
 *
 * const greet = makeEndpoint({
 *   name: 'greet',
 *   summary: 'Greet a user',
 *   input: z.object({ name: z.string() }),
 *   output: z.object({ greeting: z.string() }),
 *   handler: async ({ input }) => ({ greeting: `Hello, ${input.name}!` }),
 * });
 *
 * const registry = new InMemoryEndpointRegistry();
 * registry.register(greet);
 *
 * const config = loadConfig();
 * const server = await createRestServer({ registry, config });
 * await server.listen({ port: config.rest.port, host: config.rest.host });
 * ```
 *
 * @packageDocumentation
 */

// Core
export {
  makeEndpoint,
  type EndpointDefinition,
  type AnyEndpointDefinition,
  type EndpointContext,
  type EndpointHandler,
  type EndpointRuntimeConfig,
  type ContextFactory,
} from './domain/endpoint.js';

export {
  type EndpointRegistry,
  InMemoryEndpointRegistry,
  type ToolEnricher,
  type ToolEnricherContext,
  type ToolsChangedListener,
} from './domain/registry.js';

export {
  RivetBenchError,
  ValidationError,
  EndpointNotFoundError,
  InternalServerError,
  ConfigurationError,
  isRivetBenchError,
  toRivetBenchError,
} from './domain/errors.js';

export { createLogger, createPinoLoggerPort } from './adapters/pino/logger.js';

export { type LoggerPort } from './ports/logger.js';
export { type TransportPort } from './ports/transport.js';

// Application service
export { invokeEndpoint, type InvocationResult } from './application/invoke-endpoint.js';
export { listEndpoints, type EndpointSummary } from './application/list-endpoints.js';
export { createTransportPort } from './application/create-transport-port.js';

export {
  buildOpenApiDocument,
  type OpenApiGeneratorOptions,
} from './application/openapi.js';

// Config
export { loadConfig, type ServerConfig, type DeepPartial } from './config/index.js';

// Servers
export {
  createRestServer,
  rivetBenchPlugin,
  type RestServerOptions,
  type RivetBenchPluginOptions,
} from './adapters/fastify/server.js';
export {
  createRestHandler,
  type RestHandlerOptions,
  type RestHandler,
} from './adapters/rest/handler.js';
export {
  createMcpHandler,
  type McpHandlerOptions,
  type McpHandler,
} from './adapters/mcp/handler.js';

// CLI
export { createCli, type CreateCliOptions } from './adapters/cli/adapter.js';
