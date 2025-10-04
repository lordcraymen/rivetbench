import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { buildOpenApiDocument } from '../../src/core/openapi.js';
import { makeEndpoint } from '../../src/core/endpoint.js';

describe('buildOpenApiDocument', () => {
  it('should generate a valid OpenAPI 3.0.3 document', () => {
    const endpoint = makeEndpoint({
      name: 'echo',
      summary: 'Echo endpoint',
      description: 'Echoes back the message',
      input: z.object({ message: z.string() }),
      output: z.object({ echoed: z.string() }),
      handler: async ({ input }) => ({ echoed: input.message })
    });
    
    const document = buildOpenApiDocument([endpoint], {
      title: 'Test API',
      version: '1.0.0',
      description: 'Test API description'
    });
    
    expect(document.openapi).toBe('3.0.3');
    expect(document.info.title).toBe('Test API');
    expect(document.info.version).toBe('1.0.0');
    expect(document.info.description).toBe('Test API description');
  });
  
  it('should generate paths for each endpoint', () => {
    const endpoint1 = makeEndpoint({
      name: 'echo',
      summary: 'Echo',
      input: z.object({}),
      output: z.object({}),
      handler: async () => ({})
    });
    
    const endpoint2 = makeEndpoint({
      name: 'test',
      summary: 'Test',
      input: z.object({}),
      output: z.object({}),
      handler: async () => ({})
    });
    
    const document = buildOpenApiDocument([endpoint1, endpoint2], {
      title: 'Test API',
      version: '1.0.0'
    });
    
    expect(document.paths).toHaveProperty('/rpc/echo');
    expect(document.paths).toHaveProperty('/rpc/test');
  });
  
  it('should include proper schema conversion from Zod', () => {
    const endpoint = makeEndpoint({
      name: 'echo',
      summary: 'Echo endpoint',
      input: z.object({ 
        message: z.string().min(1, 'Message cannot be empty')
      }),
      output: z.object({ 
        echoed: z.string() 
      }),
      handler: async ({ input }) => ({ echoed: input.message })
    });
    
    const document = buildOpenApiDocument([endpoint], {
      title: 'Test API',
      version: '1.0.0'
    });
    
    const path = document.paths['/rpc/echo'];
    expect(path).toBeDefined();
    
    if (!path || !path.post) {
      throw new Error('Path or POST operation not defined');
    }
    
    // Check request body schema
    const requestBody = path.post.requestBody;
    expect(requestBody).toBeDefined();
    if (!requestBody || '$ref' in requestBody) {
      throw new Error('Request body not properly defined');
    }
    
    const requestSchema = requestBody.content?.['application/json']?.schema;
    expect(requestSchema).toBeDefined();
    expect(requestSchema).toHaveProperty('type', 'object');
    expect(requestSchema).toHaveProperty('properties');
    
    // Check response schema
    const response200 = path.post.responses['200'];
    expect(response200).toBeDefined();
    if (!response200 || '$ref' in response200) {
      throw new Error('Response not properly defined');
    }
    
    const responseSchema = response200.content?.['application/json']?.schema;
    expect(responseSchema).toBeDefined();
    expect(responseSchema).toHaveProperty('type', 'object');
    expect(responseSchema).toHaveProperty('properties');
  });
  
  it('should include error response schemas', () => {
    const endpoint = makeEndpoint({
      name: 'test',
      summary: 'Test',
      input: z.object({}),
      output: z.object({}),
      handler: async () => ({})
    });
    
    const document = buildOpenApiDocument([endpoint], {
      title: 'Test API',
      version: '1.0.0'
    });
    
    const path = document.paths['/rpc/test'];
    expect(path).toBeDefined();
    
    if (!path || !path.post) {
      throw new Error('Path or POST operation not defined');
    }
    
    expect(path.post.responses).toHaveProperty('200');
    expect(path.post.responses).toHaveProperty('400');
    expect(path.post.responses).toHaveProperty('404');
    
    // Verify 400 response structure
    const error400 = path.post.responses['400'];
    if (!error400 || '$ref' in error400) {
      throw new Error('400 response not properly defined');
    }
    expect(error400.description).toBe('Validation error');
    
    // Verify 404 response structure
    const error404 = path.post.responses['404'];
    if (!error404 || '$ref' in error404) {
      throw new Error('404 response not properly defined');
    }
    expect(error404.description).toBe('Endpoint not found');
  });
});
