import fs from 'fs-extra';
import path from 'path';
import { input, confirm, select } from '@inquirer/prompts';
import chalk from 'chalk';

// Generate a version management script for docs.json with all improvements
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

# Function to check if a command exists
command_exists() {
    command -v "\$1" >/dev/null 2>&1
}

# Error handler
handle_error() {
    local line_no=\$1
    print_error "An error occurred on line \$line_no"
    print_info "Rolling back changes..."
    # Add rollback logic here if needed
    exit 1
}

# Set error trap
trap 'handle_error \$LINENO' ERR

# Function to parse semantic version
parse_version() {
    local version="\$1"
    # Remove 'v' prefix if present
    version="\${version#v}"
    
    # Parse major.minor.patch
    if [[ "\$version" =~ ^([0-9]+)\\.([0-9]+)\\.([0-9]+)(.*)\$ ]]; then
        echo "\${BASH_REMATCH[1]} \${BASH_REMATCH[2]} \${BASH_REMATCH[3]} \${BASH_REMATCH[4]}"
        return 0
    fi
    return 1
}

# Function to compare versions
version_gt() {
    local v1="\$1"
    local v2="\$2"
    
    local v1_parts=(\\$(parse_version "\$v1"))
    local v2_parts=(\\$(parse_version "\$v2"))
    
    if [ \${#v1_parts[@]} -eq 0 ] || [ \${#v2_parts[@]} -eq 0 ]; then
        return 1
    fi
    
    # Compare major
    if [ "\${v1_parts[0]}" -gt "\${v2_parts[0]}" ]; then
        return 0
    elif [ "\${v1_parts[0]}" -lt "\${v2_parts[0]}" ]; then
        return 1
    fi
    
    # Compare minor
    if [ "\${v1_parts[1]}" -gt "\${v2_parts[1]}" ]; then
        return 0
    elif [ "\${v1_parts[1]}" -lt "\${v2_parts[1]}" ]; then
        return 1
    fi
    
    # Compare patch
    if [ "\${v1_parts[2]}" -gt "\${v2_parts[2]}" ]; then
        return 0
    else
        return 1
    fi
}

# Function to get the current development version from versions.json
get_current_version() {
    if [ ! -f versions.json ]; then
        return
    fi
    
    # Check for errors in node command
    local result
    result=\\$(node -e "
        try {
            const fs = require('fs');
            const versions = JSON.parse(fs.readFileSync('versions.json', 'utf8'));
            const currentVersion = versions.currentVersion || versions.versions.find(v => v !== 'next' && v !== 'latest' && v !== 'main');
            if (currentVersion && currentVersion !== 'next' && currentVersion !== 'latest' && currentVersion !== 'main') {
                console.log(currentVersion);
            }
        } catch (e) {
            process.exit(1);
        }
    " 2>&1) || {
        print_error "Failed to read versions.json: \$result"
        return 1
    }
    
    echo "\$result"
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

# 0. Pre-flight checks
print_info "Running pre-flight checks..."

# Check Node.js
if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js >= 18.0.0"
    exit 1
fi

# Check Node version
NODE_VERSION=\\$(node -v | cut -d'v' -f2)
NODE_MAJOR=\\$(echo "\$NODE_VERSION" | cut -d'.' -f1)
if [ "\$NODE_MAJOR" -lt 18 ]; then
    print_error "Node.js version must be >= 18.0.0 (found: v\$NODE_VERSION)"
    exit 1
fi

# Check if docs.json exists
if [ ! -f docs.json ]; then
    print_error "docs.json not found in current directory"
    print_info "Please run this script from your documentation root directory"
    exit 1
fi

print_success "Pre-flight checks passed"

# 1. Check if versions.json exists, create if not
if [ ! -f versions.json ]; then
    print_info "Creating versions.json..."
    cat > versions.json << EOF
{
  "versions": [],
  "defaultVersion": null,
  "currentVersion": null,
  "latestLabel": "latest",
  "showLatest": true
}
EOF
    print_success "Created versions.json"
fi

# 2. Ask about latest/development version visibility
print_info "Configuration for latest/development version:"
echo ""
echo "How should the latest (in-development) version be handled?"
echo "  1) Show as 'latest' in version selector (default)"
echo "  2) Show as 'next' in version selector"
echo "  3) Show as 'main' in version selector"
echo "  4) Show with custom label"
echo "  5) Don't show in navigation (only show stable versions)"
echo ""
echo -n "Choose option [1-5] (default: 1): "
read -r LATEST_OPTION

case "\$LATEST_OPTION" in
    2)
        LATEST_LABEL="next"
        SHOW_LATEST=true
        ;;
    3)
        LATEST_LABEL="main"
        SHOW_LATEST=true
        ;;
    4)
        echo -n "Enter custom label: "
        read -r LATEST_LABEL
        if [ -z "\$LATEST_LABEL" ]; then
            LATEST_LABEL="latest"
        fi
        SHOW_LATEST=true
        ;;
    5)
        LATEST_LABEL=""
        SHOW_LATEST=false
        ;;
    *)
        LATEST_LABEL="latest"
        SHOW_LATEST=true
        ;;
