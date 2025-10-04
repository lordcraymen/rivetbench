import { EndpointRegistry } from '../core/registry.js';

export interface McpServerOptions {
  registry: EndpointRegistry;
}

export const startMcpServer = async ({ registry }: McpServerOptions) => {
  // Placeholder implementation until the actual MCP server wiring is connected.
  if (registry.list().length > 0) {
    // eslint-disable-next-line no-console
    console.info('MCP server stub would expose tools:', registry.list().map((endpoint) => endpoint.name));
  }

  throw new Error('MCP server bootstrap not yet implemented.');
};

if (import.meta.url === `file://${process.argv[1]}`) {
  startMcpServer({ registry: { list: () => [], get: () => undefined, register: () => {} } }).catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to start MCP server', error);
    process.exit(1);
  });
}
