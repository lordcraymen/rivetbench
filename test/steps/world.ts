import { World, IWorldOptions, setWorldConstructor } from '@cucumber/cucumber';
import type { FastifyInstance } from 'fastify';
import { expect } from './assertions.js';

interface CliStreams {
  stdout: { stream: NodeJS.WritableStream; read: () => string; clear: () => void };
  stderr: { stream: NodeJS.WritableStream; read: () => string; clear: () => void };
}

/**
 * Custom World class for Cucumber scenarios.
 * Holds shared state across step definitions.
 */
export class RivetBenchWorld extends World {
  // REST server instance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public restServer?: FastifyInstance<any, any, any, any>;
  public restServerUrl?: string;

  // Response data from API calls
  public response?: {
    statusCode: number;
    body: unknown;
    headers: Record<string, unknown>;
  };

  // Endpoint testing
  public endpointName?: string;
  public endpointInput?: unknown;

  // CLI testing
  public cli?: { run: (args: string[]) => Promise<number> };
  public cliStreams?: CliStreams;
  public cliExitCode?: number;
  public cliOutput?: string;
  public cliError?: string;

  // Test utilities
  public expect = expect;

  constructor(options: IWorldOptions) {
    super(options);
  }

  /**
   * Reset state between scenarios
   */
  async reset() {
    if (this.restServer) {
      await this.restServer.close();
      this.restServer = undefined;
    }
    this.restServerUrl = undefined;
    this.response = undefined;
    this.endpointName = undefined;
    this.endpointInput = undefined;
    
    // Reset CLI state
    this.cli = undefined;
    this.cliStreams = undefined;
    this.cliExitCode = undefined;
    this.cliOutput = undefined;
    this.cliError = undefined;
  }
}

setWorldConstructor(RivetBenchWorld);
