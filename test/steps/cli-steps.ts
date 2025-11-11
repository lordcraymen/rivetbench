import { Given, When, Then } from '@cucumber/cucumber';
import { RivetBenchWorld } from './world.js';
import { createCli } from '../../src/cli/index.js';
import { loadConfig } from '../../src/config/index.js';
import { createDefaultRegistry } from '../../src/endpoints/index.js';
import { Writable } from 'node:stream';

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
    read: () => buffer,
    clear: () => { buffer = ''; }
  };
};

Given('I have the CLI tool available', function (this: RivetBenchWorld) {
  const config = loadConfig();
  const registry = createDefaultRegistry();
  const stdout = createMemoryStream();
  const stderr = createMemoryStream();
  
  this.cli = createCli({ 
    registry, 
    config, 
    streams: { 
      stdout: stdout.stream, 
      stderr: stderr.stream 
    } 
  });
  this.cliStreams = { stdout, stderr };
});

/**
 * Parse a command string respecting quoted arguments
 */
const parseCommand = (command: string): string[] => {
  const args: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;

  for (let i = 0; i < command.length; i += 1) {
    const char = command[i];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (char === ' ' && !inSingleQuote && !inDoubleQuote) {
      if (current) {
        args.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current) {
    args.push(current);
  }

  return args;
};

When('I run {string}', async function (this: RivetBenchWorld, command: string) {
  const args = parseCommand(command);
  
  // Clear previous output
  this.cliStreams!.stdout.clear();
  this.cliStreams!.stderr.clear();
  
  this.cliExitCode = await this.cli!.run(args);
  this.cliOutput = this.cliStreams!.stdout.read();
  this.cliError = this.cliStreams!.stderr.read();
});

Then('I should receive JSON containing {string}', function (this: RivetBenchWorld, expectedJson: string) {
  const expected = JSON.parse(expectedJson);
  
  // Safely parse CLI output with error handling
  const outputTrimmed = this.cliOutput!.trim();
  if (!outputTrimmed) {
    throw new Error('CLI output is empty, cannot parse as JSON');
  }
  
  let actual;
  try {
    actual = JSON.parse(outputTrimmed);
  } catch (error) {
    throw new Error(`Failed to parse CLI output as JSON: "${outputTrimmed}". Error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  this.expect(this.cliExitCode).toBe(0);
  this.expect(actual).toMatchObject(expected);
});

Then('I should receive JSON with {string} containing {string}', function (this: RivetBenchWorld, field: string, expectedValue: string) {
  const outputTrimmed = this.cliOutput!.trim();
  if (!outputTrimmed) {
    throw new Error('CLI output is empty, cannot parse as JSON');
  }
  
  let actual;
  try {
    actual = JSON.parse(outputTrimmed);
  } catch (error) {
    throw new Error(`Failed to parse CLI output as JSON: "${outputTrimmed}". Error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  this.expect(this.cliExitCode).toBe(0);
  this.expect(actual[field]).toContain(expectedValue);
});

Then('the {string} field should be {float}', function (this: RivetBenchWorld, field: string, expectedValue: number) {
  const outputTrimmed = this.cliOutput!.trim();
  if (!outputTrimmed) {
    throw new Error('CLI output is empty, cannot parse as JSON');
  }
  
  let actual;
  try {
    actual = JSON.parse(outputTrimmed);
  } catch (error) {
    throw new Error(`Failed to parse CLI output as JSON: "${outputTrimmed}". Error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  this.expect(this.cliExitCode).toBe(0);
  this.expect(actual[field]).toBe(expectedValue);
});

Then('I should receive the text {string} without JSON formatting', function (this: RivetBenchWorld, expectedText: string) {
  this.expect(this.cliExitCode).toBe(0);
  
  // Strip potential surrounding quotes from output
  const actualOutput = this.cliOutput!.trim().replace(/^"+|"+$/g, '');
  this.expect(actualOutput).toBe(expectedText);
});

Then('I should receive JSON output despite raw flag', function (this: RivetBenchWorld) {
  this.expect(this.cliExitCode).toBe(0);
  
  const outputTrimmed = this.cliOutput!.trim();
  if (!outputTrimmed) {
    throw new Error('CLI output is empty, cannot parse as JSON');
  }
  
  // Should be valid JSON (complex object)
  let parsed;
  try {
    parsed = JSON.parse(outputTrimmed);
  } catch (error) {
    throw new Error(`Failed to parse CLI output as JSON: "${outputTrimmed}". Error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  this.expect(typeof parsed === 'object' && parsed !== null).toBe(true);
  this.expect(Object.keys(parsed).length).toBeGreaterThan(1);
});

Then('I should receive a CLI validation error', function (this: RivetBenchWorld) {
  this.expect(this.cliExitCode).toBe(1);
  
  const errorTrimmed = this.cliError!.trim();
  if (!errorTrimmed) {
    throw new Error('CLI error output is empty, expected validation error JSON');
  }
  
  let error;
  try {
    error = JSON.parse(errorTrimmed);
  } catch (parseError) {
    throw new Error(`Failed to parse CLI error as JSON: "${errorTrimmed}". Error: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
  }
  
  this.expect(error.error.code).toBe('VALIDATION_ERROR');
});