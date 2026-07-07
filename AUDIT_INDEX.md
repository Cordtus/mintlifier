# Mintlifier Audit Index

This index tracks obsolete, inaccurate, brittle, and generalization-worthy areas found during the July 2026 audit of Mintlifier against current Mintlify documentation and the related `/home/cordt/repos/docs` project.

Reference sources used:

- Current Mintlify docs index: `https://www.mintlify.com/docs/llms.txt`
- Current docs.json schema reference: `https://www.mintlify.com/docs/organize/settings-reference.md`
- Current navigation reference: `https://www.mintlify.com/docs/organize/navigation.md`
- Current API settings reference: `https://www.mintlify.com/docs/organize/settings-api.md`
- Current CLI command reference: `https://www.mintlify.com/docs/cli/commands.md`
- Related inspiration project: `/home/cordt/repos/docs`

## Status Terms

- **Obsolete**: feature or field is no longer current Mintlify surface area.
- **Inaccurate**: docs, examples, tests, or claims do not match implementation or current Mintlify behavior.
- **Brittle**: works only for a narrow shape and can break valid projects.
- **Generalize**: feature can be made more resilient across common Mintlify structures.
- **Resolved**: addressed in the current branch after the original audit entry was written.

## Workflow Native-Overlap Follow-Up

Updated July 7, 2026.

| Workflow | Status | Current direction |
| --- | --- | --- |
| `workflow-templates/freeze-version.yml` | Active / updated | Keep as the maintained Mintlifier workflow because Mintlify does not document a native filesystem version-freeze/snapshot operation. It now runs only Mintlifier freeze logic and optional supplemental `mint validate` / `mint broken-links` checks. |
| `workflow-templates/external-repo-trigger.yml` | Active / partial overlap / updated | Keep as an optional cross-repository trigger for `freeze-version`; this remains useful when source repo releases should create a new docs version and navigation/project-structure snapshot. Prefer Mintlify Automations only when they fully cover the source-triggered workflow. |
| `workflow-templates/sync-changelog.yml` | Active / partial overlap / updated | Keep as an optional historical changelog import/backfill workflow. Native Mintlify changelog pages and Automations overlap for ongoing drafting, but do not make this parser/import path obviously identical. |
| `workflow-templates/docs-automation.yml` | Deprecated | The combined workflow mixed changelog backfill, release automation, and freezing. It is superseded by separate `freeze-version.yml`, `sync-changelog.yml`, plus native Mintlify Automations, GitHub App deployments, preview deployments, and CI checks. Kept as a non-mutating deprecation notice. |

## Priority Summary

| ID | Priority | Type | Area | Summary |
| --- | --- | --- | --- | --- |
| MTL-001 | P0 | Obsolete | Schema generation | Generated configs use removed or relocated docs.json fields. |
| MTL-002 | P0 | Obsolete | API config | OpenAPI and playground settings use legacy locations and enum values. |
| MTL-003 | P0 | Obsolete | Integrations | Analytics are emitted under stale `analytics` keys instead of `integrations`. |
| MTL-004 | P0 | Obsolete | Versioning | Versioning model does not support the product-scoped docs project shape. |
| MTL-005 | P0 | Inaccurate | Packaged schemas | `schema.json`, `docs-json-schema.json`, and TypeScript declarations diverge from current schema. |
| MTL-006 | P1 | Inaccurate | README/CLI | README documents commands and flags that do not exist or are ignored. |
| MTL-007 | P1 | Brittle | Versioning | Version parsing and path rewriting handle only narrow semver/path shapes. |
| MTL-008 | P1 | Inaccurate | Tests | Main test suite fails and validates stale output assumptions. |
| MTL-009 | P1 | Resolved | Workflows | Workflow templates were rewritten or deprecated around current `docs.json`, Mintlifier freeze behavior, and native Mintlify platform features. |
| MTL-010 | P1 | Brittle | Multiple implementations | Versioning code paths disagree and duplicate behavior. |
| MTL-011 | P2 | Generalize | CLI output | Run/deploy guidance does not use current Mintlify commands consistently. |
| MTL-012 | P2 | Generalize | Project detection | Structure adapter misses valid current Mintlify layouts and product/version nesting. |
| MTL-013 | P2 | Obsolete | Self-doc builder | `build-docs` prompt script targets old prompts and deletes docs first. |
| MTL-014 | P2 | Generalize | Validation | No generated output is validated against current schema or `mint validate`. |
| MTL-015 | P2 | Security | Dependencies | Runtime dependency tree currently reports high audit findings. |