esac

# Update versions.json with label preference
node -e "
    const fs = require('fs');
    const versions = JSON.parse(fs.readFileSync('versions.json', 'utf8'));
    versions.latestLabel = '\$LATEST_LABEL';
    versions.showLatest = \$SHOW_LATEST;
    fs.writeFileSync('versions.json', JSON.stringify(versions, null, 2));
" || {
    print_error "Failed to update versions.json"
    exit 1
}

# 3. Ask about external changelog
echo ""
if confirm "Do you want to fetch changelog from an external repository?"; then
    echo -n "Enter repository (format: owner/repo): "
    read -r EXTERNAL_REPO
    
    if [ -n "\$EXTERNAL_REPO" ]; then
        print_info "Fetching changelog from \$EXTERNAL_REPO..."
        
        # Check if refresh-changelog.sh exists
        if [ -f scripts/refresh-changelog.sh ]; then
            if bash scripts/refresh-changelog.sh "\$EXTERNAL_REPO" latest; then
                print_success "Changelog fetched and updated"
            else
                print_warning "Failed to fetch changelog, continuing without it"
            fi
        else
            print_warning "Changelog fetch script not found, skipping"
        fi
    fi
fi

# 4. Determine the current version to freeze
CURRENT_VERSION=\\$(get_current_version)

if [ -z "\$CURRENT_VERSION" ]; then
    print_info "This appears to be the first version freeze."
    echo -n "Enter the version to freeze (e.g., v1.0.0): "
    read -r CURRENT_VERSION
    
    if [ -z "\$CURRENT_VERSION" ]; then
        print_error "Version cannot be empty"
        exit 1
    fi
else
    print_info "Current development version: \${GREEN}\$CURRENT_VERSION\${NC}"
fi

# Validate version format
if ! [[ "\$CURRENT_VERSION" =~ ^v?[0-9]+\\.[0-9]+\\.[0-9]+([-+].*)?\$ ]]; then
    print_error "Invalid version format. Use semantic versioning (e.g., v1.0.0, 2.1.3, v1.0.0-beta.1)"
    exit 1
fi

# Ensure version has 'v' prefix
if [[ "\$CURRENT_VERSION" != v* ]]; then
    CURRENT_VERSION="v\$CURRENT_VERSION"
fi

# 5. Check if the version directory already exists
if [ -d "versions/\$CURRENT_VERSION" ]; then
    print_error "Version \$CURRENT_VERSION already exists as a frozen version"
    print_info "Frozen versions are immutable. Please use a different version."
    
    # Check for .version-frozen marker
    if [ -f "versions/\$CURRENT_VERSION/.version-frozen" ]; then
        FROZEN_DATE=\\$(cat "versions/\$CURRENT_VERSION/.version-frozen" | grep -o '[0-9]{4}-[0-9]{2}-[0-9]{2}' || echo "unknown date")
        print_info "This version was frozen on \$FROZEN_DATE"
    fi
    exit 1
fi

