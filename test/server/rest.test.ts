import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { z } from 'zod';
import { createRestServer } from '../../src/server/rest.js';
import { loadConfig } from '../../src/config/index.js';
import { InMemoryEndpointRegistry } from '../../src/core/registry.js';
import { makeEndpoint } from '../../src/core/endpoint.js';
import type { FastifyInstance } from 'fastify';

describe('REST Server Integration', () => {
  let server: Awaited<ReturnType<typeof createRestServer>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fastify: FastifyInstance<any, any, any, any>;
  let registry: InMemoryEndpointRegistry;
  
  beforeAll(async () => {
    // Load configuration once for deterministic testing
    const config = loadConfig();
    
    // Create a test registry with the echo endpoint
    registry = new InMemoryEndpointRegistry();
    registry.register(makeEndpoint({
      name: 'echo',
      summary: 'Echo endpoint',
      description: 'Echoes back the message',
      input: z.object({ message: z.string().min(1) }),
      output: z.object({ echoed: z.string() }),
      handler: async ({ input }) => ({ echoed: input.message })
    }));
    
    server = await createRestServer({ registry, config });
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
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('name', 'ValidationError');
      expect(body.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(body.error).toHaveProperty('message', 'Invalid endpoint input');
      expect(body.error).toHaveProperty('details');
    });
    
    it('should return 404 for non-existent endpoint', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/rpc/nonexistent',
        payload: {}
      });
      
      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('name', 'EndpointNotFoundError');
      expect(body.error).toHaveProperty('code', 'ENDPOINT_NOT_FOUND');
      expect(body.error).toHaveProperty('message', "Endpoint 'nonexistent' not found");
      expect(body.error.details).toHaveProperty('endpointName', 'nonexistent');
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

  describe('Tool Listing Endpoint', () => {
    it('should return the list of registered tools', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/tools'
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveLength(1);
      expect(body[0]).toEqual({
        name: 'echo',
        summary: 'Echo endpoint',
        description: 'Echoes back the message'
      });
    });

    it('should include an ETag header', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/tools'
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['etag']).toBeDefined();
      expect(response.headers['etag']).toMatch(/^"[a-f0-9]+"$/);
    });

    it('should include Cache-Control: no-cache header', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/tools'
      });

      expect(response.headers['cache-control']).toBe('no-cache');
    });

    it('should return 304 when If-None-Match matches current ETag', async () => {
      const first = await fastify.inject({ method: 'GET', url: '/tools' });
      const etag = first.headers['etag'] as string;

      const second = await fastify.inject({
        method: 'GET',
        url: '/tools',
        headers: { 'if-none-match': etag }
      });

      expect(second.statusCode).toBe(304);
    });

    it('should return 200 when If-None-Match does not match', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/tools',
        headers: { 'if-none-match': '"stale-etag"' }
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return a new ETag after signalToolsChanged', async () => {
      const before = await fastify.inject({ method: 'GET', url: '/tools' });
      const etagBefore = before.headers['etag'];

      registry.signalToolsChanged();

      const after = await fastify.inject({ method: 'GET', url: '/tools' });
      const etagAfter = after.headers['etag'];

      expect(etagBefore).not.toBe(etagAfter);
    });

    it('should apply tool enricher to the listing', async () => {
      registry.setToolEnricher((tools) =>
        tools.map(t => ({ ...t, description: `enriched: ${t.description}` }))
      );

      const response = await fastify.inject({ method: 'GET', url: '/tools' });
      const body = response.json();

      expect(body[0].description).toContain('enriched:');

      // Clean up enricher so other tests are unaffected
      registry.setToolEnricher(undefined);
    });
  });
});
