# CLI, Documentation, and Repository Convergence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Mintlifier's creation, editing, and version-freeze workflows reliable, then replace stale documentation and package contents with concise material that matches verified behavior.

**Architecture:** Introduce pure project-layout, page-planning, CLI-option, and navigation-conversion modules around the existing command handlers. Replace competing versioning paths with one plan/apply engine that resolves layouts once, validates every mutation, stages snapshots, and atomically updates configuration. Rewrite documentation only after the assembled workflows pass filesystem integration tests.

**Tech Stack:** Node.js 20.17+ ES modules, Node test runner, `fs-extra`, `glob`, `@inquirer/prompts`, GitHub Actions, npm.

---

## File Map

New runtime modules:

- `lib/project-layout.js`: resolve project root, config path, page base, content root, and metadata path without changing cwd.
- `lib/page-planner.js`: collect and prefix navigation page references and build deterministic MDX write plans.
- `lib/cli-options.js`: parse command options and render command-specific help.
- `lib/navigation-editor.js`: pure navigation defaults and conversions used by the interactive editor.
- `lib/version-manager.js`: the single setup/freeze coordinator and plan/apply boundary.

New tests:

- `test/project-layout.test.js`: root, nested, explicit, and missing configuration layouts.
- `test/page-planner.test.js`: navigation traversal, exact output paths, and ignored non-page references.
- `test/cli-options.test.js`: supported options, aliases, missing values, and unknown arguments.
- `test/generation.test.js`: automated project output and overwrite protection through real temporary directories.
- `test/navigation-editor.test.js`: page defaults and lossless version conversion.
- `test/version-manager.test.js`: metadata setup, flat freezes, preflight, staging cleanup, and layout integration.

Documentation:

- `README.md`: concise user journey from install through regular operation.
- `docs/commands.md`: supported commands, options, outputs, and failure modes.
- `docs/versioning.md`: setup, dry-run, freeze, review, and recovery workflow.
- `docs/schema-compatibility.md`: Mintlifier-specific generation and normalization boundaries.
- `RELEASING.md`: maintainer-only npm release process.
- `workflow-templates/README.md`: operational installation and configuration for retained templates.

Removed files are listed in Task 7 after their replacement paths are working.

### Task 1: Resolve Project Layouts Without Changing cwd

**Files:**
- Create: `lib/project-layout.js`
- Create: `test/project-layout.test.js`
- Modify: `test/freeze-command.test.js`

- [ ] **Step 1: Write failing layout behavior tests**

```js
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import fs from 'fs-extra';
import { resolveProjectLayout } from '../lib/project-layout.js';

test('root docs.json uses docs as its content root', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-layout-'));
  await fs.writeJson(path.join(root, 'docs.json'), {});

  assert.deepEqual(await resolveProjectLayout({ cwd: root }), {
    projectRoot: root,
    configPath: path.join(root, 'docs.json'),
    configDir: root,
    contentRoot: path.join(root, 'docs'),
    versionsPath: path.join(root, 'docs', 'versions.json')
  });
});

test('docs/docs.json keeps the repository as project root', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-layout-'));
  await fs.outputJson(path.join(root, 'docs', 'docs.json'), {});

  const layout = await resolveProjectLayout({ cwd: root });
  assert.equal(layout.projectRoot, root);
  assert.equal(layout.configDir, path.join(root, 'docs'));
  assert.equal(layout.contentRoot, path.join(root, 'docs'));
  assert.equal(layout.versionsPath, path.join(root, 'docs', 'versions.json'));
});

test('missing docs.json reports the searched directory', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-layout-'));
  await assert.rejects(
    resolveProjectLayout({ cwd: root }),
    { message: `No docs.json found under ${root}` }
  );
});
```

- [ ] **Step 2: Run the focused test and verify the missing-module failure**

Run: `node --test test/project-layout.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/project-layout.js`.

- [ ] **Step 3: Implement the resolver**

```js
import path from 'node:path';
import fs from 'fs-extra';

export async function resolveProjectLayout({ cwd = process.cwd(), configPath } = {}) {
  const base = path.resolve(cwd);
  const candidates = configPath
    ? [path.resolve(base, configPath)]
    : [path.join(base, 'docs.json'), path.join(base, 'docs', 'docs.json')];
  const resolvedConfig = (await Promise.all(
    candidates.map(async (candidate) => await fs.pathExists(candidate) ? candidate : null)
  )).find(Boolean);

  if (!resolvedConfig) {
    throw new Error(`No docs.json found under ${base}`);
  }

  const configDir = path.dirname(resolvedConfig);
  const nestedDocsConfig = path.basename(configDir) === 'docs';
  const projectRoot = nestedDocsConfig ? path.dirname(configDir) : configDir;
  const contentRoot = nestedDocsConfig ? configDir : path.join(projectRoot, 'docs');

  return {
    projectRoot,
    configPath: resolvedConfig,
    configDir,
    contentRoot,
    versionsPath: path.join(contentRoot, 'versions.json')
  };
}
```

- [ ] **Step 4: Replace the cwd-dependent freeze-path test with resolver assertions**

Remove `resolveVersioningPaths` coverage from `test/freeze-command.test.js`; import and exercise `resolveProjectLayout` only in `test/project-layout.test.js`. Do not call `process.chdir()` in any new test.

- [ ] **Step 5: Run focused and full tests**

Run: `node --test test/project-layout.test.js test/freeze-command.test.js && npm test`

Expected: all tests pass with no cwd mutation.

- [ ] **Step 6: Commit**

```bash
git add lib/project-layout.js test/project-layout.test.js test/freeze-command.test.js
git commit -m "refactor: centralize Mintlify project layout resolution"
```

