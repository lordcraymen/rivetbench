import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { InMemoryEndpointRegistry } from '../../src/core/registry.js';
import { makeEndpoint } from '../../src/core/endpoint.js';

describe('InMemoryEndpointRegistry', () => {
  let registry: InMemoryEndpointRegistry;
  
  beforeEach(() => {
    registry = new InMemoryEndpointRegistry();
  });
  
  it('should start with an empty list', () => {
    expect(registry.list()).toEqual([]);
  });
  
  it('should register an endpoint', () => {
    const endpoint = makeEndpoint({
      name: 'test',
      summary: 'Test',
      input: z.object({}),
      output: z.object({}),
      handler: async () => ({})
    });
    
    registry.register(endpoint);
    
    expect(registry.list()).toHaveLength(1);
    expect(registry.list()[0]).toBe(endpoint);
  });
  
  it('should retrieve an endpoint by name', () => {
    const endpoint = makeEndpoint({
      name: 'test',
      summary: 'Test',
      input: z.object({}),
      output: z.object({}),
      handler: async () => ({})
    });
    
    registry.register(endpoint);
    
    expect(registry.get('test')).toBe(endpoint);
  });
  
  it('should return undefined for non-existent endpoint', () => {
    expect(registry.get('nonexistent')).toBeUndefined();
  });
  
  it('should throw error when registering duplicate endpoint name', () => {
    const endpoint1 = makeEndpoint({
      name: 'test',
      summary: 'Test 1',
      input: z.object({}),
      output: z.object({}),
      handler: async () => ({})
    });
    
    const endpoint2 = makeEndpoint({
      name: 'test',
      summary: 'Test 2',
      input: z.object({}),
      output: z.object({}),
      handler: async () => ({})
    });
    
    registry.register(endpoint1);
    
    expect(() => registry.register(endpoint2)).toThrow(
      'Endpoint with name "test" already registered'
    );
  });
  
  it('should list multiple registered endpoints', () => {
    const endpoint1 = makeEndpoint({
      name: 'test1',
      summary: 'Test 1',
      input: z.object({}),
      output: z.object({}),
      handler: async () => ({})
    });
    
    const endpoint2 = makeEndpoint({
      name: 'test2',
      summary: 'Test 2',
      input: z.object({}),
      output: z.object({}),
      handler: async () => ({})
    });
    
    registry.register(endpoint1);
    registry.register(endpoint2);
    
    expect(registry.list()).toHaveLength(2);
    expect(registry.list()).toContain(endpoint1);
    expect(registry.list()).toContain(endpoint2);
  });
});
