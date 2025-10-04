import pino, { Logger as PinoLogger } from 'pino';
import { loadConfig } from '../config/index.js';

/**
 * Logger configuration for RivetBench
 * 
 * IMPORTANT: For MCP stdio transport compatibility:
 * - All logs MUST go to stderr (process.stderr)
 * - stdout is reserved ONLY for MCP JSON-RPC messages
 * - Violating this will break the MCP protocol
 */

let logger: PinoLogger | null = null;

/**
 * Create and configure the Pino logger
 * Always writes to stderr to maintain MCP stdio compatibility
 */
export function createLogger(): PinoLogger {
  if (logger) {
    return logger;
  }

  const config = loadConfig();

  // Use pretty printing in development (still writes to stderr)
  if (config.logging.pretty) {
    logger = pino({
      level: config.logging.level,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
          destination: 2 // fd 2 = stderr
        }
      }
    });
  } else {
    // Production mode: JSON logs to stderr
    logger = pino(
      {
        level: config.logging.level
      },
      // Explicitly target stderr
      pino.destination({
        dest: process.stderr.fd,
        sync: false // Async for better performance
      })
    );
  }

  return logger;
}

/**
 * Get the logger instance (creates if doesn't exist)
 */
export function getLogger(): PinoLogger {
  if (!logger) {
    return createLogger();
  }
  return logger;
}

/**
 * Create a child logger with additional context
 */
export function createChildLogger(context: Record<string, unknown>): PinoLogger {
  return getLogger().child(context);
}
