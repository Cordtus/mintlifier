# Webhook Setup for Auto-Versioning

To enable automatic versioning when a new release is published in undefined/undefined:

## Option 1: GitHub Actions (Recommended)

Add this workflow to the **source repository** (undefined/undefined):

```yaml
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
          curl -X POST \
            -H "Accept: application/vnd.github.v3+json" \
            -H "Authorization: token ${{ secrets.DOCS_REPO_TOKEN }}" \
            https://api.github.com/repos/[YOUR_DOCS_REPO]/dispatches \
            -d '{"event_type":"release-published","client_payload":{"tag_name":"${{ github.event.release.tag_name }}"}}'
```

Replace `[YOUR_DOCS_REPO]` with your documentation repository path (e.g., `username/docs`).

### Required Setup

1. Create a Personal Access Token with `repo` scope
2. Add it as `DOCS_REPO_TOKEN` secret in the source repository

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
