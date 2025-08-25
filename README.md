# Mintlifier - Interactive Mintlify docs.json Configuration Builder

A powerful CLI tool for creating and managing Mintlify documentation configurations with the latest docs.json schema (2024-2025).

## Features

- **Latest Schema Support**: Full support for the new docs.json schema with all 2024-2025 features
- **Interactive Configuration**: Step-by-step wizard for creating docs.json files
- **Smart Defaults**: Pre-configured with best practices and common settings
- **Validation**: Built-in validation for colors, URLs, required fields, and schema compliance
- **Edit Mode**: Modify existing docs.json files with a user-friendly interface
- **Flexible Navigation**: Support for simple, grouped, tabbed, versioned, and multi-language navigation
- **Project Structure**: Automatically generates folder structure and MDX files
- **Schema Documentation**: Complete JSON Schema and TypeScript definitions included

## Quick Start

```bash
# Create a new Mintlify configuration
npx mintlifier

# Edit an existing configuration
npx mintlifier --edit

# Edit a specific config file
npx mintlifier --edit path/to/docs.json

# Run your Mintlify docs locally
cd mintlify-docs
npx mint@latest dev
```

## Installation

```bash
yarn install
# or
npm install
```

## Usage

### Create New Configuration

Run the interactive configuration builder:

```bash
yarn start
# or
node index.js
# or
./index.js
```

### Edit Existing Configuration

Edit an existing docs.json file:

```bash
# Edit docs.json in current directory
node index.js --edit
# or
node index.js -e

# Edit specific file
node index.js --edit /path/to/docs.json
```

When you run Mintlifier in a directory with an existing docs.json, you'll be prompted to either edit it or create a new one.

## What You'll Configure

### 1. Basic Information
- Documentation name and description
- Favicon and logo (with light/dark mode support)
- Theme selection (mint, maple, palm, willow, linden, almond, aspen)

### 2. Colors & Styling
- Primary, light, and dark colors
- Icon library (lucide, heroicons, fontawesome, tabler, phosphor)
- Code block themes
- Contextual menu options (ChatGPT, Claude, Perplexity, etc.)

### 3. Navigation Structure
- Simple pages
- Grouped sections
- Tabbed navigation
- Multi-version documentation
- Multi-language support
- Dropdown menus and anchors

### 4. API Documentation
- Multiple OpenAPI/Swagger files
- API base URL and authentication
- Interactive playground modes

### 5. Analytics & Features
- 14 analytics providers (GA4, PostHog, Mixpanel, Amplitude, etc.)
- Social media integration
- Feedback widgets
- Search configuration
- SEO optimization

## Generated Structure

```
mintlify-docs/
├── docs.json          # Your configuration file (with schema reference)
├── favicon.svg        # Favicon placeholder
├── logo-light.svg     # Light mode logo
├── logo-dark.svg      # Dark mode logo
├── images/            # Assets directory
├── index.mdx          # Homepage
├── getting-started/   # Grouped content
│   ├── overview.mdx
│   ├── installation.mdx
│   └── ...
├── v2.0/              # Versioned content (optional)
│   ├── index.mdx
│   └── changelog.mdx
└── openapi-v1.json    # OpenAPI specs (multiple supported)
```

## Configuration Editor

### Edit Mode

Modify existing configurations interactively:

```bash
# Edit docs.json in current directory
npx mintlifier --edit

# Edit specific file
npx mintlifier --edit ~/projects/docs/docs.json
```

The editor supports all docs.json properties including:
- Theme & color customization
- Navigation restructuring
- Analytics integration
- SEO optimization
- And much more!

### Safety Features
- **Automatic Backup**: Creates timestamped backup before saving changes
- **Validation**: Checks configuration against Mintlify schema
- **Compatibility Warnings**: Alerts for incompatible option combinations
- **Preview**: View full configuration before saving

## Schema Support

### Complete docs.json Schema (2024-2025)

Mintlifier supports the latest Mintlify schema with:

- **Full Property Coverage**: All 40+ configuration properties
- **Type Safety**: Built-in validation for all field types
- **Schema Reference**: Automatic `$schema` inclusion for IDE support
- **Migration Support**: Handles legacy mint.json to docs.json conversion

### Navigation Flexibility

The new unified navigation structure supports:
- Simple page lists
- Grouped content organization  
- Tabbed interfaces
- Multi-version documentation
- Internationalization with 17 languages
- Dropdown menus and anchor sections

## Configuration Options

### Themes (2024-2025)
- `mint` - Default modern theme
- `maple` - Clean professional
- `palm` - Tropical vibrant
- `willow` - Soft and elegant
- `linden` - Nature-inspired
- `almond` - Warm and inviting
- `aspen` - Cool and minimal

### Analytics Providers (14 Supported)
- Google Analytics 4 (GA4)
- Google Tag Manager (GTM)
- PostHog
- Mixpanel
- Amplitude
- Segment
- Heap
- Clearbit
- Fathom
- Hotjar
- Koala
- Plausible
- LogRocket
- Pirsch

### Icon Libraries
- Lucide (recommended)
- Heroicons
- Font Awesome
- Tabler
- Phosphor

### Contextual Menu Options
- Copy
- View Source
- ChatGPT
- Claude
- Perplexity
- MCP
- Cursor
- VS Code

### Supported Languages
- English (en)
- Chinese (zh, zh-Hans, zh-Hant)
- Spanish (es)
- French (fr)
- German (de)
- Japanese (ja)
- Korean (ko)
- Portuguese (pt, pt-BR)
- Italian (it)
- Russian (ru)
- Arabic (ar)
- Turkish (tr)
- Indonesian (id)

## Automation Script

For CI/CD pipelines, use the automation script:

```javascript
// automate-config.js
node automate-config.js
```

This generates a complete docs.json configuration without user interaction, perfect for automated deployments.

## Navigation Structure Example

The new docs.json supports a unified navigation structure:

```json
{
  "$schema": "https://mintlify.com/docs.json",
  "name": "Your Documentation",
  "theme": "mint",
  "colors": {
    "primary": "#0D9373",
    "light": "#07C983",
    "dark": "#0D9373"
  },
  "navigation": {
    "tabs": [
      {
        "tab": "Documentation",
        "groups": [
          {
            "group": "Getting Started",
            "pages": ["overview", "installation", "quickstart"]
          },
          {
            "group": "Features",
            "pages": ["configuration", "versioning"]
          }
        ]
      },
      {
        "tab": "API Reference",
        "pages": ["endpoints/users", "endpoints/posts"]
      }
    ],
    "versions": [
      {
        "version": "v2.0",
        "default": true,
        "tabs": [...]
      },
      {
        "version": "v1.0",
        "tabs": [...]
      }
    ]
  }
}
```

## Documentation

- **[docs-json-schema.json](./docs-json-schema.json)** - Complete JSON Schema for validation
- **[docs-json-schema.d.ts](./docs-json-schema.d.ts)** - TypeScript type definitions
- **[DOCS-JSON-SCHEMA.md](./DOCS-JSON-SCHEMA.md)** - Comprehensive schema documentation

## Migration from mint.json

If you have an existing mint.json file:

1. Run `npx mint@latest migrate` to convert to docs.json
2. Update theme names:
   - venus → mint
   - quill → maple
   - prism → palm
3. Use Mintlifier's edit mode to update navigation structure
4. Test with `npx mint@latest dev`

## Next Steps

After running Mintlifier:

1. Navigate to the generated `mintlify-docs` directory
2. Run locally: `npx mint@latest dev`
3. Make edits to your MDX files
4. Deploy: `npx mint@latest deploy`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT