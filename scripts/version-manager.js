#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { input, confirm, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { glob } from 'glob';
import {
  findVersionScopes,
  hasVersioning,
  isSupportedVersionLabel,
  isTopLevelVersionedNavigation,
  resolveVersionScope
} from '../lib/navigation-utils.js';
import {
  applyScopedFreezePlan,
  buildScopedFreezePlan
} from '../lib/scoped-freeze.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper functions
function parseVersion(v) {
  const match = v.match(/v?(\d+)\.(\d+)\.(\d+)(.*)/);
  if (!match) return [0, 0, 0, ''];
  return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), match[4]];
}

function versionCompare(a, b) {
  const [aMajor, aMinor, aPatch, aPre] = parseVersion(a);
  const [bMajor, bMinor, bPatch, bPre] = parseVersion(b);
  
  if (bMajor !== aMajor) return bMajor - aMajor;
  if (bMinor !== aMinor) return bMinor - aMinor;
  if (bPatch !== aPatch) return bPatch - aPatch;
  
  if (!aPre && bPre) return -1;
  if (aPre && !bPre) return 1;
  return bPre.localeCompare(aPre);
}

function normalizeVersionInput(value) {
  if (!isSupportedVersionLabel(value)) {
    throw new Error(`Invalid version label: ${value}`);
  }
  return /^\d+\.\d+/.test(value) ? `v${value}` : value;
}

async function chooseVersionScope(scopes, requestedScope, nonInteractive) {
  if (requestedScope || scopes.length === 1) {
    return resolveVersionScope(scopes, requestedScope);
  }

  if (nonInteractive) {
    return resolveVersionScope(scopes, requestedScope);
  }

  const scopeId = await select({
    message: 'Which versioned documentation scope should be frozen?',
    choices: scopes.map((scope) => ({
      name: `${scope.label} (${scope.id})`,
      value: scope.id
    }))
  });

  return resolveVersionScope(scopes, scopeId);
}

function scopeVersionData(versionsData, scopeId) {
  return versionsData?.scopes?.[scopeId] || {
    versions: versionsData?.versions || [],
    currentVersion: versionsData?.currentVersion || null,
    workingVersion: versionsData?.workingVersion || 'next',
    defaultVersion: versionsData?.defaultVersion || null
  };
}

async function freezeScopedVersion({
  docsConfig,
  docsJsonPath,
  docsDir,
  versionsJsonPath,
  versionsData,
  options
}) {
  const scopes = findVersionScopes(docsConfig.navigation);
  const scope = await chooseVersionScope(scopes, options.scope, options.nonInteractive);
  const scopeData = scopeVersionData(versionsData, scope.id);

  let currentVersion = options.version || options.currentVersion || scopeData.currentVersion;
  if (!currentVersion) {
    if (options.nonInteractive) {
      throw new Error('Missing --version for non-interactive freeze');
    }
    currentVersion = await input({
      message: `Enter the version to freeze for ${scope.label} (e.g., v1.0.0, v0.53, v8.5.x):`,
      validate: (value) => {
        if (!isSupportedVersionLabel(value)) {
          return 'Use a path-safe version label such as v1.0.0, v0.53, v8.5.x, next, or main';
        }
        return true;
      }
    });
  }
  currentVersion = normalizeVersionInput(currentVersion);

  let newVersion = options.nextVersion || options.newVersion;
  if (!newVersion) {
    if (options.nonInteractive) {
      throw new Error('Missing --next-version for non-interactive freeze');
    }
    newVersion = await input({
      message: `Enter the new development version for ${scope.label} (e.g., next, v1.1.0, v0.54):`,
      default: scopeData.workingVersion || 'next',
      validate: (value) => {
        if (!isSupportedVersionLabel(value)) {
          return 'Use a path-safe version label such as v1.1.0, v0.54, next, or main';
        }
        return true;
      }
    });
  }
  newVersion = normalizeVersionInput(newVersion);

  const plan = buildScopedFreezePlan({
    docsConfig,
    versionsData,
    scope: scope.id,
    currentVersion,
    nextVersion: newVersion
  });

  console.log(chalk.cyan('\n===================================='));
  console.log(chalk.cyan('   Scoped Version Freeze Summary'));
  console.log(chalk.cyan('====================================\n'));
  console.log(`  Scope:           ${chalk.yellow(plan.scope.label)} (${plan.scope.id})`);
  console.log(`  Freeze version:  ${chalk.yellow(plan.currentVersion)} (creates snapshot)`);
  console.log(`  New dev version: ${chalk.green(plan.nextVersion)} (for future development)`);
  console.log(`  Working version: ${chalk.blue(plan.workingVersion)}`);
  console.log(`  Files to copy:   ${plan.fileCopies.length}\n`);

  if (options.dryRun) {
    console.log(chalk.yellow('Dry run only. No files were changed.'));
    plan.fileCopies.forEach((copy) => {
      console.log(chalk.gray(`  ${copy.source} -> ${copy.target}`));
    });
    return;
  }

  const proceed = options.yes || options.nonInteractive
    ? true
    : await confirm({
        message: 'Proceed with scoped version freeze?',
        default: true
      });

  if (!proceed) {
    console.log(chalk.yellow('Operation cancelled'));
    return;
  }

  const result = await applyScopedFreezePlan({
    docsDir,
    docsJsonPath,
    versionsJsonPath,
    plan
  });

  console.log(chalk.green(`✓ Copied ${result.copiedFiles} scoped documentation files`));
  console.log(chalk.green('✓ Updated docs.json navigation'));
  console.log(chalk.green('✓ Updated versions.json'));
  console.log(chalk.green(`✓ Created ${result.metadataPath}`));

  console.log(chalk.green('\n✅ Scoped version freeze completed successfully!\n'));
}

