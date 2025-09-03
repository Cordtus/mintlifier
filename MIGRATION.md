# 🔄 Mintlifier Migration Guide

Comprehensive guide for migrating existing documentation projects to use Mintlifier's versioning system.

## Overview

This guide covers migrating from various documentation systems and project structures to work with Mintlifier. Whether you're coming from other documentation platforms or have an existing Mintlify project, we'll help you get set up with versioning.

## Quick Compatibility Check

**✅ Your project is compatible if it has:**
- Mintlify docs.json or mint.json configuration
- MDX documentation files
- Standard directory structure

**⚠ Migration needed if you have:**
- Different documentation platform (GitBook, Notion, etc.)
- Custom markdown structure
- Non-standard Mintlify setup

**❌ Not currently supported:**
- Purely HTML documentation
- Wiki-based systems without export
- Proprietary formats without conversion tools

## Migration Scenarios

### Scenario 1: Existing Mintlify Project (Recommended)

**When to use:** You already have a working Mintlify project and want to add versioning.

#### Quick Setup

```bash
# 1. Run compatibility check
npx mintlifier init --check-only

# 2. Set up versioning
npx mintlifier versioning  

# 3. Start using versioning
npx mintlifier freeze
```

#### Supported Project Structures

Mintlifier automatically detects and works with these common Mintlify structures:

**Structure A: Root-level Documentation**
```
my-docs/
├── docs.json                   ✅ Detected
├── introduction.mdx
├── api/
│   └── reference.mdx
└── guides/
    └── getting-started.mdx
```

**Structure B: Docs Subdirectory**
```
my-project/
├── src/
├── docs/                       
│   ├── docs.json               ✅ Detected
│   ├── introduction.mdx
│   └── guides/
└── package.json
```

**Structure C: Content Directory**  
```
my-docs-site/
├── docs.json                   ✅ Detected
├── content/                    ✅ Auto-detected
│   ├── overview.mdx
│   └── tutorials/
├── assets/
└── snippets/
```

**Structure D: Monorepo**
```
monorepo/
├── packages/
│   └── docs/                   
│       ├── docs.json           ✅ Detected
│       └── content/
├── apps/
└── docs-site/                  ✅ Alternative location
    └── docs.json
```

#### Migration Process

1. **Automatic Detection**
```bash
npx mintlifier versioning
```
```
🔍 Detecting project structure...
✓ Detected: Root-level Documentation

📁 Project Analysis:
  • Structure: Root-level Documentation
  • MDX files: 23
  • Directories: 5  
  • Assets: 12
  • Config format: docs.json

✅ Project structure setup complete!
```

2. **Structure Adaptation**

Mintlifier automatically creates:
- `versions/` directory for frozen documentation
- `scripts/` directory for version management tools
- `versions.json` registry file
- Enhanced docs.json with versioning support

3. **First Version Freeze**

```bash  
npx mintlifier freeze
```

Your project becomes version-aware with no breaking changes to existing documentation.

#### What Changes

**Before versioning:**
```
docs/
├── docs.json
├── introduction.mdx
└── api/
    └── reference.mdx
```

**After versioning:**
```
docs/
├── docs.json                   # Now version-aware
├── versions.json              # Version registry (new)
├── versions/                  # Frozen versions (new)
│   └── v1.0.0/               # Your first frozen version
├── scripts/                   # Version management (new)
├── introduction.mdx           # Continue development here
└── api/
    └── reference.mdx
```

### Scenario 2: mint.json to docs.json Migration

**When to use:** You have a legacy Mintlify project using mint.json format.

#### Automatic Migration

Mintlifier handles mint.json → docs.json migration automatically:

```bash
npx mintlifier versioning
```

**Detection and Migration:**
```
🔍 Detecting project structure...
⚠ Found mint.json - legacy format detected
✓ Migrating to docs.json format

🔄 Migration steps:
  • Copying mint.json to docs.json
  • Updating schema reference to docs.json
  • Preserving all existing configuration
  ? Keep original mint.json file? (y/N) n
  • Removed original mint.json

✅ Successfully migrated to docs.json format
```

