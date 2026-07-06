import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';
import { input, select, confirm } from '@inquirer/prompts';
import { normalizeDocsConfig } from './current-mintlify.js';

/**
 * Directory Structure Adapter for Mintlifier Versioning
 * Automatically detects and adapts to different Mintlify project structures
 */

// Common Mintlify project patterns
const STRUCTURE_PATTERNS = {
  // Root-level docs (docs.json in project root)
  root: {
    name: 'Root-level Documentation',
    detect: async (projectPath) => {
      return await fs.pathExists(path.join(projectPath, 'docs.json')) ||
             await fs.pathExists(path.join(projectPath, 'mint.json'));
    },
    structure: {
      configFile: 'docs.json',
      contentDir: '.',
      assetsDir: 'images',
      snippetsDir: 'snippets',
      versionsDir: 'versions'
    }
  },

  // Docs subdirectory (docs.json inside docs/ folder)
  docs_subdir: {
    name: 'Docs Subdirectory',
    detect: async (projectPath) => {
      return await fs.pathExists(path.join(projectPath, 'docs', 'docs.json')) ||
             await fs.pathExists(path.join(projectPath, 'docs', 'mint.json'));
    },
    structure: {
      configFile: 'docs/docs.json',
      contentDir: 'docs',
      assetsDir: 'docs/images',
      snippetsDir: 'docs/snippets', 
      versionsDir: 'docs/versions'
    }
  },

  // Content subdirectory (docs.json in root, content in subdirectory)
  content_subdir: {
    name: 'Content Subdirectory',
    detect: async (projectPath) => {
      const hasConfig = await fs.pathExists(path.join(projectPath, 'docs.json')) ||
                       await fs.pathExists(path.join(projectPath, 'mint.json'));
      const hasContentDir = await fs.pathExists(path.join(projectPath, 'content')) ||
                           await fs.pathExists(path.join(projectPath, 'pages'));
      return hasConfig && hasContentDir;
    },
    structure: {
      configFile: 'docs.json',
      contentDir: 'content',
      assetsDir: 'assets',
      snippetsDir: 'snippets',
      versionsDir: 'versions'
    }
  },

  // Monorepo docs (docs in packages/docs or similar)
  monorepo: {
    name: 'Monorepo Documentation',
    detect: async (projectPath) => {
      const patterns = ['packages/docs', 'apps/docs', 'docs-site'];
      for (const pattern of patterns) {
        const configPath = path.join(projectPath, pattern, 'docs.json');
        const legacyPath = path.join(projectPath, pattern, 'mint.json');
        if (await fs.pathExists(configPath) || await fs.pathExists(legacyPath)) {
          return pattern;
        }
      }
      return false;
    },
    structure: {
      configFile: 'docs.json',
      contentDir: '.',
      assetsDir: 'images',
      snippetsDir: 'snippets',
      versionsDir: 'versions'
    }
  }
};

function resolveConfigPaths(projectPath, structure) {
  const basePath = path.join(projectPath, structure.basePath || '.');
  const configuredPath = path.join(basePath, structure.configFile);
  const docsPath = configuredPath.endsWith('docs.json')
    ? configuredPath
    : configuredPath.replace(/mint\.json$/, 'docs.json');
  const mintPath = docsPath.replace(/docs\.json$/, 'mint.json');

  return {
    basePath,
    docsPath,
    mintPath
  };
}

async function resolveExistingConfigPath(projectPath, structure) {
  const paths = resolveConfigPaths(projectPath, structure);

  if (await fs.pathExists(paths.docsPath)) {
    return { path: paths.docsPath, format: 'docs.json', ...paths };
  }

  if (await fs.pathExists(paths.mintPath)) {
    return { path: paths.mintPath, format: 'mint.json', ...paths };
  }

  return { path: paths.docsPath, format: null, ...paths };
}

/**
 * Detect the current project structure
 */
