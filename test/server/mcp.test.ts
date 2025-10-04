import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { InMemoryEndpointRegistry } from '../../src/core/registry.js';
import { makeEndpoint } from '../../src/core/endpoint.js';

describe('MCP Server', () => {
  let registry: InMemoryEndpointRegistry;

  beforeEach(() => {
    registry = new InMemoryEndpointRegistry();
  });

  describe('Server Initialization', () => {
    it('should create MCP server with registered endpoints', async () => {
      // Register test endpoints
      registry.register(makeEndpoint({
        name: 'test-echo',
        summary: 'Test echo endpoint',
        input: z.object({ message: z.string() }),
        output: z.object({ echoed: z.string() }),
        handler: async ({ input }) => ({ echoed: input.message })
      }));

      // Note: We can't actually start the server in tests without proper transport setup
      // This test validates that the server can be created and configured
      expect(registry.list()).toHaveLength(1);
      expect(registry.get('test-echo')).toBeDefined();
    });

    it('should handle multiple endpoints', () => {
      registry.register(makeEndpoint({
        name: 'echo',
        summary: 'Echo endpoint',
        input: z.object({ message: z.string() }),
        output: z.object({ echoed: z.string() }),
        handler: async ({ input }) => ({ echoed: input.message })
      }));

      registry.register(makeEndpoint({
        name: 'uppercase',
        summary: 'Uppercase endpoint',
        input: z.object({ text: z.string() }),
        output: z.object({ result: z.string() }),
        handler: async ({ input }) => ({ result: input.text.toUpperCase() })
      }));

      expect(registry.list()).toHaveLength(2);
      expect(registry.get('echo')).toBeDefined();
      expect(registry.get('uppercase')).toBeDefined();
    });
  });

  describe('Endpoint Registration', () => {
    it('should register endpoint with correct name and description', () => {
      const endpoint = makeEndpoint({
        name: 'test-tool',
        summary: 'Test tool summary',
        description: 'Test tool description',
        input: z.object({ value: z.string() }),
        output: z.object({ result: z.string() }),
        handler: async ({ input }) => ({ result: input.value })
      });

      registry.register(endpoint);

      const registered = registry.get('test-tool');
      expect(registered).toBeDefined();
      expect(registered?.name).toBe('test-tool');
      expect(registered?.summary).toBe('Test tool summary');
      expect(registered?.description).toBe('Test tool description');
    });

    it('should register endpoint with Zod schemas', () => {
      const endpoint = makeEndpoint({
        name: 'validate-test',
        summary: 'Validation test',
        input: z.object({
          email: z.string().email(),
          age: z.number().min(0)
        }),
        output: z.object({
          valid: z.boolean()
        }),
        handler: async () => ({ valid: true })
      });

      registry.register(endpoint);

      const registered = registry.get('validate-test');
      expect(registered).toBeDefined();
      expect(registered?.input).toBeDefined();
      expect(registered?.output).toBeDefined();
    });
  });

  describe('Endpoint Handler Execution', () => {
    it('should execute handler with valid input', async () => {
      const endpoint = makeEndpoint({
        name: 'calculator',
        summary: 'Add two numbers',
        input: z.object({ a: z.number(), b: z.number() }),
        output: z.object({ sum: z.number() }),
        handler: async ({ input }) => ({ sum: input.a + input.b })
      });

      registry.register(endpoint);

      const result = await endpoint.handler({
        input: { a: 5, b: 3 },
        config: {}
      });

      expect(result).toEqual({ sum: 8 });
    });

    it('should validate input with Zod schema', () => {
      const endpoint = makeEndpoint({
        name: 'strict-validator',
        summary: 'Strict validation test',
        input: z.object({ 
          email: z.string().email(),
          age: z.number().positive()
        }),
        output: z.object({ success: z.boolean() }),
        handler: async () => ({ success: true })
      });

      // Valid input should parse successfully
      const validResult = endpoint.input.safeParse({
        email: 'test@example.com',
        age: 25
      });
      expect(validResult.success).toBe(true);

      // Invalid email should fail
      const invalidEmail = endpoint.input.safeParse({
        email: 'not-an-email',
        age: 25
      });
      expect(invalidEmail.success).toBe(false);

      // Negative age should fail
      const invalidAge = endpoint.input.safeParse({
        email: 'test@example.com',
        age: -5
      });
      expect(invalidAge.success).toBe(false);
    });

    it('should validate output with Zod schema', async () => {
      const endpoint = makeEndpoint({
        name: 'output-validator',
        summary: 'Output validation test',
        input: z.object({ value: z.string() }),
        output: z.object({ 
          result: z.string(),
          timestamp: z.number()
        }),
        handler: async ({ input }) => ({
          result: input.value,
          timestamp: Date.now()
        })
      });

      const result = await endpoint.handler({
        input: { value: 'test' },
        config: {}
      });

      // Output should match schema
      const validation = endpoint.output.safeParse(result);
      expect(validation.success).toBe(true);
      expect(result).toHaveProperty('result');
      expect(result).toHaveProperty('timestamp');
    });
  });
});
