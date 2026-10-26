import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import { z as foreignZod } from 'zod-foreign/v3';
import { createTransportPort } from '../../application/create-transport-port.js';
import { noopLoggerPort } from '../../__test-helpers__/test-logger.js';
import { makeEndpoint } from '../../domain/endpoint.js';
import { InMemoryEndpointRegistry } from '../../domain/registry.js';
import { createMcpToolRegistration, type McpToolRegistration } from './tool-registration.js';

describe('MCP tool registration', () => {
  let registry: InMemoryEndpointRegistry;
  let server: McpServer;
  let client: Client;
  let registration: McpToolRegistration;

  beforeEach(async () => {
    registry = new InMemoryEndpointRegistry();
    registry.register(makeEndpoint({
      name: 'operate',
      summary: 'Operate on a value',
      description: 'Original description',
      input: foreignZod.discriminatedUnion('kind', [
        foreignZod.object({ kind: foreignZod.literal('echo'), value: foreignZod.string() }),
        foreignZod.object({ kind: foreignZod.literal('count'), value: foreignZod.number() }),
      ]),
      output: foreignZod.object({
        result: foreignZod.union([foreignZod.string(), foreignZod.number()]),
      }),
      handler: async ({ input }) => ({ result: input.value }),
    }));

    server = new McpServer({ name: 'test-server', version: '1.0.0' });
    registration = createMcpToolRegistration(server, {
      registry,
      transport: createTransportPort(registry, noopLoggerPort),
      logger: noopLoggerPort,
      context: { transportType: 'mcp', sessionId: 'test-session' },
    });
    client = new Client({ name: 'test-client', version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  });

  afterEach(async () => {
    registration.clear();
    await client.close();
    await server.close();
  });

  it('publishes cross-installation union fields through tools/list', async () => {
    const result = await client.listTools();
    const properties = result.tools[0].inputSchema.properties ?? {};
    expect(Object.keys(properties).sort()).toEqual(['kind', 'value']);
  });

  it('publishes the discriminator enum through tools/list', async () => {
    const result = await client.listTools();
    const properties = result.tools[0].inputSchema.properties as Record<string, { enum?: string[] }>;
    expect(properties.kind.enum).toEqual(['echo', 'count']);
  });

  it('publishes the endpoint output schema through tools/list', async () => {
    const result = await client.listTools();
    const properties = result.tools[0].outputSchema?.properties ?? {};
    expect(Object.keys(properties)).toEqual(['result']);
  });

  it('returns structured content and a text fallback', async () => {
    const result = await client.callTool({
      name: 'operate',
      arguments: { kind: 'echo', value: 'hello' },
    });
    expect(result).toMatchObject({
      structuredContent: { result: 'hello' },
      content: [{ type: 'text', text: '{\n  "result": "hello"\n}' }],
    });
  });

  it('keeps original endpoint validation authoritative', async () => {
    const result = await client.callTool({ name: 'operate', arguments: { kind: 'echo' } });
    expect(result.isError).toBe(true);
  });

  it('applies MCP tool enrichment', async () => {
    registry.setToolEnricher((tools) => tools.map(tool => ({
      ...tool,
      description: 'Enriched description',
    })));
    registration.sync();

    const result = await client.listTools();
    expect(result.tools[0].description).toBe('Enriched description');
  });

  it('synchronizes filtered tool availability', async () => {
    registry.setToolEnricher(() => []);
    registration.sync();

    const result = await client.listTools();
    expect(result.tools).toEqual([]);
  });

  it('keeps primitive outputs text-only', async () => {
    registry.register(makeEndpoint({
      name: 'primitive',
      summary: 'Return a primitive',
      input: z.object({}),
      output: z.string(),
      handler: async () => 'plain text',
    }));
    registration.sync();

    const result = await client.callTool({ name: 'primitive', arguments: {} });
    expect(result).toMatchObject({
      content: [{ type: 'text', text: '"plain text"' }],
    });
  });

  it('omits outputSchema for primitive outputs', async () => {
    registry.register(makeEndpoint({
      name: 'primitive',
      summary: 'Return a primitive',
      input: z.object({}),
      output: z.string(),
      handler: async () => 'plain text',
    }));
    registration.sync();

    const result = await client.listTools();
    const primitive = result.tools.find(tool => tool.name === 'primitive');
    expect(primitive?.outputSchema).toBeUndefined();
  });
});
