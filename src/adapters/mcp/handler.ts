/**
 * MCP adapter — Uses `@modelcontextprotocol/sdk` directly with
 * `StreamableHTTPServerTransport` to serve MCP over HTTP.
 *
 * This adapter does NOT own a server or listen on a port.  It exposes a
 * raw Node.js `handleRequest(req, res, body?)` function that can be
 * mounted on any HTTP server (Fastify, Express, plain `http`, …).
 *
 * ADR-0005: Framework-agnostic adapter — no Fastify or Express coupling.
 * ADR-0004: Depends on TransportPort, not on application services directly.
 *
 * @example
 * ```typescript
 * import http from 'node:http';
 * const handler = createMcpHandler({ transport, registry, logger, application });
 * http.createServer((req, res) => handler.handleRequest(req, res)).listen(3001);
 * ```
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { TransportPort } from '../../ports/transport.js';
import type { EndpointRegistry } from '../../domain/registry.js';
import type { LoggerPort } from '../../ports/logger.js';
import { toRivetBenchError } from '../../domain/errors.js';

/**
 * Options for {@link createMcpHandler}.
 */
export interface McpHandlerOptions {
  /** TransportPort driving interface (invoke + list). */
  transport: TransportPort;
  /** Endpoint registry for listing endpoints. */
  registry: EndpointRegistry;
  /** Logger for error reporting. */
  logger: LoggerPort;
  /** Application metadata surfaced in MCP server info. */
  application: { name: string; version: string; description?: string };
}

/**
 * Handle returned by {@link createMcpHandler}.
 */
export interface McpHandler {
  /**
   * Route an incoming HTTP request to the correct MCP session transport.
   *
   * Supports `POST` (JSON-RPC), `GET` (SSE stream), and `DELETE` (session close).
   * The first `POST` without `mcp-session-id` triggers session initialization.
   */
  handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
    parsedBody?: unknown,
  ): Promise<void>;

  /** Gracefully close all active sessions. */
  close(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface Session {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
}

/**
 * Register every endpoint from the registry as an MCP tool on `mcp`.
 */
function registerTools(mcp: McpServer, options: McpHandlerOptions): void {
  const { transport, registry, logger } = options;

  for (const endpoint of registry.list()) {
    mcp.registerTool(
      endpoint.name,
      {
        description: endpoint.description || endpoint.summary,
        inputSchema: endpoint.input,
      },
      async (args: Record<string, unknown>) => {
        try {
          const result = await transport.invoke(endpoint.name, args);
          return {
            content: [
              { type: 'text' as const, text: JSON.stringify(result.output, null, 2) },
            ],
          };
        } catch (error) {
          const rivetError = toRivetBenchError(error);
          logger.error('MCP tool execution failed', {
            tool: endpoint.name,
            errorCode: rivetError.code,
          });
          return {
            content: [
              { type: 'text' as const, text: JSON.stringify(rivetError.toJSON(), null, 2) },
            ],
            isError: true,
          };
        }
      },
    );
  }
}

function createSession(options: McpHandlerOptions): Session {
  const server = new McpServer(
    {
      name: options.application.name,
      version: options.application.version,
    },
    { capabilities: { tools: { listChanged: true } } },
  );

  registerTools(server, options);

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  });

  return { server, transport };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a framework-agnostic MCP request handler using the official
 * `@modelcontextprotocol/sdk`.
 *
 * The handler manages stateful sessions: each initialization `POST` creates a
 * new `McpServer` + `StreamableHTTPServerTransport` pair.  Subsequent requests
 * bearing the `mcp-session-id` header are routed to the matching transport.
 *
 * @param options - Configuration including transport port, registry, and logger.
 * @returns An {@link McpHandler} exposing `handleRequest` and `close`.
 *
 * @example
 * ```typescript
 * const handler = createMcpHandler({ transport, registry, logger, application });
 *
 * // Mount in plain Node.js http server:
 * http.createServer((req, res) => handler.handleRequest(req, res)).listen(3001);
 *
 * // Or via Fastify raw route:
 * fastify.all('/mcp', (req, reply) => {
 *   reply.hijack();
 *   return handler.handleRequest(req.raw, reply.raw, req.body);
 * });
 * ```
 */
export function createMcpHandler(options: McpHandlerOptions): McpHandler {
  const sessions = new Map<string, Session>();

  // Forward registry tool-list changes to all active MCP sessions.
  const unsubscribe = options.registry.onToolsChanged(() => {
    for (const { server } of sessions.values()) {
      server.server.sendToolListChanged().catch(() => {
        /* best-effort: session may have disconnected */
      });
    }
  });

  async function handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
    parsedBody?: unknown,
  ): Promise<void> {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    // Route to existing session
    if (sessionId) {
      const session = sessions.get(sessionId);
      if (session) {
        await session.transport.handleRequest(req, res, parsedBody);
        return;
      }
      // Unknown session → 404
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Session not found' } }));
      return;
    }

    // No session header — must be a POST for initialization
    if (req.method !== 'POST') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32600, message: 'Bad Request: missing session' } }));
      return;
    }

    // Create and connect a new session
    const session = createSession(options);
    await session.server.connect(session.transport);
    await session.transport.handleRequest(req, res, parsedBody);

    // Track session after initialization
    if (session.transport.sessionId) {
      sessions.set(session.transport.sessionId, session);

      session.transport.onclose = () => {
        if (session.transport.sessionId) {
          sessions.delete(session.transport.sessionId);
        }
      };
    }
  }

  async function close(): Promise<void> {
    unsubscribe();
    const closeTasks = [...sessions.values()].map(s => s.transport.close());
    await Promise.all(closeTasks);
    sessions.clear();
  }

  return { handleRequest, close };
}
