# Mintlify docs.json Schema Reference (2024-2025)

## Overview

This document provides the complete schema reference for Mintlify's `docs.json` configuration file, based on analysis of real-world configurations and the latest Mintlify documentation.

## Key Changes from mint.json

Mintlify has migrated from `mint.json` to `docs.json` with significant improvements:

1. **Unified Navigation Structure** - Navigation is now defined in a single recursive structure
2. **Better Version Support** - Multi-level versioning with cleaner organization
3. **Improved Terminology** - More consistent naming conventions
4. **Flexible File Organization** - Tabs and anchors no longer restricted to single folders

## Schema Files

- **JSON Schema**: `docs-json-schema.json` - Complete JSON Schema for validation
- **TypeScript Types**: `docs-json-schema.d.ts` - TypeScript type definitions
- **Example**: See `/Users/cordt/repos/docs/docs.json` for a real-world example

## Required Fields

Only these fields are required to get started:
- `name` - Your documentation site name
- `theme` - Visual theme preset
- `colors.primary` - Primary brand color
- `navigation` - Navigation structure

## Theme Options

Current supported themes (2024-2025):
- `mint` (default)
- `maple`
- `palm`
- `willow`
- `linden`
- `almond`
- `aspen`

## Navigation Structure

The navigation field now supports multiple organization patterns:

### Simple Navigation
```json
{
  "navigation": {
    "pages": ["index", "getting-started", "api-reference"]
  }
}
```

### Grouped Navigation
```json
{
  "navigation": {
    "groups": [
      {
        "group": "Getting Started",
        "pages": ["overview", "installation", "quickstart"]
      }
    ]
  }
}
```

### Tabbed Navigation
```json
{
  "navigation": {
    "tabs": [
      {
        "tab": "Documentation",
        "groups": [
          {
            "group": "Guides",
            "pages": ["guide1", "guide2"]
          }
        ]
      },
      {
        "tab": "API Reference",
        "pages": ["endpoints/users", "endpoints/posts"]
      }
    ]
  }
}
```

### Multi-Version Navigation
```json
{
  "navigation": {
    "versions": [
      {
        "version": "v2.0",
        "tabs": [
          {
            "tab": "Documentation",
            "groups": [...]
          }
        ]
      },
      {
        "version": "v1.0",
        "tabs": [...]
      }
    ]
  }
}
```

## Icon Libraries

Supported icon libraries:
- `lucide` (recommended)
- `heroicons`
- `fontawesome`
- `tabler`
- `phosphor`

## Contextual Menu Options

Available options for the contextual menu:
- `copy` - Copy code/text
- `view` - View source
- `chatgpt` - Open in ChatGPT
- `perplexity` - Open in Perplexity
- `mcp` - MCP integration
- `cursor` - Open in Cursor
- `vscode` - Open in VS Code

## Analytics Providers

Supported analytics integrations:
- Google Analytics 4 (`ga4`)
- Google Tag Manager (`gtm`)
- PostHog (`posthog`)
- Mixpanel (`mixpanel`)
- Amplitude (`amplitude`)
- Segment (`segment`)
- Heap (`heap`)
- Clearbit (`clearbit`)
- Fathom (`fathom`)
- Hotjar (`hotjar`)
- Koala (`koala`)
- Plausible (`plausible`)
- LogRocket (`logrocket`)
- Pirsch (`pirsch`)

## Color Configuration

Colors must be valid hex codes:
```json
{
  "colors": {
    "primary": "#FF6B35",
    "light": "#FF8C42",
    "dark": "#C1440E"
  }
}
```

## API Configuration

For OpenAPI/Swagger documentation:
```json
{
  "openapi": ["/openapi-v1.json", "/openapi-v2.json"],
  "api": {
    "baseUrl": "https://api.example.com",
    "auth": {
      "method": "bearer"
    },
    "playground": {
      "mode": "show"
    }
  }
}
```

## Social Media Links

Supported platforms:
- `x` / `twitter`
- `github`
- `discord`
- `slack`
- `linkedin`
- `youtube`
- `facebook`
- `instagram`
- `website`

## Language Support

Supported language codes:
- `en` - English
- `cn` / `zh` / `zh-Hans` / `zh-Hant` - Chinese variants
- `es` - Spanish
- `fr` - French
- `ja` / `jp` - Japanese
- `pt` / `pt-BR` - Portuguese variants
- `de` - German
- `ko` - Korean
- `it` - Italian
- `ru` - Russian
- `id` - Indonesian
- `ar` - Arabic
- `tr` - Turkish

## Migration from mint.json

To migrate from `mint.json` to `docs.json`:

1. Run: `npx mint@latest migrate`
2. Update theme names (venus→mint, quill→maple, prism→palm)
3. Restructure navigation to use the new unified format
4. Remove deprecated properties
5. Test with: `npx mint@latest dev`

## Validation

To validate your `docs.json`:

1. Add schema reference: `"$schema": "https://mintlify.com/docs.json"`
2. Use the provided JSON schema file for IDE validation
3. Test with: `npx mint@latest dev`

## Best Practices

1. **Start Simple** - Begin with required fields only
2. **Use Schema Reference** - Add `$schema` for autocomplete
3. **Organize Navigation** - Use groups for better structure
4. **Version Strategically** - Only use versioning when needed
5. **Test Locally** - Always test with `npx mint@latest dev`

## Common Issues

1. **Invalid theme** - Ensure using new theme names
2. **Navigation structure** - Must be an object, not array
3. **Color format** - Use hex codes (#RRGGBB)
4. **File paths** - Relative to docs root, no .mdx extension

## Resources

- [Mintlify Documentation](https://mintlify.com/docs)
- [Migration Guide](https://mintlify.com/blog/refactoring-mint-json-into-docs-json)
- Example: `/Users/cordt/repos/docs/docs.json`