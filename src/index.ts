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
} from './core/endpoint.js';

export {
  type EndpointRegistry,
  InMemoryEndpointRegistry,
} from './core/registry.js';

export {
  RivetBenchError,
  ValidationError,
  EndpointNotFoundError,
  InternalServerError,
  ConfigurationError,
  isRivetBenchError,
  toRivetBenchError,
} from './core/errors.js';

export { createLogger } from './core/logger.js';

export {
  buildOpenApiDocument,
  type OpenApiGeneratorOptions,
} from './core/openapi.js';

// Config
export { loadConfig, type ServerConfig } from './config/index.js';

// Servers
export { createRestServer, type RestServerOptions } from './server/rest.js';
export { startMcpServer, type McpServerOptions } from './server/mcp.js';

// CLI
export { createCli, type CreateCliOptions } from './cli/index.js';
