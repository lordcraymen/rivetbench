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

export const loadConfig = (): ServerConfig => ({
  rest: {
    host: process.env.RIVETBENCH_REST_HOST ?? '0.0.0.0',
    port: Number.parseInt(process.env.RIVETBENCH_REST_PORT ?? '3000', 10)
  },
  mcp: {
    transport: 'stdio'
  },
  application: {
    name: 'RivetBench',
    version: '0.1.0',
    description: 'Dual exposed RPC endpoints for REST and MCP.'
  }
});
