import { World, IWorldOptions, setWorldConstructor } from '@cucumber/cucumber';
import { FastifyInstance } from 'fastify';
import { expect } from './assertions.js';

/**
 * Custom World class for Cucumber scenarios.
 * Holds shared state across step definitions.
 */
export class RivetBenchWorld extends World {
  // REST server instance
  public restServer?: FastifyInstance;
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
