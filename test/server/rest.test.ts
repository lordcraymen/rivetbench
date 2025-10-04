import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { z } from 'zod';
import { createRestServer } from '../../src/server/rest.js';
import { InMemoryEndpointRegistry } from '../../src/core/registry.js';
import { makeEndpoint } from '../../src/core/endpoint.js';
import type { FastifyInstance } from 'fastify';

describe('REST Server Integration', () => {
  let server: Awaited<ReturnType<typeof createRestServer>>;
  let fastify: FastifyInstance;
  
  beforeAll(async () => {
    // Create a test registry with the echo endpoint
    const registry = new InMemoryEndpointRegistry();
    registry.register(makeEndpoint({
      name: 'echo',
      summary: 'Echo endpoint',
      description: 'Echoes back the message',
      input: z.object({ message: z.string().min(1) }),
      output: z.object({ echoed: z.string() }),
      handler: async ({ input }) => ({ echoed: input.message })
    }));
    
    server = await createRestServer({ registry });
    fastify = server.fastify;
    
    // Start server on a random port for testing
    await fastify.listen({ host: '127.0.0.1', port: 0 });
  });
  
  afterAll(async () => {
    await fastify.close();
  });
  
  describe('Health Endpoint', () => {
    it('should return ok status', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/health'
      });
      
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: 'ok' });
    });
  });
  
  describe('RPC Endpoints', () => {
    it('should successfully call echo endpoint', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/rpc/echo',
        payload: { message: 'Hello' }
      });
      
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ echoed: 'Hello' });
    });
    
    it('should return 400 for invalid input', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/rpc/echo',
        payload: { message: '' }
      });
      
      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body).toHaveProperty('error', 'Invalid input');
      expect(body).toHaveProperty('details');
    });
    
    it('should return 404 for non-existent endpoint', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/rpc/nonexistent',
        payload: {}
      });
      
      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ error: 'Endpoint not found' });
    });
  });
  
  describe('Swagger UI Integration', () => {
    it('should serve Swagger UI at /docs', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/docs'
      });
      
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
    });
    
    it('should serve Swagger static assets', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/docs/static/swagger-initializer.js'
      });
      
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/javascript');
    });
  });
  
  describe('OpenAPI Documentation', () => {
    it('should serve OpenAPI JSON document', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/docs/json'
      });
      
      expect(response.statusCode).toBe(200);
      const doc = response.json();
      
      expect(doc).toHaveProperty('openapi', '3.0.3');
      expect(doc).toHaveProperty('info');
      expect(doc.info).toHaveProperty('title', 'RivetBench');
      expect(doc).toHaveProperty('paths');
      expect(doc.paths).toHaveProperty('/rpc/echo');
    });
    
    it('should include proper schemas in OpenAPI document', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/docs/json'
      });
      
      const doc = response.json();
      const echoPath = doc.paths['/rpc/echo'];
      
      expect(echoPath).toBeDefined();
      expect(echoPath.post).toBeDefined();
      
      // Check request schema
      const requestSchema = echoPath.post.requestBody?.content?.['application/json']?.schema;
      expect(requestSchema).toBeDefined();
      expect(requestSchema.type).toBe('object');
      expect(requestSchema.properties).toHaveProperty('message');
      expect(requestSchema.properties.message.minLength).toBe(1);
      
      // Check response schema
      const responseSchema = echoPath.post.responses['200']?.content?.['application/json']?.schema;
      expect(responseSchema).toBeDefined();
      expect(responseSchema.type).toBe('object');
      expect(responseSchema.properties).toHaveProperty('echoed');
    });
  });
});