#### Manual Migration (if needed)

If automatic migration doesn't work:

1. **Backup your mint.json:**
```bash
cp mint.json mint.json.backup
```

2. **Convert format:**
```bash
# Rename file
mv mint.json docs.json

# Update schema reference in docs.json
```

3. **Update schema reference:**
```json
{
  "$schema": "https://mintlify.com/docs.json",
  "name": "Your Documentation",
  ...
}
```

4. **Test configuration:**
```bash
mint dev
```

### Scenario 3: Other Documentation Platforms

**When to use:** Migrating from GitBook, Notion, Confluence, VuePress, Docusaurus, etc.

#### From GitBook

**Export Process:**
1. **Export from GitBook:**
   - Go to GitBook Settings → Export
   - Choose "Markdown" format
   - Download ZIP file

2. **Convert to Mintlify:**
```bash
# Extract GitBook export
unzip gitbook-export.zip
cd gitbook-export

# Convert with Mintlifier
npx mintlifier migrate --from gitbook --input ./

# Follow interactive setup
```

**Migration Process:**
```
📚 GitBook Migration Detected
🔍 Found GitBook structure:
  • Summary: SUMMARY.md
  • Pages: 45 markdown files
  • Assets: 23 images

🔄 Converting GitBook to Mintlify:
  • Converting SUMMARY.md to navigation structure
  • Renaming .md files to .mdx
  • Updating internal links
  • Creating docs.json configuration
  • Organizing assets

✅ GitBook migration complete!
```

**What Gets Converted:**
- `SUMMARY.md` → `navigation` in docs.json
- `.md` files → `.mdx` files
- Internal links updated
- Images moved to `/images/` directory
- GitBook-specific syntax converted to MDX

#### From Notion

**Export Process:**
1. **Export from Notion:**
   - Select workspace/pages to export
   - Export as "Markdown & CSV"
   - Download ZIP

2. **Convert Structure:**
```bash
# Extract Notion export  
unzip Notion-export.zip
cd Notion-export

# Convert with Mintlifier
npx mintlifier migrate --from notion --input ./
```

**Migration Features:**
- Database exports → structured pages
- Nested page hierarchy → navigation groups
- Embedded content → proper MDX components
- Images and attachments → assets directory

#### From VuePress/Vitepress

**Migration Process:**
```bash
# From existing VuePress project
cd my-vuepress-docs

npx mintlifier migrate --from vuepress
```

**Conversion Map:**
- `docs/.vuepress/config.js` → `docs.json`
- `docs/README.md` → `introduction.mdx`
- Sidebar configuration → navigation structure
- Vue components → Mintlify components (where possible)

#### From Docusaurus

```bash
# From existing Docusaurus project
cd my-docusaurus-site

npx mintlifier migrate --from docusaurus --input ./docs
```

**Conversion Features:**
- `docusaurus.config.js` → `docs.json`
- `sidebars.js` → navigation structure  
- React components → MDX components
- Versioned docs → Mintlifier versioning system

#### From Generic Markdown

For custom markdown documentation:

```bash
# From any markdown collection
npx mintlifier migrate --from markdown --input ./my-docs

# Interactive structure builder
? How should we organize your navigation?
  ○ Auto-detect from file structure
  ○ Create from _sidebar.md or similar  
  ○ Manual configuration
```

## Advanced Migration Scenarios

### Large-Scale Documentation (100+ pages)

**Challenges:**
- Many internal links to update
- Complex navigation structures  
- Multiple authors/contributors
- Existing workflows