export async function detectProjectStructure(projectPath = process.cwd()) {
  console.log(chalk.cyan('🔍 Detecting project structure...'));

  const detectedStructures = [];

  // Test each structure pattern
  for (const [key, pattern] of Object.entries(STRUCTURE_PATTERNS)) {
    const detected = await pattern.detect(projectPath);
    if (detected) {
      detectedStructures.push({
        type: key,
        name: pattern.name,
        structure: pattern.structure,
        basePath: typeof detected === 'string' ? detected : '.'
      });
    }
  }

  if (detectedStructures.length === 0) {
    console.log(chalk.yellow('⚠ No standard Mintlify structure detected'));
    return null;
  }

  if (detectedStructures.length === 1) {
    const detected = detectedStructures[0];
    console.log(chalk.green(`✓ Detected: ${detected.name}`));
    return detected;
  }

  // Multiple structures detected, ask user to choose
  console.log(chalk.yellow('Multiple structures detected:'));
  const choice = await select({
    message: 'Which structure should we use?',
    choices: detectedStructures.map(s => ({
      name: s.name,
      value: s
    }))
  });

  return choice;
}

/**
 * Analyze existing documentation files
 */
export async function analyzeDocumentationFiles(projectPath, structure) {
  const analysis = {
    mdxFiles: [],
    directories: [],
    assets: [],
    config: null,
    totalFiles: 0
  };

  const contentPath = path.join(projectPath, structure.basePath || '.', structure.contentDir === '.' ? '' : structure.contentDir);
  
  console.log(chalk.cyan(`📊 Analyzing files in: ${contentPath}`));

  try {
    // Find all MDX files
    const mdxPattern = path.join(contentPath, '**/*.mdx');
    analysis.mdxFiles = await glob(mdxPattern, { 
      ignore: ['**/node_modules/**', '**/versions/**', '**/.git/**']
    });
    
    // Find directories with content
    const allFiles = await glob(path.join(contentPath, '**/*'), {
      ignore: ['**/node_modules/**', '**/versions/**', '**/.git/**']
    });
    
    analysis.directories = [...new Set(
      allFiles
        .filter(f => fs.statSync(f).isDirectory())
        .map(f => path.relative(contentPath, f))
        .filter(f => f && !f.startsWith('.'))
    )];

    // Find asset files
    const assetPatterns = ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.svg', '**/*.gif', '**/*.webp'];
    for (const pattern of assetPatterns) {
      const assets = await glob(path.join(contentPath, pattern), {
        ignore: ['**/node_modules/**', '**/versions/**']
      });
      analysis.assets.push(...assets);
    }

    // Load config
    const configPath = await resolveExistingConfigPath(projectPath, structure);
    if (configPath.format) {
      analysis.config = normalizeDocsConfig(await fs.readJson(configPath.path));
    }

    analysis.totalFiles = analysis.mdxFiles.length + analysis.assets.length;

  } catch (error) {
    console.log(chalk.red(`Error analyzing files: ${error.message}`));
  }

  return analysis;
}

/**
 * Verify compatibility with versioning system
 */
