import fs from 'fs-extra';
import path from 'path';
import { input, confirm, select } from '@inquirer/prompts';
import chalk from 'chalk';

// Generate a version management script
export function generateVersionManagerScript(projectName) {
  return `#!/bin/bash

# Version management script for ${projectName} documentation
# Manages version freezing and creation with proper navigation updates

set -e

# Color codes for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "\${BLUE}\${NC} \$1"
}

print_success() {
    echo -e "\${GREEN}✓\${NC} \$1"
}

print_warning() {
    echo -e "\${YELLOW}\${NC} \$1"
}

print_error() {
    echo -e "\${RED}✗\${NC} \$1"
}

# Function to get the current development version from mint.json
get_current_version() {
    node -e "
        const fs = require('fs');
        const config = JSON.parse(fs.readFileSync('mint.json', 'utf8'));
        if (config.versions && config.versions.length > 0) {
            const current = config.versions.find(v => 
                typeof v === 'string' ? v !== 'main' : v.name !== 'main'
            );
            console.log(typeof current === 'string' ? current : current?.name || '');
        }
    " 2>/dev/null
}

# Function to prompt for user confirmation
confirm() {
    local prompt="\$1"
    local response

    echo -n "\$prompt (y/n): "
    read -r response
    case "\$response" in
        [yY][eE][sS]|[yY])
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Main script
echo ""
echo "======================================"
echo "   Documentation Version Manager"
echo "======================================"
echo ""

# 1. Determine the current version to freeze
CURRENT_VERSION=\$(get_current_version)

if [ -z "\$CURRENT_VERSION" ]; then
    print_error "No current version found in mint.json"
    print_info "This might be the first version freeze. Please specify the version to freeze."
    echo -n "Enter the version to freeze (e.g., v1.0.0): "
    read -r CURRENT_VERSION

    if [ -z "\$CURRENT_VERSION" ]; then
        print_error "Version cannot be empty"
        exit 1
    fi
fi

print_info "Current development version: \${GREEN}\$CURRENT_VERSION\${NC}"

# 2. Check if the version directory already exists
if [ -d "docs/\$CURRENT_VERSION" ]; then
    print_error "Version \$CURRENT_VERSION already exists as a frozen version"
    print_info "Frozen versions are immutable. If you need to update, please use a different version."
    exit 1
fi

# 3. Prompt for the new development version
echo ""
echo -n "Enter the new development version (e.g., v1.1.0): "
read -r NEW_VERSION

if [ -z "\$NEW_VERSION" ]; then
    print_error "New version cannot be empty"
    exit 1
fi

# Validate version format (basic check for v#.#.#)
if ! [[ "\$NEW_VERSION" =~ ^v[0-9]+\\.[0-9]+\\.[0-9]+\$ ]]; then
    print_warning "Version format should be v#.#.# (e.g., v1.1.0)"
    if ! confirm "Continue with '\$NEW_VERSION' anyway?"; then
        exit 1
    fi
fi

# 4. Display summary and confirm
echo ""
echo "======================================"
echo "   Version Management Summary"
echo "======================================"
echo ""
echo "  Freeze version:  \${YELLOW}\$CURRENT_VERSION\${NC} (becomes immutable)"
echo "  New dev version: \${GREEN}\$NEW_VERSION\${NC} (for future development)"
echo ""
echo "This will:"
echo "  1. Create a frozen copy at docs/\$CURRENT_VERSION/"
echo "  2. Update all internal links in the frozen version"
echo "  3. Update mint.json with version configuration"
echo "  4. Set \$NEW_VERSION as the new development version"
echo ""

if ! confirm "Proceed with version management?"; then
    print_info "Operation cancelled"
    exit 0
fi

# 5. Execute the freeze operation
echo ""
print_info "Starting version freeze for \$CURRENT_VERSION..."

# Create versions directory if it doesn't exist
mkdir -p versions

# Create version directory and copy docs
print_info "Creating version directory..."
mkdir -p "docs/\$CURRENT_VERSION"

# Copy all MDX files and assets
find . -name "*.mdx" -not -path "./docs/*" -not -path "./node_modules/*" | while read -r file; do
    target="docs/\$CURRENT_VERSION/\$file"
    mkdir -p "\$(dirname "\$target")"
    cp "\$file" "\$target"
done

# Copy images and other assets
if [ -d "images" ]; then
    cp -r images "docs/\$CURRENT_VERSION/"
fi

# 6. Update all internal links in the versioned files
print_info "Updating internal links..."
find "docs/\$CURRENT_VERSION" -name "*.mdx" -type f -exec sed -i '' "s|](/|](/docs/\$CURRENT_VERSION/|g" {} \\;

# 7. Update mint.json
print_info "Updating mint.json with new version..."
node -e "
    const fs = require('fs');
    const config = JSON.parse(fs.readFileSync('mint.json', 'utf8'));
    
    // Initialize versions array if it doesn't exist
    if (!config.versions) {
        config.versions = [];
    }
    
    // Add new version at the beginning (newest first)
    const newVersion = '\$NEW_VERSION';
    const currentVersion = '\$CURRENT_VERSION';
    
    // Remove current version if it exists
    config.versions = config.versions.filter(v => 
        (typeof v === 'string' ? v : v.name) !== currentVersion
    );
    
    // Add new version and frozen version
    config.versions.unshift(newVersion);
    config.versions.push({
        name: currentVersion,
        url: 'docs/' + currentVersion
    });
    
    fs.writeFileSync('mint.json', JSON.stringify(config, null, 2));
    console.log('Updated mint.json');
"

# 8. Create a marker file in the frozen version
echo "\$CURRENT_VERSION - Frozen on \$(date '+%Y-%m-%d')" > "docs/\$CURRENT_VERSION/.version-frozen"

# Add metadata about the freeze
cat > "docs/\$CURRENT_VERSION/.version-metadata.json" << EOF
{
  "version": "\$CURRENT_VERSION",
  "frozenDate": "\$(date '+%Y-%m-%d')",
  "frozenTimestamp": "\$(date -u '+%Y-%m-%dT%H:%M:%SZ')",
  "nextVersion": "\$NEW_VERSION"
}
EOF

# 9. Display completion message
echo ""
print_success "Version management completed successfully!"
echo ""
echo "======================================"
echo "   Status"
echo "======================================"
echo ""
echo "  \${GREEN}✓\${NC} Version \$CURRENT_VERSION has been frozen (immutable)"
echo "  \${GREEN}✓\${NC} Development continues on version \$NEW_VERSION"
echo "  \${GREEN}✓\${NC} mint.json updated with version configuration"
echo ""
echo "======================================"
echo "   Next Steps"
echo "======================================"
echo ""
echo "  1. Review the changes:"
echo "     \${BLUE}git status\${NC}"
echo ""
echo "  2. Stage and commit the changes:"
echo "     \${BLUE}git add -A\${NC}"
echo "     \${BLUE}git commit -m \"docs: freeze \$CURRENT_VERSION and begin \$NEW_VERSION development\"\${NC}"
echo ""
echo "  3. Push to repository:"
echo "     \${BLUE}git push\${NC}"
echo ""
echo "  4. Continue development for version \$NEW_VERSION"
echo ""
`;
}

