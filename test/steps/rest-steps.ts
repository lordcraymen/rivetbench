import { Given, When, Then } from '@cucumber/cucumber';
import { RivetBenchWorld } from './world.js';
import { createRestServer } from '../../src/server/rest.js';
import { loadConfig } from '../../src/config/index.js';
import { createDefaultRegistry } from '../../src/endpoints/index.js';

/**
 * Step: Given the REST server is running
 * Starts the REST server on a random available port
 */
Given('the REST server is running', async function (this: RivetBenchWorld) {
  const config = loadConfig();
  const registry = createDefaultRegistry();
  const server = await createRestServer({ registry, config });
  
  // Start on random port for testing
  await server.fastify.listen({ host: '127.0.0.1', port: 0 });
  
  this.restServer = server.fastify;
  const address = server.fastify.server.address();
  if (address && typeof address === 'object') {
    this.restServerUrl = `http://127.0.0.1:${address.port}`;
  }
});

/**
 * Step: When I GET "/path"
 * Makes a GET request to the REST server
 */
When('I GET {string}', async function (this: RivetBenchWorld, path: string) {
  if (!this.restServer) {
    throw new Error('REST server is not running. Use "Given the REST server is running" first.');
  }

  const response = await this.restServer.inject({
    method: 'GET',
    url: path
  });

  this.response = {
    statusCode: response.statusCode,
    body: response.json(),
    headers: response.headers as Record<string, unknown>
  };
});

/**
 * Step: When I POST to "/path" with body
 * Makes a POST request to the REST server with JSON body
 */
When('I POST to {string} with:', async function (this: RivetBenchWorld, path: string, docString: string) {
  if (!this.restServer) {
    throw new Error('REST server is not running. Use "Given the REST server is running" first.');
  }

  const body = JSON.parse(docString);

  const response = await this.restServer.inject({
    method: 'POST',
    url: path,
    payload: body
  });

  this.response = {
    statusCode: response.statusCode,
    body: response.json(),
    headers: response.headers as Record<string, unknown>
  };
});

/**
 * Step: Then I receive a 200 OK response
 * Asserts the response status code
 */
Then('I receive a {int} OK response', function (this: RivetBenchWorld, expectedStatus: number) {
  this.expect(this.response).toBeDefined();
  this.expect(this.response?.statusCode).toBe(expectedStatus);
});

/**
 * Step: Then I receive a response with status code X
 * Asserts specific status code
 */
Then('I receive a response with status code {int}', function (this: RivetBenchWorld, expectedStatus: number) {
  this.expect(this.response).toBeDefined();
  this.expect(this.response?.statusCode).toBe(expectedStatus);
});

/**
 * Step: And the response body contains { "key": "value" }
 * Asserts the response body contains specific fields
 */
Then('the response body contains {string}', function (this: RivetBenchWorld, expectedBodyJson: string) {
  this.expect(this.response?.body).toBeDefined();
  
  const expectedBody = JSON.parse(expectedBodyJson);
  
  // Check each key in expected body exists in actual response
  for (const [key, value] of Object.entries(expectedBody)) {
    this.expect(this.response?.body).toHaveProperty(key, value);
  }
});
