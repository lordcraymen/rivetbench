import type { EndpointRegistry } from '../domain/registry.js';
import type { LoggerPort } from '../ports/logger.js';
import type { TransportPort } from '../ports/transport.js';
import { invokeEndpoint } from './invoke-endpoint.js';
import { listEndpoints } from './list-endpoints.js';

/**
 * Create a {@link TransportPort} backed by the application services.
 *
 * This is the canonical wiring used by the composition root: it combines
 * `invokeEndpoint()` and `listEndpoints()` behind a single port interface
 * that transport adapters depend on.
 *
 * @param registry - The endpoint registry.
 * @param logger   - Logger port for structured logging.
 * @returns A {@link TransportPort} ready for adapter injection.
 *
 * @example
 * ```typescript
 * const transport = createTransportPort(registry, loggerPort);
 * const result = await transport.invoke('echo', { message: 'hi' });
 * ```
 */
export function createTransportPort(
  registry: EndpointRegistry,
  logger: LoggerPort,
): TransportPort {
  return {
    async invoke(name, rawInput, options) {
      return invokeEndpoint(registry, name, rawInput, logger, options);
    },
    list(context) {
      return listEndpoints(registry, context);
    },
  };
}
