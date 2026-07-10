# Workflow Templates

These GitHub Actions templates automate Mintlifier's version snapshots and historical changelog import. Mintlify's GitHub App remains responsible for deployment and preview builds.

## Choose a workflow

| Template | Repository | Purpose |
| --- | --- | --- |
| `freeze-version.yml` | Documentation | Freeze a flat or product-scoped documentation version and open a pull request. |
| `external-repo-trigger.yml` | Source code | Dispatch a freeze to a separate documentation repository after a release or manual run. |
| `sync-changelog.yml` | Documentation | Import an existing public GitHub changelog into a Mintlify release-notes page. |

Install only the workflows required by the project.

## Freeze documentation versions

From a Mintlifier checkout, copy the workflow into the documentation repository:

```bash
MINTLIFIER_DIR=/path/to/mintlifier
DOCS_REPO=/path/to/documentation-repo
mkdir -p "$DOCS_REPO/.github/workflows"
cp "$MINTLIFIER_DIR/workflow-templates/freeze-version.yml" \
  "$DOCS_REPO/.github/workflows/freeze-version.yml"
```

The workflow needs these repository permissions:

- `contents: write`
- `pull-requests: write`

Inputs:

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `release_version` | Yes | | Version label to freeze. |
| `next_version` | No | `next` | Active development label after the freeze. |
| `version_scope` | No | | Scope alias reported by `npx mintlifier versioning`. |
| `run_mintlify_checks` | No | `false` | Run `mint validate` and `mint broken-links` before opening the pull request. |

Run it manually:

```bash
gh workflow run freeze-version.yml \
  --repo owner/documentation \
  -f release_version=v1.4.0 \
  -f next_version=next \
  -f run_mintlify_checks=true
```

For a product scope, add `-f version_scope=api-reference`.

The workflow installs `mintlifier@latest`, performs a non-interactive freeze, optionally runs Mintlify checks, and opens a branch named `mintlifier-freeze-<version>`. Review the snapshot, navigation, metadata, and internal links before merging.

## Trigger a freeze from another repository

Copy the trigger into the source repository:

```bash
MINTLIFIER_DIR=/path/to/mintlifier
SOURCE_REPO=/path/to/source-repo
mkdir -p "$SOURCE_REPO/.github/workflows"
cp "$MINTLIFIER_DIR/workflow-templates/external-repo-trigger.yml" \
  "$SOURCE_REPO/.github/workflows/trigger-docs-freeze.yml"
```

Configure the source repository:

- Secret `DOCS_REPO_TOKEN`: a fine-grained token limited to the documentation repository with `Contents: write`, or a classic token with equivalent repository access.
- Variable `MINTLIFIER_DOCS_REPO`: target repository in `owner/repo` form.
- Optional variable `MINTLIFIER_VERSION_SCOPE`: default product scope.
- Optional variable `MINTLIFIER_NEXT_VERSION`: default next label.
- Optional variable `MINTLIFIER_RUN_MINTLIFY_CHECKS`: `true` or `false`.

`freeze-version.yml` must exist on the documentation repository's default branch. GitHub delivers `repository_dispatch` only to workflows on that branch.

Release publication triggers the workflow automatically. A manual run can override the repository, version, scope, next label, and validation setting:

```bash
gh workflow run trigger-docs-freeze.yml \
  --repo owner/source \
  -f release_version=v1.4.0 \
  -f docs_repo=owner/documentation \
  -f next_version=next
```

A successful dispatch returns HTTP 204. Check the target repository's Actions page for the freeze run and resulting pull request.

## Import a historical changelog

This workflow reads common changelog filenames from a public GitHub repository and writes `docs/changelog/release-notes.mdx`. It is intended for historical import or backfill, not recurring release-note authoring.

Copy the workflow and both helper scripts into the documentation repository:

```bash
MINTLIFIER_DIR=/path/to/mintlifier
DOCS_REPO=/path/to/documentation-repo
mkdir -p "$DOCS_REPO/.github/workflows" "$DOCS_REPO/scripts"
cp "$MINTLIFIER_DIR/workflow-templates/sync-changelog.yml" \
  "$DOCS_REPO/.github/workflows/sync-changelog.yml"
cp "$MINTLIFIER_DIR/scripts/refresh-changelog.sh" \
  "$MINTLIFIER_DIR/scripts/parse-external-changelog.js" \
  "$DOCS_REPO/scripts/"
```

Set the optional `CHANGELOG_SOURCE_REPO` repository variable to the default `owner/repo`. A manual `source_repo` input overrides it.

```bash
gh workflow run sync-changelog.yml \
  --repo owner/documentation \
  -f source_repo=owner/source \
  -f source_version=latest \
  -f run_mintlify_checks=true
```

The helper checks `CHANGELOG.md`, `CHANGELOG.MD`, `changelog.md`, `Changelog.md`, `CHANGES.md`, and `HISTORY.md`. It maps common release and category headings into Mintlify `Update` entries, then opens a pull request only when the generated page changes.

## Security

- Do not commit tokens or place them in workflow inputs.
- Limit `DOCS_REPO_TOKEN` to the one target repository.
- Keep `run_mintlify_checks` enabled only after the target project passes those commands locally.
- Review generated pull requests before merging.
- Pin `MINTLIFIER_PACKAGE` to a tested version when reproducibility is more important than receiving the latest fixes automatically.

## Troubleshooting

### No target workflow run

Confirm that `MINTLIFIER_DOCS_REPO` is correct, the token can write repository contents, and `freeze-version.yml` exists on the target default branch. Inspect the source run for the response from the GitHub dispatch API.

### Freeze fails before creating a pull request

Run the printed Mintlifier command locally. Check version labels, `versions.json`, the selected scope, missing source pages, and existing snapshot paths.

### Changelog source is not found

The import helper uses unauthenticated GitHub API and raw-content requests. Confirm the repository is public, the ref exists, and one supported changelog filename is present at the repository root.

### No changelog pull request

The workflow skips pull-request creation when `docs/changelog/release-notes.mdx` is unchanged. Check the step summary for `Changes detected: false`.

## References

- [Mintlify CLI commands](https://www.mintlify.com/docs/cli/commands)
- [Mintlify GitHub deployment](https://www.mintlify.com/docs/deploy/github)
- [GitHub repository dispatch events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#repository_dispatch)
