#!/usr/bin/env node

import { input, select, confirm, checkbox, number } from '@inquirer/prompts';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import ora from 'ora';
import os from 'os';
import { setupVersioning } from './lib/versioning.js';
import { editExistingConfig } from './lib/config-editor.js';

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

console.log(chalk.cyan.bold('\n🚀 Mintlifier - Mintlify docs.json Configuration Builder\n'));
console.log(chalk.gray('Building for the latest Mintlify (2024-2025) with docs.json\n'));

// Handle command-line arguments
const args = process.argv.slice(2);
const isEditMode = args.includes('--edit') || args.includes('-e');
const configPath = args.find(arg => arg.endsWith('.json'));

async function buildDocsConfig() {
  const config = {
    $schema: 'https://mintlify.com/docs.json'
  };

  // Required: Name
  config.name = await input({
    message: 'Documentation site name:',
    validate: (value) => value.trim() ? true : 'Name is required'
  });

  // Required: Favicon
  const faviconInput = await input({
    message: 'Path to favicon file (.svg or .png):',
    default: '/favicon.svg',
    validate: (value) => value.trim() ? true : 'Favicon path is required'
  });
  config.favicon = makeRelativePath(faviconInput);
  config._originalFavicon = faviconInput; // Store original for copying

  // Theme selection
  config.theme = await select({
    message: 'Select documentation theme:',
    choices: [
      { name: 'Mint (Default)', value: 'mint' },
      { name: 'Maple', value: 'maple' },
      { name: 'Palm', value: 'palm' },
      { name: 'Willow', value: 'willow' },
      { name: 'Linden', value: 'linden' },
      { name: 'Almond', value: 'almond' },
      { name: 'Aspen', value: 'aspen' }
    ],
    default: 'mint'
  });

  // Layout selection
  config.layout = await select({
    message: 'Select layout style:',
    choices: [
      { name: 'Top Navigation', value: 'topnav' },
      { name: 'Side Navigation', value: 'sidenav' },
      { name: 'Solid Side Navigation', value: 'solidSidenav' }
    ],
    default: 'sidenav'
  });

  // Corner style
  config.rounded = await select({
    message: 'Select corner style:',
    choices: [
      { name: 'Default (Rounded)', value: 'default' },
      { name: 'Sharp', value: 'sharp' }
    ],
    default: 'default'
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
      config.colors.background = {
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

    const useGradientAnchors = await confirm({
      message: 'Use gradient for anchor links?',
      default: false
    });

    if (useGradientAnchors) {
      config.colors.anchors = {
        from: await input({
          message: 'Gradient from color (hex):',
          default: '#0D9373',
          validate: (value) => /^#[0-9A-F]{6}$/i.test(value) ? true : 'Please enter a valid hex color'
        }),
        to: await input({
          message: 'Gradient to color (hex):',
          default: '#07C983',
          validate: (value) => /^#[0-9A-F]{6}$/i.test(value) ? true : 'Please enter a valid hex color'
        })
      };
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
      choices: [
        { name: 'Lucide (recommended)', value: 'lucide' },
        { name: 'Heroicons', value: 'heroicons' },
        { name: 'Font Awesome', value: 'fontawesome' },
        { name: 'Tabler', value: 'tabler' },
        { name: 'Phosphor', value: 'phosphor' }
      ],
      default: 'lucide'
    });

    config.icons = { library: iconLibrary };

    // Code block styling
    const codeblockStyle = await select({
      message: 'Code block color scheme:',
      choices: [
        { name: 'System (follows theme)', value: 'system' },
        { name: 'Light', value: 'light' },
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
        choices: [
          { name: 'Copy', value: 'copy', checked: true },
          { name: 'View Source', value: 'view', checked: true },
          { name: 'ChatGPT', value: 'chatgpt' },
          { name: 'Claude', value: 'claude' },
          { name: 'Perplexity', value: 'perplexity' },
          { name: 'MCP', value: 'mcp' },
          { name: 'Cursor', value: 'cursor' },
          { name: 'VS Code', value: 'vscode' }
        ]
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
    const openAPICount = await number({
      message: 'How many OpenAPI spec files?',
      default: 1,
      validate: (value) => value > 0 ? true : 'Must have at least one file'
    });

    if (openAPICount === 1) {
      config.openapi = await input({
        message: 'Path to OpenAPI spec file:',
        default: '/openapi.json'
      });
    } else {
      config.openapi = [];
      for (let i = 0; i < openAPICount; i++) {
        const path = await input({
          message: `OpenAPI spec file ${i + 1} path:`,
          default: `/openapi-${i + 1}.json`
        });
        config.openapi.push(path);
      }
    }

    // API configuration
    config.api = {};

    const hasBaseUrl = await confirm({
      message: 'Configure API base URL?',
      default: true
    });

    if (hasBaseUrl) {
      config.api.baseUrl = await input({
        message: 'API base URL:',
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
      config.api.auth = { method: authMethod };
    }

    config.api.playground = {
      mode: await select({
        message: 'API playground mode:',
        choices: [
          { name: 'Show (Interactive)', value: 'show' },
          { name: 'Simple', value: 'simple' },
          { name: 'Hide', value: 'hide' }
        ],
        default: 'show'
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

  // Analytics
  const configureAnalytics = await confirm({
    message: 'Configure analytics?',
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
      config.analytics = {};

      switch (analyticsProvider) {
        case 'ga4':
          config.analytics.ga4 = {
            measurementId: await input({
              message: 'GA4 Measurement ID (G-XXXXXXXXXX):',
              validate: (value) => value.startsWith('G-') ? true : 'Must start with G-'
            })
          };
          break;
        case 'posthog':
          config.analytics.posthog = {
            apiKey: await input({
              message: 'PostHog API Key (phc_...):',
              validate: (value) => value.startsWith('phc_') ? true : 'Must start with phc_'
            })
          };
          break;
        case 'mixpanel':
          config.analytics.mixpanel = {
            projectToken: await input({
              message: 'Mixpanel Project Token:',
              validate: (value) => value.trim() ? true : 'Token is required'
            })
          };
          break;
        case 'amplitude':
          config.analytics.amplitude = {
            apiKey: await input({
              message: 'Amplitude API Key:',
              validate: (value) => value.trim() ? true : 'API Key is required'
            })
          };
          break;
        case 'segment':
          config.analytics.segment = {
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

  // Feedback
  const configureFeedback = await confirm({
    message: 'Enable feedback features?',
    default: true
  });

  if (configureFeedback) {
    config.feedback = {
      thumbsRating: await confirm({
        message: 'Enable thumbs up/down rating?',
        default: true
      }),
      suggestEdit: await confirm({
        message: 'Enable "Suggest Edit" feature?',
        default: true
      }),
      raiseIssue: await confirm({
        message: 'Enable "Raise Issue" feature?',
        default: false
      })
    };
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
      }),
      location: await select({
        message: 'Search bar location:',
        choices: [
          { name: 'Side', value: 'side' },
          { name: 'Top', value: 'top' }
        ],
        default: 'side'
      })
    };
  }

  // Mode toggle
  config.modeToggle = {
    default: await select({
      message: 'Default color mode:',
      choices: [
        { name: 'Light', value: 'light' },
        { name: 'Dark', value: 'dark' }
      ],
      default: 'light'
    }),
    isHidden: await confirm({
      message: 'Hide mode toggle button?',
      default: false
    })
  };


  return config;
}

async function generateProjectStructure(config) {
  const spinner = ora('Generating project structure...').start();

  try {
    // Create output directory
    const outputDir = path.join(process.cwd(), 'mintlify-docs');
    await fs.ensureDir(outputDir);

    // Clean config for mint.json (remove internal fields)
    const cleanConfig = { ...config };
    delete cleanConfig._originalFavicon;
    delete cleanConfig._originalLogo;
    delete cleanConfig._originalLogos;

    // Write docs.json
    await fs.writeJson(path.join(outputDir, 'docs.json'), cleanConfig, { spaces: 2 });

    // Create directory structure based on navigation
    const createPages = async (pages, baseDir = outputDir) => {
      if (!pages) return;
      for (const page of pages) {
        if (typeof page === 'string') {
          const pagePath = path.join(baseDir, `${page}.mdx`);
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
    };

    const processGroups = async (groups, baseDir = outputDir) => {
      if (!groups) return;
      for (const group of groups) {
        if (group.pages) {
          await createPages(group.pages, baseDir);
        }
      }
    };

    if (config.navigation) {
      // Handle different navigation structures
      if (config.navigation.pages) {
        await createPages(config.navigation.pages);
      }
      if (config.navigation.groups) {
        await processGroups(config.navigation.groups);
      }
      if (config.navigation.tabs) {
        for (const tab of config.navigation.tabs) {
          if (tab.pages) await createPages(tab.pages);
          if (tab.groups) await processGroups(tab.groups);
        }
      }
      if (config.navigation.versions) {
        for (const version of config.navigation.versions) {
          const versionDir = path.join(outputDir, version.version);
          await fs.ensureDir(versionDir);
          if (version.pages) await createPages(version.pages, versionDir);
          if (version.groups) await processGroups(version.groups, versionDir);
          if (version.tabs) {
            for (const tab of version.tabs) {
              if (tab.pages) await createPages(tab.pages, versionDir);
              if (tab.groups) await processGroups(tab.groups, versionDir);
            }
          }
        }
      }
    }

    // Create assets directory
    await fs.ensureDir(path.join(outputDir, 'images'));

    // Handle favicon
    if (config.favicon && !config.favicon.startsWith('http')) {
      const faviconPath = path.join(outputDir, config.favicon.replace(/^\//, ''));
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
        const logoPath = path.join(outputDir, config.logo.replace(/^\//, ''));
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
          const lightPath = path.join(outputDir, config.logo.light.replace(/^\//, ''));
          await fs.ensureDir(path.dirname(lightPath));
          const originalLight = expandTildePath(config._originalLogos.light);
          if (await fs.pathExists(originalLight)) {
            await fs.copy(originalLight, lightPath);
          } else if (!await fs.pathExists(lightPath)) {
            await fs.writeFile(lightPath, '<!-- Add your light logo SVG here -->');
          }
        }

        if (config.logo.dark && config._originalLogos?.dark) {
          const darkPath = path.join(outputDir, config.logo.dark.replace(/^\//, ''));
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
    if (config.openapi) {
      const specs = Array.isArray(config.openapi) ? config.openapi : [config.openapi];
      for (const spec of specs) {
        if (!spec.startsWith('http')) {
          const specPath = path.join(outputDir, spec.replace(/^\//, ''));
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

    // Clean up any MDX issues that might cause parsing errors
    spinner.text = 'Cleaning up MDX files...';
    const { execSync } = await import('child_process');
    try {
      // Fix ResponseExample closing tag followed by extra backticks
      execSync(`find "${outputDir}" -name "*.mdx" -type f -exec sed -i '' '/^<\\/ResponseExample>$/{ n; /^\\\`\\\`\\\`$/d; }' {} \\; 2>/dev/null || true`, { stdio: 'ignore' });
      // Fix any standalone triple backticks that might cause issues
      execSync(`find "${outputDir}" -name "*.mdx" -type f -exec sed -i '' '/^\\\`\\\`\\\`$/{ N; s/\\\`\\\`\\\`\\n\\\`\\\`\\\`//g; }' {} \\; 2>/dev/null || true`, { stdio: 'ignore' });
    } catch (cleanupError) {
      // Ignore cleanup errors, they're not critical
    }

    spinner.succeed('Project structure generated successfully!');

    // Set up versioning system if requested
    const versioningConfig = await setupVersioning(outputDir);

    console.log(chalk.green('\n Mintlify documentation project created!'));
    console.log(chalk.cyan(` Location: ${outputDir}`));

    if (versioningConfig) {
      console.log(chalk.green('\n Versioning system configured!'));
      console.log(`  - Initial version: ${versioningConfig.initialVersion}`);
      if (versioningConfig.changelogSync?.enabled) {
        console.log(`  - Changelog sync from: ${versioningConfig.changelogSync.repoOwner}/${versioningConfig.changelogSync.repoName}`);
        if (versioningConfig.autoVersioning) {
          console.log(`  - Auto-versioning on releases: Enabled`);
        }
      }
      console.log(chalk.yellow('\n Versioning commands:'));
      console.log('  - Manual freeze: ./scripts/version-manager.sh');
      if (versioningConfig.changelogSync?.enabled) {
        console.log('  - Sync changelog: ./scripts/sync-changelog.sh');
        if (versioningConfig.autoVersioning) {
          console.log('  - Auto version (GitHub Actions): Triggered on release');
        }
      }
    }

    console.log(chalk.yellow('\n Next steps:'));
    console.log('  1. Navigate to the mintlify-docs directory');
    console.log('  2. Run locally: npx mint@latest dev');
    console.log('  3. Deploy: npx mint@latest deploy');
    console.log(chalk.blue('\n Documentation: https://mintlify.com/docs'));

  } catch (error) {
    spinner.fail('Failed to generate project structure');
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

async function main() {
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
        await generateProjectStructure(config);
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
}

main();