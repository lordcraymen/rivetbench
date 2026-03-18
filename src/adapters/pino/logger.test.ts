import { describe, it, expect, vi } from 'vitest';
import { createLogger, createPinoLoggerPort } from './logger.js';
import { loadConfig } from '../../config/index.js';
import type { LoggerPort } from '../../ports/logger.js';

describe('LoggerPort', () => {
  describe('createPinoLoggerPort', () => {
    const config = loadConfig({ logging: { level: 'silent' as 'info' } });
    const pinoLogger = createLogger(config);
    const logger: LoggerPort = createPinoLoggerPort(pinoLogger);

    it('should implement info()', () => {
      expect(() => logger.info('test message')).not.toThrow();
    });

    it('should implement info() with context', () => {
      expect(() => logger.info('test message', { key: 'value' })).not.toThrow();
    });

    it('should implement warn()', () => {
      expect(() => logger.warn('warning')).not.toThrow();
    });

    it('should implement warn() with context', () => {
      expect(() => logger.warn('warning', { reason: 'test' })).not.toThrow();
    });

    it('should implement error()', () => {
      expect(() => logger.error('error')).not.toThrow();
    });

    it('should implement error() with context', () => {
      expect(() => logger.error('error', { stack: 'trace' })).not.toThrow();
    });

    it('should create child logger that implements LoggerPort', () => {
      const child = logger.child({ requestId: '123' });
      expect(child).toBeDefined();
      expect(() => child.info('child message')).not.toThrow();
      expect(() => child.warn('child warning')).not.toThrow();
      expect(() => child.error('child error')).not.toThrow();
    });

    it('should allow chaining child loggers', () => {
      const grandchild = logger.child({ a: 1 }).child({ b: 2 });
      expect(() => grandchild.info('nested child')).not.toThrow();
    });
  });

  describe('no-op LoggerPort', () => {
    it('should satisfy the LoggerPort interface with a no-op implementation', () => {
      const noop: LoggerPort = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        child: vi.fn().mockReturnThis(),
      };

      noop.info('test');
      noop.warn('test', { k: 'v' });
      noop.error('test');
      const child = noop.child({ x: 1 });

      expect(noop.info).toHaveBeenCalledWith('test');
      expect(noop.warn).toHaveBeenCalledWith('test', { k: 'v' });
      expect(noop.error).toHaveBeenCalledWith('test');
      expect(child).toBe(noop);
    });
  });
});