# 6. Prompt for the new development version
echo ""
echo -n "Enter the new development version (e.g., v1.1.0): "
read -r NEW_VERSION

if [ -z "\$NEW_VERSION" ]; then
    print_error "New version cannot be empty"
    exit 1
fi

# Validate new version format
if ! [[ "\$NEW_VERSION" =~ ^v?[0-9]+\\.[0-9]+\\.[0-9]+([-+].*)?\$ ]]; then
    print_error "Invalid version format. Use semantic versioning (e.g., v1.1.0, 2.2.0, v2.0.0-alpha.1)"
    exit 1
fi

# Ensure new version has 'v' prefix
if [[ "\$NEW_VERSION" != v* ]]; then
    NEW_VERSION="v\$NEW_VERSION"
fi

# Check that new version is greater than current version
if ! version_gt "\$NEW_VERSION" "\$CURRENT_VERSION"; then
    print_warning "New version (\$NEW_VERSION) should be greater than current version (\$CURRENT_VERSION)"
    if ! confirm "Continue anyway?"; then
        exit 1
    fi
fi

# 7. Display summary and confirm
echo ""
echo "======================================"
echo "   Version Management Summary"
echo "======================================"
echo ""
echo "  Freeze version:  \${YELLOW}\$CURRENT_VERSION\${NC} (becomes immutable)"
echo "  New dev version: \${GREEN}\$NEW_VERSION\${NC} (for future development)"
if [ "\$SHOW_LATEST" = true ]; then
    echo "  Latest label:    '\$LATEST_LABEL' (shown in navigation)"
else
    echo "  Latest version:  Hidden from navigation"
fi
echo ""
echo "This will:"
echo "  1. Create a frozen copy at versions/\$CURRENT_VERSION/"
echo "  2. Update internal document links (preserving snippet/asset paths)"
echo "  3. Update docs.json with version configuration"
echo "  4. Update versions.json registry"
echo "  5. Set \$NEW_VERSION as the new development version"
echo ""

if ! confirm "Proceed with version management?"; then
    print_info "Operation cancelled"
    exit 0
fi

# 8. Execute the freeze operation
echo ""
print_info "Starting version freeze for \$CURRENT_VERSION..."

# Create versions directory if it doesn't exist
mkdir -p versions

# Create version directory and copy current docs
print_info "Creating version directory..."
mkdir -p "versions/\$CURRENT_VERSION"

# Copy all MDX files and assets from root (excluding versions directory)
print_info "Copying documentation files..."
find . -maxdepth 2 -name "*.mdx" -not -path "./versions/*" -not -path "./node_modules/*" -not -path "./.git/*" 2>/dev/null | while read -r file; do
    target="versions/\$CURRENT_VERSION/\$file"
    mkdir -p "\\$(dirname "\$target")"
    cp "\$file" "\$target"
done

# Copy directories with content (check each exists first)
for dir in getting-started features changelog api reference documentation guides tutorials; do
    if [ -d "\$dir" ]; then
        print_info "Copying \$dir directory..."
        cp -r "\$dir" "versions/\$CURRENT_VERSION/"
    fi
done

# Copy images and other assets
if [ -d "images" ]; then
    print_info "Copying images..."
    cp -r images "versions/\$CURRENT_VERSION/"
fi

if [ -d "assets" ]; then
    print_info "Copying assets..."
    cp -r assets "versions/\$CURRENT_VERSION/"
fi

# 9. Update internal links in the versioned files (smart path management)
print_info "Updating internal document links..."

# Update only document links, preserve snippet and asset paths
find "versions/\$CURRENT_VERSION" -name "*.mdx" -type f | while read -r file; do
    # Create temp file for safer editing
    temp_file="\\$(mktemp)"
    
    # Use more sophisticated sed to only update document links, not snippets or assets
    sed -E '
        # Skip lines with snippet imports
        /^import.*\\/snippets\\//! {
            # Skip lines with asset references
            /\\/(assets|images|static)\\// ! {
                # Update relative document links
                s|]\\(\\/(getting-started\|features\|changelog\|api\|reference\|documentation\|guides\|tutorials)|](versions/'\$CURRENT_VERSION'/\\1|g
                # Update root MDX links
                s|]\\(\\/([a-zA-Z0-9_-]+\\.mdx)|](versions/'\$CURRENT_VERSION'/\\1|g
            }
        }
    ' "\$file" > "\$temp_file"
    
    # Move temp file back
    mv "\$temp_file" "\$file"
