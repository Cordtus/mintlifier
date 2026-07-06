#!/usr/bin/env node

// Script to build Mintlifier's own documentation using Mintlifier
// This serves as both documentation and end-to-end test

import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');

// Configuration for Mintlifier's own documentation
const docConfig = {
  inputs: [
    // Basic configuration
    'Mintlifier', // name
    '/assets/favicon.svg', // favicon
    '1', // theme: venus
    '2', // layout: sidenav  
    '1', // rounded: default
    '#0D9373', // primary color
    'y', // advanced colors
    '#07C983', // light color
    '#0D9373', // dark color
    'y', // background colors
    '#FFFFFF', // light background
    '#0F1117', // dark background
    'n', // no gradient anchors
    '1', // single logo
    '/assets/logo.svg', // logo path
    
    // Navigation structure
    'y', // add navigation
    'Getting Started', // group 1
    '3', // page count
    'introduction', // overview of Mintlifier
    'installation', // how to install
    'quickstart', // quick start guide
    
    'y', // add another group
    'Features', // group 2
    '4', // page count
    'configuration', // configuration options
    'versioning', // versioning system
    'automation', // GitHub Actions automation
    'api-docs', // API documentation features
    
    'y', // add another group
    'Guides', // group 3
    '3', // page count
    'basic-setup', // basic setup guide
    'advanced-config', // advanced configuration
    'ci-cd-integration', // CI/CD integration
    
    'y', // add another group
    'Reference', // group 4
    '3', // page count
    'schema', // Mintlify schema reference
    'cli-options', // CLI options
    'troubleshooting', // troubleshooting guide
    
    'n', // no more groups
    
    // Tabs
    'y', // add tabs
    'Documentation', // tab name
    'docs', // tab url
    'y', // add another tab
    'GitHub', // tab name
    'https://github.com/cordt/mintlifier', // tab url
    'n', // no more tabs
    
    // No OpenAPI for now
    'n', // OpenAPI
    
    // Footer
    'y', // configure footer
    'y', // add social links
    '2\n', // GitHub
    'https://github.com/cordt/mintlifier', // GitHub URL
    
    // No analytics for local docs
    'n', // analytics
    
    // Feedback
    'y', // feedback
    'y', // thumbs rating
    'y', // suggest edit
    'y', // raise issue
    
    // Search
    'y', // configure search
    'Search Mintlifier docs...', // search prompt
    '1', // location: side
    
    // Mode toggle
    '2', // dark mode default
    'n', // don't hide mode toggle
    
    // Versioning
    'n', // no versioning in nav (we'll add it after)
    
    // Generate project
    'y', // generate project
    
    // Enable versioning system
    'y', // enable versioning
    'v1.0.0', // initial version
    'y', // changelog sync
    '1', // same repository (mintlifier)
    'y', // auto version on release
  ]
};

async function buildDocs() {
  console.log(chalk.cyan.bold(' Building Mintlifier Documentation\n'));
  
  // Change to project root
  process.chdir(projectRoot);
  
  // Remove existing docs if present
  const docsDir = path.join(projectRoot, 'docs');
  if (await fs.pathExists(docsDir)) {
    console.log(chalk.yellow(' Removing existing docs directory...'));
    await fs.remove(docsDir);
  }
  
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['index.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    let currentInputIndex = 0;
    let inputTimer;
    
    // Send inputs sequentially
    const sendNextInput = () => {
      if (currentInputIndex < docConfig.inputs.length) {
        const input = docConfig.inputs[currentInputIndex];
        child.stdin.write(input + '\n');
        currentInputIndex++;
        
        // Schedule next input
        inputTimer = setTimeout(sendNextInput, 100);
      }
    };
    
    child.stdout.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data);
      
      // Start sending inputs after initial prompt
      if (!inputTimer && output.includes('Documentation site name:')) {
        setTimeout(sendNextInput, 100);
      }
    });
    
    child.stderr.on('data', (data) => {
      console.error(chalk.red(`Error: ${data}`));
    });
    
    child.on('close', async (code) => {
      clearTimeout(inputTimer);
      
      if (code === 0) {
        console.log(chalk.green('\n Documentation structure created successfully!'));
        
        // Now populate the documentation content
        await populateDocContent();
        
        resolve();
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      child.kill();
      reject(new Error('Timeout'));
    }, 30000);
  });
}

