import { z } from 'zod';
import { makeEndpoint } from '../core/endpoint.js';

const EchoInput = z.object({
  message: z.string().min(1, 'Message cannot be empty')
});

const EchoOutput = z.object({
  echoed: z.string()
});

export const echoEndpoint = makeEndpoint({
  name: 'echo',
  summary: 'Echo a message back to the caller',
  description: 'Takes a message string and returns it in the echoed field. Useful for testing the RPC workflow.',
  input: EchoInput,
  output: EchoOutput,
  handler: async ({ input }) => {
    return { echoed: input.message };
  }
});