done

# 10. Clean up problematic MDX syntax (but preserve valid snippet imports)
print_info "Cleaning up MDX files..."

# Only remove truly problematic patterns
find "versions/\$CURRENT_VERSION" -name "*.mdx" -type f | while read -r file; do
    temp_file="\\$(mktemp)"
    
    # More targeted cleanup
    sed -E '
        # Fix ResponseExample closing tag followed by extra backticks
        /<\\/ResponseExample>\$/ {
            n
            /^\`\`\`\$/d
        }
    ' "\$file" > "\$temp_file"
    
    mv "\$temp_file" "\$file"
done

# 11. Update versions.json with proper version sorting
print_info "Updating versions.json..."
node -e "
    const fs = require('fs');
    const versions = JSON.parse(fs.readFileSync('versions.json', 'utf8'));
    
    // Add frozen version if not exists
    if (!versions.versions.includes('\$CURRENT_VERSION')) {
        versions.versions.push('\$CURRENT_VERSION');
    }
    
    // Sort versions using semantic versioning
    versions.versions.sort((a, b) => {
        // Handle special labels
        const specialOrder = { 'latest': -3, 'next': -2, 'main': -1 };
        if (specialOrder[a] !== undefined) return specialOrder[a];
        if (specialOrder[b] !== undefined) return -specialOrder[b];
        
        // Parse semantic versions
        const parseVer = (v) => {
            const match = v.match(/v?(\\d+)\\.(\\d+)\\.(\\d+)(.*)/);
            if (!match) return [0, 0, 0, ''];
            return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), match[4]];
        };
        
        const [aMajor, aMinor, aPatch, aPre] = parseVer(a);
        const [bMajor, bMinor, bPatch, bPre] = parseVer(b);
        
        // Compare versions (newest first)
        if (bMajor !== aMajor) return bMajor - aMajor;
        if (bMinor !== aMinor) return bMinor - aMinor;
        if (bPatch !== aPatch) return bPatch - aPatch;
        
        // Handle pre-release versions
        if (!aPre && bPre) return -1;
        if (aPre && !bPre) return 1;
        return bPre.localeCompare(aPre);
    });
    
    // Update current version
    versions.currentVersion = '\$NEW_VERSION';
    
    // Set default version to the frozen version
    versions.defaultVersion = '\$CURRENT_VERSION';
    
    fs.writeFileSync('versions.json', JSON.stringify(versions, null, 2));
    console.log('Updated versions.json');
" || {
    print_error "Failed to update versions.json"
    exit 1
}

# 12. Update docs.json navigation
print_info "Updating docs.json navigation..."
node -e "
    const fs = require('fs');
    const docsConfig = JSON.parse(fs.readFileSync('docs.json', 'utf8'));
    
    // Ensure navigation.versions exists
    if (!docsConfig.navigation) {
        docsConfig.navigation = {};
    }
    if (!docsConfig.navigation.versions) {
        docsConfig.navigation.versions = [];
    }
    
    // Get the latest label preference
    const versions = JSON.parse(fs.readFileSync('versions.json', 'utf8'));
    const latestLabel = versions.latestLabel || 'latest';
    const showLatest = versions.showLatest !== false;
    
    // Find or create latest/next navigation
    let latestNav = docsConfig.navigation.versions.find(v => 
        v.version === latestLabel || v.version === 'latest' || v.version === 'next' || v.version === 'main'
    );
    
    if (!latestNav && showLatest) {
        // Create from current navigation if no latest exists
        latestNav = {
            version: latestLabel,
            default: true,
            tabs: docsConfig.navigation.tabs || []
        };
        docsConfig.navigation.versions.unshift(latestNav);
    } else if (latestNav && showLatest) {
        // Update the version label
        latestNav.version = latestLabel;
        latestNav.default = true;
    } else if (latestNav && !showLatest) {
        // Remove latest from navigation if not showing
        const index = docsConfig.navigation.versions.findIndex(v => v === latestNav);
        if (index > -1) {
            docsConfig.navigation.versions.splice(index, 1);
        }
    }
    
    // Create frozen version navigation by copying and updating paths
    if (showLatest && latestNav) {
        const frozenNav = JSON.parse(JSON.stringify(latestNav));
        frozenNav.version = '\$CURRENT_VERSION';
        delete frozenNav.default; // Remove default flag from frozen version
        
        // Update all document paths in frozen navigation (preserve snippets/assets)
        function updatePaths(obj) {
            if (typeof obj === 'string') {
                // Only update document paths, not snippets or assets
                if (!obj.startsWith('versions/') && 
                    !obj.startsWith('http') &&
                    !obj.includes('/snippets/') &&
                    !obj.includes('/assets/') &&
                    !obj.includes('/images/') &&
                    !obj.includes('/static/')) {
                    return 'versions/\$CURRENT_VERSION/' + obj;
                }
                return obj;
            }
            if (Array.isArray(obj)) {
                return obj.map(updatePaths);
            }
            if (typeof obj === 'object' && obj !== null) {
                const newObj = {};
                for (const key in obj) {
                    if (key === 'pages' || key === 'groups' || key === 'tabs') {
                        newObj[key] = updatePaths(obj[key]);
                    } else {
                        newObj[key] = obj[key];
                    }
                }
                return newObj;
            }
            return obj;
        }
        
        frozenNav.tabs = updatePaths(frozenNav.tabs);
        
        // Add or update frozen version in navigation
        const existingIndex = docsConfig.navigation.versions.findIndex(v => v.version === '\$CURRENT_VERSION');
        if (existingIndex >= 0) {
            docsConfig.navigation.versions[existingIndex] = frozenNav;
        } else {
            // Insert after latest/next if it exists
            const insertIndex = showLatest ? 1 : 0;
            docsConfig.navigation.versions.splice(insertIndex, 0, frozenNav);
        }
    }
    
    // Sort versions (latest first if shown, then semantic versions)
    docsConfig.navigation.versions.sort((a, b) => {
        // Latest/next/main always first
        if (a.version === latestLabel) return -1;
        if (b.version === latestLabel) return 1;
        
        // Then sort by semantic version
        const parseVer = (v) => {
            const match = v.version.match(/v?(\\d+)\\.(\\d+)\\.(\\d+)(.*)/);
            if (!match) return [0, 0, 0, ''];
            return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), match[4]];
        };
        
        const [aMajor, aMinor, aPatch, aPre] = parseVer(a);
        const [bMajor, bMinor, bPatch, bPre] = parseVer(b);
        
        if (bMajor !== aMajor) return bMajor - aMajor;
        if (bMinor !== aMinor) return bMinor - aMinor;
        if (bPatch !== aPatch) return bPatch - aPatch;
        
        if (!aPre && bPre) return -1;
        if (aPre && !bPre) return 1;
        return bPre.localeCompare(aPre);
    });
    
    fs.writeFileSync('docs.json', JSON.stringify(docsConfig, null, 2));
    console.log('Updated docs.json');
" || {
    print_error "Failed to update docs.json"
    exit 1
}

# 13. Create marker files in the frozen version
echo "\$CURRENT_VERSION - Frozen on \\$(date '+%Y-%m-%d')" > "versions/\$CURRENT_VERSION/.version-frozen"

# Add detailed metadata about the freeze
cat > "versions/\$CURRENT_VERSION/.version-metadata.json" << EOF
{
  "version": "\$CURRENT_VERSION",
  "frozenDate": "\\$(date '+%Y-%m-%d')",
  "frozenTimestamp": "\\$(date -u '+%Y-%m-%dT%H:%M:%SZ')",
  "nextVersion": "\$NEW_VERSION",
  "frozenBy": "\\$(whoami)",
  "gitCommit": "\\$(git rev-parse HEAD 2>/dev/null || echo 'not-in-git')",
  "nodeVersion": "\\$(node -v)"
}
EOF

# 14. Display completion message
echo ""
print_success "Version management completed successfully!"
echo ""
echo "======================================"
echo "   Status"
echo "======================================"
echo ""
echo "  \${GREEN}✓\${NC} Version \$CURRENT_VERSION has been frozen (immutable)"
echo "  \${GREEN}✓\${NC} Development continues on version \$NEW_VERSION"
echo "  \${GREEN}✓\${NC} docs.json updated with version configuration"
echo "  \${GREEN}✓\${NC} versions.json updated with version registry"
if [ "\$SHOW_LATEST" = true ]; then
    echo "  \${GREEN}✓\${NC} Latest version shown as '\$LATEST_LABEL' in navigation"
else
    echo "  \${GREEN}✓\${NC} Latest version hidden from navigation"
fi
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

# Check for any errors that might have been suppressed
if [ -f /tmp/version-manager-errors.log ]; then
    print_warning "Some non-critical errors occurred. Check /tmp/version-manager-errors.log for details."
fi
`;
}

