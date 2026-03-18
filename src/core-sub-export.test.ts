import { describe, it, expect } from 'vitest';

/**
 * Tests for the `@lordcraymen/rivetbench/core` sub-export.
 *
 * Verifies that every symbol advertised in the core barrel file is
 * re-exported correctly and that no transport-heavy modules (Fastify,
 * fastmcp, Pino) are pulled in.
 */
describe('core sub-export', () => {
  it('should re-export makeEndpoint', async () => {
    const core = await import('./core.js');
    expect(core.makeEndpoint).toBeInstanceOf(Function);
  });

  it('should re-export InMemoryEndpointRegistry', async () => {
    const core = await import('./core.js');
    expect(core.InMemoryEndpointRegistry).toBeInstanceOf(Function);

    // Instantiate and exercise basic operations
    const registry = new core.InMemoryEndpointRegistry();
    expect(registry.list()).toEqual([]);
  });

  it('should re-export error classes', async () => {
    const core = await import('./core.js');
    expect(core.RivetBenchError).toBeInstanceOf(Function);
    expect(core.ValidationError).toBeInstanceOf(Function);
    expect(core.EndpointNotFoundError).toBeInstanceOf(Function);
    expect(core.InternalServerError).toBeInstanceOf(Function);
    expect(core.ConfigurationError).toBeInstanceOf(Function);
  });

  it('should re-export error helper functions', async () => {
    const core = await import('./core.js');
    expect(core.isRivetBenchError).toBeInstanceOf(Function);
    expect(core.toRivetBenchError).toBeInstanceOf(Function);

    const err = new core.ValidationError('bad input');
    expect(core.isRivetBenchError(err)).toBe(true);
  });

  it('should NOT export transport or config symbols', async () => {
    const core = await import('./core.js') as Record<string, unknown>;
    expect(core.createRestServer).toBeUndefined();
    expect(core.startMcpServer).toBeUndefined();
    expect(core.loadConfig).toBeUndefined();
    expect(core.createLogger).toBeUndefined();
    expect(core.createCli).toBeUndefined();
  });

  it('should allow creating a full endpoint via the sub-export', async () => {
    const { makeEndpoint, InMemoryEndpointRegistry } = await import('./core.js');
    const { z } = await import('zod');

    const ping = makeEndpoint({
      name: 'ping',
      summary: 'Health check',
      input: z.object({}),
      output: z.object({ pong: z.boolean() }),
      handler: async () => ({ pong: true }),
    });

    const registry = new InMemoryEndpointRegistry();
    registry.register(ping);

    expect(registry.get('ping')).toBe(ping);
    expect(registry.list()).toHaveLength(1);
  });
});