// Generate a release notes sync script
export function generateReleaseNotesSyncScript(repoOwner, repoName) {
  return `#!/bin/bash

# Script to sync release notes from ${repoOwner}/${repoName} changelog

set -e

# Get source from command line argument, default to latest release
SOURCE="\${1:-latest}"

if [ "\$SOURCE" = "latest" ]; then
    echo " Fetching latest release tag from ${repoOwner}/${repoName}..."
    # Get the latest release tag from GitHub API
    LATEST_TAG=\$(curl -s https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\\1/')
    if [ -z "\$LATEST_TAG" ]; then
        echo " Could not fetch latest tag, falling back to main branch"
        SOURCE="main"
    else
        SOURCE="\$LATEST_TAG"
        echo "✓ Using latest release: \$SOURCE"
    fi
fi

echo " Fetching changelog from ${repoOwner}/${repoName}: \$SOURCE..."

# Create tmp directory if it doesn't exist
mkdir -p tmp

# Fetch the CHANGELOG.md from the specified source (tag or branch)
curl -s "https://raw.githubusercontent.com/${repoOwner}/${repoName}/\$SOURCE/CHANGELOG.md" > tmp/changelog.md

if [ ! -s tmp/changelog.md ]; then
    echo " Failed to fetch changelog or changelog is empty"
    exit 1
fi

echo "✓ Successfully fetched changelog (\$(wc -l < tmp/changelog.md) lines)"

echo " Parsing and converting changelog..."

# Run the parser script
node scripts/parse-changelog.js

if [ ! -f tmp/release-notes.mdx ]; then
    echo " Failed to generate release notes"
    exit 1
fi

echo " Updating release notes file..."

# Create directory if it doesn't exist
mkdir -p changelog

# Copy the generated file to the docs directory
cp tmp/release-notes.mdx changelog/release-notes.mdx

VERSION_COUNT=\$(grep -c '<Update' changelog/release-notes.mdx || true)
echo "✓ Release notes updated with \$VERSION_COUNT versions"

echo ""
echo " Summary:"
echo "  - Source: https://raw.githubusercontent.com/${repoOwner}/${repoName}/\$SOURCE/CHANGELOG.md"
echo "  - Version/Branch: \$SOURCE"
echo "  - Output: changelog/release-notes.mdx"
echo "  - Versions: \$VERSION_COUNT"
echo ""
echo " Next steps:"
echo "  1. Review the changes: git diff changelog/release-notes.mdx"
echo "  2. Commit if satisfied: git add changelog/release-notes.mdx && git commit -m 'docs: refresh release notes from ${repoOwner}/${repoName} (\$SOURCE)'"
`;
}