## Detailed Index

### MTL-001: Generated Configs Use Removed Or Relocated Fields

- **Priority**: P0
- **Type**: Obsolete
- **Files**: `index.js`, `automate-config.js`
- **Evidence**:
  - `index.js:73` writes `layout`; `index.js:84` writes `rounded`.
  - `index.js:127` writes `colors.background`; `index.js:147` writes `colors.anchors`.
  - `index.js:626` writes `modeToggle`.
  - `automate-config.js:12` writes `layout`; `automate-config.js:13` writes `rounded`; `automate-config.js:18` writes nested background and anchors under `colors`; `automate-config.js:89` writes `modeToggle`.
- **Current Mintlify direction**:
  - Required root fields are `theme`, `name`, `colors.primary`, and `navigation`.
  - Use `appearance.default` and `appearance.strict` for mode behavior.
  - Use top-level `background.color`, `background.decoration`, and `background.image` for background settings.
- **Recommended adjustment**:
  - Remove prompts and generated output for `layout`, `rounded`, `modeToggle`, `colors.background`, and `colors.anchors`.
  - Add current `appearance`, `background`, `interaction`, `styling`, and `thumbnails` prompts only where they map directly to current docs.

### MTL-002: API Configuration Uses Legacy Shape

- **Priority**: P0
- **Type**: Obsolete
- **Files**: `index.js`, `automate-config.js`, `README.md`, schemas
- **Evidence**:
  - `index.js:413` writes top-level `openapi`.
  - `index.js:437` writes `api.baseUrl`.
  - `index.js:457` writes `api.playground.mode`.
  - `automate-config.js:60` writes top-level `openapi`.
  - `automate-config.js:62` writes `api.baseUrl`; `automate-config.js:64` writes `api.playground.mode`.
  - `README.md:249` documents the same legacy shape.
- **Current Mintlify direction**:
  - Use `api.openapi`, navigation-level `openapi`, or OpenAPI `servers`.
  - Use `api.playground.display`: `interactive`, `simple`, `none`, or `auth`.
  - Use `api.mdx.auth` and `api.mdx.server` for MDX-authored API pages.
- **Recommended adjustment**:
  - Move generated OpenAPI config under `api.openapi` by default.
  - Add support for navigation item `openapi` when users want API pages inserted into a specific group/tab/dropdown/version.
  - Rename playground choices and support `proxy`, `credentials`, `params`, `url`, and `examples`.

### MTL-003: Analytics And Feedback Are Stale

- **Priority**: P0
- **Type**: Obsolete
- **Files**: `index.js`, `automate-config.js`, `lib/config-editor.js`, schema artifacts
- **Evidence**:
  - `index.js:530` creates `config.analytics`.
  - `automate-config.js:75` writes `analytics`.
  - `lib/config-editor.js:160` models `analytics` and provider-specific stale field names.
  - `index.js:587` and `automate-config.js:80` write `feedback`.
- **Current Mintlify direction**:
  - Analytics, chat, privacy, cookies, and telemetry live under `integrations`.
  - Current provider keys include `integrations.gtm.tagId`, `clearbit.publicApiKey`, `koala.publicApiKey`, `hotjar.hjid`, `hotjar.hjsv`, and `pirsch.id`.
  - Feedback is controlled through Mintlify dashboard/add-ons; disabling telemetry disables feedback.
- **Recommended adjustment**:
  - Delete `analytics` generation and editing, or migrate it to `integrations`.
  - Remove `feedback` generation from docs.json output. If keeping user-facing controls, present them as dashboard guidance or `integrations.telemetry.enabled`.

