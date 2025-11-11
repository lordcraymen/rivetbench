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

When('I run {string}', async function (this: RivetBenchWorld, command: string) {
  const args = command.split(' ').filter(arg => arg.length > 0);
  
  // Clear previous output
  this.cliStreams!.stdout.clear();
  this.cliStreams!.stderr.clear();
  
  this.cliExitCode = await this.cli!.run(args);
  this.cliOutput = this.cliStreams!.stdout.read();
  this.cliError = this.cliStreams!.stderr.read();
});

Then('I should receive JSON containing {string}', function (this: RivetBenchWorld, expectedJson: string) {
  const expected = JSON.parse(expectedJson);
  const actual = JSON.parse(this.cliOutput!.trim());
  
  this.expect(this.cliExitCode).toBe(0);
  this.expect(actual).toMatchObject(expected);
});

Then('I should receive JSON with {string} containing {string}', function (this: RivetBenchWorld, field: string, expectedValue: string) {
  const actual = JSON.parse(this.cliOutput!.trim());
  
  this.expect(this.cliExitCode).toBe(0);
  this.expect(actual[field]).toContain(expectedValue);
});

Then('the {string} field should be {float}', function (this: RivetBenchWorld, field: string, expectedValue: number) {
  const actual = JSON.parse(this.cliOutput!.trim());
  
  this.expect(this.cliExitCode).toBe(0);
  this.expect(actual[field]).toBe(expectedValue);
});

Then('I should receive the text {string} without JSON formatting', function (this: RivetBenchWorld, expectedText: string) {
  this.expect(this.cliExitCode).toBe(0);
  this.expect(this.cliOutput!.trim()).toBe(expectedText);
});

Then('I should receive JSON output despite raw flag', function (this: RivetBenchWorld) {
  this.expect(this.cliExitCode).toBe(0);
  
  // Should be valid JSON (complex object)
  const parsed = JSON.parse(this.cliOutput!.trim());
  this.expect(typeof parsed === 'object' && parsed !== null).toBe(true);
  this.expect(Object.keys(parsed).length).toBeGreaterThan(1);
});

Then('I should receive a validation error', function (this: RivetBenchWorld) {
  this.expect(this.cliExitCode).toBe(1);
  
  const error = JSON.parse(this.cliError!.trim());
  this.expect(error.error.code).toBe('VALIDATION_ERROR');
});