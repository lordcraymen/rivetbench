import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { makeEndpoint } from '../../src/core/endpoint.js';

describe('makeEndpoint', () => {
  it('should create an endpoint definition with correct properties', () => {
    const TestInput = z.object({ value: z.string() });
    const TestOutput = z.object({ result: z.string() });
    
    const endpoint = makeEndpoint({
      name: 'test',
      summary: 'Test endpoint',
      description: 'A test endpoint',
      input: TestInput,
      output: TestOutput,
      handler: async ({ input }) => ({ result: input.value })
    });
    
    expect(endpoint.name).toBe('test');
    expect(endpoint.summary).toBe('Test endpoint');
    expect(endpoint.description).toBe('A test endpoint');
    expect(endpoint.input).toBe(TestInput);
    expect(endpoint.output).toBe(TestOutput);
    expect(endpoint.handler).toBeInstanceOf(Function);
  });
  
  it('should create a handler that can be invoked', async () => {
    const TestInput = z.object({ message: z.string() });
    const TestOutput = z.object({ echoed: z.string() });
    
    const endpoint = makeEndpoint({
      name: 'echo',
      summary: 'Echo endpoint',
      input: TestInput,
      output: TestOutput,
      handler: async ({ input }) => ({ echoed: input.message })
    });
    
    const result = await endpoint.handler({
      input: { message: 'hello' },
      config: {}
    });
    
    expect(result).toEqual({ echoed: 'hello' });
  });
});