### Task 2: Generate Files at Their Documented Navigation Paths

**Files:**
- Create: `lib/page-planner.js`
- Create: `test/page-planner.test.js`
- Create: `test/generation.test.js`
- Modify: `index.js`
- Modify: `automate-config.js`
- Modify: `lib/current-mintlify.js`
- Modify: `lib/commands/auto.js`

- [ ] **Step 1: Write failing page-planner tests**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { planGeneratedPages, prefixNavigationPages } from '../lib/page-planner.js';

test('prefixNavigationPages changes only local pages and roots', () => {
  const navigation = {
    global: { tabs: [{ tab: 'Status', href: 'https://status.example.com' }] },
    groups: [{
      group: 'Guides',
      root: 'overview',
      pages: ['quickstart', 'nested/install', 'https://example.com/reference']
    }]
  };

  assert.deepEqual(prefixNavigationPages(navigation, 'docs'), {
    global: navigation.global,
    groups: [{
      group: 'Guides',
      root: 'docs/overview',
      pages: ['docs/quickstart', 'docs/nested/install', 'https://example.com/reference']
    }]
  });
});

test('planGeneratedPages returns unique MDX files matching page references', () => {
  assert.deepEqual(planGeneratedPages({
    groups: [{ group: 'Guides', pages: ['docs/intro', 'docs/setup', 'docs/intro'] }]
  }), [
    { reference: 'docs/intro', relativePath: 'docs/intro.mdx' },
    { reference: 'docs/setup', relativePath: 'docs/setup.mdx' }
  ]);
});
```

- [ ] **Step 2: Run the page-planner test and verify it fails**

Run: `node --test test/page-planner.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement navigation traversal and planning**

```js
function isLocalPage(value) {
  return typeof value === 'string' &&
    !value.startsWith('http://') &&
    !value.startsWith('https://') &&
    !value.startsWith('mailto:') &&
    !value.startsWith('#');
}

function mapNavigation(value, key, mapPage) {
  if (typeof value === 'string') {
    return (key === 'pages' || key === 'root') && isLocalPage(value) ? mapPage(value) : value;
  }
  if (Array.isArray(value)) return value.map((entry) => mapNavigation(entry, key, mapPage));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [
    childKey,
    childKey === 'href' || childKey === 'openapi'
      ? childValue
      : mapNavigation(childValue, childKey, mapPage)
  ]));
}

export function transformNavigationPages(navigation, mapPage) {
  return mapNavigation(structuredClone(navigation), null, mapPage);
}

export function prefixNavigationPages(navigation, prefix) {
  return transformNavigationPages(navigation, (page) => {
    const clean = page.replace(/^\/+/, '');
    return clean === prefix || clean.startsWith(`${prefix}/`) ? clean : `${prefix}/${clean}`;
  });
}

export function planGeneratedPages(navigation) {
  const pages = [];
  mapNavigation(navigation, null, (page) => {
    const reference = page.replace(/^\/+/, '').replace(/[?#].*$/, '');
    pages.push(reference);
    return page;
  });
  return [...new Set(pages)].sort().map((reference) => ({
    reference,
    relativePath: reference.endsWith('.mdx') ? reference : `${reference}.mdx`
  }));
}
```

- [ ] **Step 4: Write failing automated-generation integration tests**

```js
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import fs from 'fs-extra';
import { generateAutomatedProject } from '../automate-config.js';
import { generateInteractiveProject } from '../index.js';

test('interactive generation writes pages at its saved navigation paths', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-init-'));
  const config = {
    name: 'Guides', theme: 'mint', colors: { primary: '#0D9373' },
    navigation: { groups: [{ group: 'Start', pages: ['intro', 'nested/setup'] }] }
  };

  const result = await generateInteractiveProject(config, { outputDir: root, showProgress: false });
  const saved = await fs.readJson(path.join(root, 'docs.json'));

  assert.deepEqual(saved.navigation.groups[0].pages, ['docs/intro', 'docs/nested/setup']);
  assert.equal(await fs.pathExists(path.join(root, 'docs/intro.mdx')), true);
  assert.equal(await fs.pathExists(path.join(root, 'docs/nested/setup.mdx')), true);
  assert.equal(result.pages.length, 2);
});

test('auto writes every local navigation page at the referenced path', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-auto-'));
  const output = path.join(root, 'site');
  const result = await generateAutomatedProject({ outputDir: output, name: 'API Docs' });
  const config = await fs.readJson(path.join(output, 'docs.json'));

  for (const page of result.pages) {
    assert.equal(await fs.pathExists(path.join(output, page.relativePath)), true, page.reference);
  }
  assert.equal(config.name, 'API Docs');
});

test('auto refuses an existing output directory without changing it', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-auto-'));
  const output = path.join(root, 'site');
  await fs.outputFile(path.join(output, 'keep.txt'), 'preserve me');

  await assert.rejects(
    generateAutomatedProject({ outputDir: output, name: 'API Docs' }),
    /Output directory already exists/
  );
  assert.equal(await fs.readFile(path.join(output, 'keep.txt'), 'utf8'), 'preserve me');
});
```

- [ ] **Step 5: Refactor generation behind exported functions**

In `automate-config.js`, export `generateAutomatedProject({ outputDir, name })`, refuse any existing output path, prefix generated navigation with `docs`, write pages from `planGeneratedPages()`, and call the function only when the file is executed directly.

