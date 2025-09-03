# 📚 Mintlifier Versioning System

A powerful, cross-platform documentation versioning system that preserves historical documentation states while maintaining active development.

## Overview

The Mintlifier versioning system enables you to:

- **Freeze Documentation Versions** - Create immutable snapshots at release time
- **Maintain Historical Accuracy** - Keep past documentation exactly as it was
- **Continue Active Development** - Work on next version without affecting frozen ones
- **External Changelog Integration** - Automatically sync release notes from GitHub
- **Cross-Platform Compatibility** - Works on Windows, macOS, and Linux

## Real-World Example: API Documentation Lifecycle

Let's follow a real API company through their documentation versioning journey:

### Scenario: CloudAPI v2.1.0 Release

**CloudAPI** has been developing new features for their REST API. They're ready to release v2.1.0 and need to preserve the current documentation while starting work on v2.2.0.

#### Initial State
```
docs/
├── docs.json                    # Current v2.1.0 development docs
├── api/
│   ├── authentication.mdx      # Updated auth methods
│   ├── users.mdx               # New user endpoints
│   └── billing.mdx             # Enhanced billing API
├── guides/
│   ├── quickstart.mdx          # Updated for v2.1.0
│   └── migration.mdx           # v2.0 to v2.1 migration guide
└── changelog/
    └── release-notes.mdx       # Development changelog
```

#### Step 1: Run Version Freeze

```bash
npx mintlifier freeze
```

**Interactive Process:**
```
📚 CloudAPI Documentation Version Manager
Enhanced cross-platform versioning system

? Enter the current version to freeze: v2.1.0
? Enter the new development version: v2.2.0
? Fetch changelog from cloudapi/api-server? Yes

📋 Version Freeze Summary:
   Current version: v2.1.0 → frozen
   New development: v2.2.0
   Changelog: ✓ Available

? Proceed with version freeze? Yes

ℹ Created backup: docs-pre-freeze-2024-09-03T15:30:00Z
✓ Copied documentation to versions/v2.1.0
ℹ Updating internal document links...
✓ Created version metadata
✓ Updated versions registry

🎉 Version v2.1.0 frozen successfully!
📝 Development continues on v2.2.0
📁 Frozen documentation: versions/v2.1.0/
📄 Changelog: https://github.com/cloudapi/api-server/releases/tag/v2.1.0
```

#### Step 2: Result Structure

After freezing, the structure becomes:

```
docs/
├── docs.json                    # Now configured for v2.2.0 development
├── versions.json               # Version registry
├── versions/
│   └── v2.1.0/                 # ← FROZEN VERSION
│       ├── .version-frozen     # Freeze marker
│       ├── .version-metadata.json
│       ├── api/
│       │   ├── authentication.mdx  # v2.1.0 auth docs (frozen)
│       │   ├── users.mdx          # v2.1.0 user endpoints (frozen)
│       │   └── billing.mdx        # v2.1.0 billing API (frozen)
│       ├── guides/
│       │   ├── quickstart.mdx     # v2.1.0 quickstart (frozen)
│       │   └── migration.mdx      # v2.0→v2.1 migration (frozen)
│       └── changelog/
│           └── release-notes.mdx  # Up to v2.1.0 (frozen)
├── api/                        # Continue development here for v2.2.0
│   ├── authentication.mdx      # Work on v2.2.0 features
│   ├── users.mdx               # Add new v2.2.0 endpoints
│   └── billing.mdx             # Enhance for v2.2.0
├── guides/
│   ├── quickstart.mdx          # Update for v2.2.0
│   └── migration.mdx           # Add v2.1→v2.2 migration
└── changelog/
    └── release-notes.mdx       # Add v2.2.0 changes
```

#### Step 3: Updated docs.json with Versioning

The `docs.json` automatically becomes version-aware:

```json
{
  "$schema": "https://mintlify.com/docs.json",
  "name": "CloudAPI Documentation",
  "navigation": {
    "versions": [
      {
        "version": "v2.2.0",
        "default": true,
        "tabs": [
          {
            "tab": "API Reference",
            "groups": [
              {
                "group": "Authentication", 
                "pages": ["api/authentication"]
              },
              {
                "group": "Core APIs",
                "pages": ["api/users", "api/billing"]
              }
            ]
          },
          {
            "tab": "Guides",
            "pages": ["guides/quickstart", "guides/migration"]
          }
        ]
      },
      {
        "version": "v2.1.0",
        "tabs": [
          {
            "tab": "API Reference",
            "groups": [
              {
                "group": "Authentication",
                "pages": ["versions/v2.1.0/api/authentication"]
              },
              {
                "group": "Core APIs", 
                "pages": ["versions/v2.1.0/api/users", "versions/v2.1.0/api/billing"]
              }
            ]
          },
          {
            "tab": "Guides",
            "pages": ["versions/v2.1.0/guides/quickstart", "versions/v2.1.0/guides/migration"]
          }
        ]
      }
    ]
  }
}
```

