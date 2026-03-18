export interface ServerConfig {
  rest: {
    host: string;
    port: number;
  };
  mcp: {
    transport: 'stdio' | 'tcp';
    port?: number;
  };
  application: {
    name: string;
    version: string;
    description?: string;
  };
  logging: {
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
    pretty: boolean;
  };
  environment: 'development' | 'production' | 'test';
}

/**
 * Recursive partial type that makes every nested property optional.
 * Used by {@link loadConfig} to allow callers to override individual fields.
 *
 * @example
 * ```typescript
 * const overrides: DeepPartial<ServerConfig> = {
 *   application: { name: 'my-app' },
 *   mcp: { transport: 'stdio' },
 * };
 * ```
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Deep-merge `source` into `target`, returning a new object.
 * Override values from `source` win over `target`; `undefined` values in
 * `source` are ignored so callers can provide sparse overrides.
 */
function deepMerge<T extends object>(
  target: T,
  source: DeepPartial<T>,
): T {
  const result = { ...target };

  for (const key of Object.keys(source) as Array<keyof T>) {
    const srcVal = source[key as keyof DeepPartial<T>];
    if (srcVal === undefined) continue;

    const tgtVal = target[key];

    if (
      typeof tgtVal === 'object' &&
      tgtVal !== null &&
      !Array.isArray(tgtVal) &&
      typeof srcVal === 'object' &&
      srcVal !== null &&
      !Array.isArray(srcVal)
    ) {
      result[key] = deepMerge(
        tgtVal as object,
        srcVal as DeepPartial<object>,
      ) as T[keyof T];
    } else {
      result[key] = srcVal as T[keyof T];
    }
  }

  return result;
}

/**
 * Load server configuration from environment variables, optionally deep-merged
 * with programmatic overrides.
 *
 * Env-var values are read first to build base defaults. Any properties present
 * in `overrides` win over the env-var defaults.
 *
 * @param overrides - Optional partial config that is deep-merged on top of
 *   env-var defaults. Useful for library consumers who embed rivetbench
 *   programmatically and need to customise settings without env-var hacks.
 * @returns Fully resolved {@link ServerConfig}.
 *
 * @example
 * ```typescript
 * // Use env-var defaults (existing behaviour)
 * const cfg1 = loadConfig();
 *
 * // Override application name and MCP transport
 * const cfg2 = loadConfig({
 *   application: { name: 'my-app' },
 *   mcp: { transport: 'stdio' },
 * });
 * ```
 */
export const loadConfig = (overrides?: DeepPartial<ServerConfig>): ServerConfig => {
  const mcpTransport = (process.env.RIVETBENCH_MCP_TRANSPORT ?? 'stdio') as 'stdio' | 'tcp';
  const mcpPort = process.env.RIVETBENCH_MCP_PORT 
    ? Number.parseInt(process.env.RIVETBENCH_MCP_PORT, 10)
    : undefined;
  
  const environment = (process.env.NODE_ENV ?? 'development') as 'development' | 'production' | 'test';
  const logLevel = (process.env.LOG_LEVEL ?? 'info') as 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

  const defaults: ServerConfig = {
    rest: {
      host: process.env.RIVETBENCH_REST_HOST ?? '0.0.0.0',
      port: Number.parseInt(process.env.RIVETBENCH_REST_PORT ?? '3000', 10)
    },
    mcp: {
      transport: mcpTransport,
      port: mcpTransport === 'tcp' ? (mcpPort ?? 3001) : mcpPort
    },
    application: {
      name: 'RivetBench',
      version: '1.0.0',
      description: 'Dual exposed RPC endpoints for REST and MCP.'
    },
    logging: {
      level: logLevel,
      pretty: environment === 'development'
    },
    environment
  };

  if (!overrides) {
    return defaults;
  }

  return deepMerge(defaults, overrides);
};
