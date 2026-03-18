import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { makeEndpoint } from '../../src/domain/endpoint.js';

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
      config: {},
      ctx: undefined,
    });
    
    expect(result).toEqual({ echoed: 'hello' });
  });

  it('should support a typed custom context via the ctx parameter', async () => {
    interface AppCtx { greetPrefix: string }

    const Input = z.object({ name: z.string() });
    const Output = z.object({ greeting: z.string() });

    const endpoint = makeEndpoint<typeof Input, typeof Output, AppCtx>({
      name: 'greet',
      summary: 'Greet with prefix',
      input: Input,
      output: Output,
      handler: async ({ input, ctx }) => ({
        greeting: `${ctx.greetPrefix} ${input.name}`,
      }),
    });

    const result = await endpoint.handler({
      input: { name: 'World' },
      config: {},
      ctx: { greetPrefix: 'Hello,' },
    });

    expect(result).toEqual({ greeting: 'Hello, World' });
  });

  it('should default ctx to undefined for backward compatibility', async () => {
    const Input = z.object({});
    const Output = z.object({ ok: z.boolean() });

    const endpoint = makeEndpoint({
      name: 'compat',
      summary: 'Backward compatible',
      input: Input,
      output: Output,
      handler: async ({ ctx }) => {
        // ctx should be undefined when no custom context is provided
        return { ok: ctx === undefined };
      },
    });

    const result = await endpoint.handler({
      input: {},
      config: {},
      ctx: undefined,
    });

    expect(result).toEqual({ ok: true });
  });

  describe('name validation warning', () => {
    it('should not warn for recommended names', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      makeEndpoint({
        name: 'get-user',
        summary: 'Get user',
        input: z.object({}),
        output: z.object({}),
        handler: async () => ({}),
      });

      makeEndpoint({
        name: 'send_email',
        summary: 'Send email',
        input: z.object({}),
        output: z.object({}),
        handler: async () => ({}),
      });

      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should warn when name contains dots', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      makeEndpoint({
        name: 'graph.getState',
        summary: 'Dotted name',
        input: z.object({}),
        output: z.object({}),
        handler: async () => ({}),
      });

      expect(spy).toHaveBeenCalledOnce();
      expect(spy.mock.calls[0][0]).toContain('graph.getState');
      spy.mockRestore();
    });

    it('should warn when name contains uppercase letters', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      makeEndpoint({
        name: 'GetUser',
        summary: 'Uppercase name',
        input: z.object({}),
        output: z.object({}),
        handler: async () => ({}),
      });

      expect(spy).toHaveBeenCalledOnce();
      expect(spy.mock.calls[0][0]).toContain('GetUser');
      spy.mockRestore();
    });
  });
});
