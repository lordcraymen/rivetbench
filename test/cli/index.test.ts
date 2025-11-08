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

    const exitCode = await cli.run(['call', 'echo', '--input', '{"message":"hi"}']);

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

    const exitCode = await cli.run(['call', 'echo', '--input', '{"message":""}']);

    expect({ exitCode, error: JSON.parse(stderr.read()).error.code }).toEqual({
      exitCode: 1,
      error: 'VALIDATION_ERROR'
    });
  });
});
