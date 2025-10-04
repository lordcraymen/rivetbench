import { World, IWorldOptions, setWorldConstructor } from '@cucumber/cucumber';
import type { FastifyInstance } from 'fastify';
import { expect } from './assertions.js';

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
  }
}

setWorldConstructor(RivetBenchWorld);
