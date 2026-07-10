import { input, select, confirm, checkbox, number } from '@inquirer/prompts';
import chalk from 'chalk';
import fs from 'fs-extra';
import {
  CURRENT_CONTEXTUAL_OPTIONS,
  CURRENT_ICON_LIBRARIES,
  CURRENT_MINTLIFY_THEMES,
  normalizeDocsConfig,
  validateDocsConfig as validateCurrentDocsConfig
} from './current-mintlify.js';
import {
  convertNavigationToVersions,
  navigationPageDefaults
} from './navigation-editor.js';


// Helper function to validate hex color
function isValidHexColor(color) {
  return /^#[0-9A-F]{6}$/i.test(color);
}

// Edit navigation structure
async function editNavigation(config) {
  console.log(chalk.yellow('\n Navigation Configuration'));
  
  if (!config.navigation) {
    config.navigation = {};
  }
  const originalNavigation = structuredClone(config.navigation);

  // Detect current navigation structure
  let currentType = 'simple';
  if (Array.isArray(config.navigation)) {
    config.navigation = { groups: config.navigation };
    currentType = 'groups';
  } else if (config.navigation.versions) {
    currentType = 'versions';
  } else if (config.navigation.tabs) {
    currentType = 'tabs';
  } else if (config.navigation.groups) {
    currentType = 'groups';
  } else if (config.navigation.pages) {
    currentType = 'pages';
  }

  console.log(chalk.gray(`Current structure: ${currentType}`));

  const navType = await select({
    message: 'What navigation structure would you like to use?',
    choices: [
      { name: 'Simple Pages', value: 'pages' },
      { name: 'Grouped Pages', value: 'groups' },
      { name: 'Tabbed Navigation', value: 'tabs' },
      { name: 'Multi-Version (recommended)', value: 'versions' },
      { name: 'Skip', value: 'skip' }
    ],
    default: currentType
  });

  if (navType === 'skip') return;

  switch (navType) {
    case 'pages':
      config.navigation = { pages: [] };
      const pageList = await input({
        message: 'Enter page paths (comma-separated):',
        default: navigationPageDefaults(originalNavigation).join(', ') || 'index, getting-started, api-reference'
      });
      config.navigation.pages = pageList.split(',').map(p => p.trim());
      break;

    case 'groups':
      config.navigation = { groups: structuredClone(originalNavigation.groups || []) };
      const addGroup = await confirm({
        message: 'Add a navigation group?',
        default: true
      });
      if (addGroup) {
        const group = {
          group: await input({ message: 'Group name:' }),
          pages: (await input({ 
            message: 'Pages (comma-separated):',
            default: 'overview, quickstart'
          })).split(',').map(p => p.trim())
        };
        config.navigation.groups.push(group);
      }
      break;

    case 'tabs':
      config.navigation = { tabs: structuredClone(originalNavigation.tabs || []) };
      const addTab = await confirm({
        message: 'Add a navigation tab?',
        default: true
      });
      if (addTab) {
        const tab = {
          tab: await input({ message: 'Tab name:' }),
          groups: []
        };
        
        const tabStructure = await select({
          message: 'Tab content structure:',
          choices: [
            { name: 'Grouped pages', value: 'groups' },
            { name: 'Simple pages', value: 'pages' }
          ]
        });
        
        if (tabStructure === 'pages') {
          tab.pages = (await input({ 
            message: 'Pages (comma-separated):',
            default: 'index, overview'
          })).split(',').map(p => p.trim());
        } else {
          const groupCount = await number({
            message: 'How many groups in this tab?',
            default: 1
          });
          
          for (let i = 0; i < groupCount; i++) {
            const group = {
              group: await input({ message: `Group ${i + 1} name:` }),
              pages: (await input({ 
                message: 'Pages (comma-separated):',
                default: 'overview, quickstart'
              })).split(',').map(p => p.trim())
            };
            tab.groups.push(group);
          }
        }
        
        config.navigation.tabs.push(tab);
      }
      break;

    case 'versions':
      console.log(chalk.cyan('Versioned navigation is the modern Mintlify format'));
      const versionOp = await select({
        message: 'Versioned navigation operation:',
        choices: [
          { name: 'Add new version', value: 'add' },
          { name: 'Edit existing version', value: 'edit' },
          { name: 'Convert from current navigation', value: 'convert' }
        ]
      });
      
      if (versionOp === 'convert') {
        const versionName = await input({ 
          message: 'Version name for current navigation:',
          default: 'v1.0.0'
        });
        
        config.navigation = convertNavigationToVersions(originalNavigation, versionName);
        
        console.log(chalk.green('✓ Converted to versioned navigation format'));
        
      } else if (versionOp === 'add') {
        config.navigation = {
          ...(originalNavigation.global ? { global: structuredClone(originalNavigation.global) } : {}),
          versions: structuredClone(originalNavigation.versions || [])
        };
        const version = {
          version: await input({ message: 'Version identifier (e.g., v2.0.0):' }),
          default: await confirm({ message: 'Is this the default version?', default: config.navigation.versions.length === 0 })
        };
        
        const versionStructure = await select({
          message: 'Version content structure:',
          choices: [
            { name: 'Tabbed (recommended)', value: 'tabs' },
            { name: 'Grouped pages', value: 'groups' },
            { name: 'Simple pages', value: 'pages' }
          ]
        });
        
        if (versionStructure === 'tabs') {
          version.tabs = [{
            tab: await input({ message: 'Tab name:', default: 'Documentation' }),
            groups: [{
              group: await input({ message: 'Group name:', default: 'Getting Started' }),
              pages: (await input({ 
                message: 'Pages (comma-separated):',
                default: 'index, overview'
              })).split(',').map(p => p.trim())
            }]
          }];
        } else if (versionStructure === 'groups') {
          version.groups = [{
            group: await input({ message: 'Group name:', default: 'Getting Started' }),
            pages: (await input({ 
              message: 'Pages (comma-separated):',
              default: 'index, overview'
            })).split(',').map(p => p.trim())
          }];
        } else {
          version.pages = (await input({ 
            message: 'Pages (comma-separated):',
            default: 'index, changelog'
          })).split(',').map(p => p.trim());
        }
        
        config.navigation.versions.push(version);
      } else {
        config.navigation = originalNavigation;
      }
      break;
  }
}

