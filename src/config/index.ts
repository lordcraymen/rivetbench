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
}

export const loadConfig = (): ServerConfig => {
  const mcpTransport = (process.env.RIVETBENCH_MCP_TRANSPORT ?? 'stdio') as 'stdio' | 'tcp';
  const mcpPort = process.env.RIVETBENCH_MCP_PORT 
    ? Number.parseInt(process.env.RIVETBENCH_MCP_PORT, 10)
    : undefined;

  return {
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
      version: '0.1.0',
      description: 'Dual exposed RPC endpoints for REST and MCP.'
    }
  };
};
