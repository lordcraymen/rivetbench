import { EndpointRegistry } from '../core/registry.js';
import type { ServerConfig } from '../config/index.js';
import { EndpointNotFoundError, ValidationError, toRivetBenchError } from '../core/errors.js';

export interface CliIoStreams {
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
}

export interface CreateCliOptions {
  registry: EndpointRegistry;
  config: ServerConfig;
  streams?: Partial<CliIoStreams>;
}

const usageText = (applicationName: string) => `\
${applicationName} CLI\n\n` +
`Usage:\n` +
`  rivetbench list            List registered endpoints\n` +
`  rivetbench call <name>    Invoke an endpoint with JSON input\n\n` +
`Options:\n` +
`  -i, --input <json>        JSON payload passed to the endpoint\n` +
`  -h, --help                Show this help message\n`;

const writeLine = (stream: NodeJS.WritableStream, message = '') => {
  stream.write(`${message}\n`);
};

const handleList = (registry: EndpointRegistry, stdout: NodeJS.WritableStream) => {
  const endpoints = registry.list();

  if (endpoints.length === 0) {
    writeLine(stdout, 'No endpoints registered.');
    return;
  }

  for (const endpoint of endpoints) {
    writeLine(stdout, `- ${endpoint.name}: ${endpoint.summary}`);
  }
};

interface CallCommandArgs {
  endpointName: string;
  input: unknown;
}

const parseCallArgs = (args: string[]): CallCommandArgs => {
  const [endpointName, ...rest] = args;

  if (!endpointName) {
    throw new ValidationError('Endpoint name is required for call command');
  }

  let rawInput = '{}';

  for (let index = 0; index < rest.length; index += 1) {
    const flag = rest[index];

    if (flag === '--input' || flag === '-i') {
      const value = rest[index + 1];

      if (!value) {
        throw new ValidationError('Missing value for input flag', { flag });
      }

      rawInput = value;
      break;
    }
  }

  try {
    return { endpointName, input: JSON.parse(rawInput) };
  } catch (error) {
    throw new ValidationError('Invalid JSON input', { rawInput, cause: String(error) });
  }
};

const handleCall = async (
  registry: EndpointRegistry,
  stdout: NodeJS.WritableStream,
  args: string[]
) => {
  const { endpointName, input } = parseCallArgs(args);
  const endpoint = registry.get(endpointName);

  if (!endpoint) {
    throw new EndpointNotFoundError(endpointName);
  }

  const parsedInput = endpoint.input.safeParse(input);

  if (!parsedInput.success) {
    throw new ValidationError('Invalid endpoint input', {
      endpoint: endpointName,
      issues: parsedInput.error.format()
    });
  }

  const result = await endpoint.handler({
    input: parsedInput.data,
    config: { requestId: crypto.randomUUID() }
  });

  const parsedOutput = endpoint.output.parse(result);
  writeLine(stdout, JSON.stringify(parsedOutput, null, 2));
};

/**
 * Create a RivetBench command line interface that mirrors the runtime
 * registry-driven behaviour used by the REST and MCP transports.
 *
 * @example
 * ```ts
 * import { loadConfig } from '../config/index.js';
 * import { createDefaultRegistry } from '../endpoints/index.js';
 * import { createCli } from './index.js';
 *
 * const config = loadConfig();
 * const registry = createDefaultRegistry();
 * const cli = createCli({ registry, config });
 *
 * await cli.run(['list']);
 * ```
 */
export const createCli = ({ registry, config, streams }: CreateCliOptions) => {
  const stdout = streams?.stdout ?? process.stdout;
  const stderr = streams?.stderr ?? process.stderr;

  const run = async (argv: string[]): Promise<number> => {
    if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
      writeLine(stdout, usageText(config.application.name));
      return 0;
    }

    const [command, ...rest] = argv;

    try {
      if (command === 'list') {
        handleList(registry, stdout);
        return 0;
      }

      if (command === 'call') {
        await handleCall(registry, stdout, rest);
        return 0;
      }

      writeLine(stderr, `Unknown command: ${command}`);
      writeLine(stderr, usageText(config.application.name));
      return 1;
    } catch (error) {
      const rivetError = toRivetBenchError(error);
      writeLine(stderr, JSON.stringify(rivetError.toJSON(), null, 2));
      return 1;
    }
  };

  return { run };
};

const isMainModule = process.argv[1]?.includes('cli');

if (isMainModule) {
  (async () => {
    try {
      const { loadConfig } = await import('../config/index.js');
      const config = loadConfig();
      const { createDefaultRegistry } = await import('../endpoints/index.js');
      const registry = createDefaultRegistry();
      const cli = createCli({ registry, config });
      const exitCode = await cli.run(process.argv.slice(2));
      process.exit(exitCode);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to start CLI', error);
      process.exit(1);
    }
  })();
}