async function populateDocContent() {
  console.log(chalk.cyan('\n Populating documentation content...'));
  
  const docsDir = path.join(projectRoot, 'docs');
  
  // Create assets directory
  await fs.ensureDir(path.join(docsDir, 'assets'));
  
  // Copy logo and favicon (create simple SVG placeholders)
  const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#0D9373"/>
  <text x="50" y="50" text-anchor="middle" dy=".3em" fill="white" font-family="Arial" font-size="40" font-weight="bold">M</text>
</svg>`;
  
  await fs.writeFile(path.join(docsDir, 'assets', 'logo.svg'), logoSvg);
  await fs.writeFile(path.join(docsDir, 'assets', 'favicon.svg'), logoSvg);
  
  // Create comprehensive documentation content
  const docs = {
    'introduction.mdx': `---
title: Introduction
description: Interactive CLI tool for building Mintlify documentation
---

# Mintlifier

Mintlifier is an interactive command-line tool that simplifies the process of creating and configuring Mintlify documentation sites. It provides a guided setup experience with smart defaults and comprehensive configuration options.

## What is Mintlifier?

Mintlifier helps you:
- **Bootstrap Mintlify projects** with an interactive CLI
- **Configure all Mintlify options** through simple prompts
- **Set up automated versioning** for your documentation
- **Generate GitHub Actions** for CI/CD automation
- **Create proper project structure** with all necessary files

## Key Features

<CardGroup cols={2}>
  <Card title="Interactive Setup" icon="terminal">
    Step-by-step prompts guide you through all configuration options
  </Card>
  <Card title="Smart Defaults" icon="sparkles">
    Sensible defaults for common settings to get started quickly
  </Card>
  <Card title="Version Management" icon="code-branch">
    Automated versioning system with changelog synchronization
  </Card>
  <Card title="GitHub Integration" icon="github">
    Automatic workflows for releases and documentation updates
  </Card>
</CardGroup>

## Why Mintlifier?

Creating a Mintlify documentation site involves many configuration options and setup steps. Mintlifier streamlines this process by:

1. **Eliminating manual configuration** - No need to manually write \`docs.json\`
2. **Preventing common mistakes** - Validates inputs and ensures proper structure
3. **Saving time** - Generate a complete project in minutes
4. **Adding automation** - Optional CI/CD workflows for versioning and updates

## Quick Example

\`\`\`bash
# Install and run Mintlifier
npx mintlifier

# Answer the prompts
# ✓ Documentation site name: My Docs
# ✓ Theme: Venus
# ✓ Layout: Side Navigation
# ... more configuration options

# Your Mintlify project is ready!
cd mintlify-docs
mint dev
\`\`\`

## Next Steps

<Card title="Installation" icon="download" href="/installation">
  Install Mintlifier and set up your environment
</Card>

<Card title="Quick Start" icon="rocket" href="/quickstart">
  Create your first Mintlify documentation site
</Card>

<Card title="Configuration Guide" icon="cog" href="/configuration">
  Learn about all available configuration options
</Card>
`,

    'installation.mdx': `---
title: Installation
description: How to install and set up Mintlifier
---

# Installation

Mintlifier can be installed globally via npm or yarn, or run directly using npx.

## Prerequisites

Before installing Mintlifier, ensure you have:

- **Node.js** version 20.17.0 or higher
- **npm** or **yarn** package manager
- **Git** (for version control features)

## Installation Methods

### Using npm (Global)

\`\`\`bash
npm install -g mintlifier
\`\`\`

### Using yarn (Global)

\`\`\`bash
yarn global add mintlifier
\`\`\`

### Using npx (No Installation)

Run directly without installation:

\`\`\`bash
npx mintlifier
\`\`\`

### From Source

Clone and run from the repository:

\`\`\`bash
git clone https://github.com/cordt/mintlifier.git
cd mintlifier
yarn install
yarn start
\`\`\`

## Verify Installation

After installation, verify Mintlifier is working:

\`\`\`bash
mintlifier --version
\`\`\`

## System Requirements

| Requirement | Minimum Version |
|------------|----------------|
| Node.js | 20.17.0 |
| npm | 8.0.0 |
| yarn | 1.22.0 |
| Git | 2.0.0 |

## Troubleshooting Installation

### Permission Errors

If you encounter permission errors during global installation:

\`\`\`bash
# npm
sudo npm install -g mintlifier

# yarn
sudo yarn global add mintlifier
\`\`\`

### Path Issues

If the \`mintlifier\` command is not found after installation:

1. Check your global npm/yarn bin directory:
   \`\`\`bash
   npm config get prefix
   # or
   yarn global bin
   \`\`\`

2. Add the bin directory to your PATH

### Node Version Issues

If you have an older Node.js version:

\`\`\`bash
# Using nvm
nvm install 20
nvm use 20

# Using fnm
fnm install 20
fnm use 20
\`\`\`

## Next Steps

Once installed, you're ready to create your first Mintlify documentation site:

<Card title="Quick Start" icon="rocket" href="/quickstart">
  Create your first documentation site
</Card>
`,

    'quickstart.mdx': `---
title: Quick Start
description: Create your first Mintlify documentation site with Mintlifier
---

# Quick Start

Get up and running with Mintlifier in minutes. This guide will walk you through creating your first Mintlify documentation site.

## Step 1: Run Mintlifier

Start the interactive setup:

\`\`\`bash
npx mintlifier
# or if installed globally
mintlifier
\`\`\`

## Step 2: Basic Configuration

You'll be prompted for basic information:

### Site Name
Enter your documentation site name:
\`\`\`
Documentation site name: My Amazing Docs
\`\`\`

### Favicon
Specify the path to your favicon:
\`\`\`
Path to favicon file (.svg or .png): /favicon.svg
\`\`\`

### Theme Selection
Choose from three themes:
- **Venus** - Modern and clean
- **Quill** - Classic documentation style  
- **Prism** - Vibrant and colorful

### Layout Style
Select your preferred layout:
- **Top Navigation** - Navigation bar at the top
- **Side Navigation** - Traditional sidebar
- **Solid Side Navigation** - Full-height sidebar

## Step 3: Colors and Branding

### Primary Color
Set your brand's primary color:
\`\`\`
Primary color (hex): #0D9373
\`\`\`

### Logo Configuration
Choose logo setup:
- Single logo for all modes
- Separate logos for light/dark mode
- No logo

## Step 4: Navigation Structure

Create your documentation structure:

\`\`\`
Add navigation groups now? Yes
Group name: Getting Started
How many pages in this group? 3
Page 1 path: introduction
Page 2 path: installation  
Page 3 path: configuration
\`\`\`

## Step 5: Optional Features

Configure additional features:

- **API Documentation** - OpenAPI/Swagger integration
- **Footer Links** - Social media and other links
- **Analytics** - Google Analytics, PostHog, etc.
- **Feedback** - Thumbs rating, edit suggestions
- **Search** - Custom search configuration
- **Versioning** - Documentation versioning system

## Step 6: Generate Project

Confirm and generate your project:

\`\`\`
Generate Mintlify project with this configuration? Yes
\`\`\`

## Step 7: Run Your Documentation

Navigate to your new documentation:

\`\`\`bash
cd mintlify-docs
\`\`\`

Install Mintlify CLI:

\`\`\`bash
npm install -g mintlify
\`\`\`

Start the development server:

\`\`\`bash
mint dev
\`\`\`

Your documentation is now running at \`http://localhost:3000\`!

## What's Next?

### Customize Content
Edit the generated MDX files to add your documentation content.

### Configure Versioning
Set up automated versioning:
\`\`\`bash
./scripts/version-manager.sh
\`\`\`

### Deploy Your Docs
Commit and push changes to your Mintlify-connected repository:
\`\`\`bash
git add .
git commit -m "Update documentation"
git push
\`\`\`

## Example Output Structure

After running Mintlifier, you'll have:

\`\`\`
docs/
├── docs.json           # Configuration file
├── introduction.mdx    # Documentation pages
├── installation.mdx
├── configuration.mdx
├── images/            # Assets directory
├── favicon.svg        # Favicon file
├── logo.svg          # Logo file
    └── scripts/          # Versioning scripts (optional)
    ├── freeze-version.js
    └── refresh-changelog.sh
\`\`\`

## Tips for Success

<AccordionGroup>
  <Accordion title="Use meaningful page names">
    Choose descriptive names for your pages that clearly indicate their content.
  </Accordion>
  
  <Accordion title="Organize with groups">
    Group related pages together for better navigation.
  </Accordion>
  
  <Accordion title="Enable versioning early">
    If you plan to version your docs, enable it from the start.
  </Accordion>
  
  <Accordion title="Test locally first">
    Always test your documentation locally before deploying.
  </Accordion>
</AccordionGroup>
`,

    'configuration.mdx': `---
title: Configuration Options
description: Complete guide to all Mintlifier configuration options
---

# Configuration Options

Mintlifier covers all Mintlify configuration options through its interactive prompts. This guide explains each option in detail.

## Required Configuration

These options are required for every Mintlify documentation site:

### Name
The name of your documentation site. This appears in the browser title and navigation.

### Favicon  
Path to your favicon file. Supports SVG and PNG formats. The path should be relative to your docs root.

### Colors
At minimum, you need to specify a primary color in hex format (e.g., \`#0D9373\`).

### Navigation
At least one navigation group with one page is required.

## Visual Design

### Themes

Choose from three built-in themes:

| Theme | Description | Best For |
|-------|-------------|----------|
| **Venus** | Modern, clean design with subtle gradients | SaaS products, APIs |
| **Quill** | Classic documentation style | Technical documentation |
| **Prism** | Vibrant colors with bold accents | Creative projects |

### Layout Styles

| Layout | Description | When to Use |
|--------|-------------|-------------|
| **Top Navigation** | Horizontal navigation bar | Few top-level sections |
| **Side Navigation** | Traditional sidebar | Many pages, deep hierarchy |
| **Solid Side Navigation** | Full-height sidebar | Complex documentation |

### Corner Style

- **Default (Rounded)** - Soft, modern appearance with rounded corners
- **Sharp** - Clean, professional look with sharp corners

## Color Configuration

### Basic Colors

\`\`\`json
{
  "colors": {
    "primary": "#0D9373"
  }
}
\`\`\`

### Advanced Colors

\`\`\`json
{
  "colors": {
    "primary": "#0D9373",
    "light": "#07C983",
    "dark": "#0D9373",
    "background": {
      "light": "#FFFFFF",
      "dark": "#0F1117"
    },
    "anchors": {
      "from": "#0D9373",
      "to": "#07C983"
    }
  }
}
\`\`\`

## Logo Configuration

### Single Logo
One logo for all color modes:

\`\`\`json
{
  "logo": "/logo.svg"
}
\`\`\`

### Dual Logos
Different logos for light and dark modes:

\`\`\`json
{
  "logo": {
    "light": "/logo-light.svg",
    "dark": "/logo-dark.svg",
    "href": "https://yoursite.com"
  }
}
\`\`\`

## Navigation Structure

### Basic Navigation

\`\`\`json
{
  "navigation": [
    {
      "group": "Getting Started",
      "pages": ["introduction", "quickstart"]
    }
  ]
}
\`\`\`

### Nested Navigation

Create nested structures using paths:

\`\`\`json
{
  "navigation": [
    {
      "group": "Guides",
      "pages": [
        "guides/overview",
        "guides/basic/setup",
        "guides/basic/configuration",
        "guides/advanced/customization"
      ]
    }
  ]
}
\`\`\`

## Top Navigation Tabs

Add tabs to your top navigation:

\`\`\`json
{
  "tabs": [
    {
      "name": "Documentation",
      "url": "docs"
    },
    {
      "name": "API Reference",
      "url": "api"
    }
  ]
}
\`\`\`

## API Documentation

### OpenAPI Integration

\`\`\`json
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
\`\`\`

### Authentication Methods

- **Bearer Token** - JWT or OAuth tokens
- **Basic Auth** - Username and password
- **API Key** - Header or query parameter
- **None** - Public API

## Footer Configuration

### Social Links

\`\`\`json
{
  "footer": {
    "socials": {
      "x": "https://x.com/yourhandle",
      "github": "https://github.com/yourorg",
      "discord": "https://discord.gg/invite",
      "linkedin": "https://linkedin.com/company/yourco"
    }
  }
}
\`\`\`

## Analytics Integration

### Google Analytics 4

\`\`\`json
{
  "analytics": {
    "ga4": {
      "measurementId": "G-XXXXXXXXXX"
    }
  }
}
\`\`\`

### PostHog

\`\`\`json
{
  "analytics": {
    "posthog": {
      "apiKey": "phc_xxxxxxxxxxxxx"
    }
  }
}
\`\`\`

## Feedback Features

\`\`\`json
{
  "feedback": {
    "thumbsRating": true,
    "suggestEdit": true,
    "raiseIssue": true
  }
}
\`\`\`

## Search Configuration

\`\`\`json
{
  "search": {
    "prompt": "Search documentation...",
    "location": "side"
  }
}
\`\`\`

## Dark Mode

\`\`\`json
{
  "modeToggle": {
    "default": "dark",
    "isHidden": false
  }
}
\`\`\`

## Versioning

Enable documentation versioning:

\`\`\`json
{
  "versions": ["v2.0.0", "v1.0.0"]
}
\`\`\`

See the [Versioning Guide](/versioning) for detailed setup instructions.
`,

    'versioning.mdx': `---
title: Versioning System
description: Automated documentation versioning with Mintlifier
---

# Versioning System

Mintlifier includes a powerful automated versioning system that helps you manage documentation versions alongside your software releases.

## Overview

The versioning system provides:

- **Version Freezing** - Create immutable snapshots of documentation
- **Changelog Sync** - Automatically pull release notes from GitHub
- **Auto-versioning** - Freeze versions automatically on new releases
- **GitHub Actions** - Full CI/CD automation

## How It Works

### Version Freezing

When you freeze a version:

1. Current docs are copied to \`versions/[version]/\`
2. All internal links are updated
3. Version becomes immutable (read-only)
4. New development version is set

### Changelog Synchronization

Automatically fetch and format release notes:

1. Pulls CHANGELOG.md from GitHub repository
2. Parses markdown into Mintlify MDX format
3. Updates release notes page
4. Can trigger on new releases

### Automated Workflow

On new release in source repository:

1. Webhook triggers documentation workflow
2. Changelog is fetched and updated
3. Current version is frozen
4. New development version begins

## Setup

### Enable During Initial Setup

When running Mintlifier, choose to enable versioning:

\`\`\`
Enable automated versioning system? Yes
Initial version (e.g., v1.0.0): v1.0.0
Set up automatic changelog sync? Yes
\`\`\`

### Manual Version Management

Use the version manager script:

\`\`\`bash
./scripts/version-manager.sh
\`\`\`

You'll be prompted for:
- Version to freeze (current)
- New development version

For product-scoped or nested versioning, list scopes and freeze a selected scope:

\`\`\`bash
npx mintlifier versioning
npx mintlifier freeze --scope api-reference --version v2.3.0 --next-version next
npx mintlifier freeze --scope api-reference --version v2.3.0 --next-version next --dry-run
\`\`\`

### Sync Release Notes

Update release notes from source repository:

\`\`\`bash
./scripts/refresh-changelog.sh owner/repo latest
# or fetch specific version
./scripts/refresh-changelog.sh owner/repo v1.2.0
\`\`\`

## GitHub Actions Integration

### Auto-Version Workflow

The \`.github/workflows/auto-version.yml\` workflow:

- Triggers on repository dispatch or manual run
- Freezes specified version
- Updates to new development version
- Syncs changelog automatically

### Trigger from Source Repository

Add to your source repository's workflow:

\`\`\`yaml
name: Trigger Docs Versioning

on:
  release:
    types: [published]

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger docs versioning
        run: |
          curl -X POST \\
            -H "Authorization: token \${{ secrets.DOCS_TOKEN }}" \\
            https://api.github.com/repos/YOUR_DOCS_REPO/dispatches \\
            -d '{"event_type":"release-published","client_payload":{"tag_name":"\${{ github.event.release.tag_name }}"}}'
\`\`\`

## Version Structure

### Directory Layout

\`\`\`
docs/
├── docs.json              # Current dev version config
├── latest/                # Current development docs (or custom label)
├── v1.0.0/               # Frozen version 1.0.0
│   ├── .version-metadata.json
│   └── ... (frozen docs)
├── v1.1.0/               # Frozen version 1.1.0
├── versions.json         # Version registry
└── changelog/
    └── release-notes.mdx  # Aggregated release notes
\`\`\`

### Version Metadata

Each frozen version includes metadata:

\`\`\`json
{
  "version": "v1.0.0",
  "frozenDate": "2024-08-23",
  "frozenTimestamp": "2024-08-23T10:30:00Z",
  "nextVersion": "v1.1.0",
  "automated": true
}
\`\`\`

## Best Practices

### Semantic Versioning

Follow semantic versioning (SemVer):
- **Major** (v2.0.0) - Breaking changes
- **Minor** (v1.1.0) - New features
- **Patch** (v1.0.1) - Bug fixes

### Version Lifecycle

1. **Development** - Active work in main docs
2. **Release Candidate** - Prepare for freeze
3. **Frozen** - Immutable snapshot
4. **Archived** - Older versions (optional removal)

### Changelog Format

Maintain consistent CHANGELOG.md format:

\`\`\`markdown
## [v1.1.0] - 2024-08-23

### FEATURES
- New feature description

### BUG FIXES  
- Fixed issue description

### IMPROVEMENTS
- Enhancement description
\`\`\`

## Troubleshooting

### Version Already Frozen

If you see "Version already exists":
- Version has been frozen previously
- Choose a different version number
- Frozen versions are immutable

### Changelog Not Syncing

Check:
- Repository permissions
- CHANGELOG.md format
- Network connectivity
- GitHub API limits

### Workflow Not Triggering

Verify:
- GitHub token has correct permissions
- Repository dispatch is configured
- Webhook URL is correct

## Advanced Configuration

### Custom Version URLs

\`\`\`json
{
  "versions": [
    {
      "name": "v2.0.0",
      "url": "versions/v2.0.0"
    },
    {
      "name": "v1.0.0", 
      "url": "versions/v1.0.0",
      "default": true
    }
  ]
}
\`\`\`

### Version-specific Navigation

Different navigation per version:

\`\`\`json
{
  "navigation": [
    {
      "group": "Getting Started",
      "pages": ["intro"],
      "version": "v2.0.0"
    }
  ]
}
\`\`\`
`,

    'automation.mdx': `---
title: GitHub Actions Automation
description: CI/CD automation for Mintlify documentation
---

# GitHub Actions Automation

Mintlifier can generate GitHub Actions workflows for continuous integration and deployment of your documentation.

## Generated Workflows

### Changelog Sync Workflow

Automatically syncs release notes when new versions are published.

**File:** \`.github/workflows/sync-changelog.yml\`

**Triggers:**
- Repository dispatch event
- Manual workflow dispatch
- Webhook from source repository

### Auto-Version Workflow

Automatically freezes versions and manages documentation lifecycle.

**File:** \`.github/workflows/auto-version.yml\`

**Features:**
- Freezes current version
- Updates to new development version
- Syncs changelog
- Updates docs.json

## Setup Instructions

### 1. Create GitHub Token

Create a Personal Access Token with \`repo\` scope:

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select \`repo\` scope
4. Copy the token

### 2. Add Repository Secret

Add token to your repository:

1. Go to repository Settings → Secrets and variables → Actions
2. New repository secret
3. Name: \`GITHUB_TOKEN\` (or custom name)
4. Value: Your personal access token

### 3. Configure Source Repository

Add trigger workflow to source repository:

\`\`\`yaml
name: Trigger Documentation Update

on:
  release:
    types: [published]

jobs:
  update-docs:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger docs update
        uses: peter-evans/repository-dispatch@v2
        with:
          token: \${{ secrets.DOCS_REPO_TOKEN }}
          repository: owner/docs-repo
          event-type: release-published
          client-payload: '{"tag_name": "\${{ github.event.release.tag_name }}"}'
\`\`\`

## Workflow Examples

### Manual Version Freeze

Trigger manually from Actions tab:

\`\`\`yaml
workflow_dispatch:
  inputs:
    release_version:
      description: 'Version to freeze'
      required: true
      type: string
    next_version:
      description: 'Next development version'
      required: true
      type: string
\`\`\`

### Automatic Changelog Update

On every release:

\`\`\`yaml
on:
  repository_dispatch:
    types: [release-published]

jobs:
  sync:
    steps:
      - name: Fetch changelog
        run: |
          curl -s "$CHANGELOG_URL" > changelog.md
      
      - name: Parse and update
        run: node scripts/parse-changelog.js
\`\`\`

## Custom Workflows

### Deploy on Push

Deploy documentation on every push:

\`\`\`yaml
name: Deploy Documentation

on:
  push:
    branches: [main]
    paths:
      - 'mintlify-docs/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Validate Mintlify docs
        run: |
          cd mintlify-docs
          npx mint@latest validate
          npx mint@latest broken-links
      
      - name: Deployment note
        run: |
          echo "Mintlify deploys from the connected Git branch after this workflow passes."
\`\`\`

### Validate Configuration

Check docs.json on pull requests:

\`\`\`yaml
name: Validate Docs

on:
  pull_request:
    paths:
      - 'mintlify-docs/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Validate docs.json
        run: |
          cd mintlify-docs
          npx mint@latest validate
\`\`\`

## Best Practices

### Security

- Use repository secrets for sensitive data
- Limit token permissions (principle of least privilege)
- Use \`GITHUB_TOKEN\` when possible
- Rotate tokens regularly

### Performance

- Use path filters to avoid unnecessary runs
- Cache dependencies
- Run jobs in parallel when possible
- Use matrix builds for multiple versions

### Reliability

- Add error handling and retries
- Use timeouts for long-running jobs
- Monitor workflow runs
- Set up notifications for failures

## Troubleshooting

### Workflow Not Running

Check:
- Workflow file syntax (YAML validation)
- Branch protection rules
- Repository permissions
- GitHub Actions enabled for repository

### Permission Denied

Verify:
- Token has required scopes
- Token hasn't expired
- Repository allows Actions

### Dispatch Not Working

Ensure:
- Event type matches exactly
- Payload is valid JSON
- Token has \`repo\` scope
- Target repository exists
`,

    // Continue with more documentation files...
  };

  // Write all documentation files
  for (const [filename, content] of Object.entries(docs)) {
    await fs.writeFile(path.join(docsDir, filename), content);
    console.log(chalk.green(`✓ Created ${filename}`));
  }
  
  console.log(chalk.green('\n Documentation content populated successfully!'));
}

// Run the documentation builder
async function main() {
  try {
    await buildDocs();
    
    console.log(chalk.cyan('\n Documentation build complete!'));
    console.log(chalk.yellow('\nNext steps:'));
    console.log('  1. cd docs');
    console.log('  2. npm install -g mint@latest');
    console.log('  3. mint dev');
    console.log('\nYour documentation will be available at http://localhost:3000');
    
  } catch (error) {
    console.error(chalk.red('\n Documentation build failed:'), error);
    process.exit(1);
  }
}

main();
