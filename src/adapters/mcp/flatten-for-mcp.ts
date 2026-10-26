/**
 * Flatten Zod discriminated unions into a single object schema for MCP tool registration.
 *
 * The MCP SDK's `normalizeObjectSchema` only recognizes `z.object()` schemas
 * (it checks for `.shape`).  A `ZodDiscriminatedUnion` has no `.shape`, so
 * MCP clients receive empty parameter definitions.
 *
 * This module applies ADR-0010: flatten `z.discriminatedUnion()` schemas into
 * a single `z.object()` so that agents see all parameters, while validation
 * still uses the original schema.
 *
 * @see docs/adr/ADR-0010-discriminated-union-flattening-for-mcp.md
 *
 * @example
 * ```typescript
 * const flat = flattenForMcp(z.discriminatedUnion("kind", [
 *   z.object({ kind: z.literal("a"), x: z.string() }),
 *   z.object({ kind: z.literal("b"), y: z.number() }),
 * ]));
 * // → z.object({ kind: z.enum(["a","b"]), x: z.string().optional(), y: z.number().optional() })
 * ```
 */
import { z, type ZodTypeAny } from 'zod/v3';

type DiscriminatedUnionLike = ZodTypeAny & {
  discriminator: string;
  options: z.ZodObject<z.ZodRawShape>[];
};

/**
 * If `schema` is a `ZodDiscriminatedUnion`, return a flattened `z.object()`
 * suitable for MCP `inputSchema`.  All other schema types pass through unchanged.
 *
 * @param schema - The original endpoint input schema.
 * @returns A `z.object()` when flattened, or the original schema if no flattening is needed.
 *
 * @example
 * ```typescript
 * mcp.registerTool(endpoint.name, {
 *   description: endpoint.description || endpoint.summary,
 *   inputSchema: flattenForMcp(endpoint.input),
 * }, handler);
 * ```
 */
export function flattenForMcp(schema: ZodTypeAny): ZodTypeAny {
  if (isDiscriminatedUnion(schema)) {
    return flattenDiscriminatedUnion(schema);
  }
  return schema;
}

/**
 * Convert a compatible endpoint schema into an MCP object schema.
 *
 * @param schema - Endpoint input or output schema.
 * @returns An object-compatible schema, or `undefined` when MCP cannot
 *          represent the endpoint contract as structured content.
 *
 * @example
 * ```typescript
 * const schema = objectSchemaForMcp(z.object({ answer: z.string() }));
 * // schema is suitable for MCP inputSchema/outputSchema
 * ```
 */
export function objectSchemaForMcp(schema: ZodTypeAny): ZodTypeAny | undefined {
  const candidate = flattenForMcp(schema);
  return hasObjectShape(candidate) ? candidate : undefined;
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

/**
 * Flatten a single `ZodDiscriminatedUnion` into a `z.object()`.
 *
 * Rules (ADR-0010):
 * 1. Discriminator → `z.enum([...all literal values])`.
 * 2. Variant-specific fields → `.optional().describe("Required when <disc>=<values>.")`.
 * 3. Only the discriminator is in `required`.
 * 4. Shared fields (present in every variant) → `.optional()` (per ADR: only discriminator required).
 */
function flattenDiscriminatedUnion(
  schema: DiscriminatedUnionLike,
): z.ZodObject<z.ZodRawShape> {
  const discriminator: string = schema.discriminator;
  const options = schema.options;

  const discriminatorValues: string[] = [];
  /** field name → list of discriminator values where it appears */
  const fieldVariantMap = new Map<string, string[]>();
  /** field name → first-encountered Zod schema (used as representative type) */
  const fieldSchemaMap = new Map<string, ZodTypeAny>();

  for (const option of options) {
    const shape = option.shape as Record<string, ZodTypeAny>;
    const litValue = String((shape[discriminator] as z.ZodLiteral<string>).value);
    discriminatorValues.push(litValue);

    for (const [key, fieldSchema] of Object.entries(shape)) {
      if (key === discriminator) continue;

      if (!fieldVariantMap.has(key)) {
        fieldVariantMap.set(key, []);
        fieldSchemaMap.set(key, fieldSchema);
      }
      fieldVariantMap.get(key)!.push(litValue);
    }
  }

  const flatShape: Record<string, ZodTypeAny> = {};

  // Discriminator as enum (always required)
  flatShape[discriminator] = z.enum(discriminatorValues as [string, ...string[]]);

  // Merge variant fields
  for (const [key, variants] of fieldVariantMap) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    let field = fieldSchemaMap.get(key)!;

    // Strip existing optionality so we can re-wrap consistently
    const baseField = unwrapOptional(field);

    const inAllVariants = variants.length === options.length;
    const description = inAllVariants
      ? undefined
      : `Required when ${discriminator}=${variants.join('|')}.`;

    field = description ? baseField.describe(description) : baseField;
    // ADR-0010 rule 3: only the discriminator is required in the flat schema
    field = field.optional();

    flatShape[key] = field;
  }

  return z.object(flatShape);
}

/** Unwrap one layer of `ZodOptional` so we can re-apply `.optional()` uniformly. */
function unwrapOptional(schema: ZodTypeAny): ZodTypeAny {
  const candidate = schema as unknown as { unwrap?: () => ZodTypeAny };
  if (
    hasTypeName(schema, z.ZodFirstPartyTypeKind.ZodOptional) &&
    typeof candidate.unwrap === 'function'
  ) {
    return candidate.unwrap();
  }
  return schema;
}

function isDiscriminatedUnion(
  schema: ZodTypeAny,
): schema is DiscriminatedUnionLike {
  if (!hasTypeName(schema, z.ZodFirstPartyTypeKind.ZodDiscriminatedUnion)) return false;
  const candidate = schema as unknown as { discriminator?: unknown; options?: unknown };
  return typeof candidate.discriminator === 'string' && Array.isArray(candidate.options);
}

function hasObjectShape(schema: ZodTypeAny): boolean {
  const candidate = schema as unknown as { shape?: unknown };
  return candidate.shape !== undefined;
}

function hasTypeName(schema: ZodTypeAny, typeName: z.ZodFirstPartyTypeKind): boolean {
  const candidate = schema as unknown as { _def?: { typeName?: unknown } };
  return candidate._def?.typeName === typeName;
}
