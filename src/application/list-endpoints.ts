import type { EndpointRegistry, ToolEnricherContext } from '../domain/registry.js';

/**
 * Summary of an endpoint for transport listing.
 */
export interface EndpointSummary {
  name: string;
  summary: string;
  description?: string;
}

/**
 * List endpoints from the registry, optionally applying the tool enricher.
 *
 * @param registry - The endpoint registry.
 * @param context  - Transport context for enrichment.
 * @returns An array of endpoint summaries.
 *
 * @example
 * ```typescript
 * const tools = listEndpoints(registry, { transportType: 'rest', sessionId: req.id });
 * ```
 */
export function listEndpoints(
  registry: EndpointRegistry,
  context: ToolEnricherContext,
): EndpointSummary[] {
  const enriched = registry.listEnriched(context);
  return enriched.map(e => ({
    name: e.name,
    summary: e.summary,
    description: e.description,
  }));
}
