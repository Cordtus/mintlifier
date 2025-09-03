# Mintlifier - Interactive Mintlify docs.json Configuration Builder

A powerful CLI tool for creating and managing Mintlify documentation configurations with the latest docs.json schema (2024-2025), featuring advanced versioning and project structure management.

## Features

- **🎯 Modern CLI Commands**: Complete suite of commands accessible via `npx`
- **📋 Latest Schema Support**: Full support for docs.json schema with all 2024-2025 features
- **🎨 Interactive Configuration**: Step-by-step wizard for creating docs.json files
- **⚡ Smart Defaults**: Pre-configured with best practices and common settings  
- **✅ Advanced Validation**: Built-in validation for colors, URLs, navigation structures
- **📝 Edit Mode**: Modify existing docs.json files with user-friendly interface
- **🧭 Flexible Navigation**: Support for versioned, tabbed, grouped, and multi-language navigation
- **📁 Project Structure**: Auto-generates folder structure and MDX files
- **📚 Enhanced Versioning**: Production-grade documentation versioning system
- **🔄 Migration Tools**: Convert from GitBook, Notion, Docusaurus, and other platforms
- **🌐 Cross-Platform**: Works on Windows, macOS, and Linux
- **🔗 External Integration**: GitHub changelog sync and automated workflows

## Quick Start

### Using npx (Recommended)

```bash
# Create a new Mintlify configuration
npx mintlifier init

# Set up enhanced versioning for existing docs
npx mintlifier versioning

# Edit an existing configuration  
npx mintlifier edit [path/to/docs.json]

# Freeze current version and start new development
npx mintlifier freeze

# Generate configuration automatically (CI/CD friendly)
npx mintlifier auto --name "My Docs" --output custom-dir

# Show help and available commands
npx mintlifier help
```

### Run your Mintlify docs

```bash
cd mintlify-docs
npx mint@latest dev
```

## Installation

### Option 1: Use via npx (No Installation Required)

```bash
npx mintlifier <command>
```

### Option 2: Global Installation

```bash
npm install -g mintlifier
mintlifier <command>
```

### Option 3: Local Development

```bash
git clone https://github.com/Cordtus/mintlifier.git
cd mintlifier
npm install
npm link  # Make available globally
```

## Commands

### `mintlifier init`

Create a new Mintlify documentation configuration interactively.

```bash
npx mintlifier init
```

This command:
- Guides you through all configuration options
- Generates a complete docs.json file
- Creates folder structure with sample MDX files
- Sets up navigation and styling

### `mintlifier versioning`

Set up or manage documentation versioning.

```bash
npx mintlifier versioning
```

This command:
- Sets up versioning for existing documentation
- Creates working version directory (next/main/latest/current)
- Converts navigation to versioned structure
- Generates version management scripts

### `mintlifier edit [path]`

Edit an existing docs.json configuration.

```bash
# Auto-detect docs.json location
npx mintlifier edit

# Edit specific file
npx mintlifier edit path/to/docs.json
```

### `mintlifier freeze`

Freeze current documentation version and start new development.

```bash
npx mintlifier freeze
```

This command:
- Creates immutable copy of current version
- Updates navigation with frozen version
- Prompts for new development version
- Maintains version history

### `mintlifier auto`

Generate configuration automatically (non-interactive).

```bash
npx mintlifier auto

# With custom options
npx mintlifier auto --name "My Docs" --output custom-dir
```

## Versioning Workflow

### Initial Setup

1. **Set up versioning on existing docs:**
```bash
npx mintlifier versioning
```

Choose your working version name:
- `next` - For pre-release/development (recommended)
- `main` - Follows git convention
- `latest` - Current stable version
- `current` - Actively developed version

### Development Workflow

2. **Work on your documentation:**
- All changes happen in your working directory (e.g., `docs/next/`)
- Snippets and assets remain shared across versions
- Test locally with `npx mint@latest dev`

3. **Freeze a version when ready:**
```bash
npx mintlifier freeze
```

This will:
- Create immutable copy (e.g., `docs/v1.0.0/`)
- Update navigation to include both versions
- Prompt for next development version
- Preserve all internal links correctly

4. **Commit and tag:**
```bash
git add -A
git commit -m "docs: release v1.0.0"
git tag docs-v1.0.0
git push --tags
```

### Directory Structure After Versioning

```
docs/
├── docs.json           # Versioned navigation
├── versions.json       # Version registry
├── next/              # Working version
│   ├── getting-started/
│   ├── features/
│   └── ...
├── v2.0.0/            # Frozen versions
├── v1.0.0/
├── snippets/          # Shared resources
└── assets/
```

## What You'll Configure

### 1. Basic Information
- Documentation name and description
- Favicon and logo (with light/dark mode support)
- Theme selection (mint, maple, palm, willow, linden, almond, aspen)

### 2. Colors & Styling
- Primary, light, and dark colors
- Icon library (lucide, heroicons, fontawesome, tabler, phosphor)
- Code block themes
- Contextual menu options (ChatGPT, Perplexity, etc.)

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

Mintlify provides a built-in migration tool for converting mint.json to docs.json:

1. Run `npx mint@latest migrate` (Mintlify's official migration tool)
2. After migration, use Mintlifier's edit mode to further customize your configuration:
   ```bash
   npx mintlifier --edit docs.json
   ```
3. Test your migrated documentation with `npx mint@latest dev`

Note: Mintlifier focuses on creating and editing docs.json files, not converting from mint.json. Use Mintlify's official migration tool for conversion.

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