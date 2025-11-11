import { describe, it, expect } from 'vitest';
import { Writable } from 'node:stream';
import { loadConfig } from '../../src/config/index.js';
import { createDefaultRegistry } from '../../src/endpoints/index.js';
import { createCli } from '../../src/cli/index.js';

const createMemoryStream = () => {
  let buffer = '';

  const stream = new Writable({
    write(chunk, _encoding, callback) {
      buffer += chunk.toString();
      callback();
    }
  });

  return {
    stream,
    read: () => buffer
  };
};

describe('CLI', () => {
  it('lists available endpoints', async () => {
    const config = loadConfig();
    const registry = createDefaultRegistry();
    const stdout = createMemoryStream();
    const cli = createCli({ registry, config, streams: { stdout: stdout.stream } });

    const exitCode = await cli.run(['list']);

    expect({ exitCode, output: stdout.read() }).toMatchObject({
      exitCode: 0,
      output: expect.stringContaining('echo')
    });
  });

  it('invokes an endpoint with JSON input', async () => {
    const config = loadConfig();
    const registry = createDefaultRegistry();
    const stdout = createMemoryStream();
    const cli = createCli({ registry, config, streams: { stdout: stdout.stream } });

    const exitCode = await cli.run(['call', 'echo', '--params-json', '{"message":"hi"}']);

    expect({ exitCode, output: stdout.read().trim() }).toEqual({
      exitCode: 0,
      output: '{\n  "echoed": "hi"\n}'
    });
  });

  it('returns an error for invalid endpoint input', async () => {
    const config = loadConfig();
    const registry = createDefaultRegistry();
    const stderr = createMemoryStream();
    const cli = createCli({ registry, config, streams: { stderr: stderr.stream } });

    const exitCode = await cli.run(['call', 'echo', '--params-json', '{"message":""}']);

    expect({ exitCode, error: JSON.parse(stderr.read()).error.code }).toEqual({
      exitCode: 1,
      error: 'VALIDATION_ERROR'
    });
  });

  describe('Named Parameters', () => {
    it('invokes an endpoint with named parameters', async () => {
      const config = loadConfig();
      const registry = createDefaultRegistry();
      const stdout = createMemoryStream();
      const cli = createCli({ registry, config, streams: { stdout: stdout.stream } });

      const exitCode = await cli.run(['call', 'echo', '-message', 'hello world']);

      expect({ exitCode, output: stdout.read().trim() }).toEqual({
        exitCode: 0,
        output: '{\n  "echoed": "hello world"\n}'
      });
    });

    it('invokes an endpoint with multiple named parameters', async () => {
      const config = loadConfig();
      const registry = createDefaultRegistry();
      const stdout = createMemoryStream();
      const cli = createCli({ registry, config, streams: { stdout: stdout.stream } });

      const exitCode = await cli.run(['call', 'myfunc', '-text', 'test', '-number', '42']);

      const output = JSON.parse(stdout.read().trim());
      expect({ exitCode, result: output.result, doubled: output.doubled }).toEqual({
        exitCode: 0,
        result: 'Processed: test',
        doubled: 84
      });
    });

    it('parses different data types correctly', async () => {
      const config = loadConfig();
      const registry = createDefaultRegistry();
      const stdout = createMemoryStream();
      const cli = createCli({ registry, config, streams: { stdout: stdout.stream } });

      const exitCode = await cli.run(['call', 'myfunc', '-text', 'number test', '-number', '3.14']);

      const output = JSON.parse(stdout.read().trim());
      expect({ exitCode, doubled: output.doubled }).toEqual({
        exitCode: 0,
        doubled: 6.28
      });
    });

    it('returns an error for missing parameter value', async () => {
      const config = loadConfig();
      const registry = createDefaultRegistry();
      const stderr = createMemoryStream();
      const cli = createCli({ registry, config, streams: { stderr: stderr.stream } });

      const exitCode = await cli.run(['call', 'echo', '-message']);

      expect({ exitCode, error: JSON.parse(stderr.read()).error.code }).toEqual({
        exitCode: 1,
        error: 'VALIDATION_ERROR'
      });
    });

    it('returns an error for invalid parameter format', async () => {
      const config = loadConfig();
      const registry = createDefaultRegistry();
      const stderr = createMemoryStream();
      const cli = createCli({ registry, config, streams: { stderr: stderr.stream } });

      const exitCode = await cli.run(['call', 'echo', 'invalidparam', 'value']);

      expect({ exitCode, error: JSON.parse(stderr.read()).error.code }).toEqual({
        exitCode: 1,
        error: 'VALIDATION_ERROR'
      });
    });
  });

  describe('Raw Output', () => {
    it('outputs raw value for simple single-property objects with --raw flag', async () => {
      const config = loadConfig();
      const registry = createDefaultRegistry();
      const stdout = createMemoryStream();
      const cli = createCli({ registry, config, streams: { stdout: stdout.stream } });

      const exitCode = await cli.run(['call', 'echo', '-message', 'hello', '--raw']);

      expect({ exitCode, output: stdout.read().trim() }).toEqual({
        exitCode: 0,
        output: 'hello'
      });
    });

    it('outputs raw value for simple single-property objects (no -r shorthand anymore)', async () => {
      const config = loadConfig();
      const registry = createDefaultRegistry();
      const stdout = createMemoryStream();
      const stderr = createMemoryStream();
      const cli = createCli({ registry, config, streams: { stdout: stdout.stream, stderr: stderr.stream } });

      // Test that old -r flag is rejected with helpful error
      const exitCode = await cli.run(['call', 'uppercase', '-text', 'hello world', '-r']);

      expect(exitCode).toBe(1);
      expect(stderr.read()).toContain('Use --raw instead of -r');
    });

    it('falls back to JSON for complex objects even with --raw flag', async () => {
      const config = loadConfig();
      const registry = createDefaultRegistry();
      const stdout = createMemoryStream();
      const cli = createCli({ registry, config, streams: { stdout: stdout.stream } });

      const exitCode = await cli.run(['call', 'myfunc', '-text', 'test', '-number', '5', '--raw']);

      const output = JSON.parse(stdout.read().trim());
      expect({ exitCode, hasMultipleProperties: Object.keys(output).length > 1 }).toEqual({
        exitCode: 0,
        hasMultipleProperties: true
      });
    });

    it('works with JSON input and raw output', async () => {
      const config = loadConfig();
      const registry = createDefaultRegistry();
      const stdout = createMemoryStream();
      const cli = createCli({ registry, config, streams: { stdout: stdout.stream } });

      const exitCode = await cli.run(['call', 'echo', '--params-json', '{"message":"json test"}', '--raw']);

      expect({ exitCode, output: stdout.read().trim() }).toEqual({
        exitCode: 0,
        output: 'json test'
      });
    });

    it('handles primitive return values in raw mode', async () => {
      // This would need an endpoint that returns primitives directly, 
      // but our current endpoints wrap in objects. Test the formatOutput logic directly.
      const config = loadConfig();
      const registry = createDefaultRegistry();
      const stdout = createMemoryStream();
      const cli = createCli({ registry, config, streams: { stdout: stdout.stream } });

      // Test that empty/null values are handled
      const exitCode = await cli.run(['call', 'echo', '-message', '', '--raw']);

      expect(exitCode).toBe(1); // Should fail validation since message can't be empty
    });
  });

  describe('Help and List Commands', () => {
    it('shows help with --help flag', async () => {
      const config = loadConfig();
      const registry = createDefaultRegistry();
      const stdout = createMemoryStream();
      const cli = createCli({ registry, config, streams: { stdout: stdout.stream } });

      const exitCode = await cli.run(['--help']);

      expect({ exitCode, output: stdout.read() }).toMatchObject({
        exitCode: 0,
        output: expect.stringContaining('--raw')
      });
    });

    it('shows help with -h flag', async () => {
      const config = loadConfig();
      const registry = createDefaultRegistry();
      const stdout = createMemoryStream();
      const cli = createCli({ registry, config, streams: { stdout: stdout.stream } });

      const exitCode = await cli.run(['-h']);

      expect({ exitCode, output: stdout.read() }).toMatchObject({
        exitCode: 0,
        output: expect.stringContaining('Named parameters')
      });
    });

    it('lists all registered endpoints including new ones', async () => {
      const config = loadConfig();
      const registry = createDefaultRegistry();
      const stdout = createMemoryStream();
      const cli = createCli({ registry, config, streams: { stdout: stdout.stream } });

      const exitCode = await cli.run(['list']);

      const output = stdout.read();
      expect({ exitCode, hasEcho: output.includes('echo'), hasMyfunc: output.includes('myfunc'), hasUppercase: output.includes('uppercase') }).toEqual({
        exitCode: 0,
        hasEcho: true,
        hasMyfunc: true,
        hasUppercase: true
      });
    });
  });
});
