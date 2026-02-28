import { describe, it, expect, beforeEach, vi } from 'vitest';
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

  describe('signalToolsChanged', () => {
    it('should increment version on each call', () => {
      expect(registry.version).toBe(0);
      registry.signalToolsChanged();
      expect(registry.version).toBe(1);
      registry.signalToolsChanged();
      expect(registry.version).toBe(2);
    });

    it('should notify all registered listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      registry.onToolsChanged(listener1);
      registry.onToolsChanged(listener2);
      registry.signalToolsChanged();

      expect(listener1).toHaveBeenCalledOnce();
      expect(listener2).toHaveBeenCalledOnce();
    });

    it('should not notify unsubscribed listeners', () => {
      const listener = vi.fn();
      const unsubscribe = registry.onToolsChanged(listener);

      unsubscribe();
      registry.signalToolsChanged();

      expect(listener).not.toHaveBeenCalled();
    });

    it('should change the ETag after signal', () => {
      registry.register(makeEndpoint({
        name: 'a',
        summary: 'A',
        input: z.object({}),
        output: z.object({}),
        handler: async () => ({})
      }));

      const etagBefore = registry.etag;
      registry.signalToolsChanged();
      const etagAfter = registry.etag;

      expect(etagBefore).not.toBe(etagAfter);
    });
  });

  describe('ETag', () => {
    it('should return a quoted string ETag', () => {
      expect(registry.etag).toMatch(/^"[a-f0-9]+"$/);
    });

    it('should return a stable ETag for the same state', () => {
      registry.register(makeEndpoint({
        name: 'stable',
        summary: 'Stable',
        input: z.object({}),
        output: z.object({}),
        handler: async () => ({})
      }));

      expect(registry.etag).toBe(registry.etag);
    });

    it('should change ETag when an endpoint is registered', () => {
      const etagEmpty = registry.etag;

      registry.register(makeEndpoint({
        name: 'new',
        summary: 'New',
        input: z.object({}),
        output: z.object({}),
        handler: async () => ({})
      }));

      expect(registry.etag).not.toBe(etagEmpty);
    });
  });

  describe('setToolEnricher / listEnriched', () => {
    it('should return unmodified list when no enricher is set', () => {
      const endpoint = makeEndpoint({
        name: 'raw',
        summary: 'Raw',
        input: z.object({}),
        output: z.object({}),
        handler: async () => ({})
      });
      registry.register(endpoint);

      const enriched = registry.listEnriched({ transportType: 'rest' });
      expect(enriched).toEqual(registry.list());
    });

    it('should apply the enricher to the tool list', () => {
      registry.register(makeEndpoint({
        name: 'keep',
        summary: 'Keep',
        input: z.object({}),
        output: z.object({}),
        handler: async () => ({})
      }));
      registry.register(makeEndpoint({
        name: 'remove',
        summary: 'Remove',
        input: z.object({}),
        output: z.object({}),
        handler: async () => ({})
      }));

      registry.setToolEnricher((tools) =>
        tools.filter(t => t.name !== 'remove')
      );

      const enriched = registry.listEnriched({ transportType: 'rest' });
      expect(enriched).toHaveLength(1);
      expect(enriched[0].name).toBe('keep');
    });

    it('should pass context to the enricher', () => {
      registry.register(makeEndpoint({
        name: 'ctx',
        summary: 'Ctx',
        input: z.object({}),
        output: z.object({}),
        handler: async () => ({})
      }));

      const enricherSpy = vi.fn((tools) => tools);
      registry.setToolEnricher(enricherSpy);

      registry.listEnriched({ transportType: 'mcp', sessionId: 'sess-1' });

      expect(enricherSpy).toHaveBeenCalledWith(
        expect.any(Array),
        { transportType: 'mcp', sessionId: 'sess-1' }
      );
    });

    it('should clear the enricher when undefined is passed', () => {
      registry.register(makeEndpoint({
        name: 'x',
        summary: 'X',
        input: z.object({}),
        output: z.object({}),
        handler: async () => ({})
      }));

      registry.setToolEnricher(() => []);
      expect(registry.listEnriched({ transportType: 'rest' })).toHaveLength(0);

      registry.setToolEnricher(undefined);
      expect(registry.listEnriched({ transportType: 'rest' })).toHaveLength(1);
    });
  });

  describe('onToolsChanged', () => {
    it('should return an unsubscribe function', () => {
      const listener = vi.fn();
      const unsub = registry.onToolsChanged(listener);

      expect(typeof unsub).toBe('function');
    });

    it('should support multiple listeners independently', () => {
      const listenerA = vi.fn();
      const listenerB = vi.fn();

      const unsubA = registry.onToolsChanged(listenerA);
      registry.onToolsChanged(listenerB);

      unsubA();
      registry.signalToolsChanged();

      expect(listenerA).not.toHaveBeenCalled();
      expect(listenerB).toHaveBeenCalledOnce();
    });
  });
});
