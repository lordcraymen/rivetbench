import { z, ZodTypeAny } from 'zod';

/**
 * Runtime configuration injected into every endpoint handler invocation.
 */
export interface EndpointRuntimeConfig {
  requestId?: string;
}

/**
 * Context object received by every endpoint handler.
 *
 * @typeParam TInput  - Zod schema for the endpoint input.
 * @typeParam TOutput - Zod schema for the endpoint output.
 * @typeParam TCtx    - Optional user-provided context type injected via a context
 *                      factory at registry / server level. Defaults to `undefined`,
 *                      which preserves backward compatibility.
 *
 * @example
 * ```typescript
 * // Without custom context (backward compatible)
 * handler: async ({ input, config }) => ({ echoed: input.message })
 *
 * // With custom context
 * interface MyCtx { db: Database; relay: Relay }
 * handler: async ({ input, ctx }) => ctx.relay.dispatch('getGraph')
 * ```
 */
export interface EndpointContext<
  TInput extends ZodTypeAny,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  TOutput extends ZodTypeAny,
  TCtx = undefined,
> {
  input: z.infer<TInput>;
  config: EndpointRuntimeConfig;
  /**
   * User-provided custom context, injected through a {@link ContextFactory}
   * at registry or server creation level.
   * `undefined` by default — endpoints that don't need custom context can
   * ignore this field entirely.
   */
  ctx: TCtx;
}

/**
 * Endpoint handler function signature.
 *
 * @typeParam TInput  - Zod schema for the endpoint input.
 * @typeParam TOutput - Zod schema for the endpoint output.
 * @typeParam TCtx    - Optional user-provided context type.
 */
export type EndpointHandler<
  TInput extends ZodTypeAny,
  TOutput extends ZodTypeAny,
  TCtx = undefined,
> = (
  ctx: EndpointContext<TInput, TOutput, TCtx>
) => Promise<z.infer<TOutput>> | z.infer<TOutput>;

/**
 * Static definition of an endpoint, including validation schemas and handler.
 *
 * @typeParam TInput  - Zod schema for the endpoint input.
 * @typeParam TOutput - Zod schema for the endpoint output.
 * @typeParam TCtx    - Optional user-provided context type. Defaults to
 *                      `undefined` for backward compatibility.
 *
 * @example
 * ```typescript
 * // Basic endpoint (no custom context)
 * const echo = makeEndpoint({
 *   name: 'echo',
 *   summary: 'Echo back',
 *   input: z.object({ message: z.string() }),
 *   output: z.object({ echoed: z.string() }),
 *   handler: async ({ input }) => ({ echoed: input.message }),
 * });
 *
 * // Endpoint with custom injected context
 * interface AppCtx { db: Database }
 * const getUser = makeEndpoint<typeof UserInput, typeof UserOutput, AppCtx>({
 *   name: 'getUser',
 *   summary: 'Fetch a user',
 *   input: UserInput,
 *   output: UserOutput,
 *   handler: async ({ input, ctx }) => ctx.db.findUser(input.id),
 * });
 * ```
 */
export interface EndpointDefinition<
  TInput extends ZodTypeAny = ZodTypeAny,
  TOutput extends ZodTypeAny = ZodTypeAny,
  TCtx = undefined,
> {
  name: string;
  summary: string;
  description?: string;
  input: TInput;
  output: TOutput;
  handler: EndpointHandler<TInput, TOutput, TCtx>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyEndpointDefinition = EndpointDefinition<any, any, any>;

/**
 * Factory function that produces the custom context object for each handler
 * invocation.  Registered once at registration/server level and called on
 * every request.
 *
 * @typeParam TCtx - The custom context type produced by the factory.
 *
 * @example
 * ```typescript
 * const ctxFactory: ContextFactory<AppCtx> = () => ({
 *   db: dbPool,
 *   relay: relayInstance,
 * });
 * ```
 */
export type ContextFactory<TCtx> = () => TCtx;

/**
 * Create a type-safe endpoint definition.
 *
 * This is the primary entry point for defining endpoints. The returned object
 * is registered in an {@link EndpointRegistry} and automatically exposed via
 * REST, MCP, and CLI transports.
 *
 * @typeParam TInput  - Zod schema for the endpoint input.
 * @typeParam TOutput - Zod schema for the endpoint output.
 * @typeParam TCtx    - Optional user-provided context type.
 * @param definition - The endpoint definition.
 * @returns The same definition, typed for downstream consumption.
 *
 * @example
 * ```typescript
 * const greet = makeEndpoint({
 *   name: 'greet',
 *   summary: 'Greet a user',
 *   input: z.object({ name: z.string() }),
 *   output: z.object({ greeting: z.string() }),
 *   handler: async ({ input }) => ({ greeting: `Hello, ${input.name}!` }),
 * });
 * ```
 */
export const makeEndpoint = <
  TInput extends ZodTypeAny,
  TOutput extends ZodTypeAny,
  TCtx = undefined,
>(
  definition: EndpointDefinition<TInput, TOutput, TCtx>
): EndpointDefinition<TInput, TOutput, TCtx> => definition;