export async function verifyVersioningCompatibility(projectPath, structure, analysis) {
  console.log(chalk.cyan('🔧 Verifying versioning compatibility...'));

  const issues = [];
  const recommendations = [];

  const configPath = await resolveExistingConfigPath(projectPath, structure);

  // Check for docs.json vs mint.json
  if (configPath.format === 'mint.json') {
    issues.push('Using legacy mint.json format');
    recommendations.push('Migrate to docs.json and normalize legacy fields');
  }

  // Check for navigation structure
  if (analysis.config) {
    if (Array.isArray(analysis.config.navigation)) {
      recommendations.push('Navigation uses legacy array format - can be converted to versioned format');
    } else if (!analysis.config.navigation?.versions) {
      recommendations.push('Navigation not using versioned format - can be upgraded');
    }
  }

  // Check for existing versions directory
  const versionsPath = path.join(projectPath, structure.basePath || '.', structure.versionsDir);
  if (await fs.pathExists(versionsPath)) {
    issues.push('Versions directory already exists');
  }

  // Check for reserved file conflicts
  const reservedFiles = ['versions.json', '.version-frozen', '.version-metadata.json'];
  for (const file of reservedFiles) {
    const filePath = path.join(projectPath, structure.basePath || '.', file);
    if (await fs.pathExists(filePath)) {
      issues.push(`Reserved versioning file exists: ${file}`);
    }
  }

  // Check directory structure compatibility
  const requiredDirs = [structure.contentDir, structure.snippetsDir, structure.assetsDir];
  for (const dir of requiredDirs) {
    if (dir !== '.') {
      const dirPath = path.join(projectPath, structure.basePath || '.', dir);
      if (!await fs.pathExists(dirPath)) {
        recommendations.push(`Create ${dir} directory for better organization`);
      }
    }
  }

  return {
    compatible: issues.length === 0,
    issues,
    recommendations,
    summary: {
      totalFiles: analysis.totalFiles,
      mdxFiles: analysis.mdxFiles.length,
      directories: analysis.directories.length,
      hasConfig: !!analysis.config,
      configFormat: configPath.format || 'missing'
    }
  };
}

/**
 * Adapt project structure for versioning
 */
export async function adaptProjectForVersioning(projectPath, structure, analysis) {
  console.log(chalk.cyan('🔄 Adapting project structure for versioning...'));

  const adaptations = [];

  try {
    // Create versions directory
    const versionsPath = path.join(projectPath, structure.basePath || '.', structure.versionsDir);
    if (!await fs.pathExists(versionsPath)) {
      await fs.ensureDir(versionsPath);
      adaptations.push(`Created versions directory: ${structure.versionsDir}`);
    }

    // Create scripts directory
    const scriptsPath = path.join(projectPath, structure.basePath || '.', 'scripts');
    if (!await fs.pathExists(scriptsPath)) {
      await fs.ensureDir(scriptsPath);
      adaptations.push('Created scripts directory');
    }

    // Ensure snippets directory exists
    const snippetsPath = path.join(projectPath, structure.basePath || '.', structure.snippetsDir);
    if (!await fs.pathExists(snippetsPath)) {
      await fs.ensureDir(snippetsPath);
      adaptations.push(`Created snippets directory: ${structure.snippetsDir}`);
    }

    // Ensure assets/images directory exists  
    const assetsPath = path.join(projectPath, structure.basePath || '.', structure.assetsDir);
    if (!await fs.pathExists(assetsPath)) {
      await fs.ensureDir(assetsPath);
      adaptations.push(`Created assets directory: ${structure.assetsDir}`);
    }

    // Migrate mint.json to docs.json if needed
    const configPath = await resolveExistingConfigPath(projectPath, structure);
    
    if (await fs.pathExists(configPath.mintPath) && !await fs.pathExists(configPath.docsPath)) {
      const mintConfig = normalizeDocsConfig(await fs.readJson(configPath.mintPath));
      await fs.writeJson(configPath.docsPath, mintConfig, { spaces: 2 });
      adaptations.push('Migrated mint.json to docs.json');
      
      const keepOld = await confirm({
        message: 'Keep original mint.json file?',
        default: false
      });
      
      if (!keepOld) {
        await fs.remove(configPath.mintPath);
        adaptations.push('Removed original mint.json');
      }
    }

    console.log(chalk.green('✅ Project structure adapted successfully'));
    adaptations.forEach(adaptation => {
      console.log(chalk.gray(`  • ${adaptation}`));
    });

    return {
      success: true,
      adaptations,
      finalStructure: {
        ...structure,
        versionsPath,
        scriptsPath,
        configPath: configPath.docsPath
      }
    };

  } catch (error) {
    console.log(chalk.red(`Error adapting project: ${error.message}`));
    return {
      success: false,
      error: error.message,
      adaptations
    };
  }
}