// Main edit function
export async function editExistingConfig(configPath) {
  console.log(chalk.cyan.bold('\n Editing docs.json Configuration\n'));
  
  try {
    // Load existing config
    const config = normalizeDocsConfig(await fs.readJson(configPath));
    
    // Ensure schema reference
    if (!config.$schema) {
      config.$schema = 'https://mintlify.com/docs.json';
    }
    
    let editing = true;
    while (editing) {
      const category = await select({
        message: 'What would you like to edit?',
        choices: [
          { name: ' Theme & Colors', value: 'theme' },
          { name: ' Navigation', value: 'navigation' },
          { name: ' Logo & Branding', value: 'branding' },
          { name: ' Styling & UI', value: 'styling' },
          { name: ' API & OpenAPI', value: 'api' },
          { name: ' Integrations', value: 'analytics' },
          { name: ' Social & Footer', value: 'social' },
          { name: ' Search & Feedback', value: 'features' },
          { name: ' SEO & Meta', value: 'seo' },
          { name: ' Save & Exit', value: 'save' },
          { name: ' Cancel', value: 'cancel' }
        ]
      });

      switch (category) {
        case 'theme':
          config.theme = await select({
            message: 'Select theme:',
            choices: CURRENT_MINTLIFY_THEMES.map((theme) => ({
              name: theme === 'mint' ? 'Mint (Default)' : theme[0].toUpperCase() + theme.slice(1),
              value: theme
            })),
            default: config.theme || 'mint'
          });
          
          if (!config.colors) config.colors = {};
          config.colors.primary = await input({
            message: 'Primary color (hex):',
            default: config.colors.primary || '#0D9373',
            validate: (value) => isValidHexColor(value) ? true : 'Please enter a valid hex color'
          });
          break;

        case 'navigation':
          await editNavigation(config);
          break;

        case 'branding':
          // Logo configuration
          const logoType = await select({
            message: 'Logo configuration:',
            choices: [
              { name: 'Single logo', value: 'single' },
              { name: 'Light/Dark logos', value: 'dual' },
              { name: 'No change', value: 'skip' }
            ]
          });
          
          if (logoType === 'single') {
            config.logo = await input({
              message: 'Logo path:',
              default: typeof config.logo === 'string' ? config.logo : '/logo.svg'
            });
          } else if (logoType === 'dual') {
            config.logo = {
              light: await input({
                message: 'Light mode logo:',
                default: config.logo?.light || '/logo-light.svg'
              }),
              dark: await input({
                message: 'Dark mode logo:',
                default: config.logo?.dark || '/logo-dark.svg'
              })
            };
          }
          break;

        case 'styling':
          // Icons
          const setIcons = await confirm({
            message: 'Configure icon library?',
            default: false
          });
          if (setIcons) {
            if (!config.icons) config.icons = {};
            config.icons.library = await select({
              message: 'Icon library:',
              choices: CURRENT_ICON_LIBRARIES.map((library) => ({
                name: library === 'lucide'
                  ? 'Lucide'
                  : library === 'fontawesome'
                    ? 'Font Awesome'
                    : 'Tabler',
                value: library
              })),
              default: config.icons?.library || 'lucide'
            });
          }
          
          // Contextual menu
          const setContextual = await confirm({
            message: 'Configure contextual menu?',
            default: false
          });
          if (setContextual) {
            const options = await checkbox({
              message: 'Select contextual options:',
              choices: CURRENT_CONTEXTUAL_OPTIONS.map((option) => ({
                name: option.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
                value: option,
                checked: config.contextual?.options?.includes(option) || ['copy', 'view', 'assistant'].includes(option)
              }))
            });
            config.contextual = { options };
          }
          break;

        case 'api':
          const hasOpenAPI = await confirm({
            message: 'Do you have OpenAPI specifications?',
            default: !!config.api?.openapi
          });
          if (hasOpenAPI) {
            const openAPIInput = await input({
              message: 'OpenAPI file paths (comma-separated):',
              default: Array.isArray(config.api?.openapi) ? config.api.openapi.join(', ') : config.api?.openapi || '/openapi.json'
            });
            const paths = openAPIInput.split(',').map(p => p.trim());
            if (!config.api) config.api = {};
            config.api.openapi = paths.length === 1 ? paths[0] : paths;
          }
          break;

        case 'analytics':
          const provider = await select({
            message: 'Select analytics provider:',
            choices: [
              { name: 'Google Analytics 4', value: 'ga4' },
              { name: 'Google Tag Manager', value: 'gtm' },
              { name: 'PostHog', value: 'posthog' },
              { name: 'Mixpanel', value: 'mixpanel' },
              { name: 'Amplitude', value: 'amplitude' },
              { name: 'Segment', value: 'segment' },
              { name: 'Skip', value: 'skip' }
            ]
          });
          
          if (provider !== 'skip') {
            if (!config.integrations) config.integrations = {};
            switch (provider) {
              case 'ga4':
                config.integrations.ga4 = {
                  measurementId: await input({
                    message: 'GA4 Measurement ID:',
                    validate: (value) => value.startsWith('G-') ? true : 'Must start with G-'
                  })
                };
                break;
              case 'posthog':
                config.integrations.posthog = {
                  apiKey: await input({
                    message: 'PostHog API Key:',
                    validate: (value) => value.startsWith('phc_') ? true : 'Must start with phc_'
                  })
                };
                break;
              case 'gtm':
                config.integrations.gtm = {
                  tagId: await input({
                    message: 'Google Tag Manager Tag ID:',
                    validate: (value) => value.startsWith('G') ? true : 'Must start with G'
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
                    validate: (value) => value.trim() ? true : 'API key is required'
                  })
                };
                break;
              case 'segment':
                config.integrations.segment = {
                  key: await input({
                    message: 'Segment Write Key:',
                    validate: (value) => value.trim() ? true : 'Write key is required'
                  })
                };
                break;
            }
          }
          break;

        case 'social':
          if (!config.footer) config.footer = {};
          if (!config.footer.socials) config.footer.socials = {};
          
          const platforms = await checkbox({
            message: 'Select social platforms:',
            choices: [
              { name: 'GitHub', value: 'github' },
              { name: 'Discord', value: 'discord' },
              { name: 'X/Twitter', value: 'x' },
              { name: 'LinkedIn', value: 'linkedin' },
              { name: 'YouTube', value: 'youtube' },
              { name: 'Website', value: 'website' }
            ]
          });
          
          for (const platform of platforms) {
            config.footer.socials[platform] = await input({
              message: `${platform} URL:`,
              default: config.footer.socials[platform] || ''
            });
          }
          break;

        case 'features':
          if (!config.integrations) config.integrations = {};
          const disableTelemetry = await confirm({
            message: 'Disable Mintlify telemetry and dashboard feedback?',
            default: config.integrations.telemetry?.enabled === false
          });
          if (disableTelemetry) {
            config.integrations.telemetry = { enabled: false };
          } else if (config.integrations.telemetry?.enabled === false) {
            delete config.integrations.telemetry;
          }
          
          // Search
          if (!config.search) config.search = {};
          config.search.prompt = await input({
            message: 'Search prompt:',
            default: config.search.prompt || 'Search documentation...'
          });
          break;

        case 'seo':
          // SEO indexing
          if (!config.seo) config.seo = {};
          config.seo.indexing = await select({
            message: 'SEO indexing strategy:',
            choices: [
              { name: 'Navigable pages only', value: 'navigable' },
              { name: 'All pages', value: 'all' }
            ],
            default: config.seo.indexing || 'navigable'
          });
          break;

        case 'save':
          // Save configuration
          await fs.writeJson(configPath, normalizeDocsConfig(config), { spaces: 2 });
          console.log(chalk.green(`\n Configuration saved to ${configPath}`));
          editing = false;
          break;

        case 'cancel':
          console.log(chalk.yellow('\n  Changes discarded'));
          editing = false;
          break;
      }
    }
  } catch (error) {
    console.error(chalk.red('Error editing configuration:'), error.message);
    process.exit(1);
  }
}

// Export validation function
export function validateDocsConfig(config) {
  return validateCurrentDocsConfig(config);
}
