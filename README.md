# Mintlifier

Mintlifier creates, edits, and versions Mintlify `docs.json` projects. It keeps navigation and generated files aligned, normalizes older configuration fields, and can freeze immutable documentation snapshots for releases.

## Requirements

- Node.js 20.17.0 or newer
- A directory for the documentation project

Mintlifier complements the [Mintlify CLI](https://www.mintlify.com/docs/cli/commands), which provides local preview and validation.

## Install

Run commands without installing the package globally:

```bash
npx mintlifier --help
```

Or install it:

```bash
npm install --global mintlifier
mintlifier --help
```

## Create a project

### Interactive setup

Run `init` from an empty project directory:

```bash
mkdir product-docs
cd product-docs
npx mintlifier init
```

The prompts cover branding, appearance, navigation, OpenAPI, footer links, analytics integrations, search, and contextual menu options. Mintlifier writes `docs.json`, creates referenced MDX pages under `docs/`, and adds placeholder asset or OpenAPI files when configured.

If `docs.json` already exists, `init` offers to open the editor before offering an overwrite.

### Non-interactive starter

`auto` creates a neutral API documentation starter:

```bash
npx mintlifier auto --name "API Docs" --output docs-site
```

The output directory must not exist. Mintlifier does not merge with or replace an existing directory.

## Preview and validate

Run Mintlify commands from the generated project:

```bash
cd docs-site
npx mint@latest dev
npx mint@latest validate
npx mint@latest broken-links
```

`dev` starts the local preview. Run `validate` and `broken-links` before opening or merging documentation changes.

## Edit an existing project

Pass the configuration path directly:

```bash
npx mintlifier edit docs.json
```

Without a path, Mintlifier checks common locations and asks which file to use when it finds more than one:

```bash
npx mintlifier edit
```

The editor loads older Mintlify fields into the current structure and writes only when you choose **Save & Exit**. Review the diff because normalization can rename or remove obsolete fields.

## Version documentation

Set up version metadata once:

```bash
npx mintlifier versioning
```

The command keeps `docs.json` in place, moves current pages beneath a working label such as `next`, and creates `versions.json` beside the documentation content. For an already-versioned project, it can create missing metadata without reorganizing the configuration.

Preview a release snapshot:

```bash
npx mintlifier freeze \
  --version v1.0.0 \
  --next-version next \
  --dry-run
```

Apply it:

```bash
npx mintlifier freeze \
  --version v1.0.0 \
  --next-version next \
  --automated
```

For product-scoped navigation, list the available scopes and pass one to `freeze`:

```bash
npx mintlifier versioning
npx mintlifier freeze \
  --scope api-reference \
  --version v2.3.0 \
  --next-version next \
  --dry-run
```

Frozen destinations are immutable. Mintlifier validates the full plan before writing, stages the snapshot, and updates navigation and metadata only after every page is ready.

## Regular workflow

1. Edit MDX content under the active version.
2. Preview with `npx mint@latest dev`.
3. Run `npx mint@latest validate` and `npx mint@latest broken-links`.
4. Use `freeze --dry-run` before a release.
5. Apply the freeze, review `docs.json`, `versions.json`, and the new snapshot, then commit them together.

This keeps released documentation stable while current work continues under a predictable label such as `next`.

## What Mintlifier changes

- `init` and `auto` create `docs.json`, referenced MDX pages, and selected placeholders.
- `edit` updates only the selected JSON configuration.
- `versioning` may move referenced MDX pages into a working-version directory and updates their navigation paths.
- `freeze` creates a new snapshot plus `.version-metadata.json`, then updates `docs.json` and `versions.json`.

Mintlifier does not migrate content from GitBook, Notion, Docusaurus, or VuePress, and it does not deploy the site. Use Mintlify's Git integration for deployment and previews.

## Documentation

- [Command reference](docs/commands.md)
- [Versioning workflow](docs/versioning.md)
- [Schema compatibility](docs/schema-compatibility.md)
- [Workflow templates](workflow-templates/README.md)

## Development

```bash
npm ci
npm test
```

Refresh the checked-in Mintlify schema snapshot with:

```bash
npm run schema:refresh
```

Maintainers should follow [RELEASING.md](RELEASING.md) before publishing a new version.