/**
 * Generate structure-specific versioning configuration
 */
export function generateStructureConfig(structure, projectPath) {
  const basePath = structure.basePath || '.';
  
  return {
    projectPath,
    basePath,
    docsDir: path.join(basePath, structure.contentDir === '.' ? '' : structure.contentDir),
    versionsDir: path.join(basePath, structure.versionsDir),
    snippetsDir: path.join(basePath, structure.snippetsDir),
    assetsDir: path.join(basePath, structure.assetsDir),
    configFile: path.join(basePath, structure.configFile),
    scriptsDir: path.join(basePath, 'scripts'),
    preservePaths: [
      structure.snippetsDir,
      structure.assetsDir,
      'images',
      'static',
      'public'
    ]
  };
}

/**
 * Main function to setup versioning for any project structure
 */
export async function setupVersioningForProject(projectPath = process.cwd()) {
  console.log(chalk.cyan.bold('Mintlifier Project Structure Setup\n'));

  // Step 1: Detect project structure
  const detectedStructure = await detectProjectStructure(projectPath);
  
  if (!detectedStructure) {
    console.log(chalk.red('❌ Unable to detect a compatible Mintlify project structure'));
    console.log(chalk.yellow('\nTo use Mintlifier versioning, your project needs:'));
    console.log('  • docs.json or mint.json configuration file');
    console.log('  • MDX documentation files');
    console.log('  • Proper Mintlify project structure');
    console.log('\nRefer to the migration guide for help setting up your project.');
    return null;
  }

  // Step 2: Analyze existing files
  const analysis = await analyzeDocumentationFiles(projectPath, detectedStructure);
  
  console.log(chalk.green('\n📁 Project Analysis:'));
  console.log(`  • Structure: ${detectedStructure.name}`);
  console.log(`  • MDX files: ${analysis.mdxFiles.length}`);  
  console.log(`  • Directories: ${analysis.directories.length}`);
  console.log(`  • Assets: ${analysis.assets.length}`);
  console.log(`  • Config format: ${detectedStructure.structure.configFile}`);

  // Step 3: Verify compatibility
  const compatibility = await verifyVersioningCompatibility(projectPath, detectedStructure, analysis);
  
  if (compatibility.issues.length > 0) {
    console.log(chalk.yellow('\n⚠ Compatibility Issues:'));
    compatibility.issues.forEach(issue => {
      console.log(chalk.red(`  • ${issue}`));
    });
  }

  if (compatibility.recommendations.length > 0) {
    console.log(chalk.blue('\n💡 Recommendations:'));
    compatibility.recommendations.forEach(rec => {
      console.log(chalk.gray(`  • ${rec}`));
    });
  }

  if (!compatibility.compatible) {
    const proceed = await confirm({
      message: 'Continue setup despite compatibility issues?',
      default: true
    });
    
    if (!proceed) {
      console.log(chalk.yellow('Setup cancelled. Address issues and try again.'));
      return null;
    }
  }

  // Step 4: Adapt project structure
  const adaptation = await adaptProjectForVersioning(projectPath, detectedStructure, analysis);
  
  if (!adaptation.success) {
    console.log(chalk.red(`❌ Failed to adapt project: ${adaptation.error}`));
    return null;
  }

  // Step 5: Generate structure configuration
  const structureConfig = generateStructureConfig(detectedStructure, projectPath);

  console.log(chalk.green('\n✅ Project structure setup complete!'));
  console.log(chalk.cyan('\nNext steps:'));
  console.log('  1. Run: npx mintlifier versioning');
  console.log('  2. Configure your initial version');
  console.log('  3. Start using version freezing with: npx mintlifier freeze');

  return {
    structure: detectedStructure,
    analysis,
    compatibility,
    adaptation,
    config: structureConfig
  };
}
