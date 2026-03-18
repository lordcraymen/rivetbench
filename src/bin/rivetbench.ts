#!/usr/bin/env node
import { loadConfig } from '../config/index.js';
import { createDefaultRegistry } from '../endpoints/index.js';
import { createCli } from '../adapters/cli/adapter.js';

const config = loadConfig();
const registry = createDefaultRegistry();
const cli = createCli({ registry, config });
const exitCode = await cli.run(process.argv.slice(2));
process.exit(exitCode);
