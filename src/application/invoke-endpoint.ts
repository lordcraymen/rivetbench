import { randomUUID } from 'node:crypto';
import type { EndpointRegistry } from '../domain/registry.js';
import { EndpointNotFoundError, ValidationError } from '../domain/errors.js';
import type { LoggerPort } from '../ports/logger.js';

/**
 * Result returned by {@link invokeEndpoint} after successful execution.
 */
export interface InvocationResult {
  requestId: string;
  output: unknown;
}

/**
 * Single entry point for endpoint invocation across all transports.
 *
 * Implements the validate → invoke → validate pipeline exactly once.
 * REST, MCP, and CLI adapters all delegate to this function instead of
 * reimplementing the flow.
 *
 * @param registry - The endpoint registry to resolve endpoints from.
 * @param name     - The endpoint name to invoke.
 * @param rawInput - Unvalidated input from the transport layer.
 * @param logger   - Logger port for structured logging.
 * @param options  - Optional overrides (e.g. a pre-existing requestId).
 * @returns The validated output wrapped in an {@link InvocationResult}.
 * @throws {EndpointNotFoundError} When the endpoint name is not registered.
 * @throws {ValidationError} When input fails Zod schema validation.
 *
 * @example
 * ```typescript
 * const result = await invokeEndpoint(registry, 'echo', { message: 'hi' }, logger);
 * // result.output === { echoed: 'hi' }
 * // result.requestId === '550e8400-...'
 * ```
 */
export async function invokeEndpoint(
  registry: EndpointRegistry,
  name: string,
  rawInput: unknown,
  logger: LoggerPort,
  options?: { requestId?: string },
): Promise<InvocationResult> {
  const endpoint = registry.get(name);
  if (!endpoint) {
    throw new EndpointNotFoundError(name);
  }

  const requestId = options?.requestId ?? randomUUID();

  const parsed = endpoint.input.safeParse(rawInput);
  if (!parsed.success) {
    throw new ValidationError('Invalid endpoint input', {
      endpoint: name,
      issues: parsed.error.format(),
    });
  }

  logger.info('Invoking endpoint', { endpoint: name, requestId });

  const result = await endpoint.handler({
    input: parsed.data,
    config: { requestId },
    ctx: registry.createContext(),
  });

  return {
    requestId,
    output: endpoint.output.parse(result),
  };
}
