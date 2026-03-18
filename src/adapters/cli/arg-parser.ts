import { ValidationError } from '../../domain/errors.js';

/**
 * Parsed result of the CLI `call` subcommand arguments.
 */
export interface CallCommandArgs {
  endpointName: string;
  input: unknown;
  rawOutput: boolean;
}

/**
 * Parse command line arguments for the `call` command (ADR-0009).
 *
 * Supports two input formats:
 * 1. JSON input:      `--params-json '{"key": "value"}'`
 * 2. Named parameters: `-key value -otherKey otherValue`
 *
 * Output flags:
 * - `--raw` — raw output (simple values only, no JSON formatting)
 *
 * CLI flags use double dashes (`--`) to avoid collision with endpoint
 * parameters that use single dashes (`-`).
 *
 * @param args - Arguments after the `call` subcommand.
 * @returns Parsed endpoint name, input, and output options.
 * @throws {ValidationError} When arguments are malformed.
 *
 * @example
 * ```typescript
 * const parsed = parseCallArgs(['echo', '-message', 'hello', '--raw']);
 * // { endpointName: 'echo', input: { message: 'hello' }, rawOutput: true }
 * ```
 */
export function parseCallArgs(args: string[]): CallCommandArgs {
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
        throw new ValidationError('Invalid JSON input for --params-json', {
          rawInput: value,
          cause: String(error),
        });
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

    if (!flag.startsWith('-')) {
      throw new ValidationError(
        'Invalid parameter format. Use -paramName value or --params-json JSON',
        { flag },
      );
    }

    if (flag.startsWith('--')) {
      throw new ValidationError(
        `Unknown CLI flag: ${flag}. Endpoint parameters must use single dash: -paramName`,
      );
    }

    if (value === undefined) {
      throw new ValidationError('Missing value for parameter', { flag });
    }

    const paramName = flag.substring(1);

    let parsedValue: unknown = value;

    if (/^-?\d+(\.\d+)?$/.test(value)) {
      parsedValue = Number(value);
    } else if (value.toLowerCase() === 'true') {
      parsedValue = true;
    } else if (value.toLowerCase() === 'false') {
      parsedValue = false;
    } else if (
      (value.startsWith('[') && value.endsWith(']')) ||
      (value.startsWith('{') && value.endsWith('}'))
    ) {
      try {
        parsedValue = JSON.parse(value);
      } catch {
        parsedValue = value;
      }
    }

    parsedInput[paramName] = parsedValue;
  }

  return { endpointName, input: parsedInput, rawOutput };
}

/**
 * Format endpoint output for CLI display.
 *
 * In raw mode, attempts to extract a simple scalar value from single-property
 * objects. Falls back to JSON for complex structures.
 *
 * @param output    - The endpoint output value.
 * @param rawOutput - Whether to use raw (non-JSON) formatting.
 * @returns The formatted string.
 *
 * @example
 * ```typescript
 * formatOutput({ echoed: 'hello' }, true);  // 'hello'
 * formatOutput({ echoed: 'hello' }, false); // '{\n  "echoed": "hello"\n}'
 * ```
 */
export function formatOutput(output: unknown, rawOutput: boolean): string {
  if (!rawOutput) {
    return JSON.stringify(output, null, 2);
  }

  if (output === null || output === undefined) {
    return '';
  }

  if (typeof output === 'string' || typeof output === 'number' || typeof output === 'boolean') {
    return String(output);
  }

  if (typeof output === 'object' && output !== null) {
    const keys = Object.keys(output);
    if (keys.length === 1) {
      const singleValue = (output as Record<string, unknown>)[keys[0]];
      if (typeof singleValue === 'string' || typeof singleValue === 'number' || typeof singleValue === 'boolean') {
        return String(singleValue);
      }
    }
  }

  return JSON.stringify(output, null, 2);
}
