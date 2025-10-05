import pino, { Logger as PinoLogger } from 'pino';
import type { ServerConfig } from '../config/index.js';

/**
 * Logger configuration for RivetBench
 * 
 * IMPORTANT: For MCP stdio transport compatibility:
 * - All logs MUST go to stderr (process.stderr)
 * - stdout is reserved ONLY for MCP JSON-RPC messages
 * - Violating this will break the MCP protocol
 */

/**
 * Create and configure the Pino logger
 * Always writes to stderr to maintain MCP stdio compatibility
 * 
 * @param config - Server configuration (injected dependency)
 */
export function createLogger(config: ServerConfig): PinoLogger {
  let logger: PinoLogger;

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
 * Create a child logger with additional context
 * 
 * @param logger - Parent logger instance
 * @param context - Additional context to include in all child logs
 */
export function createChildLogger(logger: PinoLogger, context: Record<string, unknown>): PinoLogger {
  return logger.child(context);
}
