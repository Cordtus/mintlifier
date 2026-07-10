# Releasing Mintlifier

Publishing runs from `.github/workflows/publish-npm.yml` when a GitHub release is published. The tag must match `package.json` with a leading `v`.

## Prepare

1. Update `version` in `package.json` and `package-lock.json` to the same value.
2. Summarize user-visible behavior and package-content changes in the GitHub release notes. Call out removed package subpaths when relevant.
3. Run:

```bash
npm ci
npm test
npm pack --dry-run --cache /tmp/mintlifier-npm-cache
git diff --check
```

Inspect the package preview. It should contain runtime JavaScript, supported workflow templates and changelog helpers, public documentation, schema artifacts, `README.md`, and `LICENSE`. It should not contain tests, planning documents, release instructions, lockfiles, or repository automation.

## Publish

Commit and push the release changes, then create a GitHub release whose tag matches the package version:

```bash
PACKAGE_VERSION="$(node -p "require('./package.json').version")"
gh release create "v$PACKAGE_VERSION" --generate-notes
```

The workflow:

1. checks out the release tag;
2. verifies that the tag and package version match;
3. runs `npm ci` and `npm test`;
4. previews the npm package;
5. publishes it.

## npm authentication

Trusted publishing is preferred. Configure the npm package `mintlifier` with:

- repository: `Cordtus/mintlifier`;
- workflow: `.github/workflows/publish-npm.yml`;
- package environment settings matching the GitHub workflow configuration.

The workflow also supports an Actions secret named `NPM_TOKEN` as a fallback. The token must have read/write access to the unscoped `mintlifier` package or all packages owned by the maintainer account. Permission limited to `@cordtus/*` does not cover this package.

Never store an npm token in the repository, npm configuration committed to Git, release notes, or workflow logs.

## Verify

Wait for the `Publish npm package` workflow, then check the registry:

```bash
npm view mintlifier version dist-tags
```

The reported version and `latest` tag must match the GitHub release.

GitHub release workflows use the workflow file committed at the release tag. If publishing fails because package metadata or workflow code needs a change, make the correction, increment the package version, and create a new tag and release. Updating `main` does not alter an existing release run.
