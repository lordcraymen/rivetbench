import { EndpointRegistry } from '../core/registry.js';
import type { ServerConfig } from '../config/index.js';
import { EndpointNotFoundError, ValidationError, toRivetBenchError } from '../core/errors.js';
import { randomUUID } from 'node:crypto';

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
`  rivetbench list                           List registered endpoints\n` +
`  rivetbench call <name> [options]         Invoke an endpoint\n\n` +
`Input Options (choose one):\n` +
`  -i, --input <json>                       JSON payload passed to the endpoint\n` +
`  -<param> <value>                         Named parameters (e.g., -message "hello")\n\n` +
`Output Options:\n` +
`  -r, --raw                                Raw output (simple values only, no JSON formatting)\n\n` +
`Examples:\n` +
`  rivetbench call echo -message "Hello!"   # Named parameter, JSON output\n` +
`  rivetbench call echo -message "Hello!" --raw # Named parameter, raw output\n` +
`  rivetbench call echo -i '{"message":"Hello!"}' # JSON input\n\n` +
`Other Options:\n` +
`  -h, --help                               Show this help message\n`;

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
  rawOutput: boolean;
}

/**
 * Parse command line arguments for the call command.
 * Supports two formats:
 * 1. JSON input: --input '{"key": "value"}' or -i '{"key": "value"}'
 * 2. Named parameters: -key value -otherKey otherValue
 * Also supports output formatting flags:
 * - --raw or -r: Output raw values instead of JSON (for simple outputs)
 */
const parseCallArgs = (args: string[]): CallCommandArgs => {
  const [endpointName, ...rest] = args;

  if (!endpointName) {
    throw new ValidationError('Endpoint name is required for call command');
  }

  let rawOutput = false;

  // First pass: check for output formatting flags and remove them
  const filteredArgs: string[] = [];
  for (let index = 0; index < rest.length; index += 1) {
    const flag = rest[index];
    
    if (flag === '--raw' || flag === '-r') {
      rawOutput = true;
      // Skip this flag, don't add to filteredArgs
      continue;
    }
    
    filteredArgs.push(flag);
  }

  // Check if using JSON input format
  for (let index = 0; index < filteredArgs.length; index += 1) {
    const flag = filteredArgs[index];

    if (flag === '--input' || flag === '-i') {
      const value = filteredArgs[index + 1];

      if (!value) {
        throw new ValidationError('Missing value for input flag', { flag });
      }

      try {
        return { endpointName, input: JSON.parse(value), rawOutput };
      } catch (error) {
        throw new ValidationError('Invalid JSON input', { rawInput: value, cause: String(error) });
      }
    }
  }

  // Parse named parameters format
  const parsedInput: Record<string, unknown> = {};

  for (let index = 0; index < filteredArgs.length; index += 2) {
    const flag = filteredArgs[index];
    const value = filteredArgs[index + 1];

    if (!flag) break;

    // Skip if not a parameter flag (doesn't start with -)
    if (!flag.startsWith('-')) {
      throw new ValidationError('Invalid parameter format. Use -paramName value or --input JSON', { flag });
    }

    if (value === undefined) {
      throw new ValidationError('Missing value for parameter', { flag });
    }

    // Remove leading dashes and use as parameter name
    const paramName = flag.replace(/^-+/, '');
    
    // Try to parse as number, boolean, or keep as string
    let parsedValue: unknown = value;
    
    // Parse numbers
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      parsedValue = Number(value);
    } 
    // Parse booleans
    else if (value.toLowerCase() === 'true') {
      parsedValue = true;
    } 
    else if (value.toLowerCase() === 'false') {
      parsedValue = false;
    }
    // Try to parse as JSON (for arrays, objects, etc.)
    else if ((value.startsWith('[') && value.endsWith(']')) || 
             (value.startsWith('{') && value.endsWith('}'))) {
      try {
        parsedValue = JSON.parse(value);
      } catch {
        // If JSON parsing fails, keep as string
        parsedValue = value;
      }
    }

    parsedInput[paramName] = parsedValue;
  }

  return { endpointName, input: parsedInput, rawOutput };
};

/**
 * Format output based on the rawOutput flag and the structure of the result
 */
const formatOutput = (output: unknown, rawOutput: boolean): string => {
  if (!rawOutput) {
    return JSON.stringify(output, null, 2);
  }

  // For raw output, try to extract simple values intelligently
  if (output === null || output === undefined) {
    return '';
  }

  // If it's a primitive value, return it directly
  if (typeof output === 'string' || typeof output === 'number' || typeof output === 'boolean') {
    return String(output);
  }

  // If it's an object with a single property, return the value of that property
  if (typeof output === 'object' && output !== null) {
    const keys = Object.keys(output);
    if (keys.length === 1) {
      const singleValue = (output as Record<string, unknown>)[keys[0]];
      if (typeof singleValue === 'string' || typeof singleValue === 'number' || typeof singleValue === 'boolean') {
        return String(singleValue);
      }
    }
  }

  // For complex objects, fall back to JSON even in raw mode
  return JSON.stringify(output, null, 2);
};

const handleCall = async (
  registry: EndpointRegistry,
  stdout: NodeJS.WritableStream,
  args: string[]
) => {
  const { endpointName, input, rawOutput } = parseCallArgs(args);
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
    config: { requestId: randomUUID() }
  });

  const parsedOutput = endpoint.output.parse(result);
  writeLine(stdout, formatOutput(parsedOutput, rawOutput));
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
