import { InMemoryEndpointRegistry } from '../core/registry.js';

export const createDefaultRegistry = () => {
  const registry = new InMemoryEndpointRegistry();
  // Register default endpoints here as they are created.
  return registry;
};