// Generate a changelog parser script
export function generateChangelogParserScript() {
  return `#!/usr/bin/env node

const fs = require('fs');

function parseFullChangelog(content) {
  const lines = content.split('\\n');
  const versions = [];
  let currentVersion = null;
  let currentDate = null;
  let currentCategory = null;
  let categories = {};

  // Define standard categories in the order they should appear
  const standardCategories = [
    'DEPENDENCIES',
    'BUG FIXES',
    'IMPROVEMENTS',
    'FEATURES',
    'STATE BREAKING',
    'API-BREAKING',
    'API BREAKING',
    'BREAKING CHANGES',
    'DEPRECATED',
    'REMOVED',
    'SECURITY'
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip the main CHANGELOG header
    if (trimmedLine === '# CHANGELOG' || trimmedLine === '# Changelog') {
      continue;
    }

    // Match version headers like "## v0.4.1" or "## [v0.4.1] - 2024-10-11"
    const versionMatch = trimmedLine.match(/^##\\s+\\[?([v]?[\\d\\.\\-\\w]+)\\]?\\s*(?:-\\s*(.+))?$/);

    if (versionMatch) {
      // Save previous version if exists
      if (currentVersion && Object.keys(categories).some(cat => categories[cat].length > 0)) {
        versions.push({
          version: currentVersion,
          date: currentDate || new Date().toISOString().split('T')[0],
          categories: { ...categories }
        });
      }

      // Start new version
      currentVersion = versionMatch[1];
      currentDate = versionMatch[2] || null;

      // Try to extract date if it's in format "2024-10-11" or similar
      if (currentDate) {
        const dateMatch = currentDate.match(/(\\d{4}-\\d{2}-\\d{2})/);
        if (dateMatch) {
          currentDate = dateMatch[1];
        }
      }

      categories = {};
      currentCategory = null;
      continue;
    }

    // Skip UNRELEASED section
    if (trimmedLine === '## UNRELEASED' || trimmedLine === '## Unreleased') {
      // Save previous version before skipping
      if (currentVersion && Object.keys(categories).some(cat => categories[cat].length > 0)) {
        versions.push({
          version: currentVersion,
          date: currentDate || new Date().toISOString().split('T')[0],
          categories: { ...categories }
        });
      }
      currentVersion = null;
      categories = {};
      currentCategory = null;
      continue;
    }

    // Match category headers (### FEATURES, ### BUG FIXES, etc.)
    if (currentVersion && trimmedLine.startsWith('### ')) {
      const categoryName = trimmedLine.replace('### ', '').trim();

      // Only process standard categories
      if (standardCategories.some(cat => 
        cat === categoryName.toUpperCase() || 
        cat.replace(/[-_]/g, ' ') === categoryName.toUpperCase().replace(/[-_]/g, ' ')
      )) {
        currentCategory = categoryName;
        if (!categories[currentCategory]) {
          categories[currentCategory] = [];
        }
      } else {
        currentCategory = null; // Ignore non-standard categories
      }
      continue;
    }

    // Collect items under categories
    if (currentVersion && currentCategory && trimmedLine && !trimmedLine.startsWith('#')) {
      // Skip separator lines and empty content
      if (trimmedLine !== '---' && trimmedLine !== '___' && trimmedLine !== '***') {
        // Parse entries with PR links
        if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
          let item = trimmedLine.substring(2);
          
          // Extract PR links
          const prMatch = item.match(/\\(\\[#(\\d+)\\]\\([^)]+\\)\\)/);
          if (prMatch) {
            const prNumber = prMatch[1];
            item = item.replace(prMatch[0], \`(#\${prNumber})\`);
          }
          
          categories[currentCategory].push(item);
        }
      }
    }
  }

  // Save the last version if exists
  if (currentVersion && Object.keys(categories).some(cat => categories[cat].length > 0)) {
    versions.push({
      version: currentVersion,
      date: currentDate || new Date().toISOString().split('T')[0],
      categories: { ...categories }
    });
  }

  return versions;
}

function generateMDX(versions) {
  let mdx = \`---
title: Release Notes
description: Complete changelog and release notes
---

import { Update } from '/snippets/update.mdx';

# Release Notes

\`;

  for (const release of versions) {
    mdx += \`<Update version="\${release.version}" date="\${release.date}">\\n\`;

    // Add categories in a consistent order
    const categoryOrder = ['FEATURES', 'IMPROVEMENTS', 'BUG FIXES', 'DEPENDENCIES', 'BREAKING CHANGES', 'API-BREAKING', 'API BREAKING', 'STATE BREAKING', 'DEPRECATED', 'REMOVED', 'SECURITY'];
    
    for (const categoryName of categoryOrder) {
      const items = release.categories[categoryName] || release.categories[categoryName.replace(' ', '-')];
      if (items && items.length > 0) {
        mdx += \`  <Update.Category name="\${categoryName}">\\n\`;
        for (const item of items) {
          mdx += \`    - \${item}\\n\`;
        }
        mdx += \`  </Update.Category>\\n\`;
      }
    }

    mdx += \`</Update>\\n\\n\`;
  }

  return mdx;
}

// Read the changelog
const changelogPath = 'tmp/changelog.md';
const outputPath = 'tmp/release-notes.mdx';

try {
  const content = fs.readFileSync(changelogPath, 'utf8');
  const versions = parseFullChangelog(content);
  
  console.log(\`Parsed \${versions.length} versions\`);
  
  const mdx = generateMDX(versions);
  fs.writeFileSync(outputPath, mdx);
  
  console.log(\`Generated MDX file at \${outputPath}\`);
} catch (error) {
  console.error('Error processing changelog:', error.message);
  process.exit(1);
}
`;
}

