#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the extraction function from version-manager.js
async function testNavigationExtraction() {
  console.log(chalk.blue('\n================================='));
  console.log(chalk.blue(' Testing Navigation Extraction'));
  console.log(chalk.blue('=================================\n'));

  // Test various navigation structures
  const testCases = [
    {
      name: 'Simple pages array',
      nav: {
        pages: ['introduction', 'getting-started', 'api-reference']
      },
      expected: ['introduction.mdx', 'getting-started.mdx', 'api-reference.mdx']
    },
    {
      name: 'Groups with pages',
      nav: {
        groups: [
          {
            group: 'Getting Started',
            pages: ['introduction', 'installation', 'quickstart']
          },
          {
            group: 'API',
            pages: ['api/reference', 'api/authentication']
          }
        ]
      },
      expected: ['introduction.mdx', 'installation.mdx', 'quickstart.mdx', 'api/reference.mdx', 'api/authentication.mdx']
    },
    {
      name: 'Tabs with nested groups',
      nav: {
        tabs: [
          {
            tab: 'Documentation',
            groups: [
              {
                group: 'Guide',
                pages: ['guide/intro', 'guide/setup']
              }
            ]
          },
          {
            tab: 'API',
            pages: ['api-overview']
          }
        ]
      },
      expected: ['guide/intro.mdx', 'guide/setup.mdx', 'api-overview.mdx']
    },
    {
      name: 'Versions with navigation',
      nav: {
        versions: [
          {
            version: 'v2.0.0',
            groups: [
              {
                group: 'Docs',
                pages: ['v2/intro', 'v2/guide']
              }
            ]
          },
          {
            version: 'v1.0.0',
            pages: ['v1/legacy']
          }
        ]
      },
      expected: ['v2/intro.mdx', 'v2/guide.mdx', 'v1/legacy.mdx']
    },
    {
      name: 'Languages with pages',
      nav: {
        languages: [
          {
            language: 'en',
            pages: ['en/intro', 'en/guide']
          },
          {
            language: 'es',
            pages: ['es/intro', 'es/guia']
          }
        ]
      },
      expected: ['en/intro.mdx', 'en/guide.mdx', 'es/intro.mdx', 'es/guia.mdx']
    },
    {
      name: 'Complex nested structure',
      nav: {
        tabs: [
          {
            tab: 'Docs',
            versions: [
              {
                version: 'latest',
                groups: [
                  {
                    group: 'Getting Started',
                    pages: ['introduction', 'installation']
                  },
                  {
                    group: 'Advanced',
                    pages: ['advanced/config', 'advanced/api']
                  }
                ]
              }
            ]
          }
        ]
      },
      expected: ['introduction.mdx', 'installation.mdx', 'advanced/config.mdx', 'advanced/api.mdx']
    },
    {
      name: 'Anchors with pages',
      nav: {
        anchors: [
          {
            anchor: 'Overview',
            pages: ['overview/intro', 'overview/architecture']
          },
          {
            anchor: 'Guides',
            groups: [
              {
                group: 'Basic',
                pages: ['guides/basic/setup']
              }
            ]
          }
        ]
      },
      expected: ['overview/intro.mdx', 'overview/architecture.mdx', 'guides/basic/setup.mdx']
    },
    {
      name: 'Dropdowns with content',
      nav: {
        dropdowns: [
          {
            dropdown: 'Products',
            pages: ['products/api', 'products/sdk']
          },
          {
            dropdown: 'Resources',
            groups: [
              {
                group: 'Learn',
                pages: ['resources/tutorials', 'resources/videos']
              }
            ]
          }
        ]
      },
      expected: ['products/api.mdx', 'products/sdk.mdx', 'resources/tutorials.mdx', 'resources/videos.mdx']
    },
    {
      name: 'Mixed with external links (should be filtered)',
      nav: {
        pages: [
          'introduction',
          'https://example.com/external',
          'guide',
          '/snippets/code.js',
          'api-reference'
        ]
      },
      expected: ['introduction.mdx', 'guide.mdx', 'api-reference.mdx']
    }
  ];

  // Helper to extract page paths from navigation structure (copied from version-manager.js)
  function extractNavigationPaths(nav) {
    const paths = new Set();
    
    function isDocumentPath(str) {
      return typeof str === 'string' &&
             !str.startsWith('http') && 
             !str.startsWith('mailto:') &&
             !str.includes('/snippets/') && 
             !str.includes('/assets/') &&
             !str.includes('/images/') &&
             !str.includes('/static/') &&
             !str.startsWith('#');
    }
    
    function extractFromObj(obj) {
      if (!obj) return;
      
      if (typeof obj === 'string') {
        if (isDocumentPath(obj)) {
          const path = obj.endsWith('.mdx') ? obj : `${obj}.mdx`;
          paths.add(path.replace(/^\//, ''));
        }
      } else if (Array.isArray(obj)) {
        obj.forEach(extractFromObj);
      } else if (typeof obj === 'object') {
        // Top-level navigation structures
        if (obj.languages) extractFromObj(obj.languages);
        if (obj.versions) extractFromObj(obj.versions);
        if (obj.tabs) extractFromObj(obj.tabs);
        if (obj.dropdowns) extractFromObj(obj.dropdowns);
        if (obj.anchors) extractFromObj(obj.anchors);
        if (obj.groups) extractFromObj(obj.groups);
        if (obj.pages) extractFromObj(obj.pages);
        
        // Version structure
        if (obj.version && (obj.tabs || obj.groups || obj.pages || obj.anchors || obj.dropdowns)) {
          extractFromObj(obj.tabs);
          extractFromObj(obj.groups);
          extractFromObj(obj.pages);
          extractFromObj(obj.anchors);
          extractFromObj(obj.dropdowns);
        }
        
        // Language structure
        if (obj.language && (obj.tabs || obj.groups || obj.pages || obj.anchors || obj.dropdowns || obj.versions)) {
          extractFromObj(obj.tabs);
          extractFromObj(obj.groups);
          extractFromObj(obj.pages);
          extractFromObj(obj.anchors);
          extractFromObj(obj.dropdowns);
          extractFromObj(obj.versions);
        }
        
        // Tab structure
        if (obj.tab) {
          if (obj.languages) extractFromObj(obj.languages);
          if (obj.versions) extractFromObj(obj.versions);
          if (obj.dropdowns) extractFromObj(obj.dropdowns);
          if (obj.anchors) extractFromObj(obj.anchors);
          if (obj.groups) extractFromObj(obj.groups);
          if (obj.pages) extractFromObj(obj.pages);
        }
        
        // Dropdown structure
        if (obj.dropdown) {
          if (obj.languages) extractFromObj(obj.languages);
          if (obj.versions) extractFromObj(obj.versions);
          if (obj.anchors) extractFromObj(obj.anchors);
          if (obj.groups) extractFromObj(obj.groups);
          if (obj.pages) extractFromObj(obj.pages);
        }
        
        // Anchor structure
        if (obj.anchor) {
          if (obj.languages) extractFromObj(obj.languages);
          if (obj.versions) extractFromObj(obj.versions);
          if (obj.dropdowns) extractFromObj(obj.dropdowns);
          if (obj.groups) extractFromObj(obj.groups);
          if (obj.pages) extractFromObj(obj.pages);
        }
        
        // Group structure
        if (obj.group) {
          if (obj.pages) extractFromObj(obj.pages);
          if (obj.root) extractFromObj(obj.root);
        }
        
        // Menu structure
        if (obj.menu) extractFromObj(obj.menu);
        
        // Handle nested items arrays
        if (obj.items) extractFromObj(obj.items);
      }
    }
    
    extractFromObj(nav);
    return Array.from(paths).sort();
  }

  // Run tests
  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(chalk.yellow(`Testing: ${testCase.name}`));
    
    const extracted = extractNavigationPaths(testCase.nav);
    const expected = testCase.expected.sort();
    
    const isEqual = JSON.stringify(extracted) === JSON.stringify(expected);
    
    if (isEqual) {
      console.log(chalk.green('  ✓ PASSED'));
      passed++;
    } else {
      console.log(chalk.red('  ✗ FAILED'));
      console.log(chalk.gray('    Expected:'), expected);
      console.log(chalk.gray('    Got:'), extracted);
      failed++;
    }
  }

  console.log(chalk.blue('\n================================='));
  console.log(chalk.green(`Passed: ${passed}`));
  if (failed > 0) {
    console.log(chalk.red(`Failed: ${failed}`));
  }
  console.log(chalk.blue('=================================\n'));
  
  return failed === 0;
}

// Run tests
testNavigationExtraction().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error(chalk.red('Test error:'), error);
  process.exit(1);
});