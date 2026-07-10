# Versioning

Mintlifier keeps active documentation under a working label such as `next` and creates immutable snapshots for releases.

## Before setup

Commit or stash documentation changes before reorganizing an existing project. Confirm that every local page in navigation has a matching MDX file.

Mintlifier supports:

- flat `navigation.versions` sites;
- versions nested under products, dropdowns, tabs, languages, anchors, or groups;
- root `docs.json` and `docs/docs.json` layouts.

Version labels must be path-safe. Letters, numbers, dots, underscores, and hyphens are accepted. Examples include `next`, `main`, `v1.0.0`, `v0.53`, and `v8.5.x`. Slashes, whitespace, and `..` are rejected.

## Set up versioning

Run from the project root:

```bash
npx mintlifier versioning
```

For unversioned navigation, Mintlifier asks for:

- a working label, normally `next`;
- the current development version.

It moves referenced MDX pages beneath the working label, updates their navigation paths, wraps the navigation in `navigation.versions`, and creates `versions.json`. It does not relocate `docs.json`.

If navigation is already versioned but `versions.json` is missing, the command derives metadata from the existing version nodes without moving pages.

Metadata is stored at:

- `docs/versions.json` when the configuration is root `docs.json`;
- beside `docs/docs.json` when the configuration is nested.

## Find a product scope

Run `versioning` again to list version nodes and scope aliases:

```bash
npx mintlifier versioning
```

A flat site normally has the `root` scope. Product navigation may report aliases such as `api-reference` for an internal scope id such as `dropdown:api-reference`.

Pass the displayed alias to `freeze`. When more than one scope exists, `--scope` is required.

## Preview a freeze

Dry runs perform the same label, scope, source-file, and destination checks as a real freeze:

```bash
npx mintlifier freeze \
  --version v1.4.0 \
  --next-version next \
  --dry-run
```

For a product scope:

```bash
npx mintlifier freeze \
  --scope api-reference \
  --version v2.3.0 \
  --next-version next \
  --dry-run
```

The output lists every source and destination. No files are created or updated.

## Freeze a version

Run interactively or provide all labels for automation:

```bash
npx mintlifier freeze \
  --version v1.4.0 \
  --next-version next \
  --automated
```

Mintlifier:

1. resolves the selected version scope;
2. verifies every source is a file and every destination is unused;
3. stages and rewrites the snapshot;
4. adds `.version-metadata.json` to the snapshot;
5. promotes the staged files;
6. replaces `docs.json` and `versions.json` with their updated forms.

Only pages reachable from the selected working-version navigation node are copied. A scoped freeze leaves other products and shared navigation unchanged.

## Review and validate changes

Inspect the complete change before committing:

```bash
git status --short
git diff -- docs.json docs/versions.json docs
npx mint@latest validate
npx mint@latest broken-links
```

For nested configurations, include `docs/docs.json` in the diff.

Check that:

- the new version appears in the correct selector or product scope;
- snapshot navigation points to the frozen paths;
- internal Markdown links use the frozen version;
- unrelated scopes and content did not change.

## Commit the snapshot

Commit the navigation, metadata, and snapshot together:

```bash
git add docs.json docs
git commit -m "docs: freeze v1.4.0"
```

Adjust the paths when `docs.json` is nested. Do not edit a frozen snapshot after release; make corrections in the active version and freeze a new label.

## Metadata and generated files

Flat metadata retains these keys for compatibility:

- `versions`: frozen labels;
- `currentVersion`: current development state;
- `workingVersion`: navigation label containing active content;
- `defaultVersion`: current default frozen label.

Scoped state is stored under `versions.json.scopes`. A freeze also records the version, scope, date, timestamp, next label, and Node.js version in `.version-metadata.json` inside the snapshot.

## Failure and recovery behavior

Mintlifier refuses to overwrite any snapshot destination. Missing source pages, ambiguous scopes, invalid labels, and existing targets fail during preflight before files are copied.

Snapshot content is written in a temporary staging directory. Configuration and metadata are prepared separately and promoted only after the snapshot is ready. Failed operations remove staged or newly promoted files and retain the previous configuration and metadata.

If a process is terminated outside Mintlifier's error handling, review `git status` before retrying. Remove only a confirmed incomplete, uncommitted snapshot; never remove an established frozen version to reuse its label.

## GitHub Actions

`workflow-templates/freeze-version.yml` runs a non-interactive freeze and opens a pull request. It can be started manually or by `repository_dispatch` from another repository. See the [workflow template guide](../workflow-templates/README.md) for installation, permissions, and inputs.