// Generate GitHub workflow for automatic versioning on release
export function generateAutoVersioningWorkflow(repoOwner, repoName) {
  return `name: Auto Version Documentation

on:
  repository_dispatch:
    types: [release-published]
  workflow_dispatch:
    inputs:
      release_version:
        description: 'Version to freeze (e.g., v1.0.0)'
        required: true
        type: string
      next_version:
        description: 'Next development version (e.g., v1.1.0)'
        required: true
        type: string

jobs:
  auto-version:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          token: \${{ secrets.GITHUB_TOKEN }}
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Determine versions
        id: versions
        run: |
          if [[ "\${{ github.event_name }}" == "repository_dispatch" ]]; then
            # Extract version from repository dispatch
            RELEASE_VERSION="\${{ github.event.client_payload.tag_name }}"
            
            # Generate next version by incrementing minor version
            BASE_VERSION=\${RELEASE_VERSION#v}
            IFS='.' read -r major minor patch <<< "\$BASE_VERSION"
            NEXT_VERSION="v\$major.\$((minor + 1)).0"
          else
            # Use manual inputs
            RELEASE_VERSION="\${{ github.event.inputs.release_version }}"
            NEXT_VERSION="\${{ github.event.inputs.next_version }}"
          fi
          
          echo "release_version=\$RELEASE_VERSION" >> \$GITHUB_OUTPUT
          echo "next_version=\$NEXT_VERSION" >> \$GITHUB_OUTPUT
          
          echo " Freezing version: \$RELEASE_VERSION"
          echo " Next development version: \$NEXT_VERSION"

      - name: Check if version already frozen
        id: check_frozen
        run: |
          if [ -d "docs/\${{ steps.versions.outputs.release_version }}" ]; then
            echo " Version \${{ steps.versions.outputs.release_version }} is already frozen"
            echo "frozen=true" >> \$GITHUB_OUTPUT
          else
            echo " Version \${{ steps.versions.outputs.release_version }} can be frozen"
            echo "frozen=false" >> \$GITHUB_OUTPUT
          fi

      - name: Fetch and update changelog
        if: steps.check_frozen.outputs.frozen == 'false'
        run: |
          echo " Fetching latest changelog from ${repoOwner}/${repoName}..."
          
          # Create tmp directory
          mkdir -p tmp
          
          # Fetch changelog
          curl -s "https://raw.githubusercontent.com/${repoOwner}/${repoName}/main/CHANGELOG.md" > tmp/changelog.md
          
          if [ ! -s tmp/changelog.md ]; then
            echo " Could not fetch changelog, continuing without update"
          else
            echo " Fetched changelog successfully"
            
            # Parse changelog
            node scripts/parse-changelog.js
            
            # Update release notes
            if [ -f tmp/release-notes.mdx ]; then
              cp tmp/release-notes.mdx changelog/release-notes.mdx
              echo " Updated release notes"
            fi
          fi

      - name: Freeze current version
        if: steps.check_frozen.outputs.frozen == 'false'
        run: |
          CURRENT_VERSION="\${{ steps.versions.outputs.release_version }}"
          
          echo " Freezing version \$CURRENT_VERSION..."
          
          # Create versions directory
          mkdir -p versions
          
          # Create version directory and copy docs
          mkdir -p "docs/\$CURRENT_VERSION"
          
          # Copy all MDX files and assets
          find . -name "*.mdx" -not -path "./docs/*" -not -path "./node_modules/*" | while read -r file; do
            target="docs/\$CURRENT_VERSION/\$file"
            mkdir -p "\$(dirname "\$target")"
            cp "\$file" "\$target"
          done
          
          # Copy images if they exist
          if [ -d "images" ]; then
            cp -r images "docs/\$CURRENT_VERSION/"
          fi
          
          # Update internal links in frozen version
          find "docs/\$CURRENT_VERSION" -name "*.mdx" -type f -exec sed -i "s|](/|](/docs/\$CURRENT_VERSION/|g" {} \\;
          
          # Create version metadata
          cat > "docs/\$CURRENT_VERSION/.version-metadata.json" << EOF
          {
            "version": "\$CURRENT_VERSION",
            "frozenDate": "\$(date '+%Y-%m-%d')",
            "frozenTimestamp": "\$(date -u '+%Y-%m-%dT%H:%M:%SZ')",
            "nextVersion": "\${{ steps.versions.outputs.next_version }}",
            "automated": true
          }
          EOF
          
          echo " Version \$CURRENT_VERSION frozen successfully"

      - name: Update mint.json
        if: steps.check_frozen.outputs.frozen == 'false'
        run: |
          node -e "
            const fs = require('fs');
            const config = JSON.parse(fs.readFileSync('mint.json', 'utf8'));
            
            const currentVersion = '\${{ steps.versions.outputs.release_version }}';
            const nextVersion = '\${{ steps.versions.outputs.next_version }}';
            
            // Initialize versions if not exists
            if (!config.versions) {
              config.versions = [];
            }
            
            // Remove current version if it exists
            config.versions = config.versions.filter(v => 
              (typeof v === 'string' ? v : v.name) !== currentVersion
            );
            
            // Add new development version at the beginning
            config.versions.unshift(nextVersion);
            
            // Add frozen version with URL
            config.versions.push({
              name: currentVersion,
              url: 'docs/' + currentVersion
            });
            
            fs.writeFileSync('mint.json', JSON.stringify(config, null, 2));
            console.log(' Updated mint.json with new versions');
          "

      - name: Commit and push changes
        if: steps.check_frozen.outputs.frozen == 'false'
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          
          git add -A
          git commit -m "docs: auto-freeze \${{ steps.versions.outputs.release_version }} and begin \${{ steps.versions.outputs.next_version }} development

          Automated version management triggered by new release in ${repoOwner}/${repoName}"
          
          git push
          
          echo " Changes committed and pushed successfully"

      - name: Create summary
        run: |
          echo "##  Version Management Summary" >> \$GITHUB_STEP_SUMMARY
          echo "" >> \$GITHUB_STEP_SUMMARY
          
          if [[ "\${{ steps.check_frozen.outputs.frozen }}" == "true" ]]; then
            echo " **Version \${{ steps.versions.outputs.release_version }} was already frozen**" >> \$GITHUB_STEP_SUMMARY
            echo "No action was taken." >> \$GITHUB_STEP_SUMMARY
          else
            echo " **Successfully processed version management**" >> \$GITHUB_STEP_SUMMARY
            echo "" >> \$GITHUB_STEP_SUMMARY
            echo "-  Frozen version: \`\${{ steps.versions.outputs.release_version }}\`" >> \$GITHUB_STEP_SUMMARY
            echo "-  New development version: \`\${{ steps.versions.outputs.next_version }}\`" >> \$GITHUB_STEP_SUMMARY
            echo "-  Release notes updated from ${repoOwner}/${repoName}" >> \$GITHUB_STEP_SUMMARY
            echo "" >> \$GITHUB_STEP_SUMMARY
            echo "### Next Steps" >> \$GITHUB_STEP_SUMMARY
            echo "- Continue development in the main docs for version \${{ steps.versions.outputs.next_version }}" >> \$GITHUB_STEP_SUMMARY
            echo "- The frozen version is available at \`/docs/\${{ steps.versions.outputs.release_version }}\`" >> \$GITHUB_STEP_SUMMARY
          fi
`;
}

