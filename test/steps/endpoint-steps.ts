import { Given, When, Then } from '@cucumber/cucumber';
import { RivetBenchWorld } from './world.js';
import { createRestServer } from '../../src/server/rest.js';
import { loadConfig } from '../../src/config/index.js';
import { createDefaultRegistry } from '../../src/endpoints/index.js';

/**
 * Step: Given the "endpoint" endpoint is registered with input { ... }
 * Sets up an endpoint call with specific input
 */
Given('the {string} endpoint is registered with input {string}', async function (
  this: RivetBenchWorld,
  endpointName: string,
  inputJson: string
) {
  this.endpointName = endpointName;
  this.endpointInput = JSON.parse(inputJson);

  // Start REST server if not already running
  if (!this.restServer) {
    const config = loadConfig();
    const registry = createDefaultRegistry();
    const server = await createRestServer({ registry, config });
    await server.fastify.listen({ host: '127.0.0.1', port: 0 });
    this.restServer = server.fastify;
    const address = server.fastify.server.address();
    if (address && typeof address === 'object') {
      this.restServerUrl = `http://127.0.0.1:${address.port}`;
    }
  }
});

/**
 * Step: Given the "endpoint" endpoint expects a non-empty "field"
 * Sets up validation expectation for an endpoint
 */
Given('the {string} endpoint expects a non-empty {string}', async function (
  this: RivetBenchWorld,
  endpointName: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _fieldName: string
) {
  this.endpointName = endpointName;

  // Start REST server if not already running
  if (!this.restServer) {
    const config = loadConfig();
    const registry = createDefaultRegistry();
    const server = await createRestServer({ registry, config });
    await server.fastify.listen({ host: '127.0.0.1', port: 0 });
    this.restServer = server.fastify;
    const address = server.fastify.server.address();
    if (address && typeof address === 'object') {
      this.restServerUrl = `http://127.0.0.1:${address.port}`;
    }
  }
});

/**
 * Step: When I call the endpoint
 * Executes the endpoint with stored input
 */
When('I call the endpoint', async function (this: RivetBenchWorld) {
  if (!this.restServer || !this.endpointName) {
    throw new Error('Endpoint not set up. Use a Given step first.');
  }

  const response = await this.restServer.inject({
    method: 'POST',
    url: `/rpc/${this.endpointName}`,
    payload: this.endpointInput as Record<string, unknown>
  });

  this.response = {
    statusCode: response.statusCode,
    body: response.json(),
    headers: response.headers as Record<string, unknown>
  };
});

/**
 * Step: When I call the endpoint with { ... }
 * Executes the endpoint with inline input
 */
When('I call the endpoint with {string}', async function (this: RivetBenchWorld, inputJson: string) {
  if (!this.restServer || !this.endpointName) {
    throw new Error('Endpoint not set up. Use a Given step first.');
  }

  this.endpointInput = JSON.parse(inputJson);

  const response = await this.restServer.inject({
    method: 'POST',
    url: `/rpc/${this.endpointName}`,
    payload: this.endpointInput as Record<string, unknown>
  });

  this.response = {
    statusCode: response.statusCode,
    body: response.json(),
    headers: response.headers as Record<string, unknown>
  };
});

/**
 * Step: Then I should receive a response containing { ... }
 * Asserts response contains expected fields
 */
Then('I should receive a response containing {string}', function (this: RivetBenchWorld, expectedJson: string) {
  this.expect(this.response).toBeDefined();
  this.expect(this.response?.statusCode).toBe(200);

  const expected = JSON.parse(expectedJson);
  
  for (const [key, value] of Object.entries(expected)) {
    this.expect(this.response?.body).toHaveProperty(key, value);
  }
});

/**
 * Step: Then I should receive an endpoint validation error
 * Asserts response is a 400 validation error from REST API
 */
Then('I should receive an endpoint validation error', function (this: RivetBenchWorld) {
  this.expect(this.response).toBeDefined();
  this.expect(this.response?.statusCode).toBe(400);
  this.expect(this.response?.body).toHaveProperty('error');
});
