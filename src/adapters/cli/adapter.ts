import type { EndpointRegistry } from '../../domain/registry.js';
import type { ServerConfig } from '../../config/index.js';
import { toRivetBenchError } from '../../domain/errors.js';
import type { LoggerPort } from '../../ports/logger.js';
import type { TransportPort } from '../../ports/transport.js';
import { parseCallArgs, formatOutput } from './arg-parser.js';

// Re-export for backward compatibility
export { formatOutput } from './arg-parser.js';

export interface CliIoStreams {
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
}

export interface CreateCliOptions {
  registry: EndpointRegistry;
  config: ServerConfig;
  streams?: Partial<CliIoStreams>;
  /** Optional TransportPort override. When omitted, built automatically. */
  transport?: TransportPort;
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

/**
 * Create a RivetBench command line interface that mirrors the runtime
 * registry-driven behaviour used by the REST and MCP transports.
 *
 * All endpoint invocations are routed through the {@link TransportPort}
 * driving interface, ensuring transport parity with REST and MCP.
 *
 * @example
 * ```ts
 * import { loadConfig } from '../../config/index.js';
 * import { createDefaultRegistry } from '../../endpoints/index.js';
 * import { createCli } from './adapter.js';
 *
 * const config = loadConfig();
 * const registry = createDefaultRegistry();
 * const cli = createCli({ registry, config, transport });
 *
 * await cli.run(['list']);
 * ```
 */
export const createCli = ({ registry, config, streams, transport }: CreateCliOptions) => {
  const stdout = streams?.stdout ?? process.stdout;
  const stderr = streams?.stderr ?? process.stderr;

  // CLI logger writes to stderr (safe for MCP stdio, and avoids polluting CLI output)
  const cliLogger: LoggerPort = {
    info: () => {},
    warn: (msg) => { writeLine(stderr, `[warn] ${msg}`); },
    error: (msg) => { writeLine(stderr, `[error] ${msg}`); },
    child: () => cliLogger,
  };

  // Lazily resolve transport — permits construction without Transport in simple cases
  const getTransport = async (): Promise<TransportPort> => {
    if (transport) return transport;
    const { createTransportPort } = await import('../../application/create-transport-port.js');
    return createTransportPort(registry, cliLogger);
  };

  const handleList = () => {
    const endpoints = registry.list();
    if (endpoints.length === 0) {
      writeLine(stdout, 'No endpoints registered.');
      return;
    }
    for (const endpoint of endpoints) {
      writeLine(stdout, `- ${endpoint.name}: ${endpoint.summary}`);
    }
  };

  const handleCall = async (args: string[]) => {
    const { endpointName, input, rawOutput } = parseCallArgs(args);
    const tp = await getTransport();
    const result = await tp.invoke(endpointName, input);
    writeLine(stdout, formatOutput(result.output, rawOutput));
  };

  const run = async (argv: string[]): Promise<number> => {
    if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
      writeLine(stdout, usageText(config.application.name));
      return 0;
    }

    const [command, ...rest] = argv;

    try {
      if (command === 'list') {
        handleList();
        return 0;
      }

      if (command === 'call') {
        await handleCall(rest);
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