// Generate GitHub workflow for automatic changelog sync
export function generateGitHubWorkflow(repoOwner, repoName) {
  return `name: Sync Changelog to Docs

on:
  repository_dispatch:
    types: [release-published]
  workflow_dispatch:
    inputs:
      release_tag:
        description: 'Release tag to sync'
        required: true
        type: string

jobs:
  sync-changelog:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout docs repo
        uses: actions/checkout@v4
        with:
          token: \${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Fetch changelog
        id: fetch-changelog
        run: |
          # Get the release tag from either repository_dispatch or workflow_dispatch
          if [[ "\${{ github.event_name }}" == "repository_dispatch" ]]; then
            RELEASE_TAG="\${{ github.event.client_payload.tag_name }}"
          else
            RELEASE_TAG="\${{ github.event.inputs.release_tag }}"
          fi

          echo "release_tag=\$RELEASE_TAG" >> \$GITHUB_OUTPUT

          # Fetch the entire CHANGELOG.md from the repo main branch
          # We always pull from main to get the complete changelog
          curl -s "https://raw.githubusercontent.com/${repoOwner}/${repoName}/main/CHANGELOG.md" > tmp/changelog.md

          if [ ! -s tmp/changelog.md ]; then
            echo "Failed to fetch changelog or changelog is empty"
            exit 1
          fi

          echo "Successfully fetched changelog (\$(wc -l < tmp/changelog.md) lines)"

      - name: Parse and convert changelog
        id: convert
        run: node scripts/parse-changelog.js

      - name: Update changelog file
        run: |
          CHANGELOG_FILE="changelog/release-notes.mdx"

          # Create directory if it doesn't exist
          mkdir -p "\$(dirname "\$CHANGELOG_FILE")"

          # Replace the entire file with the newly generated content
          cp tmp/release-notes.mdx "\$CHANGELOG_FILE"

          echo "Changelog updated with \$(grep -c '<Update' "\$CHANGELOG_FILE") versions"

      - name: Commit and push changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"

          git add changelog/release-notes.mdx

          if git diff --staged --quiet; then
            echo "No changes to commit"
          else
            git commit -m "docs: update changelog for \${{ steps.fetch-changelog.outputs.release_tag }}"
            git push
          fi
`;
}