```js
export async function generateAutomatedProject({ outputDir, name = 'API Documentation' }) {
  if (await fs.pathExists(outputDir)) {
    throw new Error(`Output directory already exists: ${outputDir}`);
  }
  const config = buildAutomatedDocsConfig({ name });
  config.navigation = prefixNavigationPages(config.navigation, 'docs');
  const pages = planGeneratedPages(config.navigation);
  await fs.ensureDir(outputDir);
  await fs.writeJson(path.join(outputDir, 'docs.json'), config, { spaces: 2 });
  for (const page of pages) {
    await writeStarterPage(path.join(outputDir, page.relativePath), page.reference);
  }
  await writeStarterAssets(outputDir, config);
  return { outputDir, pages };
}
```

Export `generateInteractiveProject(config, { outputDir = process.cwd(), showProgress = true })` from `index.js`. It uses the same prefixing and page plan before writing interactive output. Replace its separate `createPages`, `processGroups`, and version-directory branches with one loop over the plan; retain its asset and OpenAPI placeholder behavior. `main()` calls this export with the default options.

- [ ] **Step 6: Remove fake company data from the automated starter config**

In `buildAutomatedDocsConfig()`, remove global status links, company URLs, social profiles, and the fake PostHog key. Retain the theme, colors, appearance, local logo/favicon paths, navigation, local OpenAPI placeholders, playground display, contextual options, and search prompt.

- [ ] **Step 7: Make the auto command validate its actual target**

Add this behavior-preserving parser to `lib/commands/auto.js`; Task 3 will move the same contract into the shared parser.

```js
export function parseAutoArgs(args = []) {
  const options = { name: 'API Documentation', output: 'mintlify-docs' };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument !== '--name' && argument !== '-n' && argument !== '--output' && argument !== '-o') {
      throw new Error(`Unknown auto option: ${argument}`);
    }
    const value = args[index + 1];
    if (!value || value.startsWith('-')) throw new Error(`${argument} requires a value`);
    options[argument === '--name' || argument === '-n' ? 'name' : 'output'] = value;
    index += 1;
  }
  return options;
}
```

Resolve `options.output` against `process.cwd()`, pass that path to `generateAutomatedProject()`, and remove the unrelated root `docs.json` guard.

- [ ] **Step 8: Run focused and full tests**

Run: `node --test test/page-planner.test.js test/generation.test.js test/current-mintlify.test.js && npm test`

Expected: page references match generated files, existing output is preserved, and all tests pass.

- [ ] **Step 9: Commit**

```bash
git add lib/page-planner.js lib/current-mintlify.js lib/commands/auto.js automate-config.js index.js test/page-planner.test.js test/generation.test.js test/current-mintlify.test.js
git commit -m "fix: align generated content with navigation"
```

### Task 3: Validate CLI Options and Provide Command Help

**Files:**
- Create: `lib/cli-options.js`
- Create: `test/cli-options.test.js`
- Modify: `bin/mintlifier.js`
- Modify: `lib/commands/auto.js`
- Modify: `lib/commands/edit.js`
- Modify: `lib/commands/freeze.js`
- Modify: `lib/commands/versioning.js`
- Modify: `test/freeze-command.test.js`

- [ ] **Step 1: Write failing parser tests**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCommandOptions } from '../lib/cli-options.js';

test('auto accepts long and short value options', () => {
  assert.deepEqual(parseCommandOptions('auto', ['-n', 'API Docs', '-o', 'site']), {
    name: 'API Docs',
    output: 'site'
  });
});

test('freeze accepts aliases and boolean flags', () => {
  assert.deepEqual(parseCommandOptions('freeze', [
    '-s', 'api', '-v', 'v1.0.0', '--next', 'next', '--dry-run', '-y'
  ]), {
    scope: 'api', version: 'v1.0.0', nextVersion: 'next', dryRun: true,
    yes: true, nonInteractive: true
  });
});

test('options reject missing values and unknown flags', () => {
  assert.throws(() => parseCommandOptions('auto', ['--output']), /requires a value/);
  assert.throws(() => parseCommandOptions('freeze', ['--force']), /Unknown freeze option: --force/);
});
```

- [ ] **Step 2: Run the parser test and verify it fails**

Run: `node --test test/cli-options.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement definitions, parsing, and help text**

```js
const COMMAND_OPTIONS = {
  auto: {
    '--name': { key: 'name', aliases: ['-n'], value: true },
    '--output': { key: 'output', aliases: ['-o'], value: true }
  },
  freeze: {
    '--version': { key: 'version', aliases: ['-v'], value: true },
    '--next-version': { key: 'nextVersion', aliases: ['--next'], value: true },
    '--scope': { key: 'scope', aliases: ['-s'], value: true },
    '--dry-run': { key: 'dryRun' },
    '--yes': { key: 'yes', aliases: ['-y', '--automated', '--non-interactive'], nonInteractive: true }
  }
};

export function parseCommandOptions(command, args) {
  const definitions = COMMAND_OPTIONS[command] || {};
  const result = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    const entry = Object.entries(definitions).find(([name, definition]) =>
      argument === name || definition.aliases?.includes(argument)
    );
    if (!entry) throw new Error(`Unknown ${command} option: ${argument}`);
    const [, definition] = entry;
    if (definition.value) {
      const value = args[index + 1];
      if (!value || value.startsWith('-')) throw new Error(`${argument} requires a value`);
      result[definition.key] = value;
      index += 1;
    } else {
      result[definition.key] = true;
      if (definition.nonInteractive) result.nonInteractive = true;
    }
  }
  return result;
}
```

Add concise `COMMAND_HELP` entries for all five commands and a `renderCommandHelp(command)` export. The binary handles `<command> --help` before importing a handler. `edit` accepts zero or one positional path; `init` and `versioning` reject additional arguments.

- [ ] **Step 4: Replace command-local parsers**

