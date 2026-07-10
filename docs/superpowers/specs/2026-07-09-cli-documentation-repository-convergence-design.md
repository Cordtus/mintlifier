# CLI, Documentation, and Repository Convergence

## Objective

Make Mintlifier's supported workflows reliable before rewriting its documentation. Preserve the existing command names and public behavior where practical, remove confirmed dead implementations, and document only behavior verified against the code and current Mintlify platform.

## Scope

This work covers:

- interactive project creation and editing;
- non-interactive project generation;
- flat and product-scoped version setup and freezing;
- CLI help and argument validation;
- user, workflow-template, schema, and release documentation;
- repository layout and npm package contents.

It does not add new Mintlify product features, migration commands, deployment infrastructure, or a new CLI framework.

## Command Architecture

Keep the `init`, `auto`, `edit`, `versioning`, and `freeze` commands and their existing aliases. Add command-specific help and reject unknown options, options without values, and invalid combinations.

Use one project-layout resolver for every command. Given a working directory or explicit config path, it returns the project root, `docs.json` path, content root, and `versions.json` path. Commands must not change the process working directory to compensate for layout differences.

Use a shared page planner to map each navigation page reference to its MDX path. Interactive and automated generation must write exactly the paths represented in `docs.json`. Asset, snippet, external, OpenAPI, and anchor references remain outside document-page generation.

`auto` checks the selected output directory rather than the invoking directory. It refuses to replace an existing target configuration or content tree.

Navigation editing takes a copy of the existing structure before constructing a replacement. Defaults and conversions derive from that copy so switching navigation forms cannot silently discard pages.

## Versioning

Use one versioning engine for post-`init` setup, the `versioning` command, the `freeze` command, and the supplied workflow templates. Remove the competing legacy generators and adapters after their remaining behavior is incorporated or proven unnecessary.

Version setup keeps `docs.json` where the user placed it. It may organize MDX content beneath the resolved content root, but it updates navigation paths in the same operation. If navigation is already versioned and metadata is absent, setup creates compatible metadata instead of leaving the project unable to freeze.

Before a freeze writes anything, it resolves the selected scope, validates version labels, verifies all source pages, checks destination conflicts, and builds a complete mutation plan. Snapshot files are written to a staging directory and promoted only after all copies succeed. Configuration and metadata use temporary files followed by atomic replacement. Failed preflight or staging leaves the project unchanged.

Frozen versions remain immutable. Flat and scoped freezes retain dry-run support, preserve unrelated scopes and shared navigation, and store scoped state under `versions.json.scopes`.

## Documentation

Documentation follows the order in which users encounter the product:

1. requirements and installation;
2. creating or generating a project;
3. previewing and validating with the Mintlify CLI;
4. editing configuration;
5. setting up and operating versioning;
6. release and workflow automation;
7. maintenance and troubleshooting.

`README.md` is the concise user entry point. Detailed command behavior, versioning operations, and Mintlifier-specific schema compatibility live in focused documents under `docs/`. Maintainer-only npm publishing instructions move to `RELEASING.md`. `workflow-templates/README.md` contains paste-ready installation, permissions, inputs, outputs, verification, and troubleshooting for the retained templates.

Avoid duplicating the upstream Mintlify field catalog. Document Mintlifier's generated fields, normalization rules, limitations, and schema-refresh procedure, then link to the authoritative Mintlify documentation.

Use calm, direct language. Remove promotional phrasing, repeated platform comparisons, decorative status prose, and obsolete examples.

## Repository and Package Cleanup

Remove confirmed dead or duplicate material:

- the stale and destructive self-documentation generator;
- superseded versioning implementations and unused adapters;
- the unused standalone version updater;
- the misplaced schema analysis note;
- the deprecated non-mutating combined workflow;
- the unused Yarn lockfile;
- one of the byte-identical schema JSON snapshots.

Retain `package-lock.json` and declare npm as the package manager. Keep tests and maintainer documentation in Git, but publish only runtime code, supported workflow assets, public schema/type artifacts, the license, and user documentation. Use an explicit `package.json` files list as the package boundary and remove redundant ignore rules.

## Error Handling

Commands fail before mutation when required input is missing, a target exists, a source page is absent, a scope is ambiguous, or a destination conflicts. Errors name the affected option, path, or scope and provide the next valid action. Interactive cancellation exits without saving. Dry runs perform the same validation as real freezes and report the planned changes.

## Testing and Verification

Add deterministic tests for observable behavior:

- project-layout resolution for root and nested configurations;
- navigation-to-file planning for supported navigation shapes;
- automated generation and overwrite protection;
- navigation editing and conversion preservation;
- first-time and already-versioned metadata setup;
- flat and scoped freeze plans and application;
- dry-run behavior and atomic failure handling;
- CLI help and argument errors.

Tests use temporary directories and real filesystem operations where the behavior is file-oriented. They avoid arbitrary timing, implementation-text assertions, and mocks that bypass the paths being validated.

Completion requires the full test suite, representative interactive and automated generation checks, flat and scoped freeze checks, documentation link review, `git diff --check`, and an npm package preview confirming that development-only and removed files are absent.

## Compatibility

Preserve documented command names, aliases, supported version labels, flat metadata keys, scoped metadata, and workflow inputs. Internal file locations may change when no documented public import exists. Removing an undocumented package subpath is acceptable for confirmed dead or duplicate artifacts in this active-development repository; the release notes must identify any package-content changes before the next publish.
