import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { invokeEndpoint } from '../../src/application/invoke-endpoint.js';
import { InMemoryEndpointRegistry } from '../../src/domain/registry.js';
import { makeEndpoint } from '../../src/domain/endpoint.js';
import { EndpointNotFoundError, ValidationError } from '../../src/domain/errors.js';
import type { LoggerPort } from '../../src/ports/logger.js';

const noopLogger: LoggerPort = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn().mockReturnThis(),
};

const echoEndpoint = makeEndpoint({
  name: 'echo',
  summary: 'Echo a message',
  input: z.object({ message: z.string().min(1) }),
  output: z.object({ echoed: z.string() }),
  handler: async ({ input }) => ({ echoed: input.message }),
});

function createTestRegistry() {
  const registry = new InMemoryEndpointRegistry();
  registry.register(echoEndpoint);
  return registry;
}

describe('invokeEndpoint', () => {
  it('should invoke an endpoint and return validated output', async () => {
    const registry = createTestRegistry();
    const result = await invokeEndpoint(registry, 'echo', { message: 'hello' }, noopLogger);

    expect(result.output).toEqual({ echoed: 'hello' });
    expect(result.requestId).toBeDefined();
    expect(typeof result.requestId).toBe('string');
  });

  it('should use a provided requestId when given', async () => {
    const registry = createTestRegistry();
    const result = await invokeEndpoint(
      registry, 'echo', { message: 'test' }, noopLogger,
      { requestId: 'custom-id-123' },
    );

    expect(result.requestId).toBe('custom-id-123');
  });

  it('should generate a UUID requestId when none provided', async () => {
    const registry = createTestRegistry();
    const result = await invokeEndpoint(registry, 'echo', { message: 'test' }, noopLogger);

    expect(result.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('should throw EndpointNotFoundError for unknown endpoints', async () => {
    const registry = createTestRegistry();

    await expect(
      invokeEndpoint(registry, 'nonexistent', {}, noopLogger),
    ).rejects.toThrow(EndpointNotFoundError);
  });

  it('should throw ValidationError for invalid input', async () => {
    const registry = createTestRegistry();

    await expect(
      invokeEndpoint(registry, 'echo', { message: '' }, noopLogger),
    ).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError when input is missing required fields', async () => {
    const registry = createTestRegistry();

    await expect(
      invokeEndpoint(registry, 'echo', {}, noopLogger),
    ).rejects.toThrow(ValidationError);
  });

  it('should log endpoint invocation', async () => {
    const logger: LoggerPort = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnThis(),
    };
    const registry = createTestRegistry();

    await invokeEndpoint(registry, 'echo', { message: 'hi' }, logger);

    expect(logger.info).toHaveBeenCalledWith(
      'Invoking endpoint',
      expect.objectContaining({ endpoint: 'echo' }),
    );
  });

  it('should pass registry context to handler', async () => {
    const registry = new InMemoryEndpointRegistry();
    const ctxValue = { db: 'mock-db' };
    registry.setContextFactory(() => ctxValue);

    const contextCapture = makeEndpoint({
      name: 'ctx-test',
      summary: 'Capture context',
      input: z.object({}),
      output: z.object({ ctx: z.unknown() }),
      handler: async ({ ctx }) => ({ ctx }),
    });
    registry.register(contextCapture);

    const result = await invokeEndpoint(registry, 'ctx-test', {}, noopLogger);

    expect(result.output).toEqual({ ctx: ctxValue });
  });
});
