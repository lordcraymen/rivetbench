import { describe, it, expect } from 'vitest';
import { createTransportPort } from './create-transport-port.js';
import { InMemoryEndpointRegistry } from '../domain/registry.js';
import { makeEndpoint } from '../domain/endpoint.js';
import { z } from 'zod';
import { noopLoggerPort } from '../__test-helpers__/test-logger.js';

describe('createTransportPort', () => {
  const registry = new InMemoryEndpointRegistry();
  registry.register(makeEndpoint({
    name: 'echo',
    summary: 'Echo endpoint',
    input: z.object({ message: z.string().min(1) }),
    output: z.object({ echoed: z.string() }),
    handler: async ({ input }) => ({ echoed: input.message }),
  }));

  const transport = createTransportPort(registry, noopLoggerPort);

  it('should invoke an endpoint and return the result', async () => {
    const result = await transport.invoke('echo', { message: 'hello' });

    expect(result.output).toEqual({ echoed: 'hello' });
    expect(result.requestId).toBeDefined();
  });

  it('should forward requestId option', async () => {
    const result = await transport.invoke('echo', { message: 'hi' }, {
      requestId: 'custom-id',
    });

    expect(result.requestId).toBe('custom-id');
  });

  it('should list endpoints', () => {
    const tools = transport.list({ transportType: 'rest' });

    expect(tools).toHaveLength(1);
    expect(tools[0]).toEqual({
      name: 'echo',
      summary: 'Echo endpoint',
      description: undefined,
    });
  });

  it('should throw EndpointNotFoundError for unknown endpoints', async () => {
    await expect(
      transport.invoke('nonexistent', {}),
    ).rejects.toThrow("Endpoint 'nonexistent' not found");
  });

  it('should throw ValidationError for invalid input', async () => {
    await expect(
      transport.invoke('echo', { message: '' }),
    ).rejects.toThrow('Invalid endpoint input');
  });
});