// Generate a simple update-versions.js script with better version sorting
export function generateUpdateVersionsScript() {
  return `#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const action = process.argv[2];
const version = process.argv[3];

if (!action || !version) {
  console.error('Usage: node update-versions.js [add|remove] VERSION');
  process.exit(1);
}

const versionsPath = path.join(__dirname, '..', 'versions.json');

// Create versions.json if it doesn't exist
if (!fs.existsSync(versionsPath)) {
  fs.writeFileSync(versionsPath, JSON.stringify({
    versions: [],
    defaultVersion: null,
    currentVersion: null,
    latestLabel: 'latest',
    showLatest: true
  }, null, 2));
}

const versions = JSON.parse(fs.readFileSync(versionsPath, 'utf8'));

// Function to parse semantic version
function parseVersion(v) {
  const match = v.match(/v?(\\d+)\\.(\\d+)\\.(\\d+)(.*)/);
  if (!match) return [0, 0, 0, ''];
  return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), match[4]];
}

// Function to sort versions
function sortVersions(versions) {
  return versions.sort((a, b) => {
    // Handle special labels
    const specialOrder = { 'latest': -3, 'next': -2, 'main': -1 };
    if (specialOrder[a] !== undefined) return specialOrder[a];
    if (specialOrder[b] !== undefined) return -specialOrder[b];
    
    const [aMajor, aMinor, aPatch, aPre] = parseVersion(a);
    const [bMajor, bMinor, bPatch, bPre] = parseVersion(b);
    
    // Compare versions (newest first)
    if (bMajor !== aMajor) return bMajor - aMajor;
    if (bMinor !== aMinor) return bMinor - aMinor;
    if (bPatch !== aPatch) return bPatch - aPatch;
    
    // Handle pre-release versions
    if (!aPre && bPre) return -1;
    if (aPre && !bPre) return 1;
    return bPre.localeCompare(aPre);
  });
}

switch (action) {
  case 'add':
    // Add new version
    if (!versions.versions.includes(version)) {
      versions.versions.push(version);
      
      // Sort versions properly
      versions.versions = sortVersions(versions.versions);
      
      // Update default version to the new version (if not a pre-release)
      if (!version.includes('-')) {
        versions.defaultVersion = version;
      }
      versions.currentVersion = version;

      console.log(\` ✓ Added version \${version}\`);
    } else {
      console.log(\`  Version \${version} already exists\`);
    }
    break;

  case 'remove':
    const index = versions.versions.indexOf(version);
    if (index > -1) {
      versions.versions.splice(index, 1);
      console.log(\` ✓ Removed version \${version}\`);

      // Update default if removed version was default
      if (versions.defaultVersion === version) {
        // Set to first non-special version, or latest if no other versions
        const regularVersions = versions.versions.filter(v => 
          v !== 'latest' && v !== 'next' && v !== 'main'
        );
        versions.defaultVersion = regularVersions[0] || versions.latestLabel || 'latest';
        console.log(\`  Updated default version to \${versions.defaultVersion}\`);
      }
      
      // Update current version if needed
      if (versions.currentVersion === version) {
        versions.currentVersion = null;
      }
    } else {
      console.log(\`  Version \${version} not found\`);
    }
    break;

  default:
    console.error('Invalid action. Use: add or remove');
    process.exit(1);
}

// Write updated versions.json
fs.writeFileSync(versionsPath, JSON.stringify(versions, null, 2) + '\\n');
console.log(' ✓ Updated versions.json');
`;
}

