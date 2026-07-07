# Workflow Templates

GitHub Actions templates for the parts of Mintlifier that are still useful beside the current Mintlify platform.

Mintlify now provides native GitHub App deployments, preview deployments, CI checks, changelog pages, agent-driven changelog drafting, and Automations. Keep these templates focused on Mintlifier's unique filesystem version-freeze workflow.

## Template Status

| Template | Status | Use when | Prefer native Mintlify when |
| --- | --- | --- | --- |
| `freeze-version.yml` | Active | A docs repository needs a PR that freezes `next` or a selected product scope into an immutable version snapshot. | You only need deployment, preview builds, hosted CI checks, content updates, or changelog drafting. |
| `external-repo-trigger.yml` | Active / partial overlap | A source repository release must dispatch `freeze-version.yml` in a separate docs repository. | Mintlify Automations can fully cover the source-triggered workflow without custom dispatch. |
| `sync-changelog.yml` | Active / partial overlap | A docs repository needs historical import/backfill from an existing markdown changelog. | Mintlify changelog pages, Automations, or the agent can cover new changelog drafting without importing an existing `CHANGELOG.md`. |
| `docs-automation.yml` | Deprecated | Existing `docs-automation` dispatches need a clear deprecation notice. | Use `freeze-version.yml`, `sync-changelog.yml`, plus native Mintlify Automations, deployments, and CI checks as separate flows. |

## Active Documentation Repository Workflow

Deploy `freeze-version.yml` in the documentation repository:

```bash
DOCS_REPO=/path/to/your/docs-repo
mkdir -p "$DOCS_REPO/.github/workflows"
cp freeze-version.yml "$DOCS_REPO/.github/workflows/"
```

The workflow accepts:

- `release_version`: the version label to freeze, such as `v1.0.0`, `v0.53`, or `v8.5.x`.
- `next_version`: the next development version label, defaulting to `next`.
- `version_scope`: optional scope from `npx mintlifier versioning` for product-scoped docs.
- `run_mintlify_checks`: whether to run supplemental `npx mint@latest validate` and `npx mint@latest broken-links` after freezing. This defaults to `false` until we confirm which local checks they can safely replace.

The workflow creates a pull request with the frozen documentation snapshot. It does not deploy directly. Mintlify's GitHub App should deploy and create preview builds from repository changes.

## Optional Source Repository Trigger

Deploy `external-repo-trigger.yml` in a source repository only when a source release should trigger a docs freeze in another repository:

```bash
SOURCE_REPO=/path/to/your/source-repo
mkdir -p "$SOURCE_REPO/.github/workflows"
cp external-repo-trigger.yml "$SOURCE_REPO/.github/workflows/trigger-docs-freeze.yml"
```

Configure the source repository:

- Add a `DOCS_REPO_TOKEN` secret that can call `repository_dispatch` on the docs repository.
- Set `MINTLIFIER_DOCS_REPO` to `owner/docs-repo`.
- Optionally set `MINTLIFIER_VERSION_SCOPE` for product-scoped docs.
- Optionally set `MINTLIFIER_NEXT_VERSION`; otherwise release events use `next`.
- Optionally set `MINTLIFIER_RUN_MINTLIFY_CHECKS` to `true` after confirming native checks are safe for the target docs repo.

The source trigger only dispatches `freeze-version`. It no longer triggers changelog sync or combined docs automation.

## Optional Changelog Backfill

Deploy `sync-changelog.yml` in a documentation repository when you need to backfill release notes from a source repository's existing markdown changelog:

```bash
DOCS_REPO=/path/to/your/docs-repo
mkdir -p "$DOCS_REPO/.github/workflows" "$DOCS_REPO/scripts"
cp sync-changelog.yml "$DOCS_REPO/.github/workflows/"
cp ../scripts/refresh-changelog.sh ../scripts/parse-external-changelog.js "$DOCS_REPO/scripts/"
```

The helper scripts currently look for `CHANGELOG.md`, `CHANGELOG.MD`, `changelog.md`, `Changelog.md`, `CHANGES.md`, and `HISTORY.md`; normalize common version heading formats; normalize category headings such as `Added`, `Bugfixes`, `Updated`, and breaking-change variants; and emit Mintlify `Update` entries.

Use native Mintlify changelog and automation features for ongoing changelog drafting once historical backfill is complete.

## Deprecated Templates

`docs-automation.yml` is intentionally non-mutating. It exists so old references show a clear warning instead of continuing stale combined behavior.

## Security Notes

- Never commit tokens or secrets.
- Prefer the Mintlify GitHub App and Automations over custom PAT-based dispatches when they fully cover the workflow.
- If `external-repo-trigger.yml` is required, scope the token to the documentation repository only.
- Review every generated version-freeze pull request before merging.

## References

- Mintlify CLI commands: https://www.mintlify.com/docs/cli/commands
- Mintlify Automations: https://www.mintlify.com/docs/automations
- Mintlify changelogs: https://www.mintlify.com/docs/create/changelogs
- Mintlify GitHub deployment: https://www.mintlify.com/docs/deploy/github
- Mintlify CI checks: https://www.mintlify.com/docs/deploy/ci