// Main function to freeze version
export async function freezeVersion(options = {}) {
  console.log(chalk.blue('\n===================================='));
  console.log(chalk.blue('   Documentation Version Manager'));
  console.log(chalk.blue('====================================\n'));

  // Look for docs.json in project root first, then in docs directory
  const projectRoot = process.cwd();
  let docsJsonPath = null;
  
  if (await fs.pathExists('docs.json')) {
    docsJsonPath = 'docs.json';
  } else if (await fs.pathExists('docs/docs.json')) {
    docsJsonPath = 'docs/docs.json';
  }
  
  if (!docsJsonPath) {
    console.log(chalk.red('✗ docs.json not found'));
    console.log(chalk.yellow('Please run from your project root'));
    process.exit(1);
  }

  // Always use /docs as the documentation directory
  const docsDir = path.join(projectRoot, 'docs');
  await fs.ensureDir(docsDir);
  
  // Load docs.json
  const docsConfig = await fs.readJson(docsJsonPath);
  
  // Check if versioning is already set up
  const versioningExists = hasVersioning(docsConfig.navigation);
  
  if (!versioningExists) {
    console.log(chalk.yellow('ℹ Documentation is not currently versioned'));
    const setupVersioning = await confirm({
      message: 'Would you like to set up versioning for this documentation?',
      default: true
    });
    
    if (!setupVersioning) {
      console.log(chalk.yellow('Version management cancelled'));
      process.exit(0);
    }
    
    // Set up versioning for existing project
    await setupVersioningForExisting(docsConfig, docsJsonPath, docsDir);
    return;
  }

  // Load or create versions.json in the docs directory
  const versionsJsonPath = path.join(docsDir, 'versions.json');
  let versionsData = { versions: [], currentVersion: null, workingVersion: 'next' };
  
  if (await fs.pathExists(versionsJsonPath)) {
    versionsData = await fs.readJson(versionsJsonPath);
  }

  if (options.scope || !isTopLevelVersionedNavigation(docsConfig.navigation)) {
    await freezeScopedVersion({
      docsConfig,
      docsJsonPath,
      docsDir,
      versionsJsonPath,
      versionsData,
      options
    });
    return;
  }

  // Get current version to freeze
  let currentVersion = options.version || options.currentVersion || versionsData.currentVersion;
  
  if (!currentVersion) {
    if (options.nonInteractive) {
      throw new Error('Missing --version for non-interactive freeze');
    }
    console.log(chalk.yellow('ℹ This appears to be the first version freeze'));
    currentVersion = await input({
      message: 'Enter the version to freeze (e.g., v1.0.0, v0.53, v8.5.x):',
      validate: (value) => {
        if (!isSupportedVersionLabel(value)) {
          return 'Use a path-safe version label such as v1.0.0, v0.53, v8.5.x, next, or main';
        }
        return true;
      }
    });
  } else {
    console.log(chalk.green(`ℹ Current development version: ${currentVersion}`));
  }

  if (!isSupportedVersionLabel(currentVersion)) {
    throw new Error(`Invalid version label: ${currentVersion}`);
  }

  // Keep old convenience for numeric semantic inputs while allowing arbitrary docs labels.
  if (/^\d+\.\d+/.test(currentVersion)) {
    currentVersion = 'v' + currentVersion;
  }

  // Check if version already exists in docs directory
  const versionDir = path.join(docsDir, currentVersion);
  if (await fs.pathExists(versionDir)) {
    console.log(chalk.red(`✗ Version ${currentVersion} already exists`));
    console.log(chalk.yellow('Frozen versions are snapshots and should not be overwritten'));
    process.exit(1);
  }

  // Get new development version
  let newVersion = options.nextVersion || options.newVersion;
  if (!newVersion) {
    if (options.nonInteractive) {
      throw new Error('Missing --next-version for non-interactive freeze');
    }
    newVersion = await input({
      message: 'Enter the new development version (e.g., v1.1.0, v0.54, next):',
      validate: (value) => {
        if (!isSupportedVersionLabel(value)) {
          return 'Use a path-safe version label such as v1.1.0, v0.54, next, or main';
        }
        return true;
      }
    });
  }

  if (!isSupportedVersionLabel(newVersion)) {
    throw new Error(`Invalid next version label: ${newVersion}`);
  }

  // Ensure new version has 'v' prefix for numeric semantic inputs
  const newVersionFinal = /^\d+\.\d+/.test(newVersion) ? 'v' + newVersion : newVersion;

  // Display summary
  console.log(chalk.cyan('\n===================================='));
  console.log(chalk.cyan('   Version Management Summary'));
  console.log(chalk.cyan('====================================\n'));
  console.log(`  Freeze version:  ${chalk.yellow(currentVersion)} (creates snapshot)`);
  console.log(`  New dev version: ${chalk.green(newVersionFinal)} (for future development)`);
  console.log(`  Working version: ${chalk.blue(versionsData.workingVersion || 'next')}\n`);
  console.log('This will:');
  console.log(`  1. Create frozen copy at docs/${currentVersion}/`);
  console.log('  2. Update internal document links');
  console.log('  3. Update docs.json navigation');
  console.log('  4. Update versions.json registry\n');

  const proceed = options.yes || options.nonInteractive
    ? true
    : await confirm({
        message: 'Proceed with version freeze?',
        default: true
      });

  if (!proceed) {
    console.log(chalk.yellow('Operation cancelled'));
    return;
  }

  // Execute freeze
  console.log(chalk.cyan('\n⏳ Starting version freeze...\n'));

  // Create version directory
  await fs.ensureDir(versionDir);
  console.log(chalk.green(`✓ Created ${currentVersion}/ directory`));

  // Get working version directory
  const workingDir = versionsData.workingVersion || 'next';
  const workingPath = path.join(docsDir, workingDir);
  
  // Copy documentation files from working version or root
  const sourceFiles = await glob('**/*.mdx', {
    cwd: await fs.pathExists(workingPath) ? workingPath : docsDir,
    ignore: ['**/node_modules/**', '**/.git/**', `${currentVersion}/**`, 'v*.*.*/**']
  });

  for (const file of sourceFiles) {
    const sourcePath = await fs.pathExists(workingPath) ? 
      path.join(workingPath, file) : path.join(docsDir, file);
    const targetPath = path.join(versionDir, file);
    
    await fs.ensureDir(path.dirname(targetPath));
    await fs.copy(sourcePath, targetPath);
  }
  console.log(chalk.green(`✓ Copied ${sourceFiles.length} documentation files`));

  // Copy assets and images (but not snippets)
  const assetDirs = ['images', 'assets'];
  for (const dir of assetDirs) {
    const sourceDirPath = await fs.pathExists(workingPath) ?
      path.join(workingPath, dir) : path.join(docsDir, dir);
    
    if (await fs.pathExists(sourceDirPath)) {
      await fs.copy(sourceDirPath, path.join(versionDir, dir));
      console.log(chalk.green(`✓ Copied ${dir}/ directory`));
    }
  }

  // Update internal links in frozen version
  const mdxFiles = await glob('**/*.mdx', { cwd: versionDir });
  let updatedFiles = 0;
  
  for (const file of mdxFiles) {
    const filePath = path.join(versionDir, file);
    let content = await fs.readFile(filePath, 'utf8');
    let updated = false;
    
    // Update relative document links but preserve snippet/asset paths
    const linkPattern = /\]\(([^)]+)\)/g;
    content = content.replace(linkPattern, (match, link) => {
      // Skip external links, snippets, assets
      if (link.startsWith('http') || 
          link.includes('/snippets/') || 
          link.includes('/assets/') ||
          link.includes('/images/') ||
          link.includes('/static/')) {
        return match;
      }
      
      // Update relative document paths
      if (link.startsWith('/')) {
        updated = true;
        return `](/${currentVersion}${link})`;
      }
      
      return match;
    });
    
    if (updated) {
      await fs.writeFile(filePath, content);
      updatedFiles++;
    }
  }
  console.log(chalk.green(`✓ Updated links in ${updatedFiles} files`));

  // Update versions.json
  if (!versionsData.versions.includes(currentVersion)) {
    versionsData.versions.push(currentVersion);
    versionsData.versions.sort(versionCompare);
  }
  versionsData.currentVersion = newVersionFinal;
  versionsData.defaultVersion = currentVersion;
  
  await fs.writeJson(versionsJsonPath, versionsData, { spaces: 2 });
  console.log(chalk.green('✓ Updated versions.json'));

  // Update docs.json navigation
  const workingVersionNav = docsConfig.navigation.versions.find(v => 
    v.version === versionsData.workingVersion || 
    v.version === 'latest' || 
    v.version === 'next' || 
    v.version === 'main' ||
    v.version === 'current'
  );

  if (workingVersionNav) {
    const knownVersionPrefixes = [
      versionsData.workingVersion,
      ...versionsData.versions,
      'next',
      'main',
      'latest',
      'current'
    ].filter((value, index, values) => value && values.indexOf(value) === index);

    function stripKnownVersionPrefix(value) {
      for (const prefix of knownVersionPrefixes) {
        if (value === prefix) return '';
        if (value.startsWith(`${prefix}/`)) {
          return value.slice(prefix.length + 1);
        }
      }
      return value;
    }

    // Create frozen version navigation
    const frozenNav = JSON.parse(JSON.stringify(workingVersionNav));
    frozenNav.version = currentVersion;
    delete frozenNav.default;
    
    // Update all paths in frozen navigation - comprehensive handler for all navigation structures
    function updatePaths(obj, versionPrefix) {
      if (typeof obj === 'string') {
        // Only update document paths, not external links or special paths
        if (!obj.startsWith('http') && 
            !obj.startsWith('mailto:') &&
            !obj.includes('/snippets/') && 
            !obj.includes('/assets/') &&
            !obj.includes('/images/') &&
            !obj.includes('/static/')) {
          // Remove any existing known version prefix and add new one.
          const cleanPath = stripKnownVersionPrefix(obj);
          return `${versionPrefix}/${cleanPath}`;
        }
        return obj;
      }
      
      if (Array.isArray(obj)) {
        return obj.map(item => updatePaths(item, versionPrefix));
      }
      
      if (typeof obj === 'object' && obj !== null) {
        const newObj = {};
        
        for (const key in obj) {
          // Handle all navigation structure fields that contain pages/paths
          if (key === 'pages' || 
              key === 'groups' || 
              key === 'tabs' || 
              key === 'menu' || 
              key === 'anchors' || 
              key === 'dropdowns' ||
              key === 'languages' ||
              key === 'versions') {
            newObj[key] = updatePaths(obj[key], versionPrefix);
          } 
          // Don't modify external hrefs
          else if (key === 'href') {
            newObj[key] = obj[key];
          }
          // Don't modify OpenAPI references (they're handled separately)
          else if (key === 'openapi') {
            newObj[key] = obj[key];
          }
          // Handle nested groups
          else if (key === 'group' && obj.pages) {
            newObj[key] = obj[key];
            newObj.pages = updatePaths(obj.pages, versionPrefix);
          }
          // Handle nested tabs
          else if (key === 'tab' && (obj.pages || obj.groups || obj.menu)) {
            newObj[key] = obj[key];
            if (obj.pages) newObj.pages = updatePaths(obj.pages, versionPrefix);
            if (obj.groups) newObj.groups = updatePaths(obj.groups, versionPrefix);
            if (obj.menu) newObj.menu = updatePaths(obj.menu, versionPrefix);
          }
          // Handle menu items
          else if (key === 'item' && (obj.pages || obj.groups)) {
            newObj[key] = obj[key];
            if (obj.pages) newObj.pages = updatePaths(obj.pages, versionPrefix);
            if (obj.groups) newObj.groups = updatePaths(obj.groups, versionPrefix);
          }
          // Handle anchors
          else if (key === 'anchor' && (obj.pages || obj.groups)) {
            newObj[key] = obj[key];
            if (obj.pages) newObj.pages = updatePaths(obj.pages, versionPrefix);
            if (obj.groups) newObj.groups = updatePaths(obj.groups, versionPrefix);
          }
          // Handle dropdowns
          else if (key === 'dropdown' && (obj.pages || obj.groups)) {
            newObj[key] = obj[key];
            if (obj.pages) newObj.pages = updatePaths(obj.pages, versionPrefix);
            if (obj.groups) newObj.groups = updatePaths(obj.groups, versionPrefix);
          }
          // Handle languages
          else if (key === 'language' && (obj.pages || obj.groups || obj.tabs)) {
            newObj[key] = obj[key];
            if (obj.pages) newObj.pages = updatePaths(obj.pages, versionPrefix);
            if (obj.groups) newObj.groups = updatePaths(obj.groups, versionPrefix);
            if (obj.tabs) newObj.tabs = updatePaths(obj.tabs, versionPrefix);
          }
          // Skip global anchors (they're external)
          else if (key === 'global') {
            newObj[key] = obj[key];
          }
          // Copy all other fields as-is
          else {
            newObj[key] = obj[key];
          }
        }
        
        return newObj;
      }
      
      return obj;
    }
    
    // Apply path updates to all navigation fields
    for (const key in frozenNav) {
      if (key !== 'version' && key !== 'default') {
        frozenNav[key] = updatePaths(frozenNav[key], currentVersion);
      }
    }
    
    // Add or update frozen version in navigation
    const existingIndex = docsConfig.navigation.versions.findIndex(v => 
      v.version === currentVersion
    );
    
    if (existingIndex >= 0) {
      docsConfig.navigation.versions[existingIndex] = frozenNav;
    } else {
      // Insert after working version
      const workingIndex = docsConfig.navigation.versions.findIndex(v => 
        v.version === versionsData.workingVersion ||
        v.version === 'latest' ||
        v.version === 'next' ||
        v.version === 'main' ||
        v.version === 'current'
      );
      docsConfig.navigation.versions.splice(workingIndex + 1, 0, frozenNav);
    }
  }

  await fs.writeJson(docsJsonPath, docsConfig, { spaces: 2 });
  console.log(chalk.green('✓ Updated docs.json navigation'));

  // Create version metadata
  const metadataPath = path.join(versionDir, '.version-metadata.json');
  await fs.writeJson(metadataPath, {
    version: currentVersion,
    frozenDate: new Date().toISOString().split('T')[0],
    frozenTimestamp: new Date().toISOString(),
    nextVersion: newVersionFinal,
    nodeVersion: process.version
  }, { spaces: 2 });
  console.log(chalk.green('✓ Created version metadata'));

  // Success message
  console.log(chalk.green('\n✅ Version freeze completed successfully!\n'));
  console.log(chalk.cyan('===================================='));
  console.log(chalk.cyan('   Next Steps'));
  console.log(chalk.cyan('====================================\n'));
  console.log('  1. Review changes:');
  console.log(chalk.gray('     git status\n'));
  console.log('  2. Commit changes:');
  console.log(chalk.gray(`     git add -A`));
  console.log(chalk.gray(`     git commit -m "docs: freeze ${currentVersion} and begin ${newVersionFinal} development"\n`));
  console.log('  3. Push to repository:');
  console.log(chalk.gray('     git push\n'));
  console.log(`  4. Continue development for ${chalk.green(newVersionFinal)}`);
}

