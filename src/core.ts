/**
 * RivetBench Core — lightweight sub-export for endpoint definition only.
 *
 * This entry point re-exports the types and utilities needed to **define**
 * endpoints and work with the registry, without pulling in heavy transport
 * dependencies (Fastify, fastmcp, Pino).
 *
 * Import from `@lordcraymen/rivetbench/core` when your module only needs to
 * create endpoint definitions or interact with the registry interface.
 *
 * @example
 * ```typescript
 * import {
 *   makeEndpoint,
 *   InMemoryEndpointRegistry,
 *   type EndpointDefinition,
 * } from '@lordcraymen/rivetbench/core';
 * ```
 *
 * @packageDocumentation
 */

// Endpoint factory & types
export {
  makeEndpoint,
  type EndpointDefinition,
  type AnyEndpointDefinition,
  type EndpointContext,
  type EndpointHandler,
  type EndpointRuntimeConfig,
  type ContextFactory,
} from './domain/endpoint.js';

// Registry
export {
  type EndpointRegistry,
  InMemoryEndpointRegistry,
  type ToolEnricher,
  type ToolEnricherContext,
  type ToolsChangedListener,
} from './domain/registry.js';

// Error classes
export {
  RivetBenchError,
  ValidationError,
  EndpointNotFoundError,
  InternalServerError,
  ConfigurationError,
  isRivetBenchError,
  toRivetBenchError,
} from './domain/errors.js';

// Ports
export { type LoggerPort } from './ports/logger.js';
export { type TransportPort } from './ports/transport.js';
