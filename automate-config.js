#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { buildAutomatedDocsConfig } from './lib/current-mintlify.js';

// Configuration data
const config = buildAutomatedDocsConfig({
  name: process.env.MINTLIFY_PROJECT_NAME || 'API Documentation'
});

// Generate the docs.json directly
async function generateConfig() {
  console.log(` Generating ${config.name} configuration...\n`);

  try {
    // Create output directory
    const outputDir = path.join(process.cwd(), process.env.MINTLIFY_OUTPUT_DIR || 'mintlify-docs');
    await fs.ensureDir(outputDir);

    // Write docs.json
    await fs.writeJson(path.join(outputDir, 'docs.json'), config, { spaces: 2 });
    console.log(' Created docs.json');

    // Create directory structure based on navigation
    for (const group of config.navigation.groups) {
      const groupSlug = group.group.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');

      for (const page of group.pages) {
        const pagePath = page.includes('/')
          ? path.join(outputDir, `${page}.mdx`)
          : path.join(outputDir, groupSlug, `${page}.mdx`);

        const dir = path.dirname(pagePath);
        await fs.ensureDir(dir);

        const pageTitle = path.basename(page).replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const content = `---
title: ${pageTitle}
description: 'Add your description here'
---

# ${pageTitle}

Add your content here.
`;
        await fs.writeFile(pagePath, content);
      }
    }

    // Create assets directory and placeholder files
    await fs.ensureDir(path.join(outputDir, 'images'));
    
    // Create favicon placeholder
    await fs.writeFile(path.join(outputDir, 'favicon.svg'), '<!-- Add your favicon SVG here -->');
    
    // Create logo placeholders
    await fs.writeFile(path.join(outputDir, 'logo-light.svg'), '<!-- Add your light logo SVG here -->');
    await fs.writeFile(path.join(outputDir, 'logo-dark.svg'), '<!-- Add your dark logo SVG here -->');

    // Create OpenAPI spec placeholders
    for (const spec of config.api.openapi) {
      const specPath = path.join(outputDir, spec.replace(/^\//, ''));
      await fs.ensureDir(path.dirname(specPath));
      await fs.writeJson(specPath, {
        openapi: '3.0.0',
        info: {
          title: `${config.name} API`,
          version: '1.0.0'
        },
        paths: {}
      }, { spaces: 2 });
    }

    // Create changelog directory
    const changelogDir = path.join(outputDir, 'changelog');
    await fs.ensureDir(changelogDir);
    await fs.writeFile(path.join(changelogDir, 'release-notes.mdx'), `---
title: Release Notes
description: Complete changelog and release notes
---

# Release Notes

## v3.0.0 - Latest

### Features
- New authentication system
- Enhanced API endpoints
- Improved performance

## v2.5.0

### Improvements
- Better error handling
- Updated documentation

## v2.0.0

### Breaking Changes
- API restructure
- New authentication flow
`);

    console.log(' Created directory structure');
    console.log(' Created placeholder assets');
    console.log(' Created OpenAPI spec files');
    console.log(' Created changelog');

    console.log(`\n ${config.name} documentation project created!`);
    console.log(` Location: ${outputDir}`);
    
    return outputDir;

  } catch (error) {
    console.error(' Error generating project:', error.message);
    process.exit(1);
  }
}

generateConfig().then(outputDir => {
  console.log('\n Next steps:');
  console.log(`  1. cd ${path.relative(process.cwd(), outputDir) || '.'}`);
  console.log('  2. Review and customize docs.json');
  console.log('  3. Run locally: npx mint@latest dev');
  console.log('  4. Validate: npx mint@latest validate');
});
