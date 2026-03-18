import { FastMCP } from 'fastmcp';
import type { EndpointRegistry } from '../../domain/registry.js';
import type { ServerConfig } from '../../config/index.js';
import { toRivetBenchError } from '../../domain/errors.js';
import type { LoggerPort } from '../../ports/logger.js';
import type { TransportPort } from '../../ports/transport.js';

/**
 * Options for {@link registerMcpTools}.
 */
export interface McpPluginOptions {
  /** TransportPort driving interface (invoke + list). */
  transport: TransportPort;
  /** Endpoint registry for listing endpoints and subscribing to changes. */
  registry: EndpointRegistry;
}

/**
 * Register all RivetBench endpoints as MCP tools on an existing FastMCP instance.
 *
 * This is the primary adapter entry point per ADR-0005: it does NOT own server
 * lifecycle — it only registers tools on the FastMCP instance it receives.
 *
 * @param mcp     - An existing FastMCP instance to register tools on.
 * @param options - Plugin configuration.
 * @returns An unsubscribe function for the tools-changed listener.
 *
 * @example
 * ```typescript
 * const mcp = new FastMCP({ name: 'my-app', version: '1.0.0' });
 * const unsub = registerMcpTools(mcp, { transport, registry });
 * // later…
 * unsub();
 * ```
 */
export function registerMcpTools(
  mcp: FastMCP,
  options: McpPluginOptions,
): () => void {
  const { transport, registry } = options;
  const endpoints = registry.list();

  for (const endpoint of endpoints) {
    mcp.addTool({
      name: endpoint.name,
      description: endpoint.description || endpoint.summary,
      parameters: endpoint.input as never, // Zod schemas are compatible with StandardSchemaV1
      execute: async (_args, context) => {
        // Wrap FastMCP's context.log as a LoggerPort (writes to stderr)
        const mcpLogger: LoggerPort = {
          info: (msg, ctx) => context.log.info(msg, ctx as Record<string, string>),
          warn: (msg, ctx) => context.log.warn(msg, ctx as Record<string, string>),
          error: (msg, ctx) => context.log.error(msg, ctx as Record<string, string>),
          child: () => mcpLogger,
        };

        try {
          const result = await transport.invoke(endpoint.name, _args);

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(result.output, null, 2),
              },
            ],
          };
        } catch (error) {
          const rivetError = toRivetBenchError(error);

          mcpLogger.error('Tool execution failed', {
            tool: endpoint.name,
            errorCode: rivetError.code,
            errorMessage: rivetError.message,
          });

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(rivetError.toJSON(), null, 2),
              },
            ],
            isError: true,
          };
        }
      },
    });
  }

  // Subscribe to tool-list changes and forward as MCP notifications.
  const unsubscribe = registry.onToolsChanged(() => {
    for (const session of mcp.sessions) {
      session.server.sendToolListChanged().catch((err: unknown) => {
        // Best-effort: session may have disconnected.
        // eslint-disable-next-line no-console
        console.error('Failed to send tools/list_changed notification', err);
      });
    }
  });

  return unsubscribe;
}

export interface McpServerOptions {
  registry: EndpointRegistry;
  config: ServerConfig;
  /** Optional TransportPort override. When omitted, built automatically. */
  transport?: TransportPort;
}

/**
 * Lifecycle handle returned by {@link createMcpServer}.
 * Provides explicit `start()` / `stop()` control over the MCP server.
 *
 * @example
 * ```typescript
 * const mcp = createMcpServer({ registry, config, transport });
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
 * @param options - Registry, config, and optional transport port.
 * @returns A {@link McpServerHandle} with `start()` and `stop()` methods.
 *
 * @example
 * ```typescript
 * const handle = createMcpServer({ registry, config, transport });
 * await handle.start();
 * // later…
 * await handle.stop();
 * ```
 */
export const createMcpServer = ({ registry, config, transport }: McpServerOptions): McpServerHandle => {
  const mcp = new FastMCP({
    name: config.application.name,
    version: config.application.version as `${number}.${number}.${number}`,
    instructions: config.application.description,
  });

  // When no TransportPort is provided, build one from the application services.
  let resolvedTransport = transport;
  let unsubscribeToolsChanged: (() => void) | undefined;

  const start = async (): Promise<void> => {
    if (!resolvedTransport) {
      const { createTransportPort } = await import('../../application/create-transport-port.js');
      const { createPinoLoggerPort, createLogger } = await import('../pino/logger.js');
      const pinoLogger = createLogger(config);
      resolvedTransport = createTransportPort(registry, createPinoLoggerPort(pinoLogger));
    }

    unsubscribeToolsChanged = registerMcpTools(mcp, {
      transport: resolvedTransport,
      registry,
    });

    const transportType = config.mcp.transport === 'stdio' ? 'stdio' : 'httpStream';

    await mcp.start({
      transportType,
      ...(config.mcp.transport === 'tcp' && config.mcp.port ? {
        httpStream: {
          port: config.mcp.port,
          host: '0.0.0.0',
        },
      } : {}),
    });

    // eslint-disable-next-line no-console
    console.error(`MCP server started with ${transportType} transport`);
    // eslint-disable-next-line no-console
    console.error(`Exposed tools: ${registry.list().map(e => e.name).join(', ')}`);
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
 * @param options - Registry, config, and optional transport port.
 * @returns The running {@link McpServerHandle}.
 *
 * @example
 * ```typescript
 * const handle = await startMcpServer({ registry, config, transport });
 * ```
 */
export const startMcpServer = async (options: McpServerOptions): Promise<McpServerHandle> => {
  const handle = createMcpServer(options);
  await handle.start();
  return handle;
};
