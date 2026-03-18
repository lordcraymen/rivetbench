import pino from 'pino';
import type { LoggerPort } from '../ports/logger.js';

/** Silent Pino logger for tests — no output, no side effects. */
export const createTestLogger = () => pino({ level: 'silent' });

/** No-op LoggerPort for tests — satisfies the interface without output. */
export const noopLoggerPort: LoggerPort = {
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => noopLoggerPort,
};