Make `parseFreezeArgs(args)` delegate to `parseCommandOptions('freeze', args)`. Add `parseAutoArgs(args)` with defaults `{ name: 'API Documentation', output: 'mintlify-docs' }`. Handlers catch parser errors, print the message on stderr, and set exit code 1.

- [ ] **Step 5: Run focused CLI tests and smoke help**

Run: `node --test test/cli-options.test.js test/freeze-command.test.js && node bin/mintlifier.js freeze --help && node bin/mintlifier.js auto --help`

Expected: tests pass and each help command lists only its supported options.

- [ ] **Step 6: Run the full suite and commit**

Run: `npm test`

```bash
git add bin/mintlifier.js lib/cli-options.js lib/commands/auto.js lib/commands/edit.js lib/commands/freeze.js lib/commands/versioning.js test/cli-options.test.js test/freeze-command.test.js
git commit -m "fix: validate CLI options and expose command help"
```

### Task 4: Preserve Navigation During Interactive Editing

**Files:**
- Create: `lib/navigation-editor.js`
- Create: `test/navigation-editor.test.js`
- Modify: `lib/config-editor.js`

- [ ] **Step 1: Write failing navigation-preservation tests**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { convertNavigationToVersions, navigationPageDefaults } from '../lib/navigation-editor.js';

test('simple-page defaults come from the existing navigation', () => {
  assert.deepEqual(navigationPageDefaults({ pages: ['intro', 'setup'] }), ['intro', 'setup']);
});