### MTL-004: Versioning Does Not Match Product-Scoped Docs

- **Priority**: P0
- **Type**: Obsolete / Brittle
- **Files**: `scripts/version-manager.js`, `lib/commands/versioning.js`, `lib/commands/freeze.js`
- **Evidence**:
  - `scripts/version-manager.js:55` always treats `/docs` as the documentation directory.
  - `scripts/version-manager.js:82` creates `docs/versions.json` with a flat `versions` list.
  - `lib/commands/versioning.js:30` only detects `docsConfig.navigation.versions`.
  - `lib/commands/freeze.js:29` only detects `docsConfig.navigation.versions`.
  - `/home/cordt/repos/docs/versions.json:1` stores versions under `products`.
  - `/home/cordt/repos/docs/scripts/versioning/README.md:63` documents product dropdowns with per-product versions.
- **Current Mintlify/project reality**:
  - Current navigation supports versions nested under tabs, dropdowns, products, anchors, and languages.
  - The related docs project keeps product directories such as `evm/next`, `sdk/next`, and `ibc/next`, with product-specific version registries.
- **Recommended adjustment**:
  - Generalize versioning around a detected navigation subtree plus a filesystem root, not a hard-coded global `docs/next`.
  - Support flat sites, single-product versioned sites, and product-scoped versioned sites as separate adapters.
  - Treat `/home/cordt/repos/docs` as a fixture shape for product-scoped versioning.

### MTL-005: Packaged Schemas And Type Declarations Are Stale

- **Priority**: P0
- **Type**: Inaccurate
- **Files**: `schema.json`, `docs-json-schema.json`, `docs-json-schema.d.ts`, `SCHEMA.md`, `lib/mintlify-schema-analysis.md`
- **Evidence**:
  - `schema.json:119` still includes `layout`; `schema.json:124` includes `rounded`.
  - `docs-json-schema.json:21` lists only seven themes.
  - `docs-json-schema.json:55` allows `heroicons` and `phosphor`.
  - `docs-json-schema.json:207` allows top-level `openapi`.
  - `docs-json-schema.json:289` models `analytics`.
  - `docs-json-schema.d.ts:17` misses `sequoia` and `luma`.
  - `docs-json-schema.d.ts:32` allows invalid icon libraries.
  - `SCHEMA.md:19` says `favicon` is required and `SCHEMA.md:22` says navigation is an array.
  - `lib/mintlify-schema-analysis.md:16` says favicon is required and `lib/mintlify-schema-analysis.md:63` says navigation is an array.
- **Current Mintlify direction**:
  - Use current `https://mintlify.com/docs.json` as the source of truth.
- **Recommended adjustment**:
  - Replace local hand-maintained schema artifacts with generated or vendored snapshots from `https://mintlify.com/docs.json`.
  - If schema augmentation is needed, keep Mintlifier-specific extension metadata separate from official schema shape.

### MTL-006: README Documents Missing Or Ignored Commands

- **Priority**: P1
- **Type**: Inaccurate
- **Files**: `README.md`, `bin/mintlifier.js`, `lib/commands/freeze.js`
- **Evidence**:
  - `README.md:9` claims migration tools.
  - `README.md:228`, `README.md:236`, `README.md:241`, and `README.md:242` document `mintlifier migrate`.
  - `bin/mintlifier.js:52` has no `migrate` route.
  - `README.md:285` documents `mintlifier freeze --version --next-version --automated`.
  - `lib/commands/freeze.js:12` accepts `args` but `lib/commands/freeze.js:71` calls `freezeVersion()` without options.
- **Recommended adjustment**:
  - Either implement migration and non-interactive freeze, or remove those claims.
  - If CI support remains a goal, define one stable non-interactive contract and wire it through CLI, scripts, workflows, and docs.

### MTL-007: Version Parsing And Path Rewriting Are Too Narrow

