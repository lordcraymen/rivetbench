import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from './index.js';

describe('loadConfig', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset relevant env vars before each test
    delete process.env.RIVETBENCH_REST_HOST;
    delete process.env.RIVETBENCH_REST_PORT;
    delete process.env.RIVETBENCH_MCP_TRANSPORT;
    delete process.env.RIVETBENCH_MCP_PORT;
    delete process.env.NODE_ENV;
    delete process.env.LOG_LEVEL;
  });

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
  });

  it('should return default config when called without overrides', () => {
    const cfg = loadConfig();

    expect(cfg.rest.host).toBe('0.0.0.0');
    expect(cfg.rest.port).toBe(3000);
    expect(cfg.mcp.transport).toBe('stdio');
    expect(cfg.application.name).toBe('RivetBench');
    expect(cfg.logging.level).toBe('info');
  });

  it('should override a top-level primitive property', () => {
    const cfg = loadConfig({ environment: 'production' });

    expect(cfg.environment).toBe('production');
  });

  it('should deep-merge a nested property without clobbering siblings', () => {
    const cfg = loadConfig({ application: { name: 'my-app' } });

    expect(cfg.application.name).toBe('my-app');
    expect(cfg.application.version).toBe('0.9.0');
    expect(cfg.application.description).toBe('Dual exposed RPC endpoints for REST and MCP.');
  });

  it('should allow overriding multiple sections simultaneously', () => {
    const cfg = loadConfig({
      application: { name: 'custom-app' },
      mcp: { transport: 'tcp' },
      rest: { port: 9090 },
    });

    expect(cfg.application.name).toBe('custom-app');
    expect(cfg.mcp.transport).toBe('tcp');
    expect(cfg.rest.port).toBe(9090);
    expect(cfg.rest.host).toBe('0.0.0.0');
  });

  it('should let overrides win over env-var defaults', () => {
    process.env.RIVETBENCH_REST_PORT = '8080';

    const cfg = loadConfig({ rest: { port: 4000 } });

    expect(cfg.rest.port).toBe(4000);
  });

  it('should preserve env-var values not covered by overrides', () => {
    process.env.RIVETBENCH_REST_PORT = '8080';

    const cfg = loadConfig({ application: { name: 'other' } });

    expect(cfg.rest.port).toBe(8080);
    expect(cfg.application.name).toBe('other');
  });

  it('should ignore undefined values in overrides', () => {
    const cfg = loadConfig({ application: { name: undefined } });

    expect(cfg.application.name).toBe('RivetBench');
  });

  it('should return the same result as no-arg call when overrides is undefined', () => {
    const cfg1 = loadConfig();
    const cfg2 = loadConfig(undefined);

    expect(cfg1).toEqual(cfg2);
  });

  it('should handle empty overrides object', () => {
    const cfg = loadConfig({});

    expect(cfg.application.name).toBe('RivetBench');
    expect(cfg.rest.port).toBe(3000);
  });

  it('should override optional properties', () => {
    const cfg = loadConfig({ application: { description: 'Custom desc' } });

    expect(cfg.application.description).toBe('Custom desc');
  });
});
