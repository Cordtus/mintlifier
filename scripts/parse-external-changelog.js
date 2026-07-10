#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function parseExternalChangelog(content) {
  const lines = content.split('\n');
  const versions = [];
  let currentVersion = null;
  let currentDate = null;
  let currentCategory = null;
  let categories = {};

  // Define standard categories in the order they should appear
  const standardCategories = [
    'DEPENDENCIES',
    'BUG FIXES',
    'IMPROVEMENTS',
    'FEATURES',
    'STATE BREAKING',
    'API-BREAKING',
    'API BREAKING',
    'BREAKING CHANGES',
    'BREAKING',
    'DEPRECATED',
    'REMOVED',
    'SECURITY',
    'CHANGED',
    'ADDED',
    'FIXED'
  ];

  // Normalize category names
  const normalizeCategory = (cat) => {
    const normalized = cat.toUpperCase().replace(/[-_]/g, ' ').trim();
    
    // Map common variations
    if (normalized === 'ADDED' || normalized === 'NEW') return 'FEATURES';
    if (normalized === 'FIXED' || normalized === 'BUGFIXES') return 'BUG FIXES';
    if (normalized === 'CHANGED' || normalized === 'UPDATED') return 'IMPROVEMENTS';
    if (normalized.includes('BREAKING')) return 'BREAKING CHANGES';
    
    return normalized;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip the main CHANGELOG header
    if (trimmedLine.match(/^#\s+(CHANGELOG|Changelog|HISTORY|History)/i)) {
      continue;
    }

    // Skip UNRELEASED section before matching broad version headings.
    if (trimmedLine.match(/^##\s+(?:\[)?(?:UNRELEASED|Unreleased|Next)(?:\])?/i)) {
      // Save previous version before skipping
      if (currentVersion && Object.keys(categories).some(cat => categories[cat] && categories[cat].length > 0)) {
        versions.push({
          version: currentVersion,
          date: currentDate || new Date().toISOString().split('T')[0],
          categories: { ...categories }
        });
      }

      currentVersion = null;
      categories = {};
      currentCategory = null;
      continue;
    }

    // Match version headers - various formats
    // ## v0.4.1
    // ## [v0.4.1] - 2024-10-11
    // ## 0.4.1 (2024-10-11)
    // ## Version 0.4.1
    const versionMatch = trimmedLine.match(/^##\s+(?:\[)?(?:Version\s+)?([v]?[\d\.\-\w]+)(?:\])?(?:\s*[-–]\s*|\s*\(\s*)?([\d]{4}-[\d]{2}-[\d]{2})?/i);

    if (versionMatch) {
      // Save previous version if exists
      if (currentVersion && Object.keys(categories).some(cat => categories[cat] && categories[cat].length > 0)) {
        versions.push({
          version: currentVersion,
          date: currentDate || new Date().toISOString().split('T')[0],
          categories: { ...categories }
        });
      }

      // Start new version
      currentVersion = versionMatch[1];
      if (!currentVersion.startsWith('v')) {
        currentVersion = 'v' + currentVersion;
      }
      
      currentDate = versionMatch[2] || null;

      categories = {};
      currentCategory = null;
      continue;
    }

    // Match category headers (### FEATURES, ### Bug Fixes, etc.)
    if (currentVersion && trimmedLine.match(/^###\s+(.+)/)) {
      const categoryName = trimmedLine.replace(/^###\s+/, '').trim();
      const normalizedCategory = normalizeCategory(categoryName);
      
      // Only process if it's a recognized category
      if (standardCategories.some(cat => normalizeCategory(cat) === normalizedCategory)) {
        currentCategory = normalizedCategory;
        if (!categories[currentCategory]) {
          categories[currentCategory] = [];
        }
      } else {
        currentCategory = null;
      }
      continue;
    }

    // Collect items under categories
    if (currentVersion && currentCategory && trimmedLine && !trimmedLine.startsWith('#')) {
      // Skip separator lines and empty content
      if (trimmedLine !== '---' && trimmedLine !== '___' && trimmedLine !== '***') {
        // Handle various list formats
        let item = trimmedLine;
        
        // Remove common list prefixes
        item = item.replace(/^[-*+•]\s*/, '');
        
        // Parse entries with PR/issue links
        // Example: "Fix bug (#123)" or "Fix bug [#123](url)"
        const prMatch = item.match(/^(.+?)\s*[\[(]#(\d+)[\])].*$/);
        if (prMatch) {
          const [, description, prNumber] = prMatch;
          // Store with PR reference
          item = `${description.trim()} (#${prNumber})`;
        }

        if (item.trim()) {
          categories[currentCategory].push(item);
        }
      }
    }
  }

  // Save the last version if exists
  if (currentVersion && Object.keys(categories).some(cat => categories[cat] && categories[cat].length > 0)) {
    versions.push({
      version: currentVersion,
      date: currentDate || new Date().toISOString().split('T')[0],
      categories: { ...categories }
    });
  }

  return versions;
}

export function generateMintlifyMDX(versions, repo, source) {
  let mdx = `---
title: Release Notes
description: Changelog and version history
---

import Update from '/snippets/update.mdx'

`;

  if (repo && source) {
    mdx += `<Note>
  Release notes imported from [${repo}](https://github.com/${repo}) (${source})
</Note>

`;
  }

  // Category display names and icons
  const categoryConfig = {
    'FEATURES': { title: 'Features', icon: 'sparkles' },
    'BUG FIXES': { title: 'Bug Fixes', icon: 'bug' },
    'IMPROVEMENTS': { title: 'Improvements', icon: 'arrow-up' },
    'BREAKING CHANGES': { title: 'Breaking Changes', icon: 'exclamation-triangle' },
    'DEPENDENCIES': { title: 'Dependencies', icon: 'package' },
    'SECURITY': { title: 'Security', icon: 'shield' },
    'DEPRECATED': { title: 'Deprecated', icon: 'clock' },
    'REMOVED': { title: 'Removed', icon: 'trash' }
  };

  versions.forEach((version) => {
    const title = `Version ${version.version}`;
    const date = version.date;

    mdx += `<Update title="${title}" date="${date}">\n\n`;

    // Output categories in a consistent order
    const orderedCategories = [
      'BREAKING CHANGES',
      'FEATURES',
      'IMPROVEMENTS',
      'BUG FIXES',
      'SECURITY',
      'DEPENDENCIES',
      'DEPRECATED',
      'REMOVED'
    ];

    orderedCategories.forEach(category => {
      const items = version.categories[category];
      if (items && items.length > 0) {
        const config = categoryConfig[category] || { title: category, icon: 'circle' };
        mdx += `### ${config.title}\n\n`;
        items.forEach(item => {
          mdx += `- ${item}\n`;
        });
        mdx += '\n';
      }
    });

    // Handle any other categories not in the ordered list
    Object.keys(version.categories).forEach(category => {
      if (!orderedCategories.includes(category)) {
        const items = version.categories[category];
        if (items && items.length > 0) {
          mdx += `### ${category}\n\n`;
          items.forEach(item => {
            mdx += `- ${item}\n`;
          });
          mdx += '\n';
        }
      }
    });

    mdx += `</Update>\n\n`;
  });

  return mdx;
}

// Main execution
async function main(args = process.argv.slice(2)) {
  const [repo, source] = args;

  try {
    // Read the changelog
    const changelogPath = path.join(__dirname, '..', 'tmp', 'changelog.md');
    if (!await pathExists(changelogPath)) {
      console.error('Changelog file not found at tmp/changelog.md');
      process.exit(1);
    }

    const content = await fs.readFile(changelogPath, 'utf8');
    
    // Parse the changelog
    const versions = parseExternalChangelog(content);
    
    if (versions.length === 0) {
      console.warn('No versions found in changelog');
    } else {
      console.log(`Parsed ${versions.length} versions from changelog`);
    }

    // Generate MDX
    const mdx = generateMintlifyMDX(versions, repo, source);

    // Write the MDX file
    const outputPath = path.join(__dirname, '..', 'tmp', 'release-notes.mdx');
    await fs.writeFile(outputPath, mdx);
    
    console.log('Generated release notes MDX at tmp/release-notes.mdx');
  } catch (error) {
    console.error('Error parsing changelog:', error.message);
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
