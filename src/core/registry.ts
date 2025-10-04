import { AnyEndpointDefinition } from './endpoint.js';

export interface EndpointRegistry {
  list(): AnyEndpointDefinition[];
  get(name: string): AnyEndpointDefinition | undefined;
  register(endpoint: AnyEndpointDefinition): void;
}

export class InMemoryEndpointRegistry implements EndpointRegistry {
  private readonly endpoints = new Map<string, AnyEndpointDefinition>();

  list(): AnyEndpointDefinition[] {
    return Array.from(this.endpoints.values());
  }

  get(name: string): AnyEndpointDefinition | undefined {
    return this.endpoints.get(name);
  }

  register(endpoint: AnyEndpointDefinition): void {
    if (this.endpoints.has(endpoint.name)) {
      throw new Error(`Endpoint with name "${endpoint.name}" already registered`);
    }

    this.endpoints.set(endpoint.name, endpoint);
  }
}
