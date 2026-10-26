import { describe, it, expect } from 'vitest';
import { z } from 'zod/v3';
import { z as foreignZod } from 'zod-foreign/v3';
import { flattenForMcp, objectSchemaForMcp } from './flatten-for-mcp.js';

describe('flattenForMcp', () => {
  describe('non-discriminated-union schemas (pass-through)', () => {
    it('returns a plain z.object() unchanged', () => {
      const schema = z.object({ name: z.string() });
      const result = flattenForMcp(schema);
      expect(result).toBe(schema);
    });

    it('returns z.string() unchanged', () => {
      const schema = z.string();
      const result = flattenForMcp(schema);
      expect(result).toBe(schema);
    });

    it('returns z.array() unchanged', () => {
      const schema = z.array(z.number());
      const result = flattenForMcp(schema);
      expect(result).toBe(schema);
    });
  });

  describe('discriminated union flattening', () => {
    it('flattens a union created by a separate Zod installation', () => {
      const schema = foreignZod.discriminatedUnion('kind', [
        foreignZod.object({ kind: foreignZod.literal('create'), name: foreignZod.string() }),
        foreignZod.object({ kind: foreignZod.literal('remove'), id: foreignZod.string() }),
      ]);

      const flat = flattenForMcp(schema);
      const shape = (flat as z.ZodObject<z.ZodRawShape>).shape;

      expect(Object.keys(shape).sort()).toEqual(['id', 'kind', 'name']);
    });

    it('unwraps optional fields created by a separate Zod installation', () => {
      const schema = foreignZod.discriminatedUnion('kind', [
        foreignZod.object({ kind: foreignZod.literal('a'), value: foreignZod.string().optional() }),
        foreignZod.object({ kind: foreignZod.literal('b'), count: foreignZod.number() }),
      ]);

      const flat = flattenForMcp(schema) as z.ZodObject<z.ZodRawShape>;
      const innerType = flat.shape.value._def.innerType;

      expect(innerType).not.toBeInstanceOf(foreignZod.ZodOptional);
    });

    it('flattens a basic two-variant union', () => {
      const schema = z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('upsert_nodes'), nodes: z.array(z.string()) }),
        z.object({ kind: z.literal('remove'), node_ids: z.array(z.string()) }),
      ]);

      const flat = flattenForMcp(schema);

      // Must be a ZodObject (has .shape)
      expect(flat).toBeInstanceOf(z.ZodObject);

      const shape = (flat as z.ZodObject<z.ZodRawShape>).shape;
      expect(Object.keys(shape).sort()).toEqual(['kind', 'node_ids', 'nodes']);
    });

    it('makes the discriminator a z.enum of all literal values', () => {
      const schema = z.discriminatedUnion('cmd', [
        z.object({ cmd: z.literal('start'), delay: z.number() }),
        z.object({ cmd: z.literal('stop'), reason: z.string() }),
        z.object({ cmd: z.literal('restart'), force: z.boolean() }),
      ]);

      const flat = flattenForMcp(schema) as z.ZodObject<z.ZodRawShape>;
      const cmdField = flat.shape.cmd;

      expect(cmdField).toBeInstanceOf(z.ZodEnum);
      const enumValues = (cmdField as z.ZodEnum<[string, ...string[]]>).options;
      expect(enumValues.sort()).toEqual(['restart', 'start', 'stop']);
    });

    it('marks variant-specific fields as optional', () => {
      const schema = z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('a'), x: z.string() }),
        z.object({ kind: z.literal('b'), y: z.number() }),
      ]);

      const flat = flattenForMcp(schema) as z.ZodObject<z.ZodRawShape>;

      expect(flat.shape.x.isOptional()).toBe(true);
      expect(flat.shape.y.isOptional()).toBe(true);
    });

    it('also marks shared fields as optional (ADR-0010 rule 3: only discriminator required)', () => {
      const schema = z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('a'), shared: z.string(), x: z.number() }),
        z.object({ kind: z.literal('b'), shared: z.string(), y: z.number() }),
      ]);

      const flat = flattenForMcp(schema) as z.ZodObject<z.ZodRawShape>;

      expect(flat.shape.shared.isOptional()).toBe(true);
    });

    it('only the discriminator is required', () => {
      const schema = z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('a'), x: z.string() }),
        z.object({ kind: z.literal('b'), y: z.number() }),
      ]);

      const flat = flattenForMcp(schema) as z.ZodObject<z.ZodRawShape>;

      // Parsing with just the discriminator should succeed
      const result = flat.safeParse({ kind: 'a' });
      expect(result.success).toBe(true);
    });

    it('annotates variant-specific fields with .describe()', () => {
      const schema = z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('upsert'), nodes: z.array(z.string()) }),
        z.object({ kind: z.literal('remove'), node_ids: z.array(z.string()) }),
      ]);

      const flat = flattenForMcp(schema) as z.ZodObject<z.ZodRawShape>;

      const nodesDesc = flat.shape.nodes._def.innerType?.description ?? flat.shape.nodes.description;
      expect(nodesDesc).toContain('kind=upsert');

      const idsDesc = flat.shape.node_ids._def.innerType?.description ?? flat.shape.node_ids.description;
      expect(idsDesc).toContain('kind=remove');
    });

    it('does not annotate shared fields with variant descriptions', () => {
      const schema = z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('a'), shared: z.string() }),
        z.object({ kind: z.literal('b'), shared: z.string() }),
      ]);

      const flat = flattenForMcp(schema) as z.ZodObject<z.ZodRawShape>;

      // shared appears in both variants → no variant annotation
      const innerType = flat.shape.shared._def.innerType;
      const desc = innerType?.description ?? flat.shape.shared.description;
      expect(desc).toBeUndefined();
    });

    it('handles already-optional fields in variants', () => {
      const schema = z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('a'), x: z.string().optional() }),
        z.object({ kind: z.literal('b'), y: z.number() }),
      ]);

      const flat = flattenForMcp(schema) as z.ZodObject<z.ZodRawShape>;

      // x was already optional in its variant; should still be optional in flat
      expect(flat.shape.x.isOptional()).toBe(true);
    });

    it('handles a union with a single variant', () => {
      const schema = z.discriminatedUnion('type', [
        z.object({ type: z.literal('only'), value: z.string() }),
      ]);

      const flat = flattenForMcp(schema) as z.ZodObject<z.ZodRawShape>;

      expect(Object.keys(flat.shape).sort()).toEqual(['type', 'value']);
      expect(flat.shape.type).toBeInstanceOf(z.ZodEnum);
    });

    it('handles many variants', () => {
      const schema = z.discriminatedUnion('op', [
        z.object({ op: z.literal('add'), a: z.number(), b: z.number() }),
        z.object({ op: z.literal('negate'), a: z.number() }),
        z.object({ op: z.literal('concat'), strings: z.array(z.string()) }),
      ]);

      const flat = flattenForMcp(schema) as z.ZodObject<z.ZodRawShape>;

      expect(Object.keys(flat.shape).sort()).toEqual(['a', 'b', 'op', 'strings']);

      // 'a' appears in 'add' and 'negate' (2 of 3), so variant-specific
      const aInner = flat.shape.a._def.innerType;
      const aDesc = aInner?.description ?? flat.shape.a.description;
      expect(aDesc).toContain('op=add|negate');
    });

    it('validates successfully with the flattened schema', () => {
      const schema = z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('a'), x: z.string() }),
        z.object({ kind: z.literal('b'), y: z.number() }),
      ]);

      const flat = flattenForMcp(schema) as z.ZodObject<z.ZodRawShape>;

      // Valid: just discriminator
      expect(flat.safeParse({ kind: 'a' }).success).toBe(true);

      // Valid: discriminator + matching field
      expect(flat.safeParse({ kind: 'a', x: 'hello' }).success).toBe(true);

      // Valid: discriminator + non-matching field (flat schema is relaxed)
      expect(flat.safeParse({ kind: 'a', y: 42 }).success).toBe(true);

      // Invalid: bad discriminator value
      expect(flat.safeParse({ kind: 'c' }).success).toBe(false);
    });
  });

  describe('MCP object schema compatibility', () => {
    it('returns object schemas', () => {
      const schema = z.object({ value: z.string() });
      expect(objectSchemaForMcp(schema)).toBe(schema);
    });

    it('rejects primitive schemas', () => {
      expect(objectSchemaForMcp(z.string())).toBeUndefined();
    });
  });
});
