/**
 * Simplified assertion utilities for Cucumber tests
 * These mirror Vitest's expect API but work in any context
 */

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

export function expect(actual: unknown) {
  return {
    toBe(expected: unknown) {
      if (actual !== expected) {
        throw new AssertionError(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
      }
    },
    
    toBeDefined() {
      if (actual === undefined || actual === null) {
        throw new AssertionError(`Expected value to be defined, but got ${actual}`);
      }
    },
    
    toHaveProperty(key: string, value?: unknown) {
      if (typeof actual !== 'object' || actual === null) {
        throw new AssertionError(`Expected ${JSON.stringify(actual)} to be an object`);
      }
      
      if (!(key in actual)) {
        throw new AssertionError(`Expected object to have property "${key}"`);
      }
      
      if (value !== undefined) {
        const actualValue = (actual as Record<string, unknown>)[key];
        if (actualValue !== value) {
          throw new AssertionError(
            `Expected property "${key}" to be ${JSON.stringify(value)}, but got ${JSON.stringify(actualValue)}`
          );
        }
      }
    },
    
    toEqual(expected: unknown) {
      const actualStr = JSON.stringify(actual);
      const expectedStr = JSON.stringify(expected);
      if (actualStr !== expectedStr) {
        throw new AssertionError(`Expected ${actualStr} to equal ${expectedStr}`);
      }
    },

    toMatchObject(expected: Record<string, unknown>) {
      if (typeof actual !== 'object' || actual === null) {
        throw new AssertionError(`Expected ${JSON.stringify(actual)} to be an object`);
      }

      const actualObj = actual as Record<string, unknown>;
      for (const [key, value] of Object.entries(expected)) {
        if (!(key in actualObj)) {
          throw new AssertionError(`Expected object to have property "${key}"`);
        }
        if (actualObj[key] !== value) {
          throw new AssertionError(
            `Expected property "${key}" to be ${JSON.stringify(value)}, but got ${JSON.stringify(actualObj[key])}`
          );
        }
      }
    },

    toContain(expected: string) {
      if (typeof actual !== 'string') {
        throw new AssertionError(`Expected ${JSON.stringify(actual)} to be a string`);
      }
      if (!actual.includes(expected)) {
        throw new AssertionError(`Expected "${actual}" to contain "${expected}"`);
      }
    },

    toBeGreaterThan(expected: number) {
      if (typeof actual !== 'number') {
        throw new AssertionError(`Expected ${JSON.stringify(actual)} to be a number`);
      }
      if (actual <= expected) {
        throw new AssertionError(`Expected ${actual} to be greater than ${expected}`);
      }
    }
  };
}
