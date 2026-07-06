# Mintlify Schema Reference

Mintlifier targets the current Mintlify `docs.json` schema.

Authoritative source:

```text
https://mintlify.com/docs.json
```

Local generated artifacts:

- `schema.json`
- `docs-json-schema.json`
- `docs-json-schema.d.ts`

## Required Fields

Current Mintlify configs require:

- `theme`
- `name`
- `colors.primary`
- `navigation`

`favicon` and `logo` are optional.

## Supported Themes

- `mint`
- `maple`
- `palm`
- `willow`
- `linden`
- `almond`
- `aspen`
- `sequoia`
- `luma`

## Important Current Fields

- `appearance.default`: `system`, `light`, or `dark`
- `appearance.strict`: hides the color-mode toggle when `true`
- `background.color`, `background.decoration`, `background.image`
- `icons.library`: `fontawesome`, `lucide`, or `tabler`
- `api.openapi`
- `api.asyncapi`
- `api.playground.display`: `interactive`, `simple`, `none`, or `auth`
- `api.mdx.server` and `api.mdx.auth`
- `integrations.*`
- `navbar.links` and `navbar.primary`
- `contextual.options`
- `redirects[].source` and `redirects[].destination`
- `seo.metatags`
- `search.prompt`

## Obsolete Fields

Do not generate new configs with these older fields:

- `layout`
- `rounded`
- `modeToggle`
- top-level `openapi`
- `api.baseUrl`
- `api.auth`
- `api.playground.mode`
- `analytics`
- `feedback`
- `footerSocials`
- top-level `tabs`
- top-level `versions`
- `topbarLinks`
- `topbarCtaButton`
- `font`
- `backgroundImage`
- `colors.background`
- `colors.anchors`
- `redirects[].from`
- `redirects[].to`

Mintlifier's normalization layer migrates many of these fields when editing older configs.
