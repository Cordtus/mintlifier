# Command Reference

Run commands as `npx mintlifier <command>`. A global installation may use `mintlifier` instead.

## `init`

```bash
npx mintlifier init
```

Aliases: `initialize`, `new`.

Creates a project interactively in the current directory. The prompts configure:

- name, theme, colors, appearance, favicon, and logos;
- simple, grouped, tabbed, or versioned navigation;
- OpenAPI files, MDX API settings, authentication, and playground display;
- icon library, code-block style, contextual menu, footer links, analytics, telemetry, and search.

Output:

- root `docs.json`;
- MDX pages at the paths stored in navigation, normally under `docs/`;
- `assets/` and `snippets/` directories;
- selected logo, favicon, and OpenAPI placeholders.

When root `docs.json` or `docs/docs.json` exists, `init` offers to edit it. Creating a new configuration requires a separate overwrite confirmation.

`init` accepts no options. Use `npx mintlifier init --help` for command help.

## `auto`

```bash
npx mintlifier auto [options]
```

Aliases: `automatic`, `generate`.

Creates a non-interactive API documentation starter in a new directory.

| Option | Short form | Description |
| --- | --- | --- |
| `--name <name>` | `-n` | Site name. Default: `API Documentation`. |
| `--output <path>` | `-o` | Output directory. Default: `mintlify-docs`. |

Example:

```bash
npx mintlifier auto --name "Payments API" --output payments-docs
```

The command creates `docs.json`, referenced MDX pages, local logo and favicon placeholders, OpenAPI placeholders, and a starter changelog. It fails without changing anything when the output path already exists.

## `edit`

```bash
npx mintlifier edit [docs.json]
```

Aliases: `modify`, `update`.

Without a path, the command checks:

1. `docs.json`
2. `docs/docs.json`
3. `documentation/docs.json`
4. `mintlify/docs.json`

It selects the only match automatically or asks when several exist. The editor normalizes older configuration fields in memory, but does not write until **Save & Exit** is selected. **Cancel** discards the session.

Only one configuration path is accepted. Other positional arguments and flags are errors.

## `versioning`

```bash
npx mintlifier versioning
```

Aliases: `version`, `versions`.

For an unversioned project, the command:

- asks for a working label and current development version;
- moves referenced pages beneath the working label;
- wraps existing navigation in `navigation.versions`;
- creates `versions.json` beside the content;
- leaves `docs.json` in its original location.

For a versioned project with missing metadata, it creates compatible metadata from the navigation. Otherwise it reports current version nodes and available scope aliases.

The command accepts no options.

## `freeze`

```bash
npx mintlifier freeze [options]
```

Aliases: `release`, `version-freeze`.

| Option | Short form | Description |
| --- | --- | --- |
| `--version <label>` | `-v` | Version to freeze. |
| `--next-version <label>` | `--next` | Development label after the freeze. |
| `--scope <scope>` | `-s` | Versioned product or navigation scope. |
| `--dry-run` | | Validate and print the plan without writing. |
| `--yes` | `-y` | Skip confirmation and run non-interactively. |
| `--automated` | | Alias for non-interactive confirmation. |
| `--non-interactive` | | Alias for non-interactive confirmation. |

Non-interactive runs require both `--version` and `--next-version`. Interactive runs prompt for missing labels and confirmation.

Examples:

```bash
npx mintlifier freeze --version v1.4.0 --next-version next --dry-run
npx mintlifier freeze --version v1.4.0 --next-version next --automated
npx mintlifier freeze --scope api --version v2.0.0 --next-version next --dry-run
```

Before writing, `freeze` verifies every source page, destination, version label, and scope. It then stages files, rewrites root-relative Markdown links, writes `.version-metadata.json`, and updates `docs.json` and `versions.json`. Existing snapshot paths are not overwritten.

## Global options

```bash
npx mintlifier --help
npx mintlifier --version
```

`--help` and `-h` show global help. `<command> --help` shows command-specific help. `--version` and `-v` print the installed Mintlifier version when used as the first argument.

## Exit behavior

Successful commands exit with status 0. Invalid commands, unsupported options, missing values, missing files, conflicts, and failed validation exit nonzero and print the affected command, path, version, or scope. Interactive cancellation does not save pending editor changes.