- **Priority**: P1
- **Type**: Brittle / Generalize
- **Files**: `scripts/version-manager.js`, `lib/enhanced-versioning.js`, workflow templates
- **Evidence**:
  - `scripts/version-manager.js:98` and `scripts/version-manager.js:125` require `vX.Y.Z`.
  - `scripts/version-manager.js:271` strips only full patch-version prefixes.
  - `lib/enhanced-versioning.js:51` requires major/minor/patch.
  - `/home/cordt/repos/docs/versions.json:17` uses `v0.53`; `:28` and `:29` use `v10.1.x` and `v8.5.x`.
- **Workflow update**:
  - Workflow templates no longer calculate next versions with shell `awk`; they accept explicit labels or default to `next`.
- **Recommended adjustment**:
  - Accept common docs version labels such as `next`, `main`, `latest`, `v0.53`, `v8.5.x`, `v25`, pre-releases, and arbitrary product release channels.
  - Split "display label" from "sort key" and "filesystem path".
  - Use parsed URL/path operations for MDX link rewrites where possible; do not rely on broad regex replacements.

### MTL-008: Main Test Suite Is Stale

- **Priority**: P1
- **Type**: Inaccurate
- **Files**: `test/test-runner.js`, `test/test-navigation-extraction.js`, `test/test-config-editor.js`, `test/test-init-versioning.js`
- **Evidence**:
  - `test/test-runner.js:158` validates `testPath/docs/docs.json`.
  - `index.js:663` writes `docs.json` at the output root.
  - `test/test-runner.js:178` still requires favicon.
  - `test/test-runner.js:184` accepts array navigation.
  - `test/test-runner.js:192` expects `scripts/version-manager.sh`, which is not the current script path.
  - `test/test-navigation-extraction.js:183` copies the helper under test instead of importing production code.
  - `test/test-config-editor.js:17` uses `https://mintlify.com/schema.json` and many obsolete fields.
  - `test/test-init-versioning.js:44` says full interactive testing is manual.
- **Observed verification**:
  - `npm test` fails on the stale output path.
  - `node test/test-navigation-extraction.js` passes, but only validates a copied helper.
  - `node test/test-init-versioning.js` passes import smoke checks only.
- **Recommended adjustment**:
  - Replace prompt-timing E2E with deterministic command tests around a non-interactive generator.
  - Validate generated `docs.json` against the current schema snapshot.
  - Add fixtures for flat, versioned, multilingual, product-scoped, and OpenAPI navigation.

### MTL-009: Workflow Templates Rewritten Or Deprecated

- **Priority**: P1
- **Type**: Resolved
- **Files**: `workflow-templates/freeze-version.yml`, `workflow-templates/docs-automation.yml`, `workflow-templates/sync-changelog.yml`, `workflow-templates/external-repo-trigger.yml`, `workflow-templates/README.md`
- **Resolution**:
  - `freeze-version.yml` is the active maintained template and invokes `npx mintlifier freeze --version --next-version --automated`, with optional `--scope`.
  - `freeze-version.yml` no longer performs changelog sync or deployment work that Mintlify now owns natively.
  - `sync-changelog.yml` remains active for historical markdown changelog import/backfill.
  - `docs-automation.yml` is a non-mutating deprecation notice.
  - `external-repo-trigger.yml` now dispatches only `freeze-version`.
  - `workflow-templates/README.md` documents active, deprecated, and partial-overlap templates.
- **Remaining consideration**:
  - The actual versioning implementation is still tracked under MTL-010 for deeper consolidation.
  - Native Mintlify validation is treated as supplemental until we test and confirm which local checks it can replace.

### MTL-010: Versioning Implementations Conflict

- **Priority**: P1
- **Type**: Brittle
- **Files**: `lib/versioning.js`, `scripts/version-manager.js`, `lib/enhanced-versioning.js`, `lib/structure-adapter.js`, workflow templates
- **Evidence**:
  - `lib/versioning.js:7` generates a Bash script.
  - `scripts/version-manager.js:34` contains a JavaScript freeze implementation used by commands.
  - `lib/enhanced-versioning.js:16` generates another JavaScript manager with a different `versions/` directory model.
  - `lib/structure-adapter.js:12` has separate detection/adaptation logic.
