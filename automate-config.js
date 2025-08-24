#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

// Configuration data
const config = {
  name: 'Enterprise API Platform',
  favicon: '/favicon.svg',
  theme: 'mint',
  layout: 'solidSidenav',
  rounded: 'sharp',
  colors: {
    primary: '#FF6B35',
    light: '#FF8C42',
    dark: '#C1440E',
    background: {
      light: '#FAFAFA',
      dark: '#1A1A1A'
    },
    anchors: {
      from: '#FF6B35',
      to: '#FF8C42'
    }
  },
  logo: {
    light: '/logo-light.svg',
    dark: '/logo-dark.svg',
    href: 'https://enterprise.example.com'
  },
  navigation: [
    {
      group: 'Getting Started',
      pages: ['overview', 'prerequisites', 'installation', 'first-api-call']
    },
    {
      group: 'Core Concepts',
      pages: ['authentication', 'rate-limiting', 'pagination', 'error-handling']
    },
    {
      group: 'API Reference',
      pages: ['endpoints/users', 'endpoints/organizations', 'endpoints/billing', 'endpoints/analytics']
    },
    {
      group: 'SDKs',
      pages: ['javascript-sdk', 'python-sdk', 'go-sdk', 'java-sdk']
    },
    {
      group: 'Advanced Topics',
      pages: ['webhooks', 'batch-operations', 'data-export', 'migrations']
    }
  ],
  tabs: [
    { name: 'Documentation', url: 'docs' },
    { name: 'API Explorer', url: 'api' },
    { name: 'Status', url: 'https://status.example.com' },
    { name: 'Changelog', url: 'changelog' }
  ],
  openapi: ['/openapi-v1.json', '/openapi-v2.json', '/openapi-internal.json'],
  api: {
    baseUrl: 'https://api.enterprise.example.com',
    auth: { method: 'bearer' },
    playground: { mode: 'show' }
  },
  footer: {
    socials: {
      github: 'https://github.com/enterprise',
      discord: 'https://discord.gg/enterprise',
      linkedin: 'https://linkedin.com/company/enterprise',
      youtube: 'https://youtube.com/enterprise',
      website: 'https://enterprise.example.com'
    }
  },
  analytics: {
    posthog: {
      apiKey: 'phc_test123456789'
    }
  },
  feedback: {
    thumbsRating: true,
    suggestEdit: true,
    raiseIssue: true
  },
  search: {
    prompt: 'Search Enterprise API docs...',
    location: 'side'
  },
  modeToggle: {
    default: 'dark',
    isHidden: false
  },
  versions: ['v3.0.0', 'v2.5.0', 'v2.0.0']
};

// Generate the docs.json directly
async function generateConfig() {
  console.log(' Generating Enterprise API Platform configuration...\n');

  try {
    // Create output directory
    const outputDir = path.join(process.cwd(), 'mintlify-docs');
    await fs.ensureDir(outputDir);

    // Write docs.json
    await fs.writeJson(path.join(outputDir, 'docs.json'), config, { spaces: 2 });
    console.log(' Created docs.json');

    // Create directory structure based on navigation
    for (const group of config.navigation) {
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
    for (const spec of config.openapi) {
      const specPath = path.join(outputDir, spec.replace(/^\//, ''));
      await fs.ensureDir(path.dirname(specPath));
      await fs.writeJson(specPath, {
        openapi: '3.0.0',
        info: {
          title: 'Enterprise API',
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

    console.log(`\n Enterprise API Platform documentation project created!`);
    console.log(` Location: ${outputDir}`);
    
    return outputDir;

  } catch (error) {
    console.error(' Error generating project:', error.message);
    process.exit(1);
  }
}

generateConfig().then(outputDir => {
  console.log('\n Next steps:');
  console.log('  1. cd mintlify-docs');
  console.log('  2. Run version manager script');
  console.log('  3. Install Mintlify CLI: npm i -g mintlify');
  console.log('  4. Run locally: mintlify dev');
});