// Generate Update component for release notes
export function generateUpdateComponent() {
  return `export function Update({ version, date, children }) {
  return (
    <div className="update-container">
      <div className="update-header">
        <h3 className="update-version">{version}</h3>
        <span className="update-date">{date}</span>
      </div>
      <div className="update-content">
        {children}
      </div>
    </div>
  );
}

Update.Category = function Category({ name, children }) {
  return (
    <div className="update-category">
      <h4 className="category-name">{name}</h4>
      <div className="category-items">
        {children}
      </div>
    </div>
  );
};
`;
}

// Main function to set up versioning
export async function setupVersioning(outputDir) {
  console.log(chalk.yellow('\n Versioning System Setup'));
  
  const enableVersioning = await confirm({
    message: 'Enable automated versioning system?',
    default: false
  });

  if (!enableVersioning) {
    return null;
  }

  const versioningConfig = {};

  // Ask for initial version
  versioningConfig.initialVersion = await input({
    message: 'Initial version (e.g., v1.0.0):',
    default: 'v1.0.0',
    validate: (value) => {
      if (!/^v?\d+\.\d+\.\d+/.test(value)) {
        return 'Version should be in format v#.#.# or #.#.#';
      }
      return true;
    }
  });

  // Ask about changelog sync
  const syncChangelog = await confirm({
    message: 'Set up automatic changelog sync from GitHub releases?',
    default: false
  });

  if (syncChangelog) {
    versioningConfig.changelogSync = {
      enabled: true
    };

    const sourceType = await select({
      message: 'Changelog source:',
      choices: [
        { name: 'Same repository', value: 'same' },
        { name: 'Different repository', value: 'different' }
      ]
    });

    if (sourceType === 'different') {
      versioningConfig.changelogSync.repoOwner = await input({
        message: 'Repository owner/organization:',
        validate: (value) => value.trim() ? true : 'Repository owner is required'
      });

      versioningConfig.changelogSync.repoName = await input({
        message: 'Repository name:',
        validate: (value) => value.trim() ? true : 'Repository name is required'
      });
    } else {
      // Extract from git remote if possible
      try {
        const gitRemote = await fs.readFile('.git/config', 'utf8').catch(() => '');
        const match = gitRemote.match(/url = .*github\.com[:/]([^/]+)\/(.+?)\.git/);
        if (match) {
          versioningConfig.changelogSync.repoOwner = match[1];
          versioningConfig.changelogSync.repoName = match[2];
        }
      } catch (e) {
        // Fallback to manual input
        versioningConfig.changelogSync.repoOwner = await input({
          message: 'GitHub username/organization:',
          validate: (value) => value.trim() ? true : 'Username is required'
        });

        versioningConfig.changelogSync.repoName = await input({
          message: 'Repository name:',
          validate: (value) => value.trim() ? true : 'Repository name is required'
        });
      }
    }
  }

  // Create versioning scripts
  console.log(chalk.cyan('\n Generating versioning scripts...'));

  // Create scripts directory
  const scriptsDir = path.join(outputDir, 'scripts');
  await fs.ensureDir(scriptsDir);

  // Generate version manager script
  const versionManagerPath = path.join(scriptsDir, 'version-manager.sh');
  await fs.writeFile(
    versionManagerPath,
    generateVersionManagerScript(versioningConfig.projectName || 'Mintlify')
  );
  await fs.chmod(versionManagerPath, '755');
  console.log(chalk.green('✓ Created scripts/version-manager.sh'));

  // Generate changelog sync script if enabled
  if (versioningConfig.changelogSync?.enabled) {
    const syncScriptPath = path.join(scriptsDir, 'sync-changelog.sh');
    await fs.writeFile(
      syncScriptPath,
      generateReleaseNotesSyncScript(
        versioningConfig.changelogSync.repoOwner,
        versioningConfig.changelogSync.repoName
      )
    );
    await fs.chmod(syncScriptPath, '755');
    console.log(chalk.green('✓ Created scripts/sync-changelog.sh'));

    // Generate changelog parser
    const parserPath = path.join(scriptsDir, 'parse-changelog.js');
    await fs.writeFile(parserPath, generateChangelogParserScript());
    await fs.chmod(parserPath, '755');
    console.log(chalk.green('✓ Created scripts/parse-changelog.js'));

    // Create GitHub workflows
    const workflowDir = path.join(outputDir, '.github', 'workflows');
    await fs.ensureDir(workflowDir);

    // Changelog sync workflow
    const syncWorkflowPath = path.join(workflowDir, 'sync-changelog.yml');
    await fs.writeFile(
      syncWorkflowPath,
      generateGitHubWorkflow(
        versioningConfig.changelogSync.repoOwner,
        versioningConfig.changelogSync.repoName
      )
    );
    console.log(chalk.green('✓ Created .github/workflows/sync-changelog.yml'));

    // Ask if they want automatic versioning on release
    const autoVersion = await confirm({
      message: 'Enable automatic version freezing on new releases?',
      default: true
    });

    if (autoVersion) {
      const autoVersionPath = path.join(workflowDir, 'auto-version.yml');
      await fs.writeFile(
        autoVersionPath,
        generateAutoVersioningWorkflow(
          versioningConfig.changelogSync.repoOwner,
          versioningConfig.changelogSync.repoName
        )
      );
      console.log(chalk.green('✓ Created .github/workflows/auto-version.yml'));
      versioningConfig.autoVersioning = true;
      
      // Create webhook setup instructions
      const webhookInstructionsPath = path.join(outputDir, 'WEBHOOK_SETUP.md');
      const webhookInstructions = `# Webhook Setup for Auto-Versioning

To enable automatic versioning when a new release is published in ${versioningConfig.changelogSync.repoOwner}/${versioningConfig.changelogSync.repoName}:

## Option 1: GitHub Actions (Recommended)

Add this workflow to the **source repository** (${versioningConfig.changelogSync.repoOwner}/${versioningConfig.changelogSync.repoName}):

\`\`\`yaml
# .github/workflows/trigger-docs-version.yml
name: Trigger Docs Versioning

on:
  release:
    types: [published]

jobs:
  trigger-versioning:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger documentation versioning
        run: |
          curl -X POST \\
            -H "Accept: application/vnd.github.v3+json" \\
            -H "Authorization: token \${{ secrets.DOCS_REPO_TOKEN }}" \\
            https://api.github.com/repos/[YOUR_DOCS_REPO]/dispatches \\
            -d '{"event_type":"release-published","client_payload":{"tag_name":"\${{ github.event.release.tag_name }}"}}'
\`\`\`

Replace \`[YOUR_DOCS_REPO]\` with your documentation repository path (e.g., \`username/docs\`).

### Required Setup:
1. Create a Personal Access Token with \`repo\` scope
2. Add it as \`DOCS_REPO_TOKEN\` secret in the source repository

## Option 2: Manual Trigger

Run the workflow manually from GitHub Actions tab:
1. Go to Actions → Auto Version Documentation
2. Click "Run workflow"
3. Enter the version to freeze and next version
4. Click "Run workflow"

## Option 3: Webhook

Set up a webhook in the source repository:
1. Go to Settings → Webhooks → Add webhook
2. Payload URL: Use a webhook relay service or GitHub Apps
3. Content type: application/json
4. Events: Select "Releases"

Note: This requires additional setup with a webhook relay service.
`;
      await fs.writeFile(webhookInstructionsPath, webhookInstructions);
      console.log(chalk.green('✓ Created WEBHOOK_SETUP.md with integration instructions'));
    }
  }

  // Create snippets directory with Update component
  const snippetsDir = path.join(outputDir, 'snippets');
  await fs.ensureDir(snippetsDir);

  const updateComponentPath = path.join(snippetsDir, 'update.mdx');
  await fs.writeFile(updateComponentPath, generateUpdateComponent());
  console.log(chalk.green('✓ Created snippets/update.mdx'));

  // Create initial changelog directory
  const changelogDir = path.join(outputDir, 'changelog');
  await fs.ensureDir(changelogDir);

  // Create initial release notes file
  const releaseNotesPath = path.join(changelogDir, 'release-notes.mdx');
  const initialReleaseNotes = `---
title: Release Notes
description: Complete changelog and release notes
---

import { Update } from '/snippets/update.mdx';

# Release Notes

<Update version="${versioningConfig.initialVersion}" date="${new Date().toISOString().split('T')[0]}">
  <Update.Category name="FEATURES">
    - Initial release
  </Update.Category>
</Update>
`;
  await fs.writeFile(releaseNotesPath, initialReleaseNotes);
  console.log(chalk.green('✓ Created changelog/release-notes.mdx'));

  // Update mint.json with version configuration
  const mintJsonPath = path.join(outputDir, 'mint.json');
  if (await fs.pathExists(mintJsonPath)) {
    const mintConfig = await fs.readJson(mintJsonPath);
    
    // Add version configuration
    mintConfig.versions = [versioningConfig.initialVersion];
    
    // Add changelog to navigation if not already there
    if (mintConfig.navigation && !mintConfig.navigation.some(group => 
      group.pages && group.pages.some(page => page.includes('changelog'))
    )) {
      // Find or create a suitable group for changelog
      let changelogGroup = mintConfig.navigation.find(group => 
        group.group && group.group.toLowerCase().includes('reference')
      );
      
      if (!changelogGroup) {
        changelogGroup = {
          group: 'Reference',
          pages: []
        };
        mintConfig.navigation.push(changelogGroup);
      }
      
      changelogGroup.pages.push('changelog/release-notes');
    }
    
    await fs.writeJson(mintJsonPath, mintConfig, { spaces: 2 });
    console.log(chalk.green('✓ Updated mint.json with version configuration'));
  }

  return versioningConfig;
}