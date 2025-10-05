import { FastMCP } from 'fastmcp';
import { EndpointRegistry } from '../core/registry.js';
import type { ServerConfig } from '../config/index.js';
import { ValidationError, toRivetBenchError } from '../core/errors.js';

export interface McpServerOptions {
  registry: EndpointRegistry;
  config: ServerConfig;
}

export const startMcpServer = async ({ registry, config }: McpServerOptions) => {
  
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
          const parsedInput = endpoint.input.safeParse(args);
          
          if (!parsedInput.success) {
            throw new ValidationError('Invalid tool input', {
              tool: endpoint.name,
              issues: parsedInput.error.format()
            });
          }
          
          // Execute the endpoint handler
          const result = await endpoint.handler({
            input: parsedInput.data,
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
          // Convert to RivetBench error for consistent handling
          const rivetError = toRivetBenchError(error);
          
          // Log error using FastMCP's logger (writes to stderr)
          context.log.error('Tool execution failed', {
            tool: endpoint.name,
            errorCode: rivetError.code,
            errorMessage: rivetError.message
          } as Record<string, string>);
          
          // Return structured error response
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(rivetError.toJSON(), null, 2)
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
  console.error(`MCP server started with ${transportType} transport`);
  // eslint-disable-next-line no-console
  console.error(`Exposed tools: ${endpoints.map(e => e.name).join(', ')}`);

  return mcp;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  import('../config/index.js').then(async ({ loadConfig }) => {
    const config = loadConfig();
    const { createDefaultRegistry } = await import('../endpoints/index.js');
    const registry = createDefaultRegistry();
    await startMcpServer({ registry, config });
  }).catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to start MCP server', error);
    process.exit(1);
  });
}
