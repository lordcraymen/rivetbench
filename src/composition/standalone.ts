/**
 * Composition Root — Standalone Server
 *
 * Wires all ports to their concrete adapter implementations and starts
 * the REST and/or MCP servers. This is the **only** place that knows
 * about all concrete types.
 *
 * @example
 * ```bash
 * tsx src/composition/standalone.ts
 * ```
 */
import { loadConfig } from '../config/index.js';
import { createDefaultRegistry } from '../endpoints/index.js';
import { createLogger, createPinoLoggerPort } from '../adapters/pino/logger.js';
import { createRestServer } from '../adapters/fastify/server.js';
import { startMcpServer } from '../adapters/fastmcp/server.js';

const config = loadConfig();
const logger = createLogger(config);
const loggerPort = createPinoLoggerPort(logger);
const registry = createDefaultRegistry();

// Start REST server
const restServer = await createRestServer({ registry, config, logger, loggerPort });
await restServer.start();

logger.info(
  {
    host: config.rest.host,
    port: config.rest.port,
    endpoints: registry.list().map(e => e.name),
  },
  'REST server started',
);

// Start MCP server if configured for non-stdio transport
// (stdio transport is typically started via a separate entry point)
if (config.mcp.transport !== 'stdio') {
  await startMcpServer({ registry, config });
  loggerPort.info('MCP server started', { transport: config.mcp.transport });
}
