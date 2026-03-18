---
title: "ADR-0009: CLI Flag and Parameter Separation"
date: "2026-03-18"
status: accepted
tags:
  - cli
  - flags
  - parameters
  - collision-avoidance
modules:
  - src/adapters/cli/
summary: >-
  Use double dashes (--) for CLI flags and single dash (-) for endpoint parameters to avoid naming collisions between framework flags and user-defined endpoint input.
supersedes:
  - "LEGACY-ADR-0008 (CLI Flag and Parameter Separation)"
---

# Context

CLI commands mix framework flags (e.g. `--raw`, `--params-json`) with endpoint parameters (e.g. `-message`, `-text`). If both use the same prefix convention, naming collisions occur when an endpoint parameter matches a framework flag name.

# Decision

### Convention

| Prefix | Usage | Example |
|--------|-------|---------|
| `--` (double dash) | CLI framework flags | `--raw`, `--params-json` |
| `-` (single dash) | Endpoint parameters | `-message "Hello"`, `-text "world"` |

### Input Modes

1. **Named parameters**: `-key value` pairs parsed as endpoint input
2. **JSON input**: `--params-json '{"key": "value"}'` for complex payloads
3. Mixing the two is not allowed (explicit error)

### Examples

```bash
# Named parameters
rivetbench call echo -message "Hello"

# Named with raw output flag
rivetbench call uppercase -text "world" --raw

# JSON input
rivetbench call echo --params-json '{"message":"Hello"}'

# Help
rivetbench --help
```

### Auto-parsing of named parameters

Values are parsed as:
- Numbers if they match `/^-?\d+(\.\d+)?$/`
- Booleans if `true` / `false`
- JSON arrays/objects if they start with `[` or `{`
- Strings otherwise

# Consequences

**Positive**:
- No naming collisions between CLI flags and endpoint parameters
- Clear visual distinction for users
- Follows Unix convention (double dash for long flags)

**Negative**:
- More verbose than single-character short flags
- Users must remember the convention

# References

- GNU argument syntax conventions
- [ADR-0002: Application Service Layer](./ADR-0002-application-service-layer.md) — CLI adapter calls the same use case
