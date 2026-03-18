/**
 * Port interface for structured logging.
 *
 * The application layer depends on this abstraction — never on a concrete
 * logger like Pino. Adapters provide implementations (Pino for production,
 * no-op for tests, stderr-only for MCP stdio).
 *
 * @example
 * ```typescript
 * import { LoggerPort } from '@lordcraymen/rivetbench';
 *
 * function doWork(logger: LoggerPort) {
 *   logger.info('starting work', { step: 1 });
 * }
 * ```
 */
export interface LoggerPort {
  info(msg: string, context?: Record<string, unknown>): void;
  warn(msg: string, context?: Record<string, unknown>): void;
  error(msg: string, context?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): LoggerPort;
}