test('version conversion preserves grouped navigation', () => {
  const original = { groups: [{ group: 'Guides', pages: ['intro', 'setup'] }] };
  assert.deepEqual(convertNavigationToVersions(original, 'v1.0.0'), {
    versions: [{ version: 'v1.0.0', default: true, groups: original.groups }]
  });
  assert.deepEqual(original, { groups: [{ group: 'Guides', pages: ['intro', 'setup'] }] });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test test/navigation-editor.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement pure editor helpers**

```js
export function navigationPageDefaults(navigation = {}) {
  return Array.isArray(navigation.pages) ? [...navigation.pages] : [];
}

export function convertNavigationToVersions(navigation = {}, version) {
  const existing = structuredClone(navigation);
  if (Array.isArray(existing.versions)) return existing;
  const versionNode = { version, default: true };
  for (const key of ['pages', 'groups', 'tabs', 'dropdowns', 'anchors']) {
    if (existing[key]) versionNode[key] = existing[key];
  }
  return { versions: [versionNode], ...(existing.global ? { global: existing.global } : {}) };
}
```

- [ ] **Step 4: Integrate helpers before replacing navigation**

At the start of `editNavigation`, capture `const originalNavigation = structuredClone(config.navigation || {})`. Use it for defaults and conversion. Construct the new navigation only after all answers required for that operation have been collected. Selecting cancel or `skip` must leave `config.navigation` unchanged.

- [ ] **Step 5: Run focused and full tests**

Run: `node --test test/navigation-editor.test.js test/current-mintlify.test.js && npm test`

Expected: all tests pass and the old conversion regression fails if the original navigation snapshot is removed.

- [ ] **Step 6: Commit**

```bash
git add lib/navigation-editor.js lib/config-editor.js test/navigation-editor.test.js
git commit -m "fix: preserve navigation during config editing"
```

### Task 5: Converge Version Setup on One Engine

**Files:**
- Create: `lib/version-manager.js`
- Create: `test/version-manager.test.js`
- Modify: `index.js`
- Modify: `lib/commands/versioning.js`
- Modify: `lib/commands/freeze.js`
- Modify: `lib/scoped-freeze.js`
- Modify: `test/version-manager-scoped.test.js`

- [ ] **Step 1: Write failing metadata-setup tests**

```js
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import fs from 'fs-extra';
import { buildVersionSetupPlan, applyVersionSetupPlan } from '../lib/version-manager.js';

test('already-versioned navigation can initialize missing metadata', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-version-'));
  const config = {
    navigation: { versions: [
      { version: 'next', default: true, pages: ['docs/next/intro'] },
      { version: 'v1.0.0', pages: ['docs/v1.0.0/intro'] }
    ] }
  };
  await fs.writeJson(path.join(root, 'docs.json'), config);
  await fs.outputFile(path.join(root, 'docs/next/intro.mdx'), '# Intro\n');

  const plan = buildVersionSetupPlan({
    layout: {
      projectRoot: root,
      configPath: path.join(root, 'docs.json'),
      configDir: root,
      contentRoot: path.join(root, 'docs'),
      versionsPath: path.join(root, 'docs/versions.json')
    },
    docsConfig: config,
    workingVersion: 'next',
    currentVersion: 'v1.1.0'
  });
  await applyVersionSetupPlan(plan);

  const metadata = await fs.readJson(path.join(root, 'docs/versions.json'));
  assert.deepEqual(metadata.versions, ['v1.0.0']);
  assert.equal(metadata.workingVersion, 'next');
  assert.equal(await fs.pathExists(path.join(root, 'docs.json')), true);
  assert.equal(await fs.pathExists(path.join(root, 'docs/docs.json')), false);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test test/version-manager.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement pure setup planning**

`buildVersionSetupPlan()` must return `{ layout, updatedDocsConfig, updatedVersionsData, fileMoves }`. For already-versioned navigation, infer the working node from `workingVersion`, `default`, or `next/main/latest/current`; list all other versions as frozen. For unversioned navigation, wrap the existing structure in one working version and transform each local page path by inserting the working label after an optional `docs/` prefix.

```js
export function buildVersionSetupPlan({ layout, docsConfig, workingVersion, currentVersion }) {
  const config = structuredClone(docsConfig);
  const existingVersions = config.navigation?.versions;
  if (Array.isArray(existingVersions)) {
    const working = existingVersions.find((entry) => entry.version === workingVersion) ||
      existingVersions.find((entry) => entry.default);
    if (!working) throw new Error(`No working version found for ${workingVersion}`);
    const frozen = existingVersions.map((entry) => entry.version).filter((value) => value !== working.version);
    return {
      layout,
      updatedDocsConfig: config,
      updatedVersionsData: {
        versions: frozen,
        currentVersion,
        workingVersion: working.version,
        defaultVersion: frozen[0] || working.version
      },
      fileMoves: []
    };
  }
  const transformed = versionNavigation(config.navigation, workingVersion);
  config.navigation = { versions: [{ version: workingVersion, default: true, ...transformed.navigation }] };
  return {
    layout,
    updatedDocsConfig: config,
    updatedVersionsData: {
      versions: [], currentVersion, workingVersion, defaultVersion: workingVersion
    },
    fileMoves: transformed.fileMoves
  };
}
```

Define the navigation transformation in the same module using the Task 2 exports:

```js
import { planGeneratedPages, transformNavigationPages } from './page-planner.js';
import path from 'node:path';
import fs from 'fs-extra';

function addWorkingVersion(reference, workingVersion) {
  const clean = reference.replace(/^\/+/, '').replace(/\.mdx$/, '');
  const segments = clean.split('/');
  if (segments[0] === 'docs') segments.splice(1, 0, workingVersion);
  else segments.unshift(workingVersion);
  return segments.join('/');
}

function versionNavigation(navigation, workingVersion) {
  const updated = transformNavigationPages(
    navigation,
    (page) => addWorkingVersion(page, workingVersion)
  );
  const fileMoves = planGeneratedPages(navigation).map(({ reference, relativePath }) => ({
    source: relativePath,
    target: `${addWorkingVersion(reference, workingVersion)}.mdx`
  }));
  return { navigation: updated, fileMoves };
}
```

- [ ] **Step 4: Implement preflighted setup application**

Validate every move source exists and every destination is absent before creating directories. Move content, atomically write config and metadata, and roll moved files back if either write fails. Keep `docs.json` at `layout.configPath`; do not create a generated `scripts/freeze-version.js`.

```js
async function writeJsonAtomically(filePath, value) {
  const temporary = `${filePath}.mintlifier-${process.pid}-${Date.now()}`;
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeJson(temporary, value, { spaces: 2 });
  await fs.rename(temporary, filePath);
}

export async function applyVersionSetupPlan(plan) {
  for (const move of plan.fileMoves) {
    const source = path.join(plan.layout.configDir, move.source);
    const target = path.join(plan.layout.configDir, move.target);
    if (!await fs.pathExists(source)) throw new Error(`Source page not found: ${move.source}`);
    if (await fs.pathExists(target)) throw new Error(`Version target already exists: ${move.target}`);
  }

  const completed = [];
  const originalConfig = await fs.readJson(plan.layout.configPath);
  const versionsExisted = await fs.pathExists(plan.layout.versionsPath);
  const originalVersions = versionsExisted ? await fs.readJson(plan.layout.versionsPath) : null;
  try {
    for (const move of plan.fileMoves) {
      const source = path.join(plan.layout.configDir, move.source);
      const target = path.join(plan.layout.configDir, move.target);
      await fs.ensureDir(path.dirname(target));
      await fs.move(source, target);
      completed.push({ source, target });
    }
    await writeJsonAtomically(plan.layout.configPath, plan.updatedDocsConfig);
    await writeJsonAtomically(plan.layout.versionsPath, plan.updatedVersionsData);
  } catch (error) {
    for (const move of completed.reverse()) {
      if (await fs.pathExists(move.target)) await fs.move(move.target, move.source, { overwrite: true });
    }
    await writeJsonAtomically(plan.layout.configPath, originalConfig);
    if (versionsExisted) await writeJsonAtomically(plan.layout.versionsPath, originalVersions);
    else await fs.remove(plan.layout.versionsPath);
    throw error;
  }
}
```

- [ ] **Step 5: Route all setup entry points through the new engine**

`index.js` calls `setupVersioning({ cwd: process.cwd() })` after project generation. `lib/commands/versioning.js` resolves the layout once and calls the same function without `process.chdir()`. `lib/commands/freeze.js` resolves the layout and invokes `freezeVersion({ ...options, layout })`.

- [ ] **Step 6: Run focused and full tests**

Run: `node --test test/version-manager.test.js test/version-manager-scoped.test.js test/freeze-command.test.js && npm test`

Expected: metadata setup works for root and nested configs, the config never moves, and all tests pass.

- [ ] **Step 7: Commit**

```bash
git add lib/version-manager.js lib/scoped-freeze.js lib/commands/versioning.js lib/commands/freeze.js index.js test/version-manager.test.js test/version-manager-scoped.test.js test/freeze-command.test.js
git commit -m "refactor: unify Mintlifier version setup"
```

### Task 6: Make Flat and Scoped Freezes Atomic

**Files:**
- Modify: `lib/version-manager.js`
- Modify: `lib/scoped-freeze.js`
- Modify: `test/scoped-freeze.test.js`
- Modify: `test/version-manager.test.js`

- [ ] **Step 1: Write failing preflight and cleanup tests**

```js
async function scopedFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-scoped-atomic-'));
  const docsDir = path.join(root, 'docs');
  const docsJsonPath = path.join(root, 'docs.json');
  const versionsJsonPath = path.join(docsDir, 'versions.json');
  const docsConfig = productVersionedConfig();
  const versionsData = {
    versionSchema: 2,
    scopes: {
      'dropdown:cosmos-evm': {
        versions: ['v0.5.0'], currentVersion: 'v0.5.0',
        workingVersion: 'next', defaultVersion: 'next'
      }
    }
  };
  await fs.outputFile(path.join(docsDir, 'evm/next/intro.mdx'), '# Intro\n');
  await fs.outputFile(path.join(docsDir, 'evm/next/install.mdx'), '# Install\n');
  await fs.writeJson(docsJsonPath, docsConfig);
  await fs.writeJson(versionsJsonPath, versionsData);
  const plan = buildScopedFreezePlan({
    docsConfig, versionsData, scope: 'cosmos-evm',
    currentVersion: 'v0.6.0', nextVersion: 'next'
  });
  return { docsDir, docsJsonPath, versionsJsonPath, plan };
}

test('scoped freeze detects all missing sources before copying any page', async () => {
  const { docsDir, docsJsonPath, versionsJsonPath, plan } = await scopedFixture();
  await fs.remove(path.join(docsDir, plan.fileCopies[1].source));

  await assert.rejects(
    applyScopedFreezePlan({ docsDir, docsJsonPath, versionsJsonPath, plan }),
    new RegExp(`Source page not found.*${plan.fileCopies[1].source}`)
  );
  assert.equal(await fs.pathExists(path.join(docsDir, plan.fileCopies[0].target)), false);
  assert.deepEqual(await fs.readJson(docsJsonPath), productVersionedConfig());
});

test('freeze rejects an existing snapshot before changing metadata', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mintlifier-flat-atomic-'));
  const docsConfig = {
    navigation: { versions: [{ version: 'next', default: true, pages: ['docs/next/intro'] }] }
  };
  const originalVersions = {
    versions: [], currentVersion: 'v1.1.0', workingVersion: 'next', defaultVersion: 'next'
  };
  const versionsPath = path.join(root, 'docs/versions.json');
  await fs.writeJson(path.join(root, 'docs.json'), docsConfig);
  await fs.outputFile(path.join(root, 'docs/next/intro.mdx'), '# Intro\n');
  await fs.writeJson(versionsPath, originalVersions);
  await fs.outputFile(path.join(root, 'docs/v1.1.0/keep.mdx'), '# Existing\n');

  await assert.rejects(freezeVersion({ cwd: root, version: 'v1.1.0', nextVersion: 'next', yes: true }), /already exists/);
  assert.equal(await fs.readFile(path.join(root, 'docs/v1.1.0/keep.mdx'), 'utf8'), '# Existing\n');
  assert.deepEqual(await fs.readJson(versionsPath), originalVersions);
});
```

- [ ] **Step 2: Run focused tests and confirm partial-write regressions fail**

Run: `node --test test/scoped-freeze.test.js test/version-manager.test.js`

Expected: at least the missing-second-source test FAILS because the first target is currently copied.

- [ ] **Step 3: Add complete preflight**

Before staging, resolve every source and target and collect errors. Reject empty plans, missing sources, duplicate targets, existing targets, invalid labels, ambiguous scopes, and missing working-version navigation. No directory creation is allowed before preflight succeeds.

```js
export async function preflightFileCopies(baseDir, fileCopies) {
  if (fileCopies.length === 0) throw new Error('No documentation pages found to freeze');
  const targets = new Set();
  for (const copy of fileCopies) {
    const source = path.join(baseDir, copy.source);
    const target = path.join(baseDir, copy.target);
    if (!await fs.pathExists(source)) throw new Error(`Source page not found: ${copy.source}`);
    if (targets.has(target)) throw new Error(`Duplicate freeze target: ${copy.target}`);
    if (await fs.pathExists(target)) throw new Error(`Frozen target already exists: ${copy.target}`);
    targets.add(target);
  }
}
```

- [ ] **Step 4: Stage files and atomically replace JSON**

Create a unique staging directory beside the destination tree, copy and rewrite all files there, write metadata there, then rename staged version directories into place. Write JSON to sibling temporary files and rename them over the originals. On any error, remove staging and any promoted directories and restore JSON from in-memory originals.

```js
async function writeJsonAtomically(filePath, value) {
  const temporary = `${filePath}.mintlifier-${process.pid}-${Date.now()}`;
  await fs.writeJson(temporary, value, { spaces: 2 });
  await fs.rename(temporary, filePath);
}
```

Use the same `buildScopedFreezePlan()` and application path for root `navigation.versions` and nested/product scopes. `--dry-run` runs plan construction and preflight, prints the plan, and skips staging.

- [ ] **Step 5: Run focused tests, then manually mutate preflight**

Run: `node --test test/scoped-freeze.test.js test/version-manager.test.js`

Expected: all tests pass. Temporarily disable the missing-source check and confirm the regression test fails, then restore it.

- [ ] **Step 6: Run the full suite and commit**

Run: `npm test`

```bash
git add lib/version-manager.js lib/scoped-freeze.js test/scoped-freeze.test.js test/version-manager.test.js
git commit -m "fix: make documentation freezes atomic"
```

### Task 7: Remove Dead Implementations and Tighten Package Contents

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `scripts/refresh-schema.js`
- Delete: `.npmignore`
- Delete: `yarn.lock`
- Delete: `schema.json`
- Delete: `scripts/build-docs.js`
- Delete: `scripts/update-versions.js`
- Delete: `scripts/version-manager.js`
- Delete: `lib/versioning.js`
- Delete: `lib/enhanced-versioning.js`
- Delete: `lib/structure-adapter.js`
- Delete: `lib/mintlify-schema-analysis.md`
- Delete: `workflow-templates/docs-automation.yml`

- [ ] **Step 1: Confirm removed runtime paths have no importers**

Run:

```bash
rg -n "(lib/versioning|enhanced-versioning|structure-adapter|scripts/version-manager|scripts/update-versions|build-docs|docs-automation)" --glob '!docs/superpowers/**' .
```

Expected: only package metadata, documentation scheduled for replacement, and the files being removed remain. If active runtime imports remain, update them to `lib/version-manager.js` before deletion.

- [ ] **Step 2: Add a reproducible schema refresh script**

```js
#!/usr/bin/env node
import fs from 'fs-extra';
import { fileURLToPath } from 'node:url';
import { CURRENT_MINTLIFY_SCHEMA_URL } from '../lib/current-mintlify.js';