- **Workflow update**:
  - Workflow templates now delegate version freezing to `npx mintlifier freeze` instead of reimplementing freeze behavior in shell/YAML.
- **Recommended adjustment**:
  - Pick one versioning core library with pure functions for detection, planning, rewrite, and apply.
  - Put all CLI, generated scripts, and workflows through that one core.
  - Add a dry-run plan output before any file movement.

### MTL-011: Mintlify CLI Guidance Is Outdated Or Inconsistent

- **Priority**: P2
- **Type**: Inaccurate
- **Files**: `README.md`, `automate-config.js`, `lib/commands/auto.js`
- **Evidence**:
  - `README.md:297` documents `npx mint@latest deploy`, which is not listed in current Mintlify CLI command docs.
  - `automate-config.js:211` recommends `npm i -g mintlify`.
  - `automate-config.js:212` recommends `mintlify dev`.
  - `lib/commands/auto.js:85` recommends `npx mint@latest dev`, which matches current naming better.
- **Current Mintlify direction**:
  - Current documented commands include `mint dev`, `mint validate`, `mint broken-links`, `mint a11y`, `mint export`, `mint score`, `mint new`, `mint update`, and `mint version`.
- **Recommended adjustment**:
  - Standardize guidance on `npx mint@latest dev` or installed `mint dev`.
  - Replace deploy guidance with the current deployment/update flow, or point to Mintlify hosting/dashboard docs.
  - Add `mint validate`, `mint broken-links`, and optionally `mint score` to verification guidance.

### MTL-012: Project Structure Detection Needs Broader Current Coverage

- **Priority**: P2
- **Type**: Generalize
- **Files**: `lib/structure-adapter.js`
- **Evidence**:
  - `lib/structure-adapter.js:12` recognizes only root, `docs/`, `content/`, and a few monorepo paths.
  - `lib/structure-adapter.js:202` treats `mint.json` as a migratable legacy format but does not validate the resulting current schema.
  - `lib/structure-adapter.js:210` treats navigation array as a conversion target.
  - `lib/structure-adapter.js:280` creates snippets/assets directories as part of adaptation, even for projects that intentionally do not use them.
- **Recommended adjustment**:
  - Detect actual config location, content roots, and navigation roots independently.
  - Support root content, product content, language content, and sourceRef/external-source navigation without forced directory creation.
  - Treat migration as a planned transform with confirmation and rollback, not automatic adaptation.

### MTL-013: Self-Documentation Builder Is Stale And Destructive

- **Priority**: P2
- **Type**: Obsolete / Brittle
- **Files**: `scripts/build-docs.js`
- **Evidence**:
  - `scripts/build-docs.js:23` comments `theme: venus`.
  - `scripts/build-docs.js:24` and `:25` feed layout/rounded prompts.
  - `scripts/build-docs.js:90` feeds feedback prompts.
  - `scripts/build-docs.js:126` removes the existing `docs` directory before running.
- **Recommended adjustment**:
  - Remove the script if it is no longer maintained, or rewrite it as a fixture-driven generator that writes into a temporary output directory.

### MTL-014: No Current Schema Or Mintlify CLI Validation Gate

- **Priority**: P2
- **Type**: Generalize
- **Files**: test suite, package scripts
- **Evidence**:
  - `package.json:12` only runs `node test/test-runner.js`.
  - No script calls `mint validate`, current schema validation, or JSON Schema validation against `https://mintlify.com/docs.json`.
- **Recommended adjustment**:
  - Add a local validation utility that can consume either the current downloaded schema snapshot or an explicit fixture schema.
  - Add `test:fixtures`, `test:schema`, and optional `test:mint` scripts.
  - Keep network-free tests deterministic; make live Mintlify validation an optional integration check.

### MTL-015: Runtime Dependency Audit Reports High Findings

