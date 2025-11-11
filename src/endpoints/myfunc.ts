import { z } from 'zod';
import { makeEndpoint } from '../core/endpoint.js';

const MyFuncInput = z.object({
  text: z.string().min(1, 'Text cannot be empty'),
  number: z.number().min(0, 'Number must be non-negative')
});

const MyFuncOutput = z.object({
  result: z.string(),
  doubled: z.number(),
  inputLength: z.number()
});

export const myFuncEndpoint = makeEndpoint({
  name: 'myfunc',
  summary: 'Demo function that takes text and number parameters',
  description: 'Takes a text string and number, returns processed results. Useful for testing named parameter CLI usage.',
  input: MyFuncInput,
  output: MyFuncOutput,
  handler: async ({ input }) => {
    const { text, number } = input;
    return {
      result: `Processed: ${text}`,
      doubled: number * 2,
      inputLength: text.length
    };
  }
});