import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Each package under example/ has its own vitest config — exclude them here.
    exclude: ['example/**', 'node_modules/**'],
  },
});