const response = await fetch(CURRENT_MINTLIFY_SCHEMA_URL);
if (!response.ok) {
  throw new Error(`Schema download failed: ${response.status} ${response.statusText}`);
}
const schema = await response.json();
await fs.writeJson(fileURLToPath(new URL('../docs-json-schema.json', import.meta.url)), schema, { spaces: 2 });
console.log(`Updated docs-json-schema.json from ${CURRENT_MINTLIFY_SCHEMA_URL}`);
```

- [ ] **Step 3: Tighten package metadata**

Set `packageManager` to `npm@11.18.0`; remove `build-docs` and unsupported migration keywords; add `schema:refresh`; and replace broad package entries with:

```json
"files": [
  "bin/",
  "index.js",
  "automate-config.js",
  "lib/**/*.js",
  "scripts/parse-external-changelog.js",
  "scripts/refresh-changelog.sh",
  "workflow-templates/",
  "docs/commands.md",
  "docs/versioning.md",
  "docs/schema-compatibility.md",
  "docs-json-schema.json",
  "docs-json-schema.d.ts",
  "LICENSE",
  "README.md"
]
```

- [ ] **Step 4: Remove confirmed dead and duplicate files**

Delete every file listed for deletion in this task. Keep `test/`, the design/plan documents, `RELEASING.md`, `.github/`, and `package-lock.json` in Git even though they are not published.

- [ ] **Step 5: Refresh schema and lock metadata**

Run: `node scripts/refresh-schema.js && npm install --package-lock-only --ignore-scripts`

Expected: `docs-json-schema.json` matches the current official schema and `package-lock.json` records the package metadata without dependency drift.

- [ ] **Step 6: Preview the package with an isolated npm cache**

Run: `npm pack --dry-run --json --cache /tmp/mintlifier-npm-cache`

Expected: no test files, design/plan files, release instructions, dead modules, Yarn lock, duplicate schema, or deprecated workflow appear. Runtime modules, three retained workflow templates, changelog helpers, schema/types, README, and license appear. Task 8 adds the public command, versioning, and schema documents already named in the package allowlist.

- [ ] **Step 7: Run the suite and commit**

Run: `npm test`

```bash
git add -A
git commit -m "chore: remove obsolete implementations and package files"
```

### Task 8: Rewrite Documentation Around Verified Workflows

**Files:**
- Modify: `README.md`
- Create: `docs/commands.md`
- Create: `docs/versioning.md`
- Rename and rewrite: `SCHEMA.md` to `docs/schema-compatibility.md`
- Create: `RELEASING.md`
- Modify: `workflow-templates/README.md`
- Modify: `workflow-templates/freeze-version.yml`
- Modify: `workflow-templates/external-repo-trigger.yml`
- Modify: `workflow-templates/sync-changelog.yml`

- [ ] **Step 1: Rewrite README as the user entry point**

Use this exact section order:

```markdown
# Mintlifier

