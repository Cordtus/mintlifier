#!/usr/bin/env node

import { fileURLToPath } from 'node:url';
import path from 'node:path';

import fs from 'fs-extra';

import { buildAutomatedDocsConfig } from './lib/current-mintlify.js';
import {
  planGeneratedPages,
  prefixNavigationPages
} from './lib/page-planner.js';

function pageTitle(reference) {
  return path.basename(reference)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function writeStarterPage(filePath, reference) {
  const title = pageTitle(reference);
  await fs.outputFile(filePath, `---
title: ${title}
description: Add a short description.
---

# ${title}

Add your content here.
`);
}

async function writeStarterAssets(outputDir, config) {
  await fs.ensureDir(path.join(outputDir, 'images'));
  await fs.outputFile(
    path.join(outputDir, 'favicon.svg'),
    '<!-- Replace with your favicon SVG. -->'
  );
  await fs.outputFile(
    path.join(outputDir, 'logo-light.svg'),
    '<!-- Replace with your light logo SVG. -->'
  );
  await fs.outputFile(
    path.join(outputDir, 'logo-dark.svg'),
    '<!-- Replace with your dark logo SVG. -->'
  );

  const specs = Array.isArray(config.api?.openapi)
    ? config.api.openapi
    : [config.api?.openapi].filter(Boolean);
  for (const spec of specs) {
    if (spec.startsWith('http://') || spec.startsWith('https://')) continue;
    await fs.outputJson(path.join(outputDir, spec.replace(/^\/+/, '')), {
      openapi: '3.0.0',
      info: { title: `${config.name} API`, version: '1.0.0' },
      paths: {}
    }, { spaces: 2 });
  }

  await fs.outputFile(path.join(outputDir, 'changelog', 'release-notes.mdx'), `---
title: Release Notes
description: Product changes by release.
---

# Release Notes

Add release notes here.
`);
}

export async function generateAutomatedProject({
  outputDir,
  name = 'API Documentation'
}) {
  const resolvedOutput = path.resolve(outputDir);
  if (await fs.pathExists(resolvedOutput)) {
    throw new Error(`Output directory already exists: ${resolvedOutput}`);
  }

  const config = buildAutomatedDocsConfig({ name });
  config.navigation = prefixNavigationPages(config.navigation, 'docs');
  const pages = planGeneratedPages(config.navigation);

  await fs.ensureDir(resolvedOutput);
  await fs.writeJson(path.join(resolvedOutput, 'docs.json'), config, { spaces: 2 });
  for (const page of pages) {
    await writeStarterPage(path.join(resolvedOutput, page.relativePath), page.reference);
  }
  await writeStarterAssets(resolvedOutput, config);

  return { outputDir: resolvedOutput, pages };
}

async function main() {
  const outputDir = path.resolve(
    process.cwd(),
    process.env.MINTLIFY_OUTPUT_DIR || 'mintlify-docs'
  );
  const name = process.env.MINTLIFY_PROJECT_NAME || 'API Documentation';
  const result = await generateAutomatedProject({ outputDir, name });
  console.log(`Created ${name} documentation at ${result.outputDir}`);
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Error generating project: ${error.message}`);
    process.exitCode = 1;
  });
}
