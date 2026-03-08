import { FastMCP } from 'fastmcp';
import { EndpointRegistry } from '../core/registry.js';
import type { ServerConfig } from '../config/index.js';
import { ValidationError, toRivetBenchError } from '../core/errors.js';

export interface McpServerOptions {
  registry: EndpointRegistry;
  config: ServerConfig;
}

/**
 * Lifecycle handle returned by {@link createMcpServer}.
 * Provides explicit `start()` / `stop()` control over the MCP server.
 *
 * @example
 * ```typescript
 * const mcp = createMcpServer({ registry, config });
 * await mcp.start();
 * // … later
 * await mcp.stop();
 * ```
 */
export interface McpServerHandle {
  /** Start listening on the configured transport. */
  start(): Promise<void>;
  /** Gracefully shut down the MCP server and unsubscribe change listeners. */
  stop(): Promise<void>;
  /** The underlying FastMCP instance (for advanced use). */
  readonly server: FastMCP;
}

/**
 * Create an MCP server **without** starting it.
 *
 * This is the recommended entry point when you need lifecycle control
 * (e.g. graceful shutdown, testing, restart). Call {@link McpServerHandle.start}
 * to begin listening.
 *
 * @param options - Registry and server configuration.
 * @returns A {@link McpServerHandle} with `start()` and `stop()` methods.
 *
 * @example
 * ```typescript
 * const handle = createMcpServer({ registry, config });
 * await handle.start();
 * // later…
 * await handle.stop();
 * ```
 */
export const createMcpServer = ({ registry, config }: McpServerOptions): McpServerHandle => {
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
        const requestId = crypto.randomUUID();

        try {
          const parsedInput = endpoint.input.safeParse(args);

          if (!parsedInput.success) {
            throw new ValidationError('Invalid tool input', {
              tool: endpoint.name,
              issues: parsedInput.error.format()
            });
          }

          const result = await endpoint.handler({
            input: parsedInput.data,
            config: { requestId },
            ctx: registry.createContext(),
          });

          const validatedOutput = endpoint.output.parse(result);

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(validatedOutput, null, 2)
              }
            ]
          };
        } catch (error) {
          const rivetError = toRivetBenchError(error);

          context.log.error('Tool execution failed', {
            tool: endpoint.name,
            requestId,
            errorCode: rivetError.code,
            errorMessage: rivetError.message
          } as Record<string, string>);

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

  let unsubscribeToolsChanged: (() => void) | undefined;

  const start = async (): Promise<void> => {
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

    // Subscribe to tool-list changes and forward as MCP notifications.
    unsubscribeToolsChanged = registry.onToolsChanged(() => {
      for (const session of mcp.sessions) {
        session.server.sendToolListChanged().catch((err: unknown) => {
          // Best-effort: session may have disconnected.
          // eslint-disable-next-line no-console
          console.error('Failed to send tools/list_changed notification', err);
        });
      }
    });

    // eslint-disable-next-line no-console
    console.error(`MCP server started with ${transportType} transport`);
    // eslint-disable-next-line no-console
    console.error(`Exposed tools: ${endpoints.map(e => e.name).join(', ')}`);
  };

  const stop = async (): Promise<void> => {
    if (unsubscribeToolsChanged) {
      unsubscribeToolsChanged();
      unsubscribeToolsChanged = undefined;
    }
    await mcp.stop();
  };

  return { start, stop, server: mcp };
};

/**
 * Convenience wrapper: creates **and starts** an MCP server in one call.
 *
 * Equivalent to:
 * ```ts
 * const handle = createMcpServer(opts);
 * await handle.start();
 * return handle;
 * ```
 *
 * @param options - Registry and server configuration.
 * @returns The running {@link McpServerHandle}.
 */
export const startMcpServer = async (options: McpServerOptions): Promise<McpServerHandle> => {
  const handle = createMcpServer(options);
  await handle.start();
  return handle;
};

// Start MCP server when this file is run directly
async function startServer() {
  const { loadConfig } = await import('../config/index.js');
  const config = loadConfig();
  const { createDefaultRegistry } = await import('../endpoints/index.js');
  const registry = createDefaultRegistry();
  await startMcpServer({ registry, config });
}

// Simple check: if this file is being run directly (not imported)
// We check if the process argv includes this file name
const isMainModule = process.argv.some(arg => 
  arg.includes('mcp.ts') || arg.includes('mcp.js')
);

if (isMainModule) {
  startServer().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to start MCP server', error);
    process.exit(1);
  });
}