// Helper to extract page paths from navigation structure based on schema.json
function extractNavigationPaths(nav) {
  const paths = new Set();
  
  function isDocumentPath(str) {
    // Check if it's a document path (not external link or asset)
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
      // Page reference
      if (isDocumentPath(obj)) {
        // Add .mdx extension if not present
        const path = obj.endsWith('.mdx') ? obj : `${obj}.mdx`;
        paths.add(path.replace(/^\//, '')); // Remove leading slash
      }
    } else if (Array.isArray(obj)) {
      // Array of items
      obj.forEach(extractFromObj);
    } else if (typeof obj === 'object') {
      // Handle specific navigation structures based on schema
      
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
        // This is a version object, extract its navigation
        extractFromObj(obj.tabs);
        extractFromObj(obj.groups);
        extractFromObj(obj.pages);
        extractFromObj(obj.anchors);
        extractFromObj(obj.dropdowns);
      }
      
      // Language structure
      if (obj.language && (obj.tabs || obj.groups || obj.pages || obj.anchors || obj.dropdowns || obj.versions)) {
        // This is a language object, extract its navigation
        extractFromObj(obj.tabs);
        extractFromObj(obj.groups);
        extractFromObj(obj.pages);
        extractFromObj(obj.anchors);
        extractFromObj(obj.dropdowns);
        extractFromObj(obj.versions);
      }
      
      // Tab structure
      if (obj.tab) {
        // Tab can have various nested structures
        if (obj.languages) extractFromObj(obj.languages);
        if (obj.versions) extractFromObj(obj.versions);
        if (obj.dropdowns) extractFromObj(obj.dropdowns);
        if (obj.anchors) extractFromObj(obj.anchors);
        if (obj.groups) extractFromObj(obj.groups);
        if (obj.pages) extractFromObj(obj.pages);
      }
      
      // Dropdown structure
      if (obj.dropdown) {
        // Dropdown can have various nested structures
        if (obj.languages) extractFromObj(obj.languages);
        if (obj.versions) extractFromObj(obj.versions);
        if (obj.anchors) extractFromObj(obj.anchors);
        if (obj.groups) extractFromObj(obj.groups);
        if (obj.pages) extractFromObj(obj.pages);
      }
      
      // Anchor structure
      if (obj.anchor) {
        // Anchor can have various nested structures
        if (obj.languages) extractFromObj(obj.languages);
        if (obj.versions) extractFromObj(obj.versions);
        if (obj.dropdowns) extractFromObj(obj.dropdowns);
        if (obj.groups) extractFromObj(obj.groups);
        if (obj.pages) extractFromObj(obj.pages);
      }
      
      // Group structure
      if (obj.group) {
        // Group has pages and can have nested groups
        if (obj.pages) extractFromObj(obj.pages);
        if (obj.root) extractFromObj(obj.root); // Group can have a root page
      }
      
      // Menu structure (can appear in tabs)
      if (obj.menu) extractFromObj(obj.menu);
      
      // Handle nested items arrays
      if (obj.items) extractFromObj(obj.items);
      
      // OpenAPI references (we track these too as they generate pages)
      if (obj.openapi && typeof obj.openapi === 'string') {
        // OpenAPI specs generate documentation pages
        // We don't add them to paths as they're auto-generated
      }
      
      // Skip global anchors (they're external links)
      // Already handled by not recursing into obj.global
    }
  }
  
  extractFromObj(nav);
  return Array.from(paths);
}

