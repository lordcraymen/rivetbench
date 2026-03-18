/**
 * REST adapter — Framework-agnostic HTTP request handler.
 *
 * This adapter does NOT own a server or listen on a port.  It exposes a
 * raw Node.js `handleRequest(req, res, body?)` function that can be
 * mounted on any HTTP server (Fastify, Express, plain `http`, …).
 *
 * Routes handled: `/health`, `/tools`, `/rpc/:name`, `/openapi.json`.
 *
 * ADR-0005: Framework-agnostic adapter — no Fastify or Express coupling.
 * ADR-0004: Depends on TransportPort, not on application services directly.
 *
 * @example
 * ```typescript
 * import express from 'express';
 * const handler = createRestHandler({ transport, registry, logger, application });
 * const app = express();
 * app.use(express.json());
 * app.all('/*', (req, res) => handler.handleRequest(req, res, req.body));
 * ```
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { OpenAPIV3 } from 'openapi-types';
import type { TransportPort } from '../../ports/transport.js';
import type { EndpointRegistry } from '../../domain/registry.js';
import type { LoggerPort } from '../../ports/logger.js';
import { toRivetBenchError } from '../../domain/errors.js';
import { buildOpenApiDocument, type OpenApiGeneratorOptions } from '../../application/openapi.js';

/**
 * Options for {@link createRestHandler}.
 */
export interface RestHandlerOptions {
  /** TransportPort driving interface (invoke + list). */
  transport: TransportPort;
  /** Endpoint registry for OpenAPI generation and ETag computation. */
  registry: EndpointRegistry;
  /** Logger for structured error logging. */
  logger: LoggerPort;
  /** Application metadata for OpenAPI docs. */
  application: { name: string; version: string; description?: string };
  /**
   * Base path prefix used in the OpenAPI document paths.
   * When the handler is mounted at a sub-path (e.g. Express `app.use('/api', ...)`),
   * set this so the generated OpenAPI paths reflect the public URL.
   */
  basePath?: string;
  /**
   * Additional OpenAPI path entries to include in the document.
   * Use this to describe non-RPC endpoints that are part of the server topology
   * (e.g. `/mcp`, static file routes).
   */
  extraPaths?: Record<string, OpenAPIV3.PathItemObject>;
}

/**
 * Handle returned by {@link createRestHandler}.
 */
export interface RestHandler {
  /**
   * Route an incoming HTTP request to the correct REST endpoint.
   *
   * Supported routes:
   * - `GET  /health`        → `{ status: "ok" }`
   * - `GET  /tools`         → endpoint listing with ETag
   * - `POST /rpc/:name`     → invoke endpoint
   * - `GET  /openapi.json`  → OpenAPI 3.0.3 document
   *
   * Returns 404 for unrecognised paths.
   */
  handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
    parsedBody?: unknown,
  ): Promise<void>;

  /**
   * Return the pre-built OpenAPI document.
   * Useful for framework integrations that serve Swagger UI separately.
   */
  getOpenApiDocument(): OpenAPIV3.Document;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const RPC_PREFIX = '/rpc/';

function sendJson(
  res: ServerResponse,
  statusCode: number,
  body: unknown,
  extraHeaders?: Record<string, string>,
): void {
  const json = JSON.stringify(body);
  res.writeHead(statusCode, {
    'content-type': 'application/json',
    'content-length': String(Buffer.byteLength(json)),
    ...extraHeaders,
  });
  res.end(json);
}

function getRequestId(req: IncomingMessage): string {
  const header = req.headers['x-request-id'];
  return typeof header === 'string' ? header : crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a framework-agnostic REST request handler.
 *
 * The handler parses `req.url` internally and routes to the appropriate
 * endpoint.  It writes directly to the raw `ServerResponse` — no framework
 * types are involved.
 *
 * @param options - Configuration including transport port, registry, and logger.
 * @returns A {@link RestHandler} exposing `handleRequest` and `getOpenApiDocument`.
 *
 * @example
 * ```typescript
 * const handler = createRestHandler({ transport, registry, logger, application });
 *
 * // Mount in Express:
 * app.all('/*', (req, res) => handler.handleRequest(req, res, req.body));
 *
 * // Mount in plain Node.js:
 * http.createServer((req, res) => handler.handleRequest(req, res)).listen(3000);
 * ```
 */
export function createRestHandler(options: RestHandlerOptions): RestHandler {
  const { transport, registry, logger, application } = options;

  const openApiOptions: OpenApiGeneratorOptions = {
    title: application.name,
    version: application.version,
    description: application.description,
    basePath: options.basePath,
    extraPaths: options.extraPaths,
  };

  const document = buildOpenApiDocument(registry.list(), openApiOptions);

  async function handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
    parsedBody?: unknown,
  ): Promise<void> {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const path = url.pathname;
    const method = req.method?.toUpperCase();

    try {
      if (method === 'GET' && path === '/health') {
        sendJson(res, 200, { status: 'ok' });
        return;
      }

      if (method === 'GET' && path === '/tools') {
        const currentEtag = registry.etag;
        const ifNoneMatch = req.headers['if-none-match'];

        if (ifNoneMatch && ifNoneMatch === currentEtag) {
          res.writeHead(304);
          res.end();
          return;
        }

        const requestId = getRequestId(req);
        const tools = transport.list({
          sessionId: requestId,
          transportType: 'rest',
        });

        sendJson(res, 200, tools, {
          etag: currentEtag,
          'cache-control': 'no-cache',
        });
        return;
      }

      if (method === 'POST' && path.startsWith(RPC_PREFIX)) {
        const name = decodeURIComponent(path.slice(RPC_PREFIX.length));
        if (!name) {
          sendJson(res, 404, {
            error: { name: 'NotFoundError', code: 'NOT_FOUND', message: 'Endpoint name required' },
          });
          return;
        }

        const requestId = getRequestId(req);
        const result = await transport.invoke(name, parsedBody, { requestId });
        sendJson(res, 200, result.output);
        return;
      }

      if (method === 'GET' && path === '/openapi.json') {
        sendJson(res, 200, document);
        return;
      }

      // Unknown route
      sendJson(res, 404, {
        error: { name: 'NotFoundError', code: 'NOT_FOUND', message: `Route ${method} ${path} not found` },
      });
    } catch (error) {
      const rivetError = toRivetBenchError(error);
      const level = rivetError.statusCode >= 500 ? 'error' : 'warn';
      logger[level](rivetError.message, {
        method,
        url: path,
        reqId: getRequestId(req),
        errorName: rivetError.name,
        errorCode: rivetError.code,
      });
      sendJson(res, rivetError.statusCode, rivetError.toJSON());
    }
  }

  function getOpenApiDocument(): OpenAPIV3.Document {
    return document;
  }

  return { handleRequest, getOpenApiDocument };
}