#### Step 4: Continue Development

Now the team can:
- **Work freely** on v2.2.0 features in the main `docs/` directory
- **Reference frozen v2.1.0** docs at `versions/v2.1.0/`
- **Customers see both versions** in the Mintlify version selector
- **Links remain intact** - v2.1.0 internal links point to frozen paths

### Real Customer Benefits

**For CloudAPI Customers:**
- **Current users** can still access v2.1.0 documentation exactly as it was at release
- **Early adopters** can preview v2.2.0 development documentation
- **Migration teams** have both versions side-by-side for comparison
- **Support teams** can reference the exact docs version customers are using

**For CloudAPI Team:**
- **Developers** work on next version without breaking current docs
- **Technical writers** can update documentation iteratively
- **Support** can quickly reference any version's documentation
- **Product** can track documentation changes between versions

## Setup Guide

### Prerequisites

- Node.js ≥ 18.0.0
- Existing Mintlify documentation project
- Git (optional, for changelog integration)

### Quick Setup

1. **Enable versioning in your project:**
```bash
npx mintlifier versioning
```

2. **Follow the interactive setup:**
```
🔧 Enhanced Versioning System Setup
? Enable enhanced versioning system? Yes
? Initial version (e.g., v1.0.0): v1.0.0
? Working directory name: next
? Enable external changelog integration? Yes  
? Repository (format: owner/repo): cloudapi/api-server

📁 Creating versioning structure...
✅ Enhanced versioning system setup complete!
```

3. **Generated files:**
```
docs/
├── versions.json               # Version registry
├── scripts/
│   └── enhanced-version-manager.js  # Freeze script
└── versions/                   # Frozen versions directory
```

### Directory Structure Compatibility

Mintlifier works with any of these common Mintlify project structures:

#### Structure A: Root-level docs
```
my-docs/
├── docs.json
├── introduction.mdx
├── api/
│   └── reference.mdx
└── guides/
    └── getting-started.mdx
```

#### Structure B: Docs subfolder  
```
my-project/
├── docs/
│   ├── docs.json
│   ├── introduction.mdx
│   ├── api/
│   └── guides/
└── src/
```

#### Structure C: Separate docs repository
```
docs-repository/
├── docs.json
├── content/
│   ├── overview.mdx
│   └── tutorials/
├── assets/
└── snippets/
```

All structures are automatically detected and versioning is configured appropriately.

## Features

### Smart Path Management

**Preserved Paths** (shared across versions):
- `/snippets/` - Shared components and code snippets
- `/assets/` - Images, icons, and static files
- `/images/` - Documentation images
- `/static/` - Static resources

**Updated Paths** (version-specific):
- Document links between pages
- Internal navigation references
- Cross-references between sections

**Example Path Updates:**
```mdx
<!-- Before freezing (in active development) -->
See the [authentication guide](/api/authentication) for details.
Read our [migration guide](/guides/migration) for upgrade steps.

<!-- After freezing v2.1.0 (in versions/v2.1.0/) -->
See the [authentication guide](/versions/v2.1.0/api/authentication) for details.
Read our [migration guide](/versions/v2.1.0/guides/migration) for upgrade steps.

<!-- Preserved (unchanged) -->
<Image src="/assets/api-diagram.png" alt="API Flow" />
<CodeBlock filename="/snippets/auth-example.js" />
```

### External Changelog Integration

Automatically fetch and integrate release notes from GitHub:

```bash
# Sync from your main repository
npx mintlifier freeze --changelog owner/repo

# Fetch specific version
npx mintlifier freeze --changelog owner/repo --version v2.1.0
```

**Supported Sources:**
- GitHub Releases
- GitHub Tags  
- CHANGELOG.md files
- Custom markdown formats

### Version Metadata

Each frozen version includes rich metadata:

```json
{
  "version": "v2.1.0",
  "frozenDate": "2024-09-03",
  "frozenTimestamp": "2024-09-03T15:30:00Z",
  "nextVersion": "v2.2.0",
  "frozenBy": "alice",
  "gitCommit": "abc123def456",
  "nodeVersion": "v18.17.0", 
  "platform": "darwin",
  "automated": false,
  "externalRepo": "cloudapi/api-server",
  "changelogUrl": "https://github.com/cloudapi/api-server/releases/tag/v2.1.0",
  "metadata": {
    "hasExternalChangelog": true,
    "frozenFiles": 12
  }
}
```

