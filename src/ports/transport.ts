/**
 * Result of invoking an endpoint through the transport port.
 */
export interface TransportInvocationResult {
  requestId: string;
  output: unknown;
}

/**
 * Summary of an endpoint for transport listing.
 */
export interface TransportEndpointSummary {
  name: string;
  summary: string;
  description?: string;
}

/**
 * Driving port for transport adapters (REST, MCP, CLI).
 *
 * All transports depend on this interface to invoke endpoints and list tools.
 * The composition root wires an implementation that delegates to the
 * application service layer ({@link invokeEndpoint}, {@link listEndpoints}).
 *
 * @example
 * ```typescript
 * // In a Fastify route handler:
 * fastify.post('/rpc/:name', async (req) => {
 *   const result = await transport.invoke(req.params.name, req.body, { requestId: req.id });
 *   return result.output;
 * });
 * ```
 */
export interface TransportPort {
  /**
   * Invoke an endpoint by name with raw (unvalidated) input.
   *
   * @param name     - Registered endpoint name.
   * @param rawInput - Unvalidated input from the transport layer.
   * @param options  - Optional overrides (e.g. a pre-existing requestId).
   * @returns The validated output wrapped in a {@link TransportInvocationResult}.
   */
  invoke(
    name: string,
    rawInput: unknown,
    options?: { requestId?: string },
  ): Promise<TransportInvocationResult>;

  /**
   * List available endpoints, optionally filtered by transport context.
   *
   * @param context - Transport context for enrichment.
   * @returns An array of endpoint summaries.
   */
  list(context: { sessionId?: string; transportType: 'rest' | 'mcp' | 'cli' }): TransportEndpointSummary[];
}
