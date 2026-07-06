# Mintlify Schema Notes

Mintlifier uses `lib/current-mintlify.js` for current schema constants, config normalization, automated config generation, and lightweight validation.

The authoritative schema is:

```text
https://mintlify.com/docs.json
```

The local `schema.json` and `docs-json-schema.json` files are generated snapshots of that schema. Do not hand-maintain separate field lists unless they are Mintlifier-specific metadata.

Legacy configs may still contain old fields such as `layout`, `rounded`, `modeToggle`, top-level `openapi`, `analytics`, `feedback`, `topbarLinks`, or `redirects[].from`. Use `normalizeDocsConfig()` to migrate those fields before saving.
