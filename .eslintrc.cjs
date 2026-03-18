module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  env: {
    node: true,
    es2022: true
  },
  ignorePatterns: ['dist/', 'example/'],
  overrides: [
    // ADR-0001: Domain layer — zero infrastructure imports
    {
      files: ['src/domain/**/*.ts'],
      rules: {
        'no-restricted-imports': ['error', {
          patterns: [
            { group: ['**/adapters/**'], message: 'Domain must not import from adapters (ADR-0001).' },
            { group: ['**/application/**'], message: 'Domain must not import from application (ADR-0001).' },
            { group: ['**/ports/**'], message: 'Domain must not import from ports (ADR-0001).' },
            { group: ['**/composition/**'], message: 'Domain must not import from composition (ADR-0001).' },
            { group: ['**/config/**'], message: 'Domain must not import from config (ADR-0001).' },
          ],
        }],
      },
    },
    // ADR-0001: Ports — only depend on domain types
    {
      files: ['src/ports/**/*.ts'],
      rules: {
        'no-restricted-imports': ['error', {
          patterns: [
            { group: ['**/adapters/**'], message: 'Ports must not import from adapters (ADR-0001).' },
            { group: ['**/application/**'], message: 'Ports must not import from application (ADR-0001).' },
            { group: ['**/composition/**'], message: 'Ports must not import from composition (ADR-0001).' },
          ],
        }],
      },
    },
    // ADR-0001: Application layer — depends on domain + ports, not adapters
    {
      files: ['src/application/**/*.ts'],
      rules: {
        'no-restricted-imports': ['error', {
          patterns: [
            { group: ['**/adapters/**'], message: 'Application must not import from adapters (ADR-0001).' },
            { group: ['**/composition/**'], message: 'Application must not import from composition (ADR-0001).' },
          ],
        }],
      },
    },
    // ADR-0007: MCP adapter — no console.log (breaks stdio protocol)
    {
      files: ['src/adapters/mcp/**/*.ts'],
      rules: {
        'no-console': ['error', { allow: ['error'] }],
      },
    },
  ],
};
