import { z, ZodTypeAny } from 'zod';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface EndpointContext<TInput extends ZodTypeAny, TOutput extends ZodTypeAny> {
  input: z.infer<TInput>;
  config: EndpointRuntimeConfig;
}

export type EndpointHandler<TInput extends ZodTypeAny, TOutput extends ZodTypeAny> = (
  ctx: EndpointContext<TInput, TOutput>
) => Promise<z.infer<TOutput>> | z.infer<TOutput>;

export interface EndpointRuntimeConfig {
  requestId?: string;
}

export interface EndpointDefinition<TInput extends ZodTypeAny = ZodTypeAny, TOutput extends ZodTypeAny = ZodTypeAny> {
  name: string;
  summary: string;
  description?: string;
  input: TInput;
  output: TOutput;
  handler: EndpointHandler<TInput, TOutput>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyEndpointDefinition = EndpointDefinition<any, any>;

export const makeEndpoint = <TInput extends ZodTypeAny, TOutput extends ZodTypeAny>(
  definition: EndpointDefinition<TInput, TOutput>
): AnyEndpointDefinition => definition;
