# Mintlifier

Interactive CLI for creating and managing Mintlify documentation with the latest docs.json schema, featuring advanced versioning and project structure management.

## Features

- **Interactive Configuration** - Step-by-step wizard for docs.json files
- **Enhanced Versioning** - Production-grade documentation versioning system
- **Migration Tools** - Convert from GitBook, Notion, Docusaurus, and other platforms
- **Cross-Platform** - Works on Windows, macOS, and Linux
- **Modern Schema** - Full support for 2024-2025 docs.json format
- **External Integration** - GitHub changelog sync and automated workflows

## Installation

```bash
# Use directly (recommended)
npx mintlifier <command>

# Or install globally
npm install -g mintlifier
```

## Commands

```bash
npx mintlifier init              # Create new documentation
npx mintlifier versioning       # Setup versioning system
npx mintlifier edit [path]       # Edit existing docs.json
npx mintlifier freeze            # Freeze current version
npx mintlifier auto              # Generate automatically
```

## Quick Start

### Create Documentation

```bash
npx mintlifier init
```

Follow prompts to configure:
- Name and branding
- Theme (mint, maple, palm, willow, linden, almond, aspen)
- Colors and styling  
- Navigation structure
- API documentation
- Analytics and features

### Generated Structure

```
docs/
├── docs.json           # Configuration
├── introduction.mdx    # Sample pages
├── getting-started.mdx
├── images/            # Assets
└── snippets/          # Shared components
```

### Run Documentation

```bash
cd docs
npx mint@latest dev
```

## Versioning

Enable documentation versioning for release management:

```bash
npx mintlifier versioning
```

### Example Workflow

**Initial Setup:**
```bash
npx mintlifier init              # Create docs
npx mintlifier versioning       # Enable versioning
```

**Development Cycle:**
```bash
# Work on documentation in docs/next/ (working directory)
# When ready to release v1.0.0:
npx mintlifier freeze
# Enter current version: v1.0.0
# Enter next version: v1.1.0
```

**Result Structure:**
```
project/
├── docs.json              # Version-aware navigation
├── versions.json          # Version registry
├── docs/
│   ├── next/              # Active development (v1.1.0)
│   │   ├── introduction.mdx
│   │   └── getting-started.mdx
│   └── v1.0.0/            # Frozen v1.0.0 docs
│       ├── introduction.mdx
│       └── getting-started.mdx
├── snippets/              # Shared components
└── images/                # Shared assets
```

### Benefits

- **Historical Accuracy** - Frozen versions preserve exact documentation state
- **Active Development** - Continue working on next version without affecting released docs
- **External Changelog** - Automatically sync release notes from GitHub
- **CI/CD Integration** - Automated version freezing on releases

## Navigation Types

**Simple Pages:**
```json
{
  "navigation": {
    "pages": ["intro", "guide", "api"]
  }
}
```

**Grouped:**
```json
{
  "navigation": {
    "groups": [
      {
        "group": "Getting Started",
        "pages": ["intro", "setup"]
      }
    ]
  }
}
```

**Versioned (Recommended):**
```json
{
  "navigation": {
    "versions": [
      {
        "version": "next",
        "default": true,
        "tabs": [
          {
            "tab": "Documentation",
            "groups": [
              {
                "group": "Getting Started", 
                "pages": ["docs/next/intro", "docs/next/setup"]
              }
            ]
          }
        ]
      },
      {
        "version": "v1.0.0",
        "tabs": [
          {
            "tab": "Documentation",
            "groups": [
              {
                "group": "Getting Started",
                "pages": ["docs/v1.0.0/intro", "docs/v1.0.0/setup"]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

## Configuration Options

### Themes
- `mint` - Default modern
- `maple` - Clean professional
- `palm` - Vibrant tropical
- `willow` - Soft elegant
- `linden` - Nature inspired
- `almond` - Warm inviting
- `aspen` - Cool minimal

### Analytics Providers
- Google Analytics 4
- PostHog
- Mixpanel
- Amplitude
- Segment
- Heap, Clearbit, Fathom, Hotjar, Koala, Plausible, LogRocket, Pirsch

### Icon Libraries
- Lucide (recommended)
- Heroicons
- Font Awesome
- Tabler
- Phosphor

## Migration

### From Existing Mintlify Project

```bash
# Auto-detect structure and setup versioning
npx mintlifier versioning
```

Supports these structures:
- Root-level docs.json
- docs/ subdirectory 
- content/ subdirectory
- Monorepo packages/docs

### From Other Platforms

**GitBook:**
1. Export as Markdown from GitBook
2. Extract files
3. Run conversion:
```bash
npx mintlifier migrate --from gitbook --input ./exported-files
```

**Notion:**
1. Export workspace as Markdown & CSV
2. Extract files
3. Convert:
```bash
npx mintlifier migrate --from notion --input ./exported-files
```

**Docusaurus/VuePress:**
```bash
npx mintlifier migrate --from docusaurus
npx mintlifier migrate --from vuepress
```

## API Documentation

Configure OpenAPI integration:

```json
{
  "openapi": "/openapi.json",
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

## Automation

### GitHub Actions

Enable automated versioning:

```yaml
name: Freeze Documentation Version
on:
  release:
    types: [published]
jobs:
  freeze-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Freeze version
        run: |
          npx mintlifier freeze \
            --version ${{ github.event.release.tag_name }} \
            --next-version "v${{ steps.next.outputs.version }}" \
            --automated
```

### CI/CD Integration

```bash
# Generate config automatically
npx mintlifier auto --name "API Docs" --output docs

# Deploy
cd docs
npx mint@latest deploy
```

## Troubleshooting

**Invalid Version Format:**
Use semantic versioning: `v1.0.0`, `v1.1.0`, `v2.0.0`

**Navigation Broken:**
Use relative paths: `/guide` not `../guide.md`

**Version Already Exists:**
Frozen versions are immutable. Use different version number.

**Missing Files:**
Ensure all documentation files are committed before freezing.

## Examples

### Basic Setup
```bash
npx mintlifier init
# Follow prompts
# Result: Complete Mintlify project ready for development
```

### API Documentation
```bash
npx mintlifier auto --name "API Docs"
# Result: Enterprise-grade API documentation with OpenAPI integration
```

### Version Management
```bash
npx mintlifier versioning
# Setup versioning system
npx mintlifier freeze
# Freeze current version when ready to release
```

## Requirements

- Node.js ≥ 18.0.0
- npm or yarn

## Links

- **Repository:** https://github.com/Cordtus/mintlifier
- **Issues:** https://github.com/Cordtus/mintlifier/issues
- **Mintlify:** https://mintlify.com/docs