Mintlifier creates, edits, and versions Mintlify `docs.json` projects.

## Requirements
## Install
## Create a project
### Interactive setup
### Non-interactive starter
## Preview and validate
## Edit an existing project
## Version documentation
## Regular workflow
## What Mintlifier changes
## Documentation
## Development
```

Include Node.js `>=20.17.0`, `npx mintlifier init`, `npx mintlifier auto --name "API Docs" --output docs-site`, `npx mint@latest dev`, `npx mint@latest validate`, `npx mint@latest broken-links`, `npx mintlifier edit [path]`, `npx mintlifier versioning`, scoped discovery, dry-run, freeze, and the review/commit loop. State that content migration from GitBook, Notion, Docusaurus, and VuePress is not implemented. Link to the three detailed docs and workflow templates. Move all npm publishing material out.

- [ ] **Step 2: Write the command reference from the tested parser contract**

For each command in `docs/commands.md`, document syntax, aliases, options, files read, files written, safe failure behavior, and one example. Do not document direct `index.js --edit`; the public entry point is `mintlifier edit`.

```markdown
# Command Reference

## `init`
## `auto`
## `edit`
## `versioning`
## `freeze`
## Global options
## Exit behavior
```

- [ ] **Step 3: Write the versioning operations guide**

Use this sequence in `docs/versioning.md`:

```markdown
# Versioning

## Before setup
## Set up versioning
## Find a product scope
## Preview a freeze
## Freeze a version
## Review and validate changes
## Commit the snapshot
## Metadata and generated files
## Failure and recovery behavior
## GitHub Actions
```

Explain flat and scoped metadata, immutable destinations, staging/preflight behavior, supported path-safe labels, and the exact review commands `git diff -- docs.json docs/versions.json docs`, `npx mint@latest validate`, and `npx mint@latest broken-links`.

- [ ] **Step 4: Consolidate schema documentation**

Move `SCHEMA.md` to `docs/schema-compatibility.md`. Retain only the authoritative schema URL, required generated fields, supported themes, normalization categories, obsolete fields removed during save, public schema/type artifact names, refresh command, and migration limitation. Link to upstream Mintlify documentation rather than repeating its entire field catalog.

- [ ] **Step 5: Move release operations into RELEASING.md**

Document the verified sequence:

```markdown
# Releasing Mintlifier

