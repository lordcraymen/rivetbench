# ADR-0008: CLI Flag and Parameter Separation

**Status**: Active
**Date**: 2025-11-11
**Deciders**: Architecture Team

## Context

The RivetBench CLI currently uses a mixed approach for flags and parameters:
- Short flags: `-r` (raw output), `-i` (JSON input)
- Long flags: `--raw`, `--input`
- Endpoint parameters: `-paramName value`

This creates potential naming collisions when an endpoint has a parameter that matches a short flag. For example, if an endpoint has a parameter named "r", the command `rivetbench call myendpoint -r someValue --raw` becomes ambiguous - is `-r` setting the "r" parameter or enabling raw output?

Additionally, the current `-i`/`--input` flag name is not clear about its purpose (JSON parameter input).

## Decision

We will enforce a clear separation between CLI flags and endpoint parameters:

1. **CLI flags must use double dashes (`--`)** with no short form alternatives
2. **Endpoint parameters must use single dash (`-`)**
3. **Rename `--input` to `--params-json`** for clarity

### New CLI syntax:
- `--raw` - Enable raw output (no `-r` shorthand)
- `--params-json` - Provide parameters as JSON object (replaces `--input`/`-i`)
- `-paramName value` - Set individual endpoint parameters

### Examples:
```bash
# Raw output with parameter
rivetbench call uppercase -text "world" --raw

# JSON parameters
rivetbench call echo --params-json '{"message":"hello"}'

# Mixed is not allowed - choose one approach
rivetbench call echo -message "hello" --params-json '{"other":"data"}'  # ERROR
```

## Consequences

### Positive:
- **No naming collisions** between CLI flags and endpoint parameters
- **Clear semantic distinction** between framework flags and endpoint data
- **Better API naming** with `--params-json` being more descriptive than `--input`
- **Consistent with Unix conventions** where `--` typically denotes long-form options

### Negative:
- **Breaking change** for existing users using `-r` and `-i`/`--input`
- **Slightly more verbose** for common operations (no short flags)
- **Migration effort** required for documentation and scripts

### Neutral:
- **Consistent with many CLI tools** that use `--` for flags and `-` for options
- **Clear parsing rules** make the implementation more robust

## Implementation Notes

1. Update `parseCallArgs` function to only recognize `--` prefixed flags
2. Reject any attempts to mix `--params-json` with individual `-param` syntax
3. Update all tests and documentation
4. Add clear error messages for deprecated flag usage

## Related ADRs

- [ADR-0005: MCP STDIO Logging Constraints](./ADR-0005-mcp-stdio-logging-constraints.md) - Shows importance of clear CLI interfaces