// Generate a simple changelog content without problematic imports
export function generateSimpleChangelog(initialVersion) {
  return `---
title: Release Notes
description: Complete changelog and release notes
---

# Release Notes

## Version ${initialVersion}
**Released: ${new Date().toISOString().split('T')[0]}**

###  Features
- Initial release of documentation
- Interactive configuration builder
- Full Mintlify docs.json support
- Automated versioning system

###  Documentation
- Getting started guide
- Configuration reference
- API documentation
`;
}

// Main function to set up versioning with improvements
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

  // Ensure version has 'v' prefix
  if (!versioningConfig.initialVersion.startsWith('v')) {
    versioningConfig.initialVersion = 'v' + versioningConfig.initialVersion;
  }

  // Ask about working/current version name
  const workingVersionName = await select({
    message: 'What should the current/working version directory be named?',
    choices: [
      { value: 'next', name: 'next (recommended for pre-release)' },
      { value: 'main', name: 'main (follows git convention)' },
      { value: 'latest', name: 'latest (current stable)' },
      { value: 'current', name: 'current (actively developed)' }
    ],
    default: 'next'
  });

  versioningConfig.workingVersion = workingVersionName;
  versioningConfig.latestLabel = workingVersionName;
  versioningConfig.showLatest = true;

  // Ask about external changelog
  const useExternalChangelog = await confirm({
    message: 'Fetch changelog from an external repository?',
    default: false
  });

  if (useExternalChangelog) {
    versioningConfig.externalRepo = await input({
      message: 'Repository (format: owner/repo):',
      validate: (value) => {
        if (value && !value.match(/^[^/]+\/[^/]+$/)) {
          return 'Invalid format. Use: owner/repo';
        }
        return true;
      }
    });
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
    generateVersionManagerScript(versioningConfig.projectName || 'Documentation')
  );
  await fs.chmod(versionManagerPath, '755');
  console.log(chalk.green('✓ Created scripts/version-manager.sh'));

  // Generate update-versions script
  const updateVersionsPath = path.join(scriptsDir, 'update-versions.js');
  await fs.writeFile(updateVersionsPath, generateUpdateVersionsScript());
  await fs.chmod(updateVersionsPath, '755');
  console.log(chalk.green('✓ Created scripts/update-versions.js'));

  // Copy refresh-changelog.sh if it exists
  const sourceChangelogScript = path.join(path.dirname(path.dirname(__filename)), 'scripts', 'refresh-changelog.sh');
  const targetChangelogScript = path.join(scriptsDir, 'refresh-changelog.sh');
  if (await fs.pathExists(sourceChangelogScript)) {
    await fs.copy(sourceChangelogScript, targetChangelogScript);
    await fs.chmod(targetChangelogScript, '755');
    console.log(chalk.green('✓ Created scripts/refresh-changelog.sh'));
  }

  // Copy parse-external-changelog.js if it exists
  const sourceParseScript = path.join(path.dirname(path.dirname(__filename)), 'scripts', 'parse-external-changelog.js');
  const targetParseScript = path.join(scriptsDir, 'parse-external-changelog.js');
  if (await fs.pathExists(sourceParseScript)) {
    await fs.copy(sourceParseScript, targetParseScript);
    await fs.chmod(targetParseScript, '755');
    console.log(chalk.green('✓ Created scripts/parse-external-changelog.js'));
  }

  // Create initial changelog directory
  const changelogDir = path.join(outputDir, 'changelog');
  await fs.ensureDir(changelogDir);

  // Fetch external changelog if configured
  if (versioningConfig.externalRepo) {
    console.log(chalk.cyan(`\n Fetching changelog from ${versioningConfig.externalRepo}...`));
    try {
      const { execSync } = await import('child_process');
      execSync(`bash "${targetChangelogScript}" "${versioningConfig.externalRepo}" latest`, {
        cwd: outputDir,
        stdio: 'inherit'
      });
      console.log(chalk.green('✓ Changelog fetched and processed'));
    } catch (error) {
      console.log(chalk.yellow(' Could not fetch changelog, creating default'));
      // Create default changelog
      const releaseNotesPath = path.join(changelogDir, 'release-notes.mdx');
      await fs.writeFile(releaseNotesPath, generateSimpleChangelog(versioningConfig.initialVersion));
    }
  } else {
    // Create initial release notes file
    const releaseNotesPath = path.join(changelogDir, 'release-notes.mdx');
    await fs.writeFile(releaseNotesPath, generateSimpleChangelog(versioningConfig.initialVersion));
    console.log(chalk.green('✓ Created changelog/release-notes.mdx'));
  }

  // Create initial versions.json with configuration
  const versionsJsonPath = path.join(outputDir, 'versions.json');
  const versionsData = {
    versions: [],
    defaultVersion: versioningConfig.workingVersion,
    currentVersion: versioningConfig.initialVersion,
    workingVersion: versioningConfig.workingVersion,
    latestLabel: versioningConfig.latestLabel || 'next',
    showLatest: versioningConfig.showLatest !== false
  };
  await fs.writeJson(versionsJsonPath, versionsData, { spaces: 2 });
  console.log(chalk.green('✓ Created versions.json'));

  // Update docs.json with version configuration
  const docsJsonPath = path.join(outputDir, 'docs.json');
  if (await fs.pathExists(docsJsonPath)) {
    const docsConfig = await fs.readJson(docsJsonPath);
    
    // Ensure navigation structure exists
    if (!docsConfig.navigation) {
      docsConfig.navigation = {};
    }
    
    // Convert simple navigation to versioned navigation
    if (docsConfig.navigation.groups || docsConfig.navigation.tabs) {
      const currentNav = {
        version: versioningConfig.workingVersion,
        default: true,
        tabs: docsConfig.navigation.tabs || [
          {
            tab: 'Documentation',
            groups: docsConfig.navigation.groups || []
          }
        ]
      };
      
      // Replace old navigation with versioned navigation
      docsConfig.navigation = {
        versions: [currentNav]
      };
    } else if (!docsConfig.navigation.versions) {
      // Create new versioned navigation
      docsConfig.navigation.versions = [
        {
          version: versioningConfig.workingVersion,
          default: true,
          tabs: []
        }
      ];
    }
    
    // Add changelog to navigation if not already there
    const workingVersion = docsConfig.navigation.versions.find(v => 
      v.version === versioningConfig.workingVersion
    );
    
    if (workingVersion && workingVersion.tabs) {
      // Check if changelog tab exists
      const hasChangelog = workingVersion.tabs.some(tab => 
        tab.tab && tab.tab.toLowerCase().includes('changelog')
      );
      
      if (!hasChangelog) {
        // Add changelog tab
        workingVersion.tabs.push({
          tab: 'Changelog',
          pages: ['changelog/release-notes']
        });
      }
    }
    
    await fs.writeJson(docsJsonPath, docsConfig, { spaces: 2 });
    console.log(chalk.green('✓ Updated docs.json with version configuration'));
  }

  console.log(chalk.green('\n Versioning system setup complete!'));
  console.log(chalk.cyan('\n  To freeze a version and create a new one:'));
  console.log(chalk.gray('   ./scripts/version-manager.sh'));
  
  if (versioningConfig.externalRepo) {
    console.log(chalk.cyan('\n  To update changelog from external repo:'));
    console.log(chalk.gray(`   ./scripts/refresh-changelog.sh ${versioningConfig.externalRepo} latest`));
  }

  return versioningConfig;
}