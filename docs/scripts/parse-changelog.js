#!/usr/bin/env node

const fs = require('fs');

function parseFullChangelog(content) {
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
    'DEPRECATED',
    'REMOVED',
    'SECURITY'
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip the main CHANGELOG header
    if (trimmedLine === '# CHANGELOG' || trimmedLine === '# Changelog') {
      continue;
    }

    // Match version headers like "## v0.4.1" or "## [v0.4.1] - 2024-10-11"
    const versionMatch = trimmedLine.match(/^##\s+\[?([v]?[\d\.\-\w]+)\]?\s*(?:-\s*(.+))?$/);

    if (versionMatch) {
      // Save previous version if exists
      if (currentVersion && Object.keys(categories).some(cat => categories[cat].length > 0)) {
        versions.push({
          version: currentVersion,
          date: currentDate || new Date().toISOString().split('T')[0],
          categories: { ...categories }
        });
      }

      // Start new version
      currentVersion = versionMatch[1];
      currentDate = versionMatch[2] || null;

      // Try to extract date if it's in format "2024-10-11" or similar
      if (currentDate) {
        const dateMatch = currentDate.match(/(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          currentDate = dateMatch[1];
        }
      }

      categories = {};
      currentCategory = null;
      continue;
    }

    // Skip UNRELEASED section
    if (trimmedLine === '## UNRELEASED' || trimmedLine === '## Unreleased') {
      // Save previous version before skipping
      if (currentVersion && Object.keys(categories).some(cat => categories[cat].length > 0)) {
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

    // Match category headers (### FEATURES, ### BUG FIXES, etc.)
    if (currentVersion && trimmedLine.startsWith('### ')) {
      const categoryName = trimmedLine.replace('### ', '').trim();

      // Only process standard categories
      if (standardCategories.some(cat => 
        cat === categoryName.toUpperCase() || 
        cat.replace(/[-_]/g, ' ') === categoryName.toUpperCase().replace(/[-_]/g, ' ')
      )) {
        currentCategory = categoryName;
        if (!categories[currentCategory]) {
          categories[currentCategory] = [];
        }
      } else {
        currentCategory = null; // Ignore non-standard categories
      }
      continue;
    }

    // Collect items under categories
    if (currentVersion && currentCategory && trimmedLine && !trimmedLine.startsWith('#')) {
      // Skip separator lines and empty content
      if (trimmedLine !== '---' && trimmedLine !== '___' && trimmedLine !== '***') {
        // Parse entries with PR links
        if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
          let item = trimmedLine.substring(2);
          
          // Extract PR links
          const prMatch = item.match(/\(\[#(\d+)\]\([^)]+\)\)/);
          if (prMatch) {
            const prNumber = prMatch[1];
            item = item.replace(prMatch[0], `(#${prNumber})`);
          }
          
          categories[currentCategory].push(item);
        }
      }
    }
  }

  // Save the last version if exists
  if (currentVersion && Object.keys(categories).some(cat => categories[cat].length > 0)) {
    versions.push({
      version: currentVersion,
      date: currentDate || new Date().toISOString().split('T')[0],
      categories: { ...categories }
    });
  }

  return versions;
}

function generateMDX(versions) {
  let mdx = `---
title: Release Notes
description: Complete changelog and release notes
---

import { Update } from '/snippets/update.mdx';

# Release Notes

`;

  for (const release of versions) {
    mdx += `<Update version="${release.version}" date="${release.date}">\n`;

    // Add categories in a consistent order
    const categoryOrder = ['FEATURES', 'IMPROVEMENTS', 'BUG FIXES', 'DEPENDENCIES', 'BREAKING CHANGES', 'API-BREAKING', 'API BREAKING', 'STATE BREAKING', 'DEPRECATED', 'REMOVED', 'SECURITY'];
    
    for (const categoryName of categoryOrder) {
      const items = release.categories[categoryName] || release.categories[categoryName.replace(' ', '-')];
      if (items && items.length > 0) {
        mdx += `  <Update.Category name="${categoryName}">\n`;
        for (const item of items) {
          mdx += `    - ${item}\n`;
        }
        mdx += `  </Update.Category>\n`;
      }
    }

    mdx += `</Update>\n\n`;
  }

  return mdx;
}

// Read the changelog
const changelogPath = 'tmp/changelog.md';
const outputPath = 'tmp/release-notes.mdx';

try {
  const content = fs.readFileSync(changelogPath, 'utf8');
  const versions = parseFullChangelog(content);
  
  console.log(`Parsed ${versions.length} versions`);
  
  const mdx = generateMDX(versions);
  fs.writeFileSync(outputPath, mdx);
  
  console.log(`Generated MDX file at ${outputPath}`);
} catch (error) {
  console.error('Error processing changelog:', error.message);
  process.exit(1);
}
