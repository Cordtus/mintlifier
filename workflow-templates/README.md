# Workflow Templates

GitHub Actions templates for automated Mintlify documentation management.

## Available Workflows

### Documentation Repository Workflows

Deploy these in your documentation repository:

#### 1. `sync-changelog.yml`
- **Purpose**: Sync release notes from source repository
- **Creates**: Pull request with updated changelog
- **Triggers**: Manual, API, or external repository

#### 2. `freeze-version.yml`
- **Purpose**: Create immutable documentation snapshots
- **Creates**: Pull request with frozen version
- **Triggers**: Manual, API, or external repository

#### 3. `docs-automation.yml`
- **Purpose**: Combined workflow for complete automation
- **Features**: Handles both changelog sync and version freeze
- **Triggers**: Release events, manual, or external repository

### Source Repository Workflow

Deploy this in your project/source repository:

#### 4. `external-repo-trigger.yml`
- **Purpose**: Trigger documentation updates from source repo
- **Setup**: Requires PAT token and docs repo configuration
- **Triggers**: Release events or manual

## Quick Setup

### For Documentation Repository

```bash
DOCS_REPO=/path/to/your/docs-repo
mkdir -p "$DOCS_REPO/.github/workflows" "$DOCS_REPO/scripts"

# Copy all documentation workflows
cp sync-changelog.yml freeze-version.yml docs-automation.yml "$DOCS_REPO/.github/workflows/"

# Copy changelog helper scripts if you enable changelog sync
cp ../scripts/refresh-changelog.sh ../scripts/parse-external-changelog.js "$DOCS_REPO/scripts/"
```

### For Source Repository (if separate)

```bash
# Copy external trigger workflow
cp external-repo-trigger.yml YOUR_PROJECT/.github/workflows/trigger-docs.yml

# Edit the workflow to set your docs repository
# Update DOCS_REPO environment variable
```

## Configuration Required

### 1. GitHub Actions Permissions

In repository settings:
-  Read and write permissions
-  Allow GitHub Actions to create pull requests

### 2. For External Triggers

Create Personal Access Token:
- Scope: `repo`
- Add as secret: `DOCS_REPO_TOKEN`

### 3. Customize Workflows

Edit workflows to match your:
- Repository names
- Changelog source repository (`source_repo` input or `CHANGELOG_SOURCE_REPO` repository variable)
- Versioning scope (`version_scope` input) for product-scoped nested versioning
- Branch names
- Review requirements
- Version formats

## Workflow Features

All workflows:
-  Create pull requests (no direct commits)
-  Support manual triggers
-  Accept external repository triggers
-  Include comprehensive error handling
-  Provide detailed summaries
-  Support various version formats
-  Use `npx mintlifier freeze --version --next-version --automated` for flat freezes and add `--scope` for product-scoped freezes

## Usage Examples

### Manual Trigger
```yaml
workflow_dispatch:
  inputs:
    release_version: 'v1.2.0'
    next_version: 'v1.3.0'
```

### External Trigger
```bash
curl -X POST \
  -H "Authorization: token $PAT" \
  https://api.github.com/repos/ORG/REPO/dispatches \
  -d '{"event_type": "docs-automation", "client_payload": {...}}'
```

### On Release
```yaml
on:
  release:
    types: [published]
```

## Security Notes

- Never commit tokens or secrets
- Use minimal token scopes
- Rotate PATs regularly
- Review all PRs before merging

## Support

For issues or questions:
- Review workflow logs in Actions tab
- Open an issue in this repository