// Setup versioning for existing project
async function setupVersioningForExisting(docsConfig, docsJsonPath, docsDir) {
  console.log(chalk.cyan('\n⚙️  Setting up versioning for existing documentation...\n'));
  
  const projectRoot = path.dirname(docsJsonPath);
  const isAlreadyInDocs = docsJsonPath.includes('/docs/docs.json');
  
  if (!isAlreadyInDocs) {
    console.log(chalk.cyan('📁 Organizing documentation structure...\n'));
    
    // Extract all document paths from navigation
    const navPaths = extractNavigationPaths(docsConfig.navigation);
    
    // Find all MDX files currently in the project
    const existingMdxFiles = await glob('**/*.mdx', {
      cwd: projectRoot,
      ignore: ['**/node_modules/**', '**/.git/**', 'docs/**']
    });
    
    // Determine which MDX files to move based on navigation
    const filesToMove = new Set();
    
    // Add files referenced in navigation
    navPaths.forEach(navPath => {
      const cleanPath = navPath.replace(/^\//, '');
      if (existingMdxFiles.includes(cleanPath)) {
        filesToMove.add(cleanPath);
      }
    });
    
    // If no files found in navigation, move all MDX files
    if (filesToMove.size === 0) {
      existingMdxFiles.forEach(file => filesToMove.add(file));
    }
    
    // Move ONLY MDX documentation files to /docs directory
    for (const file of filesToMove) {
      const sourcePath = path.join(projectRoot, file);
      const targetPath = path.join(docsDir, file);
      
      if (await fs.pathExists(sourcePath)) {
        await fs.ensureDir(path.dirname(targetPath));
        await fs.move(sourcePath, targetPath, { overwrite: true });
      }
    }
    
    // DO NOT move assets, images, snippets - they stay in project root
    // Mintlify expects them there for proper referencing
    
    // Move docs.json to /docs
    if (!docsJsonPath.includes('/docs/')) {
      const newDocsJsonPath = path.join(docsDir, 'docs.json');
      await fs.copy(docsJsonPath, newDocsJsonPath, { overwrite: true });
      // Keep original docs.json as backup
      await fs.move(docsJsonPath, docsJsonPath + '.backup', { overwrite: true });
      docsJsonPath = newDocsJsonPath;
      docsConfig = await fs.readJson(docsJsonPath);
    }
    
    console.log(chalk.green(`✓ Organized documentation files\n`));
  }

  // Select working version name
  const workingVersionName = await select({
    message: 'What should the current/working version be labeled?',
    choices: [
      { value: 'latest', name: 'latest (current stable)' },
      { value: 'current', name: 'current (actively developed)' },
      { value: 'next', name: 'next (pre-release)' },
      { value: 'main', name: 'main (follows git convention)' },
      { value: 'unreleased', name: 'unreleased (work in progress)' }
    ],
    default: 'latest'
  });

  // Ask if they want to create the working version directory within /docs
  const createWorkingDir = await confirm({
    message: `Move current docs into docs/${workingVersionName}/ directory?`,
    default: true
  });

  // Get initial version for tracking
  const initialVersion = await input({
    message: 'What version are you currently working on? (e.g., v1.0.0, v0.53, v8.5.x):',
    default: 'v1.0.0',
    validate: (value) => {
      if (!isSupportedVersionLabel(value)) {
        return 'Use a path-safe version label such as v1.0.0, v0.53, v8.5.x, next, or main';
      }
      return true;
    }
  });

  const versionWithPrefix = /^\d+\.\d+/.test(initialVersion) ? 'v' + initialVersion : initialVersion;

  // Ask if they want to create an initial version snapshot
  const createInitialSnapshot = await confirm({
    message: 'Create an initial version snapshot from current docs?',
    default: false
  });
  
  // Create versions.json
  const versionsData = {
    versions: createInitialSnapshot ? [versionWithPrefix] : [],
    currentVersion: versionWithPrefix,
    workingVersion: workingVersionName,
    defaultVersion: workingVersionName
  };

  await fs.writeJson(path.join(docsDir, 'versions.json'), versionsData, { spaces: 2 });
  console.log(chalk.green('✓ Created docs/versions.json'));

  // Create initial version snapshot if requested
  if (createInitialSnapshot) {
    const versionDir = path.join(docsDir, versionWithPrefix);
    await fs.ensureDir(versionDir);
    
    // Copy current MDX files to version directory
    const mdxFiles = await glob('**/*.mdx', {
      cwd: docsDir,
      ignore: ['**/node_modules/**', '**/.git/**', 'v*.*.*/**', `${workingVersionName}/**`]
    });
    
    for (const file of mdxFiles) {
      const sourcePath = path.join(docsDir, file);
      const targetPath = path.join(versionDir, file);
      
      await fs.ensureDir(path.dirname(targetPath));
      await fs.copy(sourcePath, targetPath, { overwrite: true });
    }
    
    console.log(chalk.green(`✓ Created initial version snapshot: ${versionWithPrefix}`));
  }
  
  // Move files to working directory if requested
  if (createWorkingDir) {
    const workingDir = path.join(docsDir, workingVersionName);
    await fs.ensureDir(workingDir);

    // Get all MDX files in docs root
    const mdxFiles = await glob('**/*.mdx', {
      cwd: docsDir,
      ignore: ['**/node_modules/**', '**/.git/**', 'v*.*.*/**', `${workingVersionName}/**`]
    });

    // Move MDX files to working directory
    for (const file of mdxFiles) {
      const sourcePath = path.join(docsDir, file);
      const targetPath = path.join(workingDir, file);
      
      await fs.ensureDir(path.dirname(targetPath));
      await fs.move(sourcePath, targetPath, { overwrite: true });
    }
    
    // Clean up empty directories in docs root
    const dirs = await glob('**/', {
      cwd: docsDir,
      ignore: ['v*.*.*/**', `${workingVersionName}/**`]
    });
    
    for (const dir of dirs.reverse()) { // reverse to delete deepest first
      const dirPath = path.join(docsDir, dir);
      try {
        const files = await fs.readdir(dirPath);
        if (files.length === 0) {
          await fs.remove(dirPath);
        }
      } catch (e) {
        // Directory might already be removed
      }
    }

    console.log(chalk.green(`✓ Moved documentation to docs/${workingVersionName}/ directory`));
  }

  // Update docs.json navigation structure
  const currentNav = docsConfig.navigation;
  
  // Convert to versioned navigation
  if (!currentNav.versions) {
    // Create versioned navigation wrapper
    const versionedNav = {
      version: workingVersionName,
      default: true
    };

    // Preserve ALL existing navigation structures
    // Copy all navigation fields except 'versions'
    for (const key in currentNav) {
      if (key !== 'versions') {
        versionedNav[key] = currentNav[key];
      }
    }

    // If no structure exists, create a default tabs structure
    if (!versionedNav.tabs && !versionedNav.groups && !versionedNav.pages && 
        !versionedNav.anchors && !versionedNav.dropdowns) {
      versionedNav.tabs = [];
    }

    // Update paths if files were moved
    if (createWorkingDir) {
      function prefixPaths(obj, prefix) {
        if (typeof obj === 'string') {
          // Only update document paths, not external links or special paths
          if (!obj.startsWith('http') && 
              !obj.startsWith('mailto:') &&
              !obj.includes('/snippets/') && 
              !obj.includes('/assets/') &&
              !obj.includes('/images/') &&
              !obj.includes('/static/')) {
            return `${prefix}/${obj}`;
          }
          return obj;
        }
        
        if (Array.isArray(obj)) {
          return obj.map(item => prefixPaths(item, prefix));
        }
        
        if (typeof obj === 'object' && obj !== null) {
          const newObj = {};
          
          for (const key in obj) {
            // Handle all navigation structure fields
            if (key === 'pages' || 
                key === 'groups' || 
                key === 'tabs' || 
                key === 'menu' || 
                key === 'anchors' || 
                key === 'dropdowns' ||
                key === 'languages') {
              newObj[key] = prefixPaths(obj[key], prefix);
            }
            // Don't modify external hrefs or OpenAPI refs
            else if (key === 'href' || key === 'openapi') {
              newObj[key] = obj[key];
            }
            // Handle nested navigation structures
            else if ((key === 'group' || key === 'tab' || key === 'item' || 
                     key === 'anchor' || key === 'dropdown' || key === 'language') && 
                     (obj.pages || obj.groups || obj.tabs || obj.menu)) {
              newObj[key] = obj[key];
              if (obj.pages) newObj.pages = prefixPaths(obj.pages, prefix);
              if (obj.groups) newObj.groups = prefixPaths(obj.groups, prefix);
              if (obj.tabs) newObj.tabs = prefixPaths(obj.tabs, prefix);
              if (obj.menu) newObj.menu = prefixPaths(obj.menu, prefix);
            }
            // Skip global anchors (they're external)
            else if (key === 'global') {
              newObj[key] = obj[key];
            }
            // Copy all other fields as-is
            else {
              newObj[key] = obj[key];
            }
          }
          
          return newObj;
        }
        
        return obj;
      }

      // Apply path prefixes to all navigation fields
      for (const key in versionedNav) {
        if (key !== 'version' && key !== 'default') {
          versionedNav[key] = prefixPaths(versionedNav[key], workingVersionName);
        }
      }
    }

    // Create navigation array with working version
    const versions = [versionedNav];
    
    // Add initial snapshot version if created
    if (createInitialSnapshot) {
      const snapshotNav = JSON.parse(JSON.stringify(versionedNav));
      snapshotNav.version = versionWithPrefix;
      delete snapshotNav.default;
      
      // Update paths in snapshot to include version prefix
      function updateSnapshotPaths(obj, versionPrefix) {
        if (typeof obj === 'string') {
          // Only update document paths
          if (!obj.startsWith('http') && 
              !obj.startsWith('mailto:') &&
              !obj.includes('/snippets/') && 
              !obj.includes('/assets/') &&
              !obj.includes('/images/') &&
              !obj.includes('/static/')) {
            // If path already has working version prefix, replace it
            if (obj.startsWith(workingVersionName + '/')) {
              return obj.replace(workingVersionName + '/', versionPrefix + '/');
            }
            // Otherwise add version prefix
            return `${versionPrefix}/${obj}`;
          }
          return obj;
        }
        
        if (Array.isArray(obj)) {
          return obj.map(item => updateSnapshotPaths(item, versionPrefix));
        }
        
        if (typeof obj === 'object' && obj !== null) {
          const newObj = {};
          for (const key in obj) {
            if (key === 'pages' || key === 'groups' || key === 'tabs' || 
                key === 'menu' || key === 'anchors' || key === 'dropdowns' ||
                key === 'languages') {
              newObj[key] = updateSnapshotPaths(obj[key], versionPrefix);
            } else if ((key === 'group' || key === 'tab' || key === 'item' || 
                       key === 'anchor' || key === 'dropdown' || key === 'language') && 
                       (obj.pages || obj.groups || obj.tabs || obj.menu)) {
              newObj[key] = obj[key];
              if (obj.pages) newObj.pages = updateSnapshotPaths(obj.pages, versionPrefix);
              if (obj.groups) newObj.groups = updateSnapshotPaths(obj.groups, versionPrefix);
              if (obj.tabs) newObj.tabs = updateSnapshotPaths(obj.tabs, versionPrefix);
              if (obj.menu) newObj.menu = updateSnapshotPaths(obj.menu, versionPrefix);
            } else {
              newObj[key] = obj[key];
            }
          }
          return newObj;
        }
        
        return obj;
      }
      
      // Update all navigation fields in snapshot
      for (const key in snapshotNav) {
        if (key !== 'version' && key !== 'default') {
          snapshotNav[key] = updateSnapshotPaths(snapshotNav[key], versionWithPrefix);
        }
      }
      
      versions.push(snapshotNav);
    }
    
    // Replace navigation with versioned structure
    docsConfig.navigation = {
      versions: versions
    };
    
    // Preserve global anchors if they exist
    if (currentNav.global) {
      docsConfig.navigation.global = currentNav.global;
    }
  }

  // Save updated docs.json in docs directory
  const finalDocsJsonPath = path.join(docsDir, 'docs.json');
  await fs.writeJson(finalDocsJsonPath, docsConfig, { spaces: 2 });
  console.log(chalk.green('✓ Updated docs/docs.json with versioned navigation'));

  // Create version manager script in project root scripts directory
  const scriptsDir = path.join(projectRoot, 'scripts');
  await fs.ensureDir(scriptsDir);
  
  const scriptPath = path.join(scriptsDir, 'freeze-version.js');
  const scriptContent = `#!/usr/bin/env node

// Version freeze script for this documentation
import { freezeVersion } from '${path.relative(scriptsDir, __filename).replace(/\\/g, '/').replace('../', '')}';

freezeVersion().catch(console.error);
`;

  await fs.writeFile(scriptPath, scriptContent);
  await fs.chmod(scriptPath, '755');
  console.log(chalk.green('✓ Created scripts/freeze-version.js'));

  console.log(chalk.green('\n✅ Versioning setup complete!\n'));
  console.log('Your documentation now supports versioning.');
  console.log(`Working version: ${chalk.cyan(workingVersionName)}`);
  console.log(`Current development: ${chalk.yellow(versionWithPrefix)}\n`);
  console.log('To freeze a version and start a new one:');
  console.log(chalk.gray('  node scripts/freeze-version.js\n'));
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  freezeVersion().catch(console.error);
}
