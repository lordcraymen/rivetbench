import { InMemoryEndpointRegistry } from '../core/registry.js';
import { echoEndpoint } from './echo.js';

export const createDefaultRegistry = () => {
  const registry = new InMemoryEndpointRegistry();
  
  // Register default endpoints
  registry.register(echoEndpoint);
  
  return registry;
};