## Advanced Usage

### Automated Version Freezing

Integrate with CI/CD pipelines:

```yaml
# .github/workflows/docs-version.yml
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
      
      - name: Freeze documentation version
        run: |
          npx mintlifier freeze \
            --version ${{ github.event.release.tag_name }} \
            --next-version "v${{ steps.next.outputs.version }}" \
            --changelog ${{ github.repository }} \
            --automated
```

### Custom Configuration

Configure versioning behavior:

```json
// versions.json
{
  "versions": ["v2.1.0", "v2.0.0"],
  "defaultVersion": "v2.1.0",
  "currentVersion": "v2.2.0",
  "workingVersion": "next",
  "versioningConfig": {
    "preservePaths": ["snippets", "assets", "images", "static", "components"],
    "autoChangelog": true,
    "semanticVersioning": true,
    "backupRetention": 7,
    "rollbackEnabled": true
  }
}
```

### Rollback Support

If something goes wrong during freezing:

```bash
# Automatic rollback on failure
npx mintlifier freeze  # Automatically rolls back on error

# Manual rollback
npx mintlifier rollback --to-backup docs-pre-freeze-2024-09-03T15:30:00Z
```

## Migration from Existing Projects  

### From Unversioned Mintlify Project

1. **Backup your current documentation**
2. **Run versioning setup:**
```bash
npx mintlifier versioning
```
3. **Choose initial version** (e.g., current state becomes v1.0.0)
4. **Continue development** in main docs directory
5. **Freeze versions** as needed for releases

### From Other Documentation Systems

See our [Migration Guide](./MIGRATION.md) for detailed instructions on migrating from:
- GitBook
- Notion
- Confluence  
- VuePress/Vitepress
- Docusaurus
- Custom markdown sites

## Best Practices

### Version Naming
- **Use semantic versioning**: `v1.0.0`, `v1.1.0`, `v2.0.0`
- **Consistent prefixes**: Always use `v` prefix
- **Pre-release tags**: `v1.0.0-beta.1`, `v1.0.0-rc.1`

### Content Management
- **Keep active development** in root docs directory
- **Never edit frozen versions** (they're immutable)
- **Use relative links** within documentation
- **Test before freezing** - run `mint dev` to verify

### Release Workflow
1. **Complete documentation** for the release
2. **Test locally** with `mint dev`
3. **Freeze version** with `npx mintlifier freeze`
4. **Commit changes** to version control
5. **Deploy** updated documentation
6. **Continue development** on next version

## Troubleshooting

### Common Issues

**Version Already Exists**
```bash
✗ Error: Version v2.1.0 already exists as a frozen version
```
Frozen versions are immutable. Use a different version number.

**Invalid Version Format** 
```bash
✗ Error: Invalid semantic version format
```
Use format: `v1.2.3` or `1.2.3` (with optional pre-release: `v1.2.3-beta.1`)

**Navigation Broken After Freeze**
Check that internal links use relative paths, not absolute paths.

**Missing Files After Freeze**
Ensure all documentation files are committed to version control before freezing.

### Debug Mode

Enable detailed logging:

```bash
DEBUG=mintlifier:* npx mintlifier freeze
```

## API Reference

### Command Line Interface

```bash
# Freeze current version
npx mintlifier freeze

# Freeze with options
npx mintlifier freeze --version v2.1.0 --next v2.2.0 --changelog owner/repo

# Setup versioning
npx mintlifier versioning

# List versions
npx mintlifier versions

# Rollback changes
npx mintlifier rollback --to-backup <backup-id>
```

### Programmatic API

```javascript
import { setupEnhancedVersioning, freezeVersion } from 'mintlifier/lib/enhanced-versioning';

// Setup versioning
const config = await setupEnhancedVersioning('./docs', {
  projectName: 'My API Docs',
  initialVersion: 'v1.0.0',
  externalRepo: 'owner/repo'
});

// Freeze a version
await freezeVersion({
  currentVersion: 'v2.1.0',
  nextVersion: 'v2.2.0',
  fetchChangelog: true
});
```

## Support

- **Documentation**: [Mintlifier Documentation](./README.md)
- **Issues**: [GitHub Issues](https://github.com/Cordtus/mintlifier/issues)
- **Examples**: [Example Projects](./examples/)
- **Community**: [Discussions](https://github.com/Cordtus/mintlifier/discussions)

---

**Next Steps:**
- [Set up versioning](npx-mintlifier-versioning) in your project
- [Read the full documentation](./README.md)
- [See migration examples](./MIGRATION.md)
- [Join the community](https://github.com/Cordtus/mintlifier/discussions)