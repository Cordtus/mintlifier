#!/bin/bash

# Script to fetch changelog from external repository

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Get repository and source from command line arguments
REPO="${1}"
SOURCE="${2:-latest}"

if [ -z "$REPO" ]; then
    print_error "Repository not specified"
    echo "Usage: $0 <owner/repo> [version|branch|latest]"
    echo "Example: $0 cosmos/evm latest"
    echo "Example: $0 myorg/myrepo v1.0.0"
    exit 1
fi

# Parse owner and repo name
IFS='/' read -r OWNER REPO_NAME <<< "$REPO"

if [ -z "$OWNER" ] || [ -z "$REPO_NAME" ]; then
    print_error "Invalid repository format. Use: owner/repo"
    exit 1
fi

# Determine the source reference
if [ "$SOURCE" = "latest" ]; then
    print_info "Fetching latest release tag from $REPO..."
    
    # Get the latest release tag from GitHub API
    LATEST_TAG=$(curl -s "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
    
    if [ -z "$LATEST_TAG" ]; then
        print_warning "Could not fetch latest tag, falling back to main branch"
        SOURCE="main"
    else
        SOURCE="$LATEST_TAG"
        print_success "Using latest release: $SOURCE"
    fi
fi

print_info "Fetching changelog from $REPO: $SOURCE..."

# Create tmp directory if it doesn't exist
mkdir -p tmp

# Try common changelog file names
CHANGELOG_FOUND=false
for CHANGELOG_FILE in "CHANGELOG.md" "CHANGELOG.MD" "changelog.md" "Changelog.md" "CHANGES.md" "HISTORY.md"; do
    URL="https://raw.githubusercontent.com/$REPO/$SOURCE/$CHANGELOG_FILE"
    
    # Try to fetch the file
    if curl -s -f "$URL" > tmp/changelog.md 2>/dev/null; then
        if [ -s tmp/changelog.md ]; then
            CHANGELOG_FOUND=true
            print_success "Found changelog at $CHANGELOG_FILE"
            break
        fi
    fi
done

if [ "$CHANGELOG_FOUND" = false ]; then
    print_error "Could not find changelog file in $REPO at $SOURCE"
    print_info "Tried: CHANGELOG.md, changelog.md, CHANGES.md, HISTORY.md"
    exit 1
fi

print_success "Successfully fetched changelog ($(wc -l < tmp/changelog.md) lines)"

# Check if we have a parser script
if [ -f scripts/parse-external-changelog.js ]; then
    print_info "Parsing and converting changelog..."
    
    # Run the parser script
    node scripts/parse-external-changelog.js "$REPO" "$SOURCE"
    
    if [ ! -f tmp/release-notes.mdx ]; then
        print_error "Failed to generate release notes"
        exit 1
    fi
    
    print_info "Updating release notes file..."
    
    # Create directory if it doesn't exist
    mkdir -p docs/changelog
    
    # Copy the generated file to the docs directory
    cp tmp/release-notes.mdx docs/changelog/release-notes.mdx
    
    VERSION_COUNT=$(grep -c '<Update' docs/changelog/release-notes.mdx 2>/dev/null || echo "0")
    print_success "Release notes updated with $VERSION_COUNT versions"
    
    echo ""
    echo "Summary:"
    echo "  - Repository: $REPO"
    echo "  - Version/Branch: $SOURCE"
    echo "  - Output: docs/changelog/release-notes.mdx"
    echo "  - Versions: $VERSION_COUNT"
else
    print_warning "Parser script not found. Changelog saved to tmp/changelog.md"
    print_info "You can manually convert it to MDX format"
fi

echo ""
echo "Next steps:"
echo "  1. Review the changes: git diff docs/changelog/release-notes.mdx"
echo "  2. Commit if satisfied: git add docs/changelog/release-notes.mdx && git commit -m 'docs: update release notes from $REPO ($SOURCE)'"