**Strategy:**
```bash
# 1. Analyze existing structure
npx mintlifier analyze --input ./large-docs-site

# 2. Create migration plan
npx mintlifier plan --from docusaurus --pages 156 --authors 8

# 3. Migrate in phases
npx mintlifier migrate --from docusaurus --phase 1 # Core content
npx mintlifier migrate --from docusaurus --phase 2 # Advanced content  
npx mintlifier migrate --from docusaurus --phase 3 # Assets & media

# 4. Verify migration
npx mintlifier verify --check-links --check-images
```

### Multi-Language Documentation

**Source Structure:**
```
docs/
├── en/
│   ├── guide.md
│   └── api.md
├── es/  
│   ├── guide.md
│   └── api.md
└── fr/
    ├── guide.md
    └── api.md
```

**Migration:**
```bash
npx mintlifier migrate --from markdown --input ./docs --i18n

# Results in versioned multi-language structure
```

**Result:**
```json
{
  "navigation": {
    "versions": [
      {
        "version": "en",
        "default": true,
        "tabs": [...]
      },
      {
        "version": "es", 
        "tabs": [...]
      },
      {
        "version": "fr",
        "tabs": [...]
      }
    ]
  }
}
```

### API Documentation with OpenAPI

**Existing Structure:**
```
api-docs/
├── openapi.yaml
├── guides/
└── reference/
```

**Migration:**
```bash
npx mintlifier migrate --from openapi --input ./api-docs

# Automatically:
# - Converts openapi.yaml to docs.json api configuration
# - Creates navigation for API reference
# - Preserves existing guides
# - Sets up proper API playground
```

## Troubleshooting Common Issues

### Issue 1: Navigation Structure Not Detected

**Problem:** Migration doesn't detect navigation structure properly.

**Solution:**
```bash
# Manual navigation setup
npx mintlifier edit ./docs.json

# Choose: Navigation → Multi-Version → Convert from current navigation
```

### Issue 2: Internal Links Broken After Migration

**Problem:** Links between pages don't work after migration.

**Solution:**
```bash
# Run link checker and fixer
npx mintlifier fix-links --input ./docs

# Or manual fix in docs.json navigation
```

**Before (broken):**
```markdown
See [API Guide](../api/guide.md) for details.
```

**After (fixed):**
```markdown  
See [API Guide](/api/guide) for details.
```

### Issue 3: Assets Not Loading

**Problem:** Images and other assets missing after migration.

**Solution:**
```bash
# Move assets to correct directory
npx mintlifier organize-assets --input ./docs

# Updates all asset references automatically
```

### Issue 4: Custom Components Don't Work

**Problem:** Platform-specific components need conversion.

**Solution:**

**VuePress Component:**
```vue
<Badge text="New" type="tip"/>
```

**Mintlify Equivalent:**
```mdx
<Note>New</Note>
```

**Docusaurus Component:**
```jsx
<Tabs>
  <TabItem value="js" label="JavaScript">
    Code here
  </TabItem>
</Tabs>
```

**Mintlify Equivalent:**
```mdx
<CodeGroup>
  <CodeBlock title="JavaScript">
    Code here
  </CodeBlock>
</CodeGroup>
```

### Issue 5: Large File Migration Fails

**Problem:** Migration times out or fails on large documentation sets.

**Solution:**
```bash
# Migrate in batches
npx mintlifier migrate --from docusaurus --batch-size 50 --input ./docs

# Or exclude certain directories
npx mintlifier migrate --from docusaurus --exclude node_modules,build --input ./docs
```

## Post-Migration Checklist

### Immediate Steps (Required)

- [ ] **Test locally:** Run `mint dev` to verify everything works
- [ ] **Check navigation:** Ensure all pages are accessible  
- [ ] **Verify links:** All internal links work correctly
- [ ] **Test images:** All assets load properly
- [ ] **Review config:** docs.json has correct settings

### Setup Steps (Recommended)

- [ ] **Enable versioning:** Run `npx mintlifier versioning`
- [ ] **Create first version:** Run `npx mintlifier freeze`  
- [ ] **Set up CI/CD:** Add automated versioning to workflows
- [ ] **Configure analytics:** Add tracking if migrating from tracked platform
- [ ] **Update documentation:** Update internal docs about new structure

