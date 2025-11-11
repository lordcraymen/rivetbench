import { z } from 'zod';
import { makeEndpoint } from '../core/endpoint.js';

const UppercaseInput = z.object({
  text: z.string()
});

const UppercaseOutput = z.object({
  result: z.string()
});

export const uppercaseEndpoint = makeEndpoint({
  name: 'uppercase',
  summary: 'Convert text to uppercase',
  description: 'Takes a text string and returns it in uppercase. Perfect for testing raw output mode.',
  input: UppercaseInput,
  output: UppercaseOutput,
  handler: async ({ input }) => {
    return { result: input.text.toUpperCase() };
  }
});