#!/bin/bash

# Version management script for Mintlify documentation
# Manages version freezing and creation with proper navigation updates

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
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
    local prompt="$1"
    local response

    echo -n "$prompt (y/n): "
    read -r response
    case "$response" in
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
CURRENT_VERSION=$(get_current_version)

if [ -z "$CURRENT_VERSION" ]; then
    print_error "No current version found in mint.json"
    print_info "This might be the first version freeze. Please specify the version to freeze."
    echo -n "Enter the version to freeze (e.g., v1.0.0): "
    read -r CURRENT_VERSION

    if [ -z "$CURRENT_VERSION" ]; then
        print_error "Version cannot be empty"
        exit 1
    fi
fi

print_info "Current development version: ${GREEN}$CURRENT_VERSION${NC}"

# 2. Check if the version directory already exists
if [ -d "versions/$CURRENT_VERSION" ]; then
    print_error "Version $CURRENT_VERSION already exists as a frozen version"
    print_info "Frozen versions are immutable. If you need to update, please use a different version."
    exit 1
fi

# 3. Prompt for the new development version
echo ""
echo -n "Enter the new development version (e.g., v1.1.0): "
read -r NEW_VERSION

if [ -z "$NEW_VERSION" ]; then
    print_error "New version cannot be empty"
    exit 1
fi

# Validate version format (basic check for v#.#.#)
if ! [[ "$NEW_VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    print_warning "Version format should be v#.#.# (e.g., v1.1.0)"
    if ! confirm "Continue with '$NEW_VERSION' anyway?"; then
        exit 1
    fi
fi

# 4. Display summary and confirm
echo ""
echo "======================================"
echo "   Version Management Summary"
echo "======================================"
echo ""
echo "  Freeze version:  ${YELLOW}$CURRENT_VERSION${NC} (becomes immutable)"
echo "  New dev version: ${GREEN}$NEW_VERSION${NC} (for future development)"
echo ""
echo "This will:"
echo "  1. Create a frozen copy at versions/$CURRENT_VERSION/"
echo "  2. Update all internal links in the frozen version"
echo "  3. Update mint.json with version configuration"
echo "  4. Set $NEW_VERSION as the new development version"
echo ""

if ! confirm "Proceed with version management?"; then
    print_info "Operation cancelled"
    exit 0
fi

# 5. Execute the freeze operation
echo ""
print_info "Starting version freeze for $CURRENT_VERSION..."

# Create versions directory if it doesn't exist
mkdir -p versions

# Create version directory and copy docs
print_info "Creating version directory..."
mkdir -p "versions/$CURRENT_VERSION"

# Copy all MDX files and assets
find . -name "*.mdx" -not -path "./versions/*" -not -path "./node_modules/*" | while read -r file; do
    target="versions/$CURRENT_VERSION/$file"
    mkdir -p "$(dirname "$target")"
    cp "$file" "$target"
done

# Copy images and other assets
if [ -d "images" ]; then
    cp -r images "versions/$CURRENT_VERSION/"
fi

# 6. Update all internal links in the versioned files
print_info "Updating internal links..."
find "versions/$CURRENT_VERSION" -name "*.mdx" -type f -exec sed -i '' "s|](/|](/versions/$CURRENT_VERSION/|g" {} \;

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
    const newVersion = '$NEW_VERSION';
    const currentVersion = '$CURRENT_VERSION';
    
    // Remove current version if it exists
    config.versions = config.versions.filter(v => 
        (typeof v === 'string' ? v : v.name) !== currentVersion
    );
    
    // Add new version and frozen version
    config.versions.unshift(newVersion);
    config.versions.push({
        name: currentVersion,
        url: 'versions/' + currentVersion
    });
    
    fs.writeFileSync('mint.json', JSON.stringify(config, null, 2));
    console.log('Updated mint.json');
"

# 8. Create a marker file in the frozen version
echo "$CURRENT_VERSION - Frozen on $(date '+%Y-%m-%d')" > "versions/$CURRENT_VERSION/.version-frozen"

# Add metadata about the freeze
cat > "versions/$CURRENT_VERSION/.version-metadata.json" << EOF
{
  "version": "$CURRENT_VERSION",
  "frozenDate": "$(date '+%Y-%m-%d')",
  "frozenTimestamp": "$(date -u '+%Y-%m-%dT%H:%M:%SZ')",
  "nextVersion": "$NEW_VERSION"
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
echo "  ${GREEN}✓${NC} Version $CURRENT_VERSION has been frozen (immutable)"
echo "  ${GREEN}✓${NC} Development continues on version $NEW_VERSION"
echo "  ${GREEN}✓${NC} mint.json updated with version configuration"
echo ""
echo "======================================"
echo "   Next Steps"
echo "======================================"
echo ""
echo "  1. Review the changes:"
echo "     ${BLUE}git status${NC}"
echo ""
echo "  2. Stage and commit the changes:"
echo "     ${BLUE}git add -A${NC}"
echo "     ${BLUE}git commit -m "docs: freeze $CURRENT_VERSION and begin $NEW_VERSION development"${NC}"
echo ""
echo "  3. Push to repository:"
echo "     ${BLUE}git push${NC}"
echo ""
echo "  4. Continue development for version $NEW_VERSION"
echo ""
