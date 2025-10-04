import { FastMCP } from 'fastmcp';
import { EndpointRegistry } from '../core/registry.js';
import { loadConfig } from '../config/index.js';

export interface McpServerOptions {
  registry: EndpointRegistry;
}

export const startMcpServer = async ({ registry }: McpServerOptions) => {
  const config = loadConfig();
  
  // Create FastMCP server instance
  const mcp = new FastMCP({
    name: config.application.name,
    version: config.application.version as `${number}.${number}.${number}`,
    instructions: config.application.description
  });

  // Register each endpoint as an MCP tool
  const endpoints = registry.list();
  
  for (const endpoint of endpoints) {
    mcp.addTool({
      name: endpoint.name,
      description: endpoint.description || endpoint.summary,
      parameters: endpoint.input as never, // Zod schemas are compatible with StandardSchemaV1
      execute: async (args, context) => {
        try {
          // Validate and parse input using Zod schema
          const parsedInput = endpoint.input.parse(args);
          
          // Execute the endpoint handler
          const result = await endpoint.handler({
            input: parsedInput,
            config: {}
          });
          
          // Validate output
          const validatedOutput = endpoint.output.parse(result);
          
          // Return as text content with formatted JSON
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(validatedOutput, null, 2)
              }
            ]
          };
        } catch (error) {
          // Log error details
          context.log.error('Tool execution failed', {
            tool: endpoint.name,
            error: error instanceof Error ? error.message : String(error)
          } as Record<string, string>);
          
          // Return error as text content
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  error: error instanceof Error ? error.message : String(error)
                }, null, 2)
              }
            ],
            isError: true
          };
        }
      }
    });
  }

  // Start the MCP server with appropriate transport
  const transportType = config.mcp.transport === 'stdio' ? 'stdio' : 'httpStream';
  
  await mcp.start({
    transportType,
    ...(config.mcp.transport === 'tcp' && config.mcp.port ? {
      httpStream: {
        port: config.mcp.port,
        host: '0.0.0.0'
      }
    } : {})
  });

  // eslint-disable-next-line no-console
  console.info(`MCP server started with ${transportType} transport`);
  // eslint-disable-next-line no-console
  console.info(`Exposed tools: ${endpoints.map(e => e.name).join(', ')}`);
  
  return mcp;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  import('../endpoints/index.js').then(async ({ createDefaultRegistry }) => {
    const registry = createDefaultRegistry();
    await startMcpServer({ registry });
  }).catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to start MCP server', error);
    process.exit(1);
  });
}
