#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { input, confirm, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { glob } from 'glob';

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

// Main function to freeze version
export async function freezeVersion(options = {}) {
  console.log(chalk.blue('\n===================================='));
  console.log(chalk.blue('   Documentation Version Manager'));
  console.log(chalk.blue('====================================\n'));

  // Check if we're in the docs directory or project root
  const docsJsonPath = await fs.pathExists('docs.json') ? 'docs.json' : 
                       await fs.pathExists('docs/docs.json') ? 'docs/docs.json' : null;
  
  if (!docsJsonPath) {
    console.log(chalk.red('✗ docs.json not found'));
    console.log(chalk.yellow('Please run from your documentation directory or project root'));
    process.exit(1);
  }

  const docsDir = path.dirname(docsJsonPath);
  const isInDocsDir = docsDir === '.';
  
  // Load docs.json
  const docsConfig = await fs.readJson(docsJsonPath);
  
  // Check if versioning is already set up
  const hasVersioning = docsConfig.navigation?.versions?.length > 0;
  
  if (!hasVersioning) {
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

  // Load or create versions.json
  const versionsJsonPath = path.join(docsDir, 'versions.json');
  let versionsData = { versions: [], currentVersion: null, workingVersion: 'next' };
  
  if (await fs.pathExists(versionsJsonPath)) {
    versionsData = await fs.readJson(versionsJsonPath);
  }

  // Get current version to freeze
  let currentVersion = versionsData.currentVersion;
  
  if (!currentVersion) {
    console.log(chalk.yellow('ℹ This appears to be the first version freeze'));
    currentVersion = await input({
      message: 'Enter the version to freeze (e.g., v1.0.0):',
      validate: (value) => {
        if (!/^v?\d+\.\d+\.\d+/.test(value)) {
          return 'Please use semantic versioning (e.g., v1.0.0)';
        }
        return true;
      }
    });
  } else {
    console.log(chalk.green(`ℹ Current development version: ${currentVersion}`));
  }

  // Ensure version has 'v' prefix
  if (!currentVersion.startsWith('v')) {
    currentVersion = 'v' + currentVersion;
  }

  // Check if version already exists
  const versionDir = path.join(docsDir, currentVersion);
  if (await fs.pathExists(versionDir)) {
    console.log(chalk.red(`✗ Version ${currentVersion} already exists`));
    console.log(chalk.yellow('Frozen versions are immutable'));
    process.exit(1);
  }

  // Get new development version
  const newVersion = await input({
    message: 'Enter the new development version (e.g., v1.1.0):',
    validate: (value) => {
      if (!/^v?\d+\.\d+\.\d+/.test(value)) {
        return 'Please use semantic versioning (e.g., v1.1.0)';
      }
      return true;
    }
  });

  // Ensure new version has 'v' prefix
  const newVersionFinal = newVersion.startsWith('v') ? newVersion : 'v' + newVersion;

  // Display summary
  console.log(chalk.cyan('\n===================================='));
  console.log(chalk.cyan('   Version Management Summary'));
  console.log(chalk.cyan('====================================\n'));
  console.log(`  Freeze version:  ${chalk.yellow(currentVersion)} (becomes immutable)`);
  console.log(`  New dev version: ${chalk.green(newVersionFinal)} (for future development)`);
  console.log(`  Working version: ${chalk.blue(versionsData.workingVersion || 'next')}\n`);
  console.log('This will:');
  console.log(`  1. Create frozen copy at ${docsDir}/${currentVersion}/`);
  console.log('  2. Update internal document links');
  console.log('  3. Update docs.json navigation');
  console.log('  4. Update versions.json registry\n');

  const proceed = await confirm({
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
          // Remove any existing version prefix and add new one
          const cleanPath = obj.replace(/^(v\d+\.\d+\.\d+|next|main|latest|current)\//, '');
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

// Setup versioning for existing project
async function setupVersioningForExisting(docsConfig, docsJsonPath, docsDir) {
  console.log(chalk.cyan('\n⚙️  Setting up versioning for existing documentation...\n'));

  // Select working version name
  const workingVersionName = await select({
    message: 'What should the current/working version be called?',
    choices: [
      { value: 'next', name: 'next (recommended for pre-release)' },
      { value: 'main', name: 'main (follows git convention)' },
      { value: 'latest', name: 'latest (current stable)' },
      { value: 'current', name: 'current (actively developed)' }
    ],
    default: 'next'
  });

  // Ask if they want to create the working version directory
  const createWorkingDir = await confirm({
    message: `Move current docs into ${workingVersionName}/ directory?`,
    default: true
  });

  // Get initial version for tracking
  const initialVersion = await input({
    message: 'What version are you currently working on? (e.g., v1.0.0):',
    default: 'v1.0.0',
    validate: (value) => {
      if (!/^v?\d+\.\d+\.\d+/.test(value)) {
        return 'Please use semantic versioning (e.g., v1.0.0)';
      }
      return true;
    }
  });

  const versionWithPrefix = initialVersion.startsWith('v') ? initialVersion : 'v' + initialVersion;

  // Create versions.json
  const versionsData = {
    versions: [],
    currentVersion: versionWithPrefix,
    workingVersion: workingVersionName,
    defaultVersion: workingVersionName
  };

  await fs.writeJson(path.join(docsDir, 'versions.json'), versionsData, { spaces: 2 });
  console.log(chalk.green('✓ Created versions.json'));

  // Move files to working directory if requested
  if (createWorkingDir) {
    const workingDir = path.join(docsDir, workingVersionName);
    await fs.ensureDir(workingDir);

    // Get all MDX files in root
    const mdxFiles = await glob('**/*.mdx', {
      cwd: docsDir,
      ignore: ['**/node_modules/**', '**/.git/**', 'v*.*.*/**', `${workingVersionName}/**`]
    });

    // Move files to working directory
    for (const file of mdxFiles) {
      const sourcePath = path.join(docsDir, file);
      const targetPath = path.join(workingDir, file);
      
      await fs.ensureDir(path.dirname(targetPath));
      await fs.move(sourcePath, targetPath, { overwrite: true });
    }

    // Move asset directories
    const assetDirs = ['images', 'assets'];
    for (const dir of assetDirs) {
      const sourcePath = path.join(docsDir, dir);
      if (await fs.pathExists(sourcePath)) {
        await fs.move(sourcePath, path.join(workingDir, dir), { overwrite: true });
      }
    }

    console.log(chalk.green(`✓ Moved documentation to ${workingVersionName}/ directory`));
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

    // Replace navigation with versioned structure
    docsConfig.navigation = {
      versions: [versionedNav]
    };
    
    // Preserve global anchors if they exist
    if (currentNav.global) {
      docsConfig.navigation.global = currentNav.global;
    }
  }

  await fs.writeJson(docsJsonPath, docsConfig, { spaces: 2 });
  console.log(chalk.green('✓ Updated docs.json with versioned navigation'));

  // Create version manager script
  const scriptsDir = path.join(docsDir, 'scripts');
  await fs.ensureDir(scriptsDir);
  
  const scriptPath = path.join(scriptsDir, 'freeze-version.js');
  const scriptContent = `#!/usr/bin/env node

// Version freeze script for this documentation
import { freezeVersion } from '${path.relative(scriptsDir, __filename).replace(/\\/g, '/')}';

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