import fs from 'fs-extra';
import path from 'path';
import { input, confirm, select } from '@inquirer/prompts';
import chalk from 'chalk';

/**
 * Enhanced versioning system inspired by ../docs versioning with improvements
 * - Better cross-platform compatibility
 * - Enhanced path management
 * - External changelog integration
 * - Rollback capabilities
 * - Rich metadata tracking
 */

// Enhanced version manager with better path handling
export function generateEnhancedVersionManagerScript(projectName, config = {}) {
  return `#!/usr/bin/env node

// Enhanced Version Manager for ${projectName}
// Cross-platform JavaScript implementation with bash fallback

import fs from 'fs-extra';
import path from 'path';
import { input, confirm, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { execSync } from 'child_process';

// Configuration
const CONFIG = {
  projectName: '${projectName}',
  docsDir: 'docs',
  versionsDir: 'versions', 
  snippetsDir: 'snippets',
  assetsDir: 'assets',
  workingVersion: '${config.workingVersion || 'next'}',
  externalRepo: '${config.externalRepo || ''}',
  preservePaths: ['snippets', 'assets', 'images', 'static'],
  ...${JSON.stringify(config, null, 2)}
};

// Color output functions
const print = {
  info: (msg) => console.log(chalk.blue('ℹ') + ' ' + msg),
  success: (msg) => console.log(chalk.green('✓') + ' ' + msg),
  warning: (msg) => console.log(chalk.yellow('⚠') + ' ' + msg),
  error: (msg) => console.log(chalk.red('✗') + ' ' + msg)
};

// Enhanced semantic version parsing
function parseSemanticVersion(version) {
  const match = version.replace(/^v/, '').match(/^(\\d+)\\.(\\d+)\\.(\\d+)(?:-(\\w+)(?:\\.(\\d+))?)?$/);
  if (!match) return null;
  
  return {
    major: parseInt(match[1]),
    minor: parseInt(match[2]), 
    patch: parseInt(match[3]),
    prerelease: match[4] || null,
    prereleaseNumber: match[5] ? parseInt(match[5]) : null,
    original: version
  };
}

function compareVersions(a, b) {
  const vA = parseSemanticVersion(a);
  const vB = parseSemanticVersion(b);
  
  if (!vA || !vB) return 0;
  
  // Compare major.minor.patch
  if (vA.major !== vB.major) return vB.major - vA.major;
  if (vA.minor !== vB.minor) return vB.minor - vA.minor;
  if (vA.patch !== vB.patch) return vB.patch - vA.patch;
  
  // Handle prerelease versions
  if (!vA.prerelease && vB.prerelease) return -1;
  if (vA.prerelease && !vB.prerelease) return 1;
  if (vA.prerelease && vB.prerelease) {
    const preOrder = { alpha: 1, beta: 2, rc: 3 };
    const aOrder = preOrder[vA.prerelease] || 0;
    const bOrder = preOrder[vB.prerelease] || 0;
    if (aOrder !== bOrder) return bOrder - aOrder;
    return (vB.prereleaseNumber || 0) - (vA.prereleaseNumber || 0);
  }
  
  return 0;
}

// Enhanced path management with pattern matching
function updateDocumentPaths(content, fromVersion, toVersion) {
  // Update internal document links but preserve snippets, assets, etc.
  const preservePatterns = CONFIG.preservePaths.map(p => 
    new RegExp(\`\\\\/(\\$\{p\\})\\\\//\`, 'g')
  );
  
  let updated = content;
  
  // Check if any preserve patterns match
  const hasPreservePaths = preservePatterns.some(pattern => pattern.test(content));
  
  if (!hasPreservePaths) {
    // Safe to update document paths
    const fromPrefix = \`/\${fromVersion}/\`;
    const toPrefix = \`/\${toVersion}/\`;
    updated = updated.replace(new RegExp(fromPrefix, 'g'), toPrefix);
  } else {
    // Careful path replacement - only update document paths
    const lines = updated.split('\\n');
    updated = lines.map(line => {
      let updatedLine = line;
      
      // Skip lines with preserve patterns
      const hasPreservePath = preservePatterns.some(pattern => pattern.test(line));
      if (!hasPreservePath) {
        const fromPrefix = \`/\${fromVersion}/\`;
        const toPrefix = \`/\${toVersion}/\`;
        updatedLine = updatedLine.replace(new RegExp(fromPrefix, 'g'), toPrefix);
      }
      
      return updatedLine;
    }).join('\\n');
  }
  
  return updated;
}

// Backup and rollback system
async function createBackup(sourceDir, backupSuffix = 'backup') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = \`\${sourceDir}-\${backupSuffix}-\${timestamp}\`;
  
  if (await fs.pathExists(sourceDir)) {
    await fs.copy(sourceDir, backupDir);
    print.info(\`Created backup: \${backupDir}\`);
    return backupDir;
  }
  return null;
}

async function rollback(backupDir, targetDir) {
  if (backupDir && await fs.pathExists(backupDir)) {
    if (await fs.pathExists(targetDir)) {
      await fs.remove(targetDir);
    }
    await fs.move(backupDir, targetDir);
    print.success(\`Rolled back to: \${targetDir}\`);
  }
}

// External changelog integration
async function fetchExternalChangelog(repo, version = 'latest') {
  if (!repo || !CONFIG.externalRepo) return null;
  
  try {
    print.info(\`Fetching changelog from \${repo}...\`);
    
    // Try to fetch changelog via GitHub API
    const response = await fetch(\`https://api.github.com/repos/\${repo}/releases/\${version === 'latest' ? 'latest' : \`tags/\${version}\`}\`);
    
    if (response.ok) {
      const release = await response.json();
      return {
        version: release.tag_name,
        body: release.body,
        published_at: release.published_at,
        html_url: release.html_url
      };
    }
  } catch (error) {
    print.warning(\`Failed to fetch changelog: \${error.message}\`);
  }
  
  return null;
}

// Enhanced metadata generation
function generateVersionMetadata(version, nextVersion, options = {}) {
  return {
    version,
    frozenDate: new Date().toISOString().split('T')[0],
    frozenTimestamp: new Date().toISOString(),
    nextVersion,
    frozenBy: process.env.USER || process.env.USERNAME || 'unknown',
    gitCommit: (() => {
      try {
        return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
      } catch {
        return 'not-in-git';
      }
    })(),
    nodeVersion: process.version,
    platform: process.platform,
    automated: options.automated || false,
    externalRepo: CONFIG.externalRepo,
    changelogUrl: options.changelogUrl,
    ...options.metadata
  };
}

// Main version freeze function
async function freezeVersion() {
  console.log(chalk.cyan.bold(\`\\n📚 \${CONFIG.projectName} Version Manager\`));
  console.log(chalk.gray('Enhanced cross-platform versioning system\\n'));

  try {
    // 1. Determine current version
    const versionsJsonPath = path.join(process.cwd(), 'versions.json');
    let versionsData = { versions: [], defaultVersion: null, currentVersion: null };
    
    if (await fs.pathExists(versionsJsonPath)) {
      versionsData = await fs.readJson(versionsJsonPath);
    }
    
    let currentVersion = versionsData.currentVersion;
    if (!currentVersion) {
      currentVersion = await input({
        message: 'Enter the current version to freeze (e.g., v1.0.0):',
        validate: (value) => {
          const parsed = parseSemanticVersion(value);
          return parsed ? true : 'Invalid semantic version format (e.g., v1.0.0)';
        }
      });
    }
    
    // 2. Get new development version
    const suggestedNext = (() => {
      const parsed = parseSemanticVersion(currentVersion);
      if (parsed) {
        return \`v\${parsed.major}.\${parsed.minor}.\${parsed.patch + 1}\`;
      }
      return 'v1.0.1';
    })();
    
    const nextVersion = await input({
      message: 'Enter the new development version:',
      default: suggestedNext,
      validate: (value) => {
        const parsed = parseSemanticVersion(value);
        if (!parsed) return 'Invalid semantic version format';
        
        const currentParsed = parseSemanticVersion(currentVersion);
        if (currentParsed && compareVersions(value, currentVersion) >= 0) {
          return 'New version should be greater than current version';
        }
        
        return true;
      }
    });
    
    // 3. Check for external changelog
    let changelogData = null;
    if (CONFIG.externalRepo) {
      const fetchChangelog = await confirm({
        message: \`Fetch changelog from \${CONFIG.externalRepo}?\`,
        default: true
      });
      
      if (fetchChangelog) {
        changelogData = await fetchExternalChangelog(CONFIG.externalRepo, currentVersion);
      }
    }
    
    // 4. Confirm operation
    console.log(chalk.yellow('\\n📋 Version Freeze Summary:'));
    console.log(\`   Current version: \${chalk.green(currentVersion)} → \${chalk.blue('frozen')}\`);
    console.log(\`   New development: \${chalk.green(nextVersion)}\`);
    if (changelogData) {
      console.log(\`   Changelog: \${chalk.blue('✓ Available')}\`);
    }
    
    const proceed = await confirm({
      message: 'Proceed with version freeze?',
      default: true
    });
    
    if (!proceed) {
      print.info('Operation cancelled');
      return;
    }
    
    // 5. Create backups
    const docsBackup = await createBackup(CONFIG.docsDir, 'pre-freeze');
    const versionsBackup = await createBackup('versions.json', 'versions');
    
    try {
      // 6. Execute freeze
      print.info(\`Freezing version \${currentVersion}...\`);
      
      // Create version directory
      const versionDir = path.join('versions', currentVersion);
      await fs.ensureDir(versionDir);
      
      // Copy current docs
      if (await fs.pathExists(CONFIG.docsDir)) {
        await fs.copy(CONFIG.docsDir, versionDir);
        print.success(\`Copied documentation to \${versionDir}\`);
      }
      
      // Update internal links in frozen version
      print.info('Updating internal document links...');
      const mdxFiles = await fs.readdir(versionDir).then(files => 
        files.filter(f => f.endsWith('.mdx'))
      );
      
      for (const file of mdxFiles) {
        const filePath = path.join(versionDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        const updated = updateDocumentPaths(content, CONFIG.workingVersion, currentVersion);
        await fs.writeFile(filePath, updated);
      }
      
      // Create version metadata
      const metadata = generateVersionMetadata(currentVersion, nextVersion, {
        changelogUrl: changelogData?.html_url,
        automated: false,
        metadata: {
          hasExternalChangelog: !!changelogData,
          frozenFiles: mdxFiles.length
        }
      });
      
      await fs.writeFile(
        path.join(versionDir, '.version-frozen'),
        \`\${currentVersion} - Frozen on \${metadata.frozenDate}\`
      );
      
      await fs.writeJson(
        path.join(versionDir, '.version-metadata.json'),
        metadata,
        { spaces: 2 }
      );
      
      // Update versions registry
      if (!versionsData.versions.includes(currentVersion)) {
        versionsData.versions.push(currentVersion);
        versionsData.versions.sort(compareVersions);
      }
      
      versionsData.currentVersion = nextVersion;
      versionsData.defaultVersion = currentVersion;
      
      await fs.writeJson(versionsJsonPath, versionsData, { spaces: 2 });
      
      // Clean up backups on success
      if (docsBackup) await fs.remove(docsBackup);
      if (versionsBackup) await fs.remove(versionsBackup);
      
      print.success(\`\\nVersion \${currentVersion} frozen successfully.\`);
      print.info(\`Development continues on \${nextVersion}\`);
      print.info(\`Frozen documentation: versions/\${currentVersion}/\`);
      
      if (changelogData) {
        print.info(\`Changelog: \${changelogData.html_url}\`);
      }
      
    } catch (error) {
      print.error(\`Version freeze failed: \${error.message}\`);
      
      // Attempt rollback
      print.info('Attempting rollback...');
      if (docsBackup) await rollback(docsBackup, CONFIG.docsDir);
      if (versionsBackup) await rollback(versionsBackup, 'versions.json');
      
      throw error;
    }
    
  } catch (error) {
    print.error(\`Error: \${error.message}\`);
    process.exit(1);
  }
}

// Export for programmatic use
export { freezeVersion, parseSemanticVersion, compareVersions };

// Run if called directly
if (import.meta.url === \`file://\${process.argv[1]}\`) {
  freezeVersion();
}
`;
}

