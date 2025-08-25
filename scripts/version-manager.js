#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { input, confirm, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color helpers
const info = (msg) => console.log(chalk.blue(''), msg);
const success = (msg) => console.log(chalk.green('✓'), msg);
const warning = (msg) => console.log(chalk.yellow(''), msg);
const error = (msg) => console.log(chalk.red('✗'), msg);

// Parse semantic version
function parseVersion(version) {
  const v = version.replace(/^v/, '');
  const match = v.match(/^(\d+)\.(\d+)\.(\d+)(.*)?$/);
  if (!match) return null;
  return {
    major: parseInt(match[1]),
    minor: parseInt(match[2]),
    patch: parseInt(match[3]),
    prerelease: match[4] || ''
  };
}

// Compare versions
function versionGreaterThan(v1, v2) {
  const p1 = parseVersion(v1);
  const p2 = parseVersion(v2);
  
  if (!p1 || !p2) return false;
  
  if (p1.major !== p2.major) return p1.major > p2.major;
  if (p1.minor !== p2.minor) return p1.minor > p2.minor;
  if (p1.patch !== p2.patch) return p1.patch > p2.patch;
  
  // Handle prerelease versions
  if (!p1.prerelease && p2.prerelease) return true;
  if (p1.prerelease && !p2.prerelease) return false;
  return p1.prerelease > p2.prerelease;
}

// Sort versions
function sortVersions(versions) {
  const specialOrder = { 'latest': -3, 'next': -2, 'main': -1 };
  
  return versions.sort((a, b) => {
    if (specialOrder[a] !== undefined) return specialOrder[a];
    if (specialOrder[b] !== undefined) return -specialOrder[b];
    
    const pa = parseVersion(a);
    const pb = parseVersion(b);
    
    if (!pa || !pb) return 0;
    
    // Sort newest first
    if (pb.major !== pa.major) return pb.major - pa.major;
    if (pb.minor !== pa.minor) return pb.minor - pa.minor;
    if (pb.patch !== pa.patch) return pb.patch - pa.patch;
    
    if (!pa.prerelease && pb.prerelease) return -1;
    if (pa.prerelease && !pb.prerelease) return 1;
    return pb.prerelease.localeCompare(pa.prerelease);
  });
}

// Get current version from versions.json
async function getCurrentVersion() {
  const versionsPath = 'versions.json';
  if (!await fs.pathExists(versionsPath)) {
    return null;
  }
  
  try {
    const versions = await fs.readJson(versionsPath);
    return versions.currentVersion || 
           versions.versions.find(v => v !== 'next' && v !== 'latest' && v !== 'main') ||
           null;
  } catch (e) {
    error(`Failed to read versions.json: ${e.message}`);
    return null;
  }
}

// Update paths in navigation
function updateNavigationPaths(obj, fromPrefix, toPrefix) {
  if (typeof obj === 'string') {
    // Only update document paths, not snippets or assets
    if (!obj.startsWith('http') && 
        !obj.includes('/snippets/') && 
        !obj.includes('/assets/') && 
        !obj.includes('/images/') && 
        !obj.includes('/static/')) {
      if (obj.startsWith(fromPrefix)) {
        return obj.replace(fromPrefix, toPrefix);
      }
      // Handle root-level MDX files
      if (obj.match(/^[a-zA-Z0-9_-]+\.mdx$/)) {
        return `${toPrefix}${obj}`;
      }
    }
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => updateNavigationPaths(item, fromPrefix, toPrefix));
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const newObj = {};
    for (const key in obj) {
      if (key === 'pages' || key === 'groups' || key === 'tabs') {
        newObj[key] = updateNavigationPaths(obj[key], fromPrefix, toPrefix);
      } else {
        newObj[key] = obj[key];
      }
    }
    return newObj;
  }
  
  return obj;
}

