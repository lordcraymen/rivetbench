import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { listEndpoints } from '../../src/application/list-endpoints.js';
import { InMemoryEndpointRegistry } from '../../src/domain/registry.js';
import { makeEndpoint } from '../../src/domain/endpoint.js';

const echoEndpoint = makeEndpoint({
  name: 'echo',
  summary: 'Echo a message',
  description: 'Returns the message',
  input: z.object({ message: z.string() }),
  output: z.object({ echoed: z.string() }),
  handler: async ({ input }) => ({ echoed: input.message }),
});

const uppercaseEndpoint = makeEndpoint({
  name: 'uppercase',
  summary: 'Uppercase text',
  input: z.object({ text: z.string() }),
  output: z.object({ result: z.string() }),
  handler: async ({ input }) => ({ result: input.text.toUpperCase() }),
});

describe('listEndpoints', () => {
  it('should return endpoint summaries', () => {
    const registry = new InMemoryEndpointRegistry();
    registry.register(echoEndpoint);
    registry.register(uppercaseEndpoint);

    const result = listEndpoints(registry, { transportType: 'rest' });

    expect(result).toEqual([
      { name: 'echo', summary: 'Echo a message', description: 'Returns the message' },
      { name: 'uppercase', summary: 'Uppercase text', description: undefined },
    ]);
  });

  it('should return empty array when no endpoints registered', () => {
    const registry = new InMemoryEndpointRegistry();
    const result = listEndpoints(registry, { transportType: 'cli' });

    expect(result).toEqual([]);
  });

  it('should apply enricher when set', () => {
    const registry = new InMemoryEndpointRegistry();
    registry.register(echoEndpoint);
    registry.register(uppercaseEndpoint);
    registry.setToolEnricher((tools, ctx) =>
      ctx.transportType === 'mcp' ? tools.filter(t => t.name === 'echo') : tools,
    );

    const mcpResult = listEndpoints(registry, { transportType: 'mcp' });
    expect(mcpResult).toHaveLength(1);
    expect(mcpResult[0].name).toBe('echo');

    const restResult = listEndpoints(registry, { transportType: 'rest' });
    expect(restResult).toHaveLength(2);
  });
});