// Enhanced versions.json structure
export function generateVersionsRegistry(config = {}) {
  return {
    versions: [],
    defaultVersion: null,
    currentVersion: config.initialVersion || 'v1.0.0',
    workingVersion: config.workingVersion || 'next',
    latestLabel: config.latestLabel || 'latest',
    showLatest: config.showLatest !== false,
    externalRepo: config.externalRepo || null,
    lastUpdated: new Date().toISOString(),
    versioningConfig: {
      preservePaths: ['snippets', 'assets', 'images', 'static'],
      autoChangelog: !!config.externalRepo,
      semanticVersioning: true,
      ...config
    }
  };
}

// Enhanced setup function that creates everything needed
export async function setupEnhancedVersioning(outputDir, config = {}) {
  console.log(chalk.yellow('\n🔧 Enhanced Versioning System Setup'));
  
  const enableVersioning = await confirm({
    message: 'Enable enhanced versioning system?',
    default: true
  });

  if (!enableVersioning) return null;

  // Gather configuration
  const versioningConfig = {
    initialVersion: await input({
      message: 'Initial version (e.g., v1.0.0):',
      default: 'v1.0.0',
      validate: (value) => {
        const parsed = parseSemanticVersion(value.startsWith('v') ? value : `v${value}`);
        return parsed ? true : 'Invalid semantic version format';
      }
    }),

    workingVersion: await select({
      message: 'Working directory name:',
      choices: [
        { name: 'next (recommended)', value: 'next' },
        { name: 'main', value: 'main' },
        { name: 'latest', value: 'latest' },
        { name: 'current', value: 'current' }
      ],
      default: 'next'
    }),

    externalRepo: '',
    projectName: config.projectName || 'Documentation'
  };

  // Check for external changelog
  const useExternalChangelog = await confirm({
    message: 'Enable external changelog integration?',
    default: false
  });

  if (useExternalChangelog) {
    versioningConfig.externalRepo = await input({
      message: 'Repository (format: owner/repo):',
      validate: (value) => {
        if (value && !value.match(/^[^/]+\/[^/]+$/)) {
          return 'Invalid format. Use: owner/repo';
        }
        return true;
      }
    });
  }

  // Create versioning structure
  console.log(chalk.cyan('\n📁 Creating versioning structure...'));

  // Create directories
  const versionsDir = path.join(outputDir, 'versions');
  const scriptsDir = path.join(outputDir, 'scripts');
  await fs.ensureDir(versionsDir);
  await fs.ensureDir(scriptsDir);

  // Generate enhanced version manager
  const versionManagerPath = path.join(scriptsDir, 'enhanced-version-manager.js');
  await fs.writeFile(
    versionManagerPath,
    generateEnhancedVersionManagerScript(versioningConfig.projectName, versioningConfig)
  );

  // Create enhanced versions.json
  const versionsData = generateVersionsRegistry(versioningConfig);
  await fs.writeJson(path.join(outputDir, 'versions.json'), versionsData, { spaces: 2 });

  // Create package.json scripts if it exists
  const packageJsonPath = path.join(outputDir, 'package.json');
  if (await fs.pathExists(packageJsonPath)) {
    const packageJson = await fs.readJson(packageJsonPath);
    packageJson.scripts = packageJson.scripts || {};
    packageJson.scripts['version:freeze'] = 'node scripts/enhanced-version-manager.js';
    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
  }

  console.log(chalk.green('✅ Enhanced versioning system setup complete!'));
  console.log(chalk.cyan('\n📖 Usage:'));
  console.log('  • Freeze version: node scripts/enhanced-version-manager.js');
  console.log('  • Or via npm: npm run version:freeze');
  
  return versioningConfig;
}

// Helper to parse semantic version
function parseSemanticVersion(version) {
  const match = version.replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)(?:-(\w+)(?:\.(\d+))?)?$/);
  if (!match) return null;
  
  return {
    major: parseInt(match[1]),
    minor: parseInt(match[2]), 
    patch: parseInt(match[3]),
    prerelease: match[4] || null,
    prereleaseNumber: match[5] ? parseInt(match[5]) : null,
    original: version
  };
}