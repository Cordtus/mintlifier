# Mintlifier

Interactive CLI for creating and updating Mintlify `docs.json` projects with the current Mintlify schema.

## Features

- Interactive `docs.json` generator
- Non-interactive starter project generator
- Current Mintlify theme, appearance, API, navigation, contextual menu, and integrations fields
- Legacy config normalization for older `mint.json`/early `docs.json` fields
- Versioning helpers for flat `navigation.versions` projects and product-scoped nested versioning

## Installation

Mintlifier targets the current Mintlify CLI workflow, so use Node.js 20.17.0 or newer.

```bash
npx mintlifier <command>

# Or install globally
npm install -g mintlifier
```

## Commands

```bash
npx mintlifier init
npx mintlifier auto --name "API Docs" --output docs-site
npx mintlifier edit docs.json
npx mintlifier versioning
npx mintlifier freeze
```

`freeze` also accepts non-interactive flags:

```bash
npx mintlifier freeze --version v1.0.0 --next-version v1.1.0 --automated
```

For product-scoped or nested versioning, pass the scope shown by `npx mintlifier versioning`:

```bash
npx mintlifier freeze --scope api-reference --version v2.3.0 --next-version next --automated
npx mintlifier freeze --scope api-reference --version v2.3.0 --next-version next --dry-run
```

## Quick Start

```bash
mkdir my-docs
cd my-docs
npx mintlifier init
npx mint@latest dev
```

Before publishing changes, run the Mintlify checks that matter for your project:

```bash
npx mint@latest validate
npx mint@latest broken-links
```

## Generated Layout

Mintlifier creates a root `docs.json` and content files under `docs/`:

```text
project/
├── docs.json
├── docs/
│   ├── introduction.mdx
│   └── getting-started.mdx
├── assets/
└── snippets/
```

The generator keeps discovery flexible when editing existing projects, but new projects use this layout consistently.

## Current Schema Coverage

Mintlifier generates current Mintlify fields such as:

- `appearance.default` and `appearance.strict`
- `background.color`, `background.decoration`, and `background.image`
- `api.openapi`, `api.playground.display`, and `api.mdx`
- `integrations.*`
- `navbar.links` and `navbar.primary`
- `navigation.pages`, `groups`, `tabs`, `versions`, `dropdowns`, and nested structures
- `contextual.options`
- `search.prompt`
- `seo.metatags`
- `redirects[].source` and `redirects[].destination`

It intentionally no longer generates obsolete fields such as `layout`, `rounded`, `modeToggle`, top-level `openapi`, `analytics`, `feedback`, top-level `versions`, `topbarLinks`, or `topbarCtaButton`.

## Versioning

For a flat versioned Mintlify site, `navigation.versions` is supported:

```json
{
  "navigation": {
    "versions": [
      {
        "version": "next",
        "default": true,
        "pages": ["next/introduction"]
      },
      {
        "version": "v1.0.0",
        "pages": ["v1.0.0/introduction"]
      }
    ]
  }
}
```

The freezer accepts path-safe labels such as `next`, `main`, `v1.0.0`, `v0.53`, and `v8.5.x`.

Product-scoped or nested versioning, such as versions under `navigation.dropdowns[].versions`, is supported by selecting a scope. Mintlifier freezes only the selected scope's pages and navigation node, leaving unrelated products and shared navigation untouched. Scoped metadata is stored under `versions.json.scopes`.

## Migration Note

Mintlifier normalizes older Mintlify config fields when editing or saving, but it does not currently implement full GitBook, Notion, Docusaurus, or VuePress content migration commands.

## Development

```bash
npm ci
npm test
```

`npm test` runs deterministic Node tests for schema normalization and versioning detection.

## Releases

Publishing is handled by GitHub Releases. Create a release tag that matches `package.json`, such as `v2.1.1`; the `Publish npm package` workflow verifies the tag, runs tests, previews the package contents, and publishes to npm using npm trusted publishing.

Before the first automated publish, configure one npm authentication path:

- Preferred: add an npm trusted publisher for package `mintlifier` that points at `Cordtus/mintlifier` and `.github/workflows/publish-npm.yml`.
- Fallback: add a repository Actions secret named `NPM_TOKEN` with an npm automation token that has read/write access to the unscoped `mintlifier` package, or to all packages owned by the maintainer account. A token limited to scoped `@cordtus/*` packages cannot publish `mintlifier`.

If the workflow or package metadata changes after a failed release, bump `package.json` and create a new release. GitHub release workflows run from the workflow file committed at the release tag.

## References

- Mintlify docs: https://www.mintlify.com/docs
- Current schema: https://mintlify.com/docs.json
