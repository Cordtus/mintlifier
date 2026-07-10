# Schema Compatibility

Mintlifier targets Mintlify's current [`docs.json` schema](https://mintlify.com/docs.json). The upstream schema is authoritative; this document covers Mintlifier's behavior at that boundary.

## Generated configuration

Mintlifier always writes the required fields:

- `name`
- `theme`
- `colors.primary`
- `navigation`

The interactive generator can also write:

- favicon and single or light/dark logos;
- light and dark colors, background color, and background decoration;
- appearance mode, icon library, and code-block style;
- simple, grouped, tabbed, or versioned navigation;
- OpenAPI references, MDX API server and authentication, and playground display;
- footer social links and supported analytics integrations;
- contextual menu options, telemetry preference, and search prompt.

Supported themes are `mint`, `maple`, `palm`, `willow`, `linden`, `almond`, `aspen`, `sequoia`, and `luma`. Supported icon libraries are `fontawesome`, `lucide`, and `tabler`.

Mintlifier performs lightweight checks for required fields, theme, icon library, and color syntax. Use `npx mint@latest validate` for authoritative project validation.

## Normalizing older configurations

The editor normalizes older Mintlify shapes before saving. Current conversions include:

- array navigation to `navigation.groups`;
- top-level tabs to `navigation.global.tabs`;
- top-level `openapi` and older API settings to `api.*`;
- `analytics` providers to `integrations.*`;
- `modeToggle` to `appearance`;
- older background colors and images to `background`;
- top-bar links and calls to action to `navbar`;
- `font` to `fonts`;
- metadata to `seo.metatags`;
- redirect `from` and `to` keys to `source` and `destination`;
- hidden feedback settings to telemetry integration settings.

After conversion, Mintlifier removes obsolete top-level fields such as `layout`, `rounded`, `modeToggle`, `openapi`, `analytics`, `feedback`, `versions`, `tabs`, `topbarLinks`, `topbarCtaButton`, `font`, and `backgroundImage`.

Normalization is not a full content migration. Mintlifier does not import or convert pages from GitBook, Notion, Docusaurus, VuePress, or other documentation systems.

## Version metadata

`versions.json` is Mintlifier metadata, not part of Mintlify's `docs.json` schema. Flat projects retain top-level `versions`, `currentVersion`, `workingVersion`, and `defaultVersion` keys. Scoped projects also store per-scope state under `scopes` and set `versionSchema` to `2`.

## Checked-in schema artifacts

The npm package includes:

- `docs-json-schema.json`: a formatted snapshot of the upstream schema;
- `docs-json-schema.d.ts`: TypeScript interfaces for supported `docs.json` structures.

Refresh the JSON snapshot from the authoritative URL:

```bash
npm run schema:refresh
git diff -- docs-json-schema.json docs-json-schema.d.ts
```

Review upstream changes against `lib/current-mintlify.js`, the TypeScript definitions, generators, editor, and tests before committing the refreshed artifact. Do not edit the schema snapshot by hand.

## Upstream references

- [Mintlify global settings](https://www.mintlify.com/docs/organize/settings)
- [Mintlify navigation](https://www.mintlify.com/docs/organize/navigation)
- [Mintlify CLI commands](https://www.mintlify.com/docs/cli/commands)
