#!/bin/bash

# Script to sync release notes from undefined/undefined changelog

set -e

# Get source from command line argument, default to latest release
SOURCE="${1:-latest}"

if [ "$SOURCE" = "latest" ]; then
    echo " Fetching latest release tag from undefined/undefined..."
    # Get the latest release tag from GitHub API
    LATEST_TAG=$(curl -s https://api.github.com/repos/undefined/undefined/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
    if [ -z "$LATEST_TAG" ]; then
        echo " Could not fetch latest tag, falling back to main branch"
        SOURCE="main"
    else
        SOURCE="$LATEST_TAG"
        echo "✓ Using latest release: $SOURCE"
    fi
fi

echo " Fetching changelog from undefined/undefined: $SOURCE..."

# Create tmp directory if it doesn't exist
mkdir -p tmp

# Fetch the CHANGELOG.md from the specified source (tag or branch)
curl -s "https://raw.githubusercontent.com/undefined/undefined/$SOURCE/CHANGELOG.md" > tmp/changelog.md

if [ ! -s tmp/changelog.md ]; then
    echo " Failed to fetch changelog or changelog is empty"
    exit 1
fi

echo "✓ Successfully fetched changelog ($(wc -l < tmp/changelog.md) lines)"

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

VERSION_COUNT=$(grep -c '<Update' changelog/release-notes.mdx || true)
echo "✓ Release notes updated with $VERSION_COUNT versions"

echo ""
echo " Summary:"
echo "  - Source: https://raw.githubusercontent.com/undefined/undefined/$SOURCE/CHANGELOG.md"
echo "  - Version/Branch: $SOURCE"
echo "  - Output: changelog/release-notes.mdx"
echo "  - Versions: $VERSION_COUNT"
echo ""
echo " Next steps:"
echo "  1. Review the changes: git diff changelog/release-notes.mdx"
echo "  2. Commit if satisfied: git add changelog/release-notes.mdx && git commit -m 'docs: refresh release notes from undefined/undefined ($SOURCE)'"