1. Update `package.json` and `package-lock.json` to the same version.
2. Run `npm test`.
3. Run `npm pack --dry-run --cache /tmp/mintlifier-npm-cache`.
4. Commit and push the release changes.
5. Publish a GitHub release whose tag is `v` followed by the package version.
6. Confirm the `Publish npm package` workflow succeeds.
7. Verify the registry with `npm view mintlifier version dist-tags`.
```

Explain trusted publishing, the optional `NPM_TOKEN` fallback, unscoped package permissions, and why a failed release requires a new version/tag after workflow changes.

- [ ] **Step 6: Rewrite workflow-template guidance and trim YAML prose**

The workflow README must contain:

- a three-template decision table;
- copy commands rooted at a cloned Mintlifier checkout;
- exact workflow inputs and repository variables;
- `DOCS_REPO_TOKEN` target-repository `Contents: write` permission;
- the target default-branch requirement for `repository_dispatch`;
- manual-run examples using `gh workflow run`;
- expected pull requests and summaries;
- security and troubleshooting notes.

Remove repeated Mintlify platform comparisons and promotional notes from YAML headers, PR bodies, and summaries. Preserve workflow inputs, triggers, permissions, and functional steps.

- [ ] **Step 7: Check prose, references, and command consistency**

Run:

```bash
rg -n "(Venus|layout|rounded|modeToggle|topbarLinks|build-docs|docs-automation|yarn|v2\.1\.1|until we confirm|comprehensive|powerful|seamless|exciting)" --glob '*.md' --glob '*.yml' .
rg -n "npx mintlifier|npx mint@latest|npm (ci|test|pack|view)" README.md docs RELEASING.md workflow-templates/README.md
```

Expected: the first command returns only deliberate obsolete-field references in `docs/schema-compatibility.md`; every command in the second output matches tested CLI or maintainer behavior.

- [ ] **Step 8: Run tests and commit**

Run: `npm test && git diff --check`

```bash
git add README.md SCHEMA.md docs/commands.md docs/versioning.md docs/schema-compatibility.md RELEASING.md workflow-templates/README.md workflow-templates/freeze-version.yml workflow-templates/external-repo-trigger.yml workflow-templates/sync-changelog.yml
git commit -m "docs: align user and maintainer workflows with the CLI"
```

### Task 9: Verify the Assembled Product and Review the Diff

**Files:**
- Modify only files required to address verification or review findings.

- [ ] **Step 1: Run static and test verification**

Run:

```bash
npm test
git diff --check origin/main...HEAD
node bin/mintlifier.js --version
node bin/mintlifier.js --help
node bin/mintlifier.js auto --help
node bin/mintlifier.js freeze --help
```

Expected: all tests pass; no whitespace errors; version prints `v2.1.2`; help exits 0 and lists the tested commands/options.

- [ ] **Step 2: Generate and inspect a representative starter**

Run:

```bash
VERIFY_DIR="$(mktemp -d /tmp/mintlifier-verification.XXXXXX)"
node bin/mintlifier.js auto --name "Verification Docs" --output "$VERIFY_DIR/site"
VERIFY_DIR="$VERIFY_DIR" node -e "const fs=require('fs'); const c=JSON.parse(fs.readFileSync(process.env.VERIFY_DIR + '/site/docs.json')); if(c.name!=='Verification Docs') process.exit(1)"
find "$VERIFY_DIR/site" -maxdepth 4 -type f | sort
if node bin/mintlifier.js auto --name "Verification Docs" --output "$VERIFY_DIR/site"; then exit 1; fi
(cd "$VERIFY_DIR/site" && npx mint@latest validate && npx mint@latest broken-links)
```

Expected: generation succeeds once, every local navigation page has a corresponding `.mdx` file, a second identical `auto` command exits nonzero without changing the directory, and current Mintlify validation and link checks pass.

- [ ] **Step 3: Exercise flat and scoped freeze integration tests**

Run: `node --test test/version-manager.test.js test/scoped-freeze.test.js test/version-manager-scoped.test.js`

Expected: setup, dry-run, flat freeze, scoped freeze, immutability, and preflight tests pass using temporary directories.

- [ ] **Step 4: Preview final npm contents**

Run: `npm pack --dry-run --json --cache /tmp/mintlifier-npm-cache`

Expected: the tarball contains only the explicit runtime, workflow, schema/type, license, README, and public documentation files from Task 7.

- [ ] **Step 5: Validate current external references**

Open every unique URL from `README.md`, `docs/*.md`, `RELEASING.md`, and `workflow-templates/README.md`. Confirm a successful response or replace the link with the current official location. Use only official Mintlify, npm, and GitHub documentation for operational claims.

- [ ] **Step 6: Request second-pass code review**

Use `superpowers:requesting-code-review` with the range `335a128..HEAD`. Ask the reviewer to focus on destructive filesystem behavior, config-location compatibility, freeze atomicity, package omissions, documentation accuracy, and unrelated changes.

- [ ] **Step 7: Fix review findings and rerun affected verification**

Add every actionable finding to the active plan. For each fix, reproduce the issue with a focused behavior test when practical, implement the smallest correction, rerun the focused test, then rerun `npm test`, `git diff --check origin/main...HEAD`, and `npm pack --dry-run --cache /tmp/mintlifier-npm-cache`.

- [ ] **Step 8: Commit review fixes if any**

```bash
git add -A
git commit -m "fix: address convergence review findings"
```

If review returns no issues and the worktree is clean, do not create an empty commit.
