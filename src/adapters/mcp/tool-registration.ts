import { McpServer, type RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AnyEndpointDefinition } from '../../domain/endpoint.js';
import type { EndpointRegistry, ToolEnricherContext } from '../../domain/registry.js';
import { InternalServerError, toRivetBenchError } from '../../domain/errors.js';
import type { LoggerPort } from '../../ports/logger.js';
import type { TransportPort } from '../../ports/transport.js';
import { objectSchemaForMcp } from './flatten-for-mcp.js';

export interface McpToolRegistrationOptions {
  transport: TransportPort;
  registry: EndpointRegistry;
  logger: LoggerPort;
  context: ToolEnricherContext;
}

export interface McpToolRegistration {
  sync(): void;
  clear(): void;
}

/**
 * Register and synchronize registry endpoints on one MCP server session.
 *
 * @example
 * ```typescript
 * const registration = createMcpToolRegistration(server, options);
 * registry.signalToolsChanged();
 * registration.sync();
 * ```
 */
export function createMcpToolRegistration(
  server: McpServer,
  options: McpToolRegistrationOptions,
): McpToolRegistration {
  const registered = new Map<string, RegisteredTool>();

  const clear = (): void => {
    for (const tool of registered.values()) tool.remove();
    registered.clear();
  };

  const sync = (): void => {
    clear();
    const endpoints = options.registry.listEnriched(options.context);
    for (const endpoint of endpoints) {
      registered.set(endpoint.name, registerEndpoint(server, endpoint, options));
    }
  };

  sync();
  return { sync, clear };
}

function registerEndpoint(
  server: McpServer,
  endpoint: AnyEndpointDefinition,
  options: McpToolRegistrationOptions,
): RegisteredTool {
  const inputSchema = objectSchemaForMcp(endpoint.input) as typeof endpoint.input | undefined;
  const outputSchema = objectSchemaForMcp(endpoint.output) as typeof endpoint.output | undefined;
  const description = endpoint.description || endpoint.summary;
  const callback = createToolCallback(endpoint, outputSchema !== undefined, options);

  if (outputSchema) {
    return server.registerTool(
      endpoint.name,
      { description, inputSchema, outputSchema },
      callback,
    );
  }
  return server.registerTool(endpoint.name, { description, inputSchema }, callback);
}

function createToolCallback(
  endpoint: AnyEndpointDefinition,
  hasOutputSchema: boolean,
  options: McpToolRegistrationOptions,
) {
  return async (args: Record<string, unknown>) => {
    try {
      const result = await options.transport.invoke(endpoint.name, args);
      const content = [{ type: 'text' as const, text: JSON.stringify(result.output, null, 2) }];
      if (!hasOutputSchema) return { content };
      if (!isRecord(result.output)) {
        throw new InternalServerError('Structured MCP output must be an object.');
      }
      return { content, structuredContent: result.output };
    } catch (error) {
      return toolError(endpoint.name, error, options.logger);
    }
  };
}

function toolError(tool: string, error: unknown, logger: LoggerPort) {
  const rivetError = toRivetBenchError(error);
  logger.error('MCP tool execution failed', { tool, errorCode: rivetError.code });
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(rivetError.toJSON(), null, 2) }],
    isError: true as const,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