// Update internal links in MDX files
async function updateInternalLinks(versionDir, currentVersion) {
  const mdxFiles = await glob(`${versionDir}/**/*.mdx`);
  
  for (const file of mdxFiles) {
    let content = await fs.readFile(file, 'utf8');
    
    // Update relative document links for known directories
    const directories = ['getting-started', 'features', 'changelog', 'api', 'reference', 'documentation', 'guides', 'tutorials'];
    for (const dir of directories) {
      const regex = new RegExp(`\\]\\(/(${dir}/[^)]+)\\)`, 'g');
      content = content.replace(regex, `](${toPrefix}$1)`);
    }
    
    // Update root MDX links
    content = content.replace(/\]\(\/([a-zA-Z0-9_-]+\.mdx)\)/g, `](${toPrefix}$1)`);
    
    // Don't update snippet imports or asset references
    // Those should remain pointing to shared resources
    
    await fs.writeFile(file, content);
  }
}

// Main version management function
async function manageVersions() {
  console.log(chalk.cyan.bold('\n======================================'));
  console.log(chalk.cyan.bold('   Documentation Version Manager'));
  console.log(chalk.cyan.bold('======================================\n'));
  
  // Pre-flight checks
  info('Running pre-flight checks...');
  
  // Check Node version
  const nodeVersion = process.version.slice(1).split('.')[0];
  if (parseInt(nodeVersion) < 18) {
    error(`Node.js version must be >= 18.0.0 (found: ${process.version})`);
    process.exit(1);
  }
  
  // Check if docs.json exists
  if (!await fs.pathExists('docs.json')) {
    error('docs.json not found in current directory');
    info('Please run this script from your documentation root directory');
    process.exit(1);
  }
  
  success('Pre-flight checks passed');
  
  // Create versions.json if it doesn't exist
  const versionsPath = 'versions.json';
  if (!await fs.pathExists(versionsPath)) {
    info('Creating versions.json...');
    await fs.writeJson(versionsPath, {
      versions: [],
      defaultVersion: null,
      currentVersion: null,
      latestLabel: 'latest',
      showLatest: true
    }, { spaces: 2 });
    success('Created versions.json');
  }
  
  const versionsData = await fs.readJson(versionsPath);
  
  // Ask about latest/development version visibility
  console.log();
  const latestOption = await select({
    message: 'How should the latest (in-development) version be handled?',
    choices: [
      { value: 'latest', name: "Show as 'latest' in version selector" },
      { value: 'next', name: "Show as 'next' in version selector" },
      { value: 'main', name: "Show as 'main' in version selector" },
      { value: 'custom', name: 'Show with custom label' },
      { value: 'hidden', name: "Don't show in navigation (only show stable versions)" }
    ],
    default: versionsData.latestLabel || 'latest'
  });
  
  let latestLabel = 'latest';
  let showLatest = true;
  
  if (latestOption === 'custom') {
    latestLabel = await input({
      message: 'Enter custom label:',
      default: 'development'
    });
  } else if (latestOption === 'hidden') {
    latestLabel = '';
    showLatest = false;
  } else {
    latestLabel = latestOption;
  }
  
  // Update versions.json with preference
  versionsData.latestLabel = latestLabel;
  versionsData.showLatest = showLatest;
  await fs.writeJson(versionsPath, versionsData, { spaces: 2 });
  
  // Ask about external changelog
  const fetchChangelog = await confirm({
    message: 'Do you want to fetch changelog from an external repository?',
    default: false
  });
  
  if (fetchChangelog) {
    const externalRepo = await input({
      message: 'Enter repository (format: owner/repo):',
      validate: (value) => {
        if (!value) return 'Repository is required';
        if (!value.match(/^[^/]+\/[^/]+$/)) return 'Invalid format. Use: owner/repo';
        return true;
      }
    });
    
    if (externalRepo) {
      info(`Fetching changelog from ${externalRepo}...`);
      
      // Check if refresh-changelog.sh exists
      const changelogScript = path.join(__dirname, 'refresh-changelog.sh');
      if (await fs.pathExists(changelogScript)) {
        try {
          execSync(`bash "${changelogScript}" "${externalRepo}" latest`, {
            stdio: 'inherit',
            cwd: path.dirname(__dirname)
          });
          success('Changelog fetched and updated');
        } catch (e) {
          warning('Failed to fetch changelog, continuing without it');
        }
      } else {
        warning('Changelog fetch script not found, skipping');
      }
    }
  }
  
  // Determine the current version to freeze
  let currentVersion = await getCurrentVersion();
  
  if (!currentVersion) {
    info('This appears to be the first version freeze.');
    currentVersion = await input({
      message: 'Enter the version to freeze (e.g., v1.0.0):',
      validate: (value) => {
        if (!value) return 'Version is required';
        if (!value.match(/^v?\d+\.\d+\.\d+([-+].*)?$/)) {
          return 'Invalid version format. Use semantic versioning (e.g., v1.0.0)';
        }
        return true;
      }
    });
  } else {
    info(`Current development version: ${chalk.green(currentVersion)}`);
  }
  
  // Ensure version has 'v' prefix
  if (!currentVersion.startsWith('v')) {
    currentVersion = 'v' + currentVersion;
  }
  
  // Check if version directory already exists
  const versionDir = path.join('versions', currentVersion);
  if (await fs.pathExists(versionDir)) {
    error(`Version ${currentVersion} already exists as a frozen version`);
    info('Frozen versions are immutable. Please use a different version.');
    
    // Check for .version-frozen marker
    const frozenMarker = path.join(versionDir, '.version-frozen');
    if (await fs.pathExists(frozenMarker)) {
      const frozenContent = await fs.readFile(frozenMarker, 'utf8');
      const dateMatch = frozenContent.match(/\d{4}-\d{2}-\d{2}/);
      if (dateMatch) {
        info(`This version was frozen on ${dateMatch[0]}`);
      }
    }
    process.exit(1);
  }
  
  // Prompt for new development version
  console.log();
  const newVersion = await input({
    message: 'Enter the new development version (e.g., v1.1.0):',
    validate: (value) => {
      if (!value) return 'Version is required';
      if (!value.match(/^v?\d+\.\d+\.\d+([-+].*)?$/)) {
        return 'Invalid version format. Use semantic versioning (e.g., v1.1.0)';
      }
      return true;
    }
  });
  
  // Ensure new version has 'v' prefix
  let newVersionPrefixed = newVersion;
  if (!newVersionPrefixed.startsWith('v')) {
    newVersionPrefixed = 'v' + newVersion;
  }
  
  // Check that new version is greater than current version
  if (!versionGreaterThan(newVersionPrefixed, currentVersion)) {
    warning(`New version (${newVersionPrefixed}) should be greater than current version (${currentVersion})`);
    const continueAnyway = await confirm({
      message: 'Continue anyway?',
      default: false
    });
    if (!continueAnyway) {
      process.exit(1);
    }
  }
  
  // Display summary and confirm
  console.log();
  console.log(chalk.cyan('======================================'));
  console.log(chalk.cyan('   Version Management Summary'));
  console.log(chalk.cyan('======================================'));
  console.log();
  console.log(`  Freeze version:  ${chalk.yellow(currentVersion)} (becomes immutable)`);
  console.log(`  New dev version: ${chalk.green(newVersionPrefixed)} (for future development)`);
  if (showLatest) {
    console.log(`  Latest label:    '${latestLabel}' (shown in navigation)`);
  } else {
    console.log(`  Latest version:  Hidden from navigation`);
  }
  console.log();
  console.log('This will:');
  console.log(`  1. Create a frozen copy at versions/${currentVersion}/`);
  console.log('  2. Update internal document links (preserving snippet/asset paths)');
  console.log('  3. Update docs.json with version configuration');
  console.log('  4. Update versions.json registry');
  console.log(`  5. Set ${newVersionPrefixed} as the new development version`);
  console.log();
  
  const proceed = await confirm({
    message: 'Proceed with version management?',
    default: true
  });
  
  if (!proceed) {
    info('Operation cancelled');
    process.exit(0);
  }
  
  // Execute the freeze operation
  console.log();
  info(`Starting version freeze for ${currentVersion}...`);
  
  // Create versions directory if it doesn't exist
  await fs.ensureDir('versions');
  
  // Create version directory and copy current docs
  info('Creating version directory...');
  await fs.ensureDir(versionDir);
  
  // Copy documentation directories
  info('Copying documentation files...');
  const dirsToCheck = ['getting-started', 'features', 'changelog', 'api', 'reference', 'documentation', 'guides', 'tutorials'];
  
  for (const dir of dirsToCheck) {
    if (await fs.pathExists(dir)) {
      info(`Copying ${dir} directory...`);
      await fs.copy(dir, path.join(versionDir, dir));
    }
  }
  
  // Copy root MDX files
  const rootMdxFiles = await glob('*.mdx');
  for (const file of rootMdxFiles) {
    await fs.copy(file, path.join(versionDir, file));
  }
  
  // Copy assets
  if (await fs.pathExists('images')) {
    info('Copying images...');
    await fs.copy('images', path.join(versionDir, 'images'));
  }
  
  if (await fs.pathExists('assets')) {
    info('Copying assets...');
    await fs.copy('assets', path.join(versionDir, 'assets'));
  }
  
  // Update internal links in versioned files
  info('Updating internal document links...');
  await updateInternalLinks(versionDir, currentVersion);
  
  // Update versions.json
  info('Updating versions.json...');
  
  // Add frozen version if not exists
  if (!versionsData.versions.includes(currentVersion)) {
    versionsData.versions.push(currentVersion);
  }
  
  // Sort versions
  versionsData.versions = sortVersions(versionsData.versions);
  
  // Update current and default versions
  versionsData.currentVersion = newVersionPrefixed;
  versionsData.defaultVersion = currentVersion;
  
  await fs.writeJson(versionsPath, versionsData, { spaces: 2 });
  success('Updated versions.json');
  
  // Update docs.json navigation
  info('Updating docs.json navigation...');
  const docsConfig = await fs.readJson('docs.json');
  
  // Ensure navigation.versions exists
  if (!docsConfig.navigation) {
    docsConfig.navigation = {};
  }
  if (!docsConfig.navigation.versions) {
    docsConfig.navigation.versions = [];
  }
  
  // Find or create latest/next navigation
  let latestNav = docsConfig.navigation.versions.find(v => 
    v.version === latestLabel || v.version === 'latest' || v.version === 'next' || v.version === 'main'
  );
  
  if (!latestNav && showLatest) {
    // Create from current navigation if no latest exists
    latestNav = {
      version: latestLabel,
      default: true,
      tabs: docsConfig.navigation.tabs || []
    };
    docsConfig.navigation.versions.unshift(latestNav);
  } else if (latestNav && showLatest) {
    // Update the version label
    latestNav.version = latestLabel;
    latestNav.default = true;
  } else if (latestNav && !showLatest) {
    // Remove latest from navigation if not showing
    const index = docsConfig.navigation.versions.findIndex(v => v === latestNav);
    if (index > -1) {
      docsConfig.navigation.versions.splice(index, 1);
    }
  }
  
  // Create frozen version navigation
  if (showLatest && latestNav) {
    const frozenNav = JSON.parse(JSON.stringify(latestNav));
    frozenNav.version = currentVersion;
    delete frozenNav.default;
    
    // Update paths in frozen navigation
    frozenNav.tabs = updateNavigationPaths(frozenNav.tabs, '', `versions/${currentVersion}/`);
    
    // Add or update frozen version in navigation
    const existingIndex = docsConfig.navigation.versions.findIndex(v => v.version === currentVersion);
    if (existingIndex >= 0) {
      docsConfig.navigation.versions[existingIndex] = frozenNav;
    } else {
      const insertIndex = showLatest ? 1 : 0;
      docsConfig.navigation.versions.splice(insertIndex, 0, frozenNav);
    }
  }
  
  // Sort navigation versions
  docsConfig.navigation.versions.sort((a, b) => {
    if (a.version === latestLabel) return -1;
    if (b.version === latestLabel) return 1;
    
    const pa = parseVersion(a.version);
    const pb = parseVersion(b.version);
    
    if (!pa || !pb) return 0;
    
    if (pb.major !== pa.major) return pb.major - pa.major;
    if (pb.minor !== pa.minor) return pb.minor - pa.minor;
    if (pb.patch !== pa.patch) return pb.patch - pa.patch;
    
    if (!pa.prerelease && pb.prerelease) return -1;
    if (pa.prerelease && !pb.prerelease) return 1;
    return pb.prerelease.localeCompare(pa.prerelease);
  });
  
  await fs.writeJson('docs.json', docsConfig, { spaces: 2 });
  success('Updated docs.json');
  
  // Create marker files in frozen version
  const frozenDate = new Date().toISOString().split('T')[0];
  await fs.writeFile(
    path.join(versionDir, '.version-frozen'),
    `${currentVersion} - Frozen on ${frozenDate}`
  );
  
  // Add metadata
  const metadata = {
    version: currentVersion,
    frozenDate: frozenDate,
    frozenTimestamp: new Date().toISOString(),
    nextVersion: newVersionPrefixed,
    frozenBy: process.env.USER || 'unknown',
    gitCommit: 'not-in-git',
    nodeVersion: process.version
  };
  
  // Try to get git commit
  try {
    const gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    metadata.gitCommit = gitCommit;
  } catch (e) {
    // Ignore git errors
  }
  
  await fs.writeJson(
    path.join(versionDir, '.version-metadata.json'),
    metadata,
    { spaces: 2 }
  );
  
  // Display completion message
  console.log();
  success('Version management completed successfully!');
  console.log();
  console.log(chalk.cyan('======================================'));
  console.log(chalk.cyan('   Status'));
  console.log(chalk.cyan('======================================'));
  console.log();
  console.log(`  ${chalk.green('✓')} Version ${currentVersion} has been frozen (immutable)`);
  console.log(`  ${chalk.green('✓')} Development continues on version ${newVersionPrefixed}`);
  console.log(`  ${chalk.green('✓')} docs.json updated with version configuration`);
  console.log(`  ${chalk.green('✓')} versions.json updated with version registry`);
  if (showLatest) {
    console.log(`  ${chalk.green('✓')} Latest version shown as '${latestLabel}' in navigation`);
  } else {
    console.log(`  ${chalk.green('✓')} Latest version hidden from navigation`);
  }
  console.log();
  console.log(chalk.cyan('======================================'));
  console.log(chalk.cyan('   Next Steps'));
  console.log(chalk.cyan('======================================'));
  console.log();
  console.log('  1. Review the changes:');
  console.log(`     ${chalk.blue('git status')}`);
  console.log();
  console.log('  2. Stage and commit the changes:');
  console.log(`     ${chalk.blue('git add -A')}`);
  console.log(`     ${chalk.blue(`git commit -m "docs: freeze ${currentVersion} and begin ${newVersionPrefixed} development"`)}`);
  console.log();
  console.log('  3. Push to repository:');
  console.log(`     ${chalk.blue('git push')}`);
  console.log();
  console.log(`  4. Continue development for version ${newVersionPrefixed}`);
  console.log();
}

// Run the script
manageVersions().catch(err => {
  error(`An error occurred: ${err.message}`);
  if (err.stack) {
    console.error(chalk.gray(err.stack));
  }
  process.exit(1);
});