- **Priority**: P2
- **Type**: Security / Maintenance
- **Files**: `package.json`, `package-lock.json`
- **Evidence**:
  - `package.json:46` depends on `glob`.
  - `npm audit --omit=dev` reported 3 high findings through `@isaacs/brace-expansion` via `minimatch` and `glob`, with no fix available at audit time.
- **Recommended adjustment**:
  - Track upstream fix availability.
  - Consider replacing `glob` usage with a narrower maintained walker if the advisory remains unresolved.

### MTL-016: Generated Output Structure Is Inconsistent Across Code, README, And Tests

- **Priority**: P2
- **Type**: Inaccurate / Brittle
- **Files**: `README.md`, `index.js`, `test/test-runner.js`, `lib/commands/edit.js`
- **Evidence**:
  - `README.md:52` shows `docs/docs.json`.
  - `README.md:64` tells users to `cd docs`.
  - `index.js:663` writes `docs.json` to project root and pages under `docs/`.
  - `test/test-runner.js:160` expects output under `docs/`.
  - `lib/commands/edit.js:21` searches multiple possible locations.
- **Recommended adjustment**:
  - Decide the canonical generated layout.
  - Make init, auto, docs, tests, edit discovery, and versioning all use that same layout.
  - For broad compatibility, keep discovery flexible but generation opinionated.

### MTL-017: Contextual Menu Support Is Behind Current AI Options

- **Priority**: P2
- **Type**: Obsolete / Generalize
- **Files**: `index.js`, `docs-json-schema.json`, `docs-json-schema.d.ts`
- **Evidence**:
  - `index.js:245` presents a small fixed set of contextual options.
  - `docs-json-schema.json:125` lists only `copy`, `view`, `chatgpt`, `claude`, `perplexity`, `mcp`, `cursor`, and `vscode`.
  - `docs-json-schema.d.ts:56` mirrors the same reduced list.
- **Current Mintlify direction**:
  - Current contextual options include assistant, copy, view, download actions, multiple AI tools, MCP variants, editor integrations, and custom option objects.
- **Recommended adjustment**:
  - Load contextual options from the schema snapshot.
  - Support custom contextual option objects rather than only string enum choices.

### MTL-018: Navigation Modeling Misses Current Schema Details

- **Priority**: P2
- **Type**: Generalize
- **Files**: `index.js`, `schema.json`, `docs-json-schema.json`, `docs-json-schema.d.ts`, versioning helpers
- **Evidence**:
  - `index.js:275` supports simple/grouped/tabbed/versioned prompts only.
  - Schema artifacts omit or under-model `global`, `products`, `directory`, `root`, `tag`, `expanded`, `hidden`, `searchable`, `sourceRef`, `asyncapi`, nested `openapi`, and menu variants.
  - `scripts/version-manager.js:519` explicitly avoids adding OpenAPI references to paths but does not plan generated API pages.
- **Recommended adjustment**:
  - Model navigation as a recursive tree based on the current schema, not as several special-case prompt shapes.
  - Add a tree walker that can visit and transform only content path fields while preserving structural metadata.

### MTL-019: Migration Claims Are Unimplemented

- **Priority**: P2
- **Type**: Inaccurate
- **Files**: `README.md`, `package.json`, CLI router
- **Evidence**:
  - `package.json:23` includes `migration` as a keyword.
  - `README.md:206` has a migration section for existing Mintlify and other platforms.
  - `bin/mintlifier.js:52` has no migration command.
- **Recommended adjustment**:
  - Remove platform migration claims until implemented.
  - If implemented later, split migration from versioning setup and require fixture-backed transforms for GitBook, Notion, Docusaurus, and VuePress.

### MTL-020: Auto Command Has Narrow And Misleading Behavior

- **Priority**: P3
- **Type**: Generalize / Inaccurate
- **Files**: `lib/commands/auto.js`, `automate-config.js`
- **Evidence**:
  - `lib/commands/auto.js:17` defines `mintlifyDocsPath` but never uses it.
  - `lib/commands/auto.js:27` stores `configName`, but `automate-config.js` hard-codes `name: 'Enterprise API Platform'` at `automate-config.js:9`.
  - `automate-config.js:209` prints `cd mintlify-docs` even when the caller provided another output directory.
