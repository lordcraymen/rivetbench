import pino, { Logger as PinoLogger } from 'pino';
import type { ServerConfig } from '../../config/index.js';
import type { LoggerPort } from '../../ports/logger.js';

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

/**
 * Wrap a Pino logger instance as a {@link LoggerPort}.
 *
 * This adapter bridges the Pino-specific API (`logger.info(obj, msg)`)
 * to the port interface (`logger.info(msg, context?)`).
 *
 * @param pinoLogger - A Pino logger to wrap.
 * @returns A {@link LoggerPort} backed by the given Pino instance.
 *
 * @example
 * ```typescript
 * const pino = createLogger(config);
 * const logger: LoggerPort = createPinoLoggerPort(pino);
 * logger.info('hello', { key: 'value' });
 * ```
 */
export function createPinoLoggerPort(pinoLogger: PinoLogger): LoggerPort {
  return {
    info(msg: string, context?: Record<string, unknown>): void {
      if (context) {
        pinoLogger.info(context, msg);
      } else {
        pinoLogger.info(msg);
      }
    },
    warn(msg: string, context?: Record<string, unknown>): void {
      if (context) {
        pinoLogger.warn(context, msg);
      } else {
        pinoLogger.warn(msg);
      }
    },
    error(msg: string, context?: Record<string, unknown>): void {
      if (context) {
        pinoLogger.error(context, msg);
      } else {
        pinoLogger.error(msg);
      }
    },
    child(bindings: Record<string, unknown>): LoggerPort {
      return createPinoLoggerPort(pinoLogger.child(bindings));
    },
  };
}
