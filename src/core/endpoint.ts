import { z, ZodTypeAny } from 'zod';

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

export interface EndpointDefinition<TInput extends ZodTypeAny, TOutput extends ZodTypeAny> {
  name: string;
  summary: string;
  description?: string;
  input: TInput;
  output: TOutput;
  handler: EndpointHandler<TInput, TOutput>;
}

export type AnyEndpointDefinition = EndpointDefinition<ZodTypeAny, ZodTypeAny>;

export const makeEndpoint = <TInput extends ZodTypeAny, TOutput extends ZodTypeAny>(
  definition: EndpointDefinition<TInput, TOutput>
): EndpointDefinition<TInput, TOutput> => definition;