### Team Steps (Important)

- [ ] **Train team:** Show new workflow to contributors
- [ ] **Update processes:** Modify documentation processes
- [ ] **Backup old system:** Keep old docs until migration verified
- [ ] **Update links:** Change any external links pointing to old docs
- [ ] **Migrate bookmarks:** Help users update their bookmarks

## Migration Support

### Self-Service Tools

```bash
# Migration assistant
npx mintlifier migrate --interactive

# Validation tools  
npx mintlifier verify --comprehensive

# Rollback if needed
npx mintlifier rollback --to-backup <backup-id>
```

### Getting Help

**Community Support:**
- [GitHub Discussions](https://github.com/Cordtus/mintlifier/discussions)
- [Discord Community](https://discord.gg/mintlify)
- [Documentation Examples](https://github.com/Cordtus/mintlifier/tree/main/examples)

**Professional Support:**
- Migration consulting available
- Custom migration scripts
- Team training sessions

## Migration Examples

### Complete GitBook Migration

```bash
# Real example: Migrating Acme API Docs from GitBook

# 1. Export from GitBook
# Download: acme-api-docs.zip (45 pages, 23 images)

# 2. Extract and convert
unzip acme-api-docs.zip
cd acme-api-docs
npx mintlifier migrate --from gitbook

# 3. Results:
# ✓ 45 pages converted to MDX
# ✓ Navigation structure preserved
# ✓ 23 images organized in /images/
# ✓ Internal links updated
# ✓ docs.json created with proper config

# 4. Enable versioning
npx mintlifier versioning
# ? Initial version: v2.1.0 (current API version)
# ? Working directory name: next
# ? Enable external changelog integration? Yes
# ? Repository: acme/api-server

# 5. Freeze current version
npx mintlifier freeze
# ✓ v2.1.0 frozen with 45 pages
# ✓ Ready for v2.2.0 development

# 6. Deploy
mint deploy

# Result: Fully migrated, versioned documentation ready for active development
```

### Notion to Mintlify Migration

```bash
# Real example: Engineering team docs migration

# 1. Export from Notion workspace
# Download: Engineering-Wiki.zip (156 pages, hierarchical structure)

# 2. Convert
unzip Engineering-Wiki.zip  
cd Engineering-Wiki
npx mintlifier migrate --from notion --input ./

# Migration detected:
# • Database: "API Endpoints" → structured pages
# • Nested pages → navigation groups  
# • Images → /images/ directory
# • Internal links → updated to work with Mintlify

# 3. Review and organize
npx mintlifier edit ./docs.json
# Organized into logical navigation structure

# 4. Team workflow setup
npx mintlifier versioning
# Set up for quarterly release versioning

# Result: 156-page engineering wiki successfully migrated with full team workflow
```

## Best Practices for Migration

### Planning Phase
1. **Audit current content** - Know what you're migrating
2. **Map navigation** - Plan your new structure  
3. **Identify custom components** - Plan conversions needed
4. **Test with subset** - Migrate a few pages first
5. **Plan team transition** - Consider change management

### Execution Phase
1. **Backup everything** - Keep original content safe
2. **Migrate incrementally** - Don't do everything at once
3. **Test frequently** - Verify each step works
4. **Document changes** - Track what was modified
5. **Communicate progress** - Keep team informed

### Post-Migration Phase  
1. **Monitor usage** - Check for user issues
2. **Gather feedback** - What could be improved?
3. **Optimize performance** - Fine-tune configuration
4. **Plan versioning** - Set up ongoing workflow
5. **Train team** - Ensure everyone knows new system

---

**Next Steps:**
- [Start migration](npx-mintlifier-migrate) for your platform
- [Read versioning guide](./VERSIONING.md) to understand the workflow  
- [Join community](https://github.com/Cordtus/mintlifier/discussions) for support