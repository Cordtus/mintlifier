#!/usr/bin/env node

import { input, select, confirm, checkbox, number } from '@inquirer/prompts';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import ora from 'ora';
import os from 'os';
import { editExistingConfig } from './lib/config-editor.js';
import {
  CURRENT_CONTEXTUAL_OPTIONS,
  CURRENT_ICON_LIBRARIES,
  CURRENT_MINTLIFY_THEMES,
  normalizeDocsConfig
} from './lib/current-mintlify.js';
import {
  planGeneratedPages,
  prefixNavigationPages
} from './lib/page-planner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to expand tilde paths
function expandTildePath(filePath) {
  if (filePath && filePath.startsWith('~')) {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
}

// Helper function to make paths relative for docs.json
function makeRelativePath(filePath) {
  // Expand tilde first
  const expanded = expandTildePath(filePath);
  // If it's an absolute path, just use the filename
  if (expanded && path.isAbsolute(expanded)) {
    return '/' + path.basename(expanded);
  }
  return filePath;
}

// Main logic moved to end of file for proper execution

async function buildDocsConfig() {
  const config = {
    $schema: 'https://mintlify.com/docs.json'
  };

  // Required: Name
  config.name = await input({
    message: 'Documentation site name:',
    validate: (value) => value.trim() ? true : 'Name is required'
  });

  // Optional: Favicon
  const faviconInput = await input({
    message: 'Path to favicon file (.svg or .png, optional):',
    default: '/favicon.svg'
  });
  if (faviconInput.trim()) {
    config.favicon = makeRelativePath(faviconInput);
    config._originalFavicon = faviconInput; // Store original for copying
  }

  // Theme selection
  config.theme = await select({
    message: 'Select documentation theme:',
    choices: CURRENT_MINTLIFY_THEMES.map((theme) => ({
      name: theme === 'mint' ? 'Mint (Default)' : theme[0].toUpperCase() + theme.slice(1),
      value: theme
    })),
    default: 'mint'
  });

  // Colors configuration
  console.log(chalk.yellow('\n Color Configuration'));

  config.colors = {};
  config.colors.primary = await input({
    message: 'Primary color (hex):',
    default: '#0D9373',
    validate: (value) => /^#[0-9A-F]{6}$/i.test(value) ? true : 'Please enter a valid hex color'
  });

  const useAdvancedColors = await confirm({
    message: 'Configure advanced color options?',
    default: false
  });

  if (useAdvancedColors) {
    config.colors.light = await input({
      message: 'Light mode color (hex):',
      default: '#07C983',
      validate: (value) => /^#[0-9A-F]{6}$/i.test(value) ? true : 'Please enter a valid hex color'
    });

    config.colors.dark = await input({
      message: 'Dark mode color (hex):',
      default: '#0D9373',
      validate: (value) => /^#[0-9A-F]{6}$/i.test(value) ? true : 'Please enter a valid hex color'
    });

    const useBackgroundColors = await confirm({
      message: 'Configure background colors?',
      default: false
    });

    if (useBackgroundColors) {
      config.background = config.background || {};
      config.background.color = {
        light: await input({
          message: 'Light mode background (hex):',
          default: '#FFFFFF',
          validate: (value) => /^#[0-9A-F]{6}$/i.test(value) ? true : 'Please enter a valid hex color'
        }),
        dark: await input({
          message: 'Dark mode background (hex):',
          default: '#0F1117',
          validate: (value) => /^#[0-9A-F]{6}$/i.test(value) ? true : 'Please enter a valid hex color'
        })
      };
    }

    const useBackgroundDecoration = await confirm({
      message: 'Configure a background decoration?',
      default: false
    });

    if (useBackgroundDecoration) {
      config.background = config.background || {};
      config.background.decoration = await select({
        message: 'Background decoration:',
        choices: [
          { name: 'Gradient', value: 'gradient' },
          { name: 'Grid', value: 'grid' },
          { name: 'Windows', value: 'windows' }
        ],
        default: 'gradient'
      });
    }
  }

  // Logo configuration
  const logoType = await select({
    message: 'Logo configuration:',
    choices: [
      { name: 'Single logo for all modes', value: 'single' },
      { name: 'Separate logos for light/dark mode', value: 'dual' },
      { name: 'No logo', value: 'none' }
    ]
  });

  if (logoType === 'single') {
    const logoInput = await input({
      message: 'Path to logo file:',
      default: '/logo.svg'
    });
    config.logo = makeRelativePath(logoInput);
    config._originalLogo = logoInput; // Store original for copying
  } else if (logoType === 'dual') {
    const lightLogoInput = await input({
      message: 'Light mode logo path:',
      default: '/logo-light.svg'
    });
    const darkLogoInput = await input({
      message: 'Dark mode logo path:',
      default: '/logo-dark.svg'
    });
    config.logo = {
      light: makeRelativePath(lightLogoInput),
      dark: makeRelativePath(darkLogoInput)
    };
    config._originalLogos = {
      light: lightLogoInput,
      dark: darkLogoInput
    };

    const addLogoHref = await confirm({
      message: 'Add link to logo?',
      default: false
    });

    if (addLogoHref) {
      config.logo.href = await input({
        message: 'Logo link URL:',
        default: 'https://yoursite.com'
      });
    }
  }

  // Additional styling options
  const addAdvancedStyling = await confirm({
    message: 'Configure advanced styling options?',
    default: false
  });

  if (addAdvancedStyling) {
    // Icon library
    const iconLibrary = await select({
      message: 'Select icon library:',
      choices: CURRENT_ICON_LIBRARIES.map((library) => ({
        name: library === 'lucide'
          ? 'Lucide (recommended)'
          : library === 'fontawesome'
            ? 'Font Awesome'
            : 'Tabler',
        value: library
      })),
      default: 'lucide'
    });

    config.icons = { library: iconLibrary };

    // Code block styling
    const codeblockStyle = await select({
      message: 'Code block color scheme:',
      choices: [
        { name: 'System (follows theme)', value: 'system' },
        { name: 'Dark', value: 'dark' }
      ],
      default: 'system'
    });

    config.styling = { codeblocks: codeblockStyle };

    // Contextual menu
    const addContextual = await confirm({
      message: 'Enable contextual menu options?',
      default: true
    });

    if (addContextual) {
      const contextualOptions = await checkbox({
        message: 'Select contextual menu options:',
        choices: CURRENT_CONTEXTUAL_OPTIONS.map((option) => ({
          name: option.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
          value: option,
          checked: ['copy', 'view', 'assistant'].includes(option)
        }))
      });

      if (contextualOptions.length > 0) {
        config.contextual = { options: contextualOptions };
      }
    }
  }

  // Navigation structure
  console.log(chalk.yellow('\n Navigation Configuration'));

  const navType = await select({
    message: 'Select navigation type:',
    choices: [
      { name: 'Simple (pages only)', value: 'simple' },
      { name: 'Grouped (with sections)', value: 'grouped' },
      { name: 'Tabbed (multiple tabs)', value: 'tabbed' },
      { name: 'Versioned (multiple versions)', value: 'versioned' }
    ],
    default: 'grouped'
  });

  config.navigation = {};

  if (navType === 'simple') {
    // Simple pages array
    const pageList = await input({
      message: 'Enter page paths (comma-separated):',
      default: 'index, getting-started, api-reference'
    });
    config.navigation.pages = pageList.split(',').map(p => p.trim());
  } else if (navType === 'grouped') {
    // Grouped navigation
    config.navigation.groups = [];
    let addMoreGroups = true;
    while (addMoreGroups) {
      const group = {};
      group.group = await input({
        message: 'Group name:',
        validate: (value) => value.trim() ? true : 'Group name is required'
      });

      const pageList = await input({
        message: 'Enter page paths for this group (comma-separated):',
        default: 'overview, quickstart'
      });
      group.pages = pageList.split(',').map(p => p.trim());

      config.navigation.groups.push(group);
      addMoreGroups = await confirm({
        message: 'Add another group?',
        default: false
      });
    }
  } else if (navType === 'tabbed') {
    // Tabbed navigation
    config.navigation.tabs = [];
    let addMoreTabs = true;
    while (addMoreTabs) {
      const tab = {};
      tab.tab = await input({
        message: 'Tab name:',
        validate: (value) => value.trim() ? true : 'Tab name is required'
      });

      const tabContent = await select({
        message: 'Tab content type:',
        choices: [
          { name: 'Pages', value: 'pages' },
          { name: 'Groups', value: 'groups' }
        ]
      });

      if (tabContent === 'pages') {
        const pageList = await input({
          message: 'Enter page paths (comma-separated):',
          default: 'index, overview'
        });
        tab.pages = pageList.split(',').map(p => p.trim());
      } else {
        tab.groups = [];
        const groupCount = await number({
          message: 'How many groups in this tab?',
          default: 1
        });
        for (let i = 0; i < groupCount; i++) {
          const group = {};
          group.group = await input({
            message: `Group ${i + 1} name:`
          });
          const pageList = await input({
            message: 'Enter page paths (comma-separated):'
          });
          group.pages = pageList.split(',').map(p => p.trim());
          tab.groups.push(group);
        }
      }

      config.navigation.tabs.push(tab);
      addMoreTabs = await confirm({
        message: 'Add another tab?',
        default: false
      });
    }
  } else {
    // Versioned navigation
    config.navigation.versions = [];
    let addMoreVersions = true;
    while (addMoreVersions) {
      const version = {};
      version.version = await input({
        message: 'Version identifier (e.g., v2.0, main):',
        validate: (value) => value.trim() ? true : 'Version is required'
      });
      
      version.default = await confirm({
        message: 'Is this the default version?',
        default: config.navigation.versions.length === 0
      });

      // Simple structure for version
      const pageList = await input({
        message: 'Enter page paths for this version (comma-separated):',
        default: 'index, changelog'
      });
      version.pages = pageList.split(',').map(p => p.trim());

      config.navigation.versions.push(version);
      addMoreVersions = await confirm({
        message: 'Add another version?',
        default: false
      });
    }
  }


  // API Documentation
  const hasOpenAPI = await confirm({
    message: 'Do you have OpenAPI/Swagger documentation?',
    default: false
  });

  if (hasOpenAPI) {
    config.api = config.api || {};

    const openAPICount = await number({
      message: 'How many OpenAPI spec files?',
      default: 1,
      validate: (value) => value > 0 ? true : 'Must have at least one file'
    });

    if (openAPICount === 1) {
      config.api.openapi = await input({
        message: 'Path to OpenAPI spec file:',
        default: '/openapi.json'
      });
    } else {
      config.api.openapi = [];
      for (let i = 0; i < openAPICount; i++) {
        const specPath = await input({
          message: `OpenAPI spec file ${i + 1} path:`,
          default: `/openapi-${i + 1}.json`
        });
        config.api.openapi.push(specPath);
      }
    }

    const hasBaseUrl = await confirm({
      message: 'Configure a base URL for MDX-authored API pages?',
      default: false
    });

    if (hasBaseUrl) {
      config.api.mdx = config.api.mdx || {};
      config.api.mdx.server = await input({
        message: 'MDX API server URL:',
        default: 'https://api.yoursite.com'
      });
    }

    const authMethod = await select({
      message: 'API authentication method:',
      choices: [
        { name: 'None', value: null },
        { name: 'Bearer Token', value: 'bearer' },
        { name: 'Basic Auth', value: 'basic' },
        { name: 'API Key', value: 'key' }
      ]
    });

    if (authMethod) {
      config.api.mdx = config.api.mdx || {};
      config.api.mdx.auth = { method: authMethod };
    }

    config.api.playground = {
      display: await select({
        message: 'API playground display:',
        choices: [
          { name: 'Interactive', value: 'interactive' },
          { name: 'Simple', value: 'simple' },
          { name: 'None', value: 'none' },
          { name: 'Authenticated users only', value: 'auth' }
        ],
        default: 'interactive'
      })
    };
  }

  // Footer configuration
  const configureFooter = await confirm({
    message: 'Configure footer?',
    default: false
  });

  if (configureFooter) {
    config.footer = {};

    const addSocials = await confirm({
      message: 'Add social media links?',
      default: true
    });

    if (addSocials) {
      const socialPlatforms = await checkbox({
        message: 'Select social platforms:',
        choices: [
          { name: 'X (Twitter)', value: 'x' },
          { name: 'GitHub', value: 'github' },
          { name: 'Discord', value: 'discord' },
          { name: 'Slack', value: 'slack' },
          { name: 'LinkedIn', value: 'linkedin' },
          { name: 'YouTube', value: 'youtube' },
          { name: 'Website', value: 'website' }
        ]
      });

      if (socialPlatforms.length > 0) {
        config.footer.socials = {};
        for (const platform of socialPlatforms) {
          config.footer.socials[platform] = await input({
            message: `${platform} URL:`,
            validate: (value) => value.trim() ? true : 'URL is required'
          });
        }
      }
    }
  }

  // Integrations
  const configureAnalytics = await confirm({
    message: 'Configure analytics integrations?',
    default: false
  });

  if (configureAnalytics) {
    const analyticsProvider = await select({
      message: 'Select analytics provider:',
      choices: [
        { name: 'Google Analytics 4', value: 'ga4' },
        { name: 'PostHog', value: 'posthog' },
        { name: 'Mixpanel', value: 'mixpanel' },
        { name: 'Amplitude', value: 'amplitude' },
        { name: 'Segment', value: 'segment' },
        { name: 'None', value: null }
      ]
    });

    if (analyticsProvider) {
      config.integrations = config.integrations || {};

      switch (analyticsProvider) {
        case 'ga4':
          config.integrations.ga4 = {
            measurementId: await input({
              message: 'GA4 Measurement ID (G-XXXXXXXXXX):',
              validate: (value) => value.startsWith('G-') ? true : 'Must start with G-'
            })
          };
          break;
        case 'posthog':
          config.integrations.posthog = {
            apiKey: await input({
              message: 'PostHog API Key (phc_...):',
              validate: (value) => value.startsWith('phc_') ? true : 'Must start with phc_'
            })
          };
          break;
        case 'mixpanel':
          config.integrations.mixpanel = {
            projectToken: await input({
              message: 'Mixpanel Project Token:',
              validate: (value) => value.trim() ? true : 'Token is required'
            })
          };
          break;
        case 'amplitude':
          config.integrations.amplitude = {
            apiKey: await input({
              message: 'Amplitude API Key:',
              validate: (value) => value.trim() ? true : 'API Key is required'
            })
          };
          break;
        case 'segment':
          config.integrations.segment = {
            key: await input({
              message: 'Segment Write Key:',
              validate: (value) => value.trim() ? true : 'Write Key is required'
            })
          };
          break;
      }
    }
  }

  // Features
  console.log(chalk.yellow('\n Feature Configuration'));

  // Telemetry controls dashboard feedback availability in current Mintlify.
  const disableTelemetry = await confirm({
    message: 'Disable Mintlify telemetry and dashboard feedback?',
    default: false
  });

  if (disableTelemetry) {
    config.integrations = config.integrations || {};
    config.integrations.telemetry = { enabled: false };
  }

  // Search
  const configureSearch = await confirm({
    message: 'Configure search settings?',
    default: false
  });

  if (configureSearch) {
    config.search = {
      prompt: await input({
        message: 'Custom search prompt:',
        default: 'Search documentation...'
      })
    };
  }

  // Appearance
  config.appearance = {
    default: await select({
      message: 'Default color mode:',
      choices: [
        { name: 'System', value: 'system' },
        { name: 'Light', value: 'light' },
        { name: 'Dark', value: 'dark' }
      ],
      default: 'system'
    }),
    strict: await confirm({
      message: 'Hide mode toggle button?',
      default: false
    })
  };


  return normalizeDocsConfig(config);
}

export async function generateInteractiveProject(config, {
  outputDir = process.cwd(),
  showProgress = true
} = {}) {
  const resolvedOutput = path.resolve(outputDir);
  const spinner = showProgress ? ora('Generating project structure...').start() : null;

  try {
    const generatedConfig = normalizeDocsConfig(config);
    generatedConfig.navigation = prefixNavigationPages(generatedConfig.navigation, 'docs');
    const pages = planGeneratedPages(generatedConfig.navigation);
    const cleanConfig = normalizeDocsConfig(generatedConfig);
    delete cleanConfig._originalFavicon;
    delete cleanConfig._originalLogo;
    delete cleanConfig._originalLogos;

    await fs.ensureDir(resolvedOutput);
    await fs.writeJson(path.join(resolvedOutput, 'docs.json'), cleanConfig, { spaces: 2 });

    for (const page of pages) {
      const pagePath = path.join(resolvedOutput, page.relativePath);
      const pageTitle = path.basename(page.reference)
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
      await fs.outputFile(pagePath, `---
title: ${pageTitle}
description: Add a short description.
---

# ${pageTitle}

Add your content here.
`);
    }

    await fs.ensureDir(path.join(resolvedOutput, 'assets'));
    await fs.ensureDir(path.join(resolvedOutput, 'snippets'));

    // Handle favicon
    if (config.favicon && !config.favicon.startsWith('http')) {
      const faviconPath = path.join(resolvedOutput, config.favicon.replace(/^\//, ''));
      await fs.ensureDir(path.dirname(faviconPath));

      // Try to copy the original file if it exists
      if (config._originalFavicon) {
        const originalPath = expandTildePath(config._originalFavicon);
        if (await fs.pathExists(originalPath)) {
          await fs.copy(originalPath, faviconPath);
        } else if (!await fs.pathExists(faviconPath)) {
          await fs.writeFile(faviconPath, '<!-- Add your favicon SVG here -->');
        }
      } else if (!await fs.pathExists(faviconPath)) {
        await fs.writeFile(faviconPath, '<!-- Add your favicon SVG here -->');
      }
    }

    // Handle logo files
    if (config.logo) {
      if (typeof config.logo === 'string') {
        const logoPath = path.join(resolvedOutput, config.logo.replace(/^\//, ''));
        await fs.ensureDir(path.dirname(logoPath));

        // Try to copy the original file if it exists
        if (config._originalLogo) {
          const originalPath = expandTildePath(config._originalLogo);
          if (await fs.pathExists(originalPath)) {
            await fs.copy(originalPath, logoPath);
          } else if (!await fs.pathExists(logoPath)) {
            await fs.writeFile(logoPath, '<!-- Add your logo SVG here -->');
          }
        } else if (!await fs.pathExists(logoPath)) {
          await fs.writeFile(logoPath, '<!-- Add your logo SVG here -->');
        }
      } else {
        // Handle dual logos
        if (config.logo.light && config._originalLogos?.light) {
          const lightPath = path.join(resolvedOutput, config.logo.light.replace(/^\//, ''));
          await fs.ensureDir(path.dirname(lightPath));
          const originalLight = expandTildePath(config._originalLogos.light);
          if (await fs.pathExists(originalLight)) {
            await fs.copy(originalLight, lightPath);
          } else if (!await fs.pathExists(lightPath)) {
            await fs.writeFile(lightPath, '<!-- Add your light logo SVG here -->');
          }
        }

        if (config.logo.dark && config._originalLogos?.dark) {
          const darkPath = path.join(resolvedOutput, config.logo.dark.replace(/^\//, ''));
          await fs.ensureDir(path.dirname(darkPath));
          const originalDark = expandTildePath(config._originalLogos.dark);
          if (await fs.pathExists(originalDark)) {
            await fs.copy(originalDark, darkPath);
          } else if (!await fs.pathExists(darkPath)) {
            await fs.writeFile(darkPath, '<!-- Add your dark logo SVG here -->');
          }
        }
      }
    }

    // Create OpenAPI spec placeholders
    if (cleanConfig.api?.openapi) {
      const specs = Array.isArray(cleanConfig.api.openapi) ? cleanConfig.api.openapi : [cleanConfig.api.openapi];
      for (const spec of specs) {
        if (!spec.startsWith('http')) {
          const specPath = path.join(resolvedOutput, spec.replace(/^\//, ''));
          await fs.ensureDir(path.dirname(specPath));
          if (!await fs.pathExists(specPath)) {
            await fs.writeJson(specPath, {
              openapi: '3.0.0',
              info: {
                title: 'Your API',
                version: '1.0.0'
              },
              paths: {}
            }, { spaces: 2 });
          }
        }
      }
    }

    spinner?.succeed('Project structure generated successfully');

    if (showProgress) {
      console.log(chalk.green('\nMintlify documentation project created.'));
      console.log(chalk.cyan(`Location: ${resolvedOutput}`));
      console.log(chalk.yellow('\nNext steps:'));
      console.log('  1. npx mint@latest dev');
      console.log('  2. npx mint@latest validate');
      console.log('  3. npx mint@latest broken-links');
    }

    return { outputDir: resolvedOutput, pages, config: cleanConfig };

  } catch (error) {
    spinner?.fail('Failed to generate project structure');
    throw error;
  }
}

async function main() {
  console.log(chalk.cyan.bold('\n Mintlifier - Mintlify docs.json Configuration Builder\n'));
  console.log(chalk.gray('Building for the current Mintlify docs.json schema\n'));

  // Handle command-line arguments
  const args = process.argv.slice(2);
  const isEditMode = args.includes('--edit') || args.includes('-e');
  const configPath = args.find(arg => arg.endsWith('.json'));

  try {
    // Handle direct edit mode from command line
    if (isEditMode) {
      const targetPath = configPath ? 
        path.resolve(expandTildePath(configPath)) : 
        path.join(process.cwd(), 'docs.json');
      
      if (!await fs.pathExists(targetPath)) {
        console.log(chalk.red(`✗ Configuration file not found: ${targetPath}`));
        console.log(chalk.yellow('Tip: Use without --edit flag to create a new configuration'));
        process.exit(1);
      }
      
      await editExistingConfig(targetPath);
      return;
    }

    // Check for existing docs.json in current directory
    const docsJsonPath = path.join(process.cwd(), 'docs.json');
    const hasDocsJson = await fs.pathExists(docsJsonPath);

    let mode = 'create';
    if (hasDocsJson) {
      console.log(chalk.green('✓ Found existing docs.json in current directory'));
      mode = await select({
        message: 'What would you like to do?',
        choices: [
          { name: 'Edit existing configuration', value: 'edit' },
          { name: 'Create new configuration (overwrites existing)', value: 'create' },
          { name: 'Exit', value: 'exit' }
        ]
      });

      if (mode === 'exit') {
        console.log(chalk.yellow('\n Exiting Mintlifier'));
        return;
      }
    }

    if (mode === 'edit') {
      await editExistingConfig(docsJsonPath);
    } else {
      const config = await buildDocsConfig();

      console.log(chalk.yellow('\n Configuration Summary:'));
      console.log(JSON.stringify(config, null, 2));

      const proceed = await confirm({
        message: 'Generate Mintlify project with this configuration?',
        default: true
      });

      if (proceed) {
        await generateInteractiveProject(config);
        
        // Prompt for versioning setup after project generation
        console.log(chalk.cyan('\nDocumentation versioning setup:'));
        
        const shouldSetupVersioning = await confirm({
          message: 'Set up versioning system now?',
          default: true
        });
        
        if (shouldSetupVersioning) {
          console.log(chalk.blue('🔧 Setting up versioning...'));
          try {
            const outputDir = process.cwd();
            const { setupVersioning } = await import('./lib/versioning.js');
            await setupVersioning(outputDir);
            console.log(chalk.green('\nDocumentation created with versioning enabled.'));
          } catch (versioningError) {
            console.log(chalk.red('\n❌ Versioning setup failed:'), versioningError.message);
            console.log(chalk.yellow('Documentation created without versioning'));
          }
        } else {
          console.log(chalk.gray('\nYou can set up versioning later with: npx mintlifier versioning'));
        }
      } else {
        console.log(chalk.yellow('\n Configuration not saved. Run the tool again when ready!'));
      }
    }
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      console.log(chalk.yellow('\n Configuration cancelled. Run the tool again when ready!'));
    } else {
      console.error(chalk.red('\n Error:'), error.message);
      process.exit(1);
    }
  }
  
  // Ensure process exits cleanly
  process.exit(0);
}

// Export for use as npm module
export default main;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
