import { createHash } from 'node:crypto';
import { AnyEndpointDefinition } from './endpoint.js';

/**
 * Context passed to tool enricher functions for per-request customization.
 *
 * @example
 * ```typescript
 * registry.setToolEnricher((tools, ctx) => {
 *   if (ctx.transportType === 'rest') return tools.filter(t => !t.name.startsWith('internal-'));
 *   return tools;
 * });
 * ```
 */
export interface ToolEnricherContext {
  /** Unique session or request identifier */
  sessionId?: string;
  /** Transport that triggered the listing */
  transportType: 'rest' | 'mcp' | 'cli';
}

/**
 * Signature for tool-enricher callbacks.
 * The function receives the current tool list and per-request context and must
 * return the (possibly filtered / annotated) list.
 */
export type ToolEnricher = (
  tools: AnyEndpointDefinition[],
  context: ToolEnricherContext,
) => AnyEndpointDefinition[];

/** Callback invoked when the tool list changes. */
export type ToolsChangedListener = () => void;

export interface EndpointRegistry {
  list(): AnyEndpointDefinition[];
  get(name: string): AnyEndpointDefinition | undefined;
  register(endpoint: AnyEndpointDefinition): void;

  /**
   * Signal that the available tool list has changed.
   * Bumps the internal version and notifies all registered listeners
   * (e.g. MCP sessions that need to send `notifications/tools/list_changed`).
   */
  signalToolsChanged(): void;

  /**
   * Set an optional enricher that transforms the tool list before it is served.
   * Pass `undefined` to clear a previously set enricher.
   *
   * @example
   * ```typescript
   * registry.setToolEnricher((tools, ctx) => {
   *   return tools.map(t => ({ ...t, description: `[${ctx.transportType}] ${t.description}` }));
   * });
   * ```
   */
  setToolEnricher(fn: ToolEnricher | undefined): void;

  /**
   * Return the tool list after applying the current enricher (if any).
   * Falls back to {@link list} when no enricher is set.
   */
  listEnriched(context: ToolEnricherContext): AnyEndpointDefinition[];

  /**
   * Register a listener that is called whenever {@link signalToolsChanged} fires.
   * Returns an unsubscribe function.
   */
  onToolsChanged(listener: ToolsChangedListener): () => void;

  /** Current ETag (content-hash) for the tool list. */
  get etag(): string;

  /** Monotonic version counter; bumped on every {@link signalToolsChanged} call. */
  get version(): number;
}

export class InMemoryEndpointRegistry implements EndpointRegistry {
  private readonly endpoints = new Map<string, AnyEndpointDefinition>();
  private readonly listeners = new Set<ToolsChangedListener>();
  private enricher: ToolEnricher | undefined;
  private internalVersion = 0;
  private cachedEtag: string | undefined;

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
    this.invalidateEtag();
  }

  signalToolsChanged(): void {
    this.internalVersion += 1;
    this.invalidateEtag();
    for (const listener of this.listeners) {
      listener();
    }
  }

  setToolEnricher(fn: ToolEnricher | undefined): void {
    this.enricher = fn;
  }

  listEnriched(context: ToolEnricherContext): AnyEndpointDefinition[] {
    const tools = this.list();
    if (!this.enricher) {
      return tools;
    }
    return this.enricher(tools, context);
  }

  onToolsChanged(listener: ToolsChangedListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  get etag(): string {
    if (!this.cachedEtag) {
      this.cachedEtag = this.computeEtag();
    }
    return this.cachedEtag;
  }

  get version(): number {
    return this.internalVersion;
  }

  /** Invalidate cached ETag so it is recomputed on next access. */
  private invalidateEtag(): void {
    this.cachedEtag = undefined;
  }

  /** Compute a deterministic ETag from endpoint names, version, and descriptions. */
  private computeEtag(): string {
    const parts = this.list().map(e => `${e.name}:${e.summary ?? ''}:${e.description ?? ''}`);
    const payload = `v${this.internalVersion}:${parts.join('|')}`;
    const hash = createHash('sha256').update(payload).digest('hex').slice(0, 16);
    return `"${hash}"`;
  }
}
