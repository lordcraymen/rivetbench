import { EndpointRegistry } from '../../domain/registry.js';
import type { ServerConfig } from '../../config/index.js';
import { toRivetBenchError, ValidationError } from '../../domain/errors.js';
import { invokeEndpoint } from '../../application/invoke-endpoint.js';
import type { LoggerPort } from '../../ports/logger.js';

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
`  --params-json <json>                     JSON payload passed to the endpoint\n` +
`  -<param> <value>                         Named parameters (e.g., -message "hello")\n\n` +
`Output Options:\n` +
`  --raw                                    Raw output (simple values only, no JSON formatting)\n\n` +
`Examples:\n` +
`  rivetbench call echo -message "Hello!"   # Named parameter, JSON output\n` +
`  rivetbench call echo -message "Hello!" --raw # Named parameter, raw output\n` +
`  rivetbench call echo --params-json '{"message":"Hello!"}' # JSON input\n\n` +
`Other Options:\n` +
`  -h, --help                               Show this help message\n\n` +
`Note: CLI flags use double dashes (--) and endpoint parameters use single dash (-)`;

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
 * 1. JSON input: --params-json '{"key": "value"}'
 * 2. Named parameters: -key value -otherKey otherValue
 * Also supports output formatting flags:
 * - --raw: Output raw values instead of JSON (for simple outputs)
 * 
 * CLI flags use double dashes (--) to avoid collision with endpoint parameters
 * that use single dashes (-).
 */
const parseCallArgs = (args: string[]): CallCommandArgs => {
  const [endpointName, ...rest] = args;

  if (!endpointName) {
    throw new ValidationError('Endpoint name is required for call command');
  }

  let rawOutput = false;
  let hasParamsJson = false;

  // First pass: check for CLI flags and remove them
  const filteredArgs: string[] = [];
  for (let index = 0; index < rest.length; index += 1) {
    const flag = rest[index];
    
    if (flag === '--raw') {
      rawOutput = true;
      // Skip this flag, don't add to filteredArgs
      continue;
    }
    
    if (flag === '--params-json') {
      hasParamsJson = true;
      filteredArgs.push(flag);
      continue;
    }

    // Reject old short flags with helpful error messages
    if (flag === '-r') {
      throw new ValidationError('Use --raw instead of -r for raw output flag');
    }
    
    if (flag === '-i' || flag === '--input') {
      throw new ValidationError('Use --params-json instead of --input or -i for JSON parameter input');
    }
    
    filteredArgs.push(flag);
  }

  // Check if using JSON input format
  for (let index = 0; index < filteredArgs.length; index += 1) {
    const flag = filteredArgs[index];

    if (flag === '--params-json') {
      const value = filteredArgs[index + 1];

      if (!value) {
        throw new ValidationError('Missing value for --params-json flag');
      }

      try {
        return { endpointName, input: JSON.parse(value), rawOutput };
      } catch (error) {
        throw new ValidationError('Invalid JSON input for --params-json', { rawInput: value, cause: String(error) });
      }
    }
  }

  // Reject mixing --params-json with individual parameters
  if (hasParamsJson) {
    throw new ValidationError('Cannot mix --params-json with individual -parameter flags');
  }

  // Parse named parameters format
  const parsedInput: Record<string, unknown> = {};

  for (let index = 0; index < filteredArgs.length; index += 2) {
    const flag = filteredArgs[index];
    const value = filteredArgs[index + 1];

    if (!flag) break;

    // Skip if not a parameter flag (doesn't start with -)
    if (!flag.startsWith('-')) {
      throw new ValidationError('Invalid parameter format. Use -paramName value or --params-json JSON', { flag });
    }

    // Reject double-dash parameters (reserved for CLI flags)
    if (flag.startsWith('--')) {
      throw new ValidationError(`Unknown CLI flag: ${flag}. Endpoint parameters must use single dash: -paramName`);
    }

    if (value === undefined) {
      throw new ValidationError('Missing value for parameter', { flag });
    }

    // Remove leading dash and use as parameter name
    const paramName = flag.substring(1);
    
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
export const formatOutput = (output: unknown, rawOutput: boolean): string => {
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
  args: string[],
  logger: LoggerPort,
) => {
  const { endpointName, input, rawOutput } = parseCallArgs(args);
  const result = await invokeEndpoint(registry, endpointName, input, logger);
  writeLine(stdout, formatOutput(result.output, rawOutput));
};

/**
 * Create a RivetBench command line interface that mirrors the runtime
 * registry-driven behaviour used by the REST and MCP transports.
 *
 * @example
 * ```ts
 * import { loadConfig } from '../../config/index.js';
 * import { createDefaultRegistry } from '../../endpoints/index.js';
 * import { createCli } from './adapter.js';
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

  // CLI logger writes to stderr (safe for MCP stdio, and avoids polluting CLI output)
  const cliLogger: LoggerPort = {
    info: () => {},
    warn: (msg) => { writeLine(stderr, `[warn] ${msg}`); },
    error: (msg) => { writeLine(stderr, `[error] ${msg}`); },
    child: () => cliLogger,
  };

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
        await handleCall(registry, stdout, rest, cliLogger);
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
