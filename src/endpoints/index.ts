import { InMemoryEndpointRegistry } from '../core/registry.js';
import { echoEndpoint } from './echo.js';
import { myFuncEndpoint } from './myfunc.js';
import { uppercaseEndpoint } from './uppercase.js';

export const createDefaultRegistry = () => {
  const registry = new InMemoryEndpointRegistry();
  
  // Register default endpoints
  registry.register(echoEndpoint);
  registry.register(myFuncEndpoint);
  registry.register(uppercaseEndpoint);
  
  return registry;
};