- **Recommended adjustment**:
  - Make `auto` a real non-interactive generator with explicit options and defaults.
  - Validate generated output before printing success.

### MTL-021: External Changelog Workflow Narrowed To Backfill

- **Priority**: P3
- **Type**: Partial overlap / Generalize
- **Files**: `workflow-templates/*`, `scripts/refresh-changelog.sh`, `scripts/parse-external-changelog.js`, `scripts/update-versions.js`
- **Resolution**:
  - `workflow-templates/sync-changelog.yml` is now an optional historical import/backfill workflow.
  - `scripts/parse-external-changelog.js` exports parser/generator functions and has characterization tests for common markdown changelog structures.
  - `workflow-templates/docs-automation.yml` no longer performs changelog sync as part of a combined workflow.
  - `workflow-templates/README.md` documents the difference between Mintlifier historical backfill and Mintlify-native ongoing changelog drafting.
- **Remaining consideration**:
  - Decide whether to keep the helper scripts long-term, but do not treat them as obsolete until we compare them against native Mintlify Automations on real historical changelogs.

### MTL-022: Local Documentation Contains Contradictory Schema Guidance

- **Priority**: P3
- **Type**: Inaccurate
- **Files**: `SCHEMA.md`, `lib/mintlify-schema-analysis.md`, `README.md`
- **Evidence**:
  - `SCHEMA.md:10` uses `https://mintlify.com/schema.json`.
  - `README.md:3` claims latest docs.json schema.
  - `SCHEMA.md:196` lists old themes `venus`, `quill`, and `prism`.
  - `README.md:44` lists current-ish but incomplete themes.
  - `lib/mintlify-schema-analysis.md:276` says options need to be added/fixed based on an older schema analysis.
- **Recommended adjustment**:
  - Remove `lib/mintlify-schema-analysis.md` if it is historical scratch material.
  - Regenerate `SCHEMA.md` from the same current schema source used by implementation.

### MTL-023: Missing Support For Current Mintlify AI-Native Features

- **Priority**: P3
- **Type**: Generalize
- **Files**: generator/editor/schema artifacts
- **Evidence**:
  - Current docs include llms.txt, markdown export, assistant, contextual AI actions, MCP server discovery, and `mint score`.
  - Existing prompts focus on older appearance, analytics, feedback, and versioning fields.
- **Recommended adjustment**:
  - Add optional scaffolding/guidance for `AGENTS.md`, assistant docs, `contextual`, markdown export, and `mint score` readiness only after core schema correctness is fixed.

### MTL-024: Current `/home/cordt/repos/docs` Features Are Not Represented As Test Fixtures

- **Priority**: P2
- **Type**: Generalize
- **Files**: tests and fixtures
- **Evidence**:
  - `/home/cordt/repos/docs/docs.json` uses large product dropdowns with nested versions, tabs, groups, and product directories.
  - `/home/cordt/repos/docs/versions.json` has a product registry.
  - Current tests only cover small synthetic navigation objects.
- **Recommended adjustment**:
  - Add sanitized fixtures modeled after `/home/cordt/repos/docs`:
    - product-scoped versions
    - `next` plus frozen versions
    - non-patch versions such as `v0.53` and `v8.5.x`
    - nested dropdown/tabs/groups
  - Use those fixtures to validate detection and dry-run versioning.

## Suggested Cleanup Order

1. Establish one current schema source and regenerate local schema/types/docs from it.
2. Fix `init`, `auto`, and `edit` to produce and modify only current docs.json fields.
3. Replace duplicated versioning with a pure planning core plus adapters for flat, single-product, and product-scoped sites.
4. Rewrite tests around deterministic fixtures and current schema validation.
5. Update README, workflow templates, and self-doc scripts after behavior is current.
6. Re-run dependency audit and decide whether to keep or replace `glob`.
