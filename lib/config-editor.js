import { input, select, confirm, checkbox, number } from '@inquirer/prompts';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

// docs.json Schema-based configuration options (2024-2025)
const CONFIG_SCHEMA = {
  // Required Settings
  required: {
    '$schema': { 
      type: 'string', 
      description: 'Schema reference', 
      default: 'https://mintlify.com/docs.json' 
    },
    name: { 
      type: 'string', 
      description: 'Documentation name',
      required: true 
    },
    theme: { 
      type: 'enum', 
      values: ['mint', 'maple', 'palm', 'willow', 'linden', 'almond', 'aspen'],
      description: 'Documentation theme',
      required: true,
      default: 'mint'
    },
    colors: {
      type: 'object',
      required: true,
      properties: {
        primary: { type: 'color', required: true },
        light: { type: 'color' },
        dark: { type: 'color' }
      }
    },
    navigation: {
      type: 'object',
      required: true,
      description: 'Navigation structure (pages, groups, tabs, versions, etc.)'
    }
  },

  // Basic Settings
  basic: {
    description: { type: 'string', description: 'Site description' },
    favicon: { 
      type: 'union',
      string: { type: 'string', description: 'Single favicon path' },
      object: {
        light: { type: 'string' },
        dark: { type: 'string' }
      }
    },
    logo: {
      type: 'union',
      string: { type: 'string', description: 'Single logo path' },
      object: {
        light: { type: 'string' },
        dark: { type: 'string' },
        href: { type: 'url' }
      }
    },
    layout: { 
      type: 'enum', 
      values: ['topnav', 'sidenav', 'solidSidenav'],
      description: 'Layout style' 
    },
    rounded: { 
      type: 'enum', 
      values: ['default', 'sharp'],
      description: 'Corner style' 
    },
    modeToggle: {
      type: 'object',
      properties: {
        default: { type: 'enum', values: ['light', 'dark'] },
        isHidden: { type: 'boolean' }
      }
    }
  },

  // Styling & UI
  styling: {
    icons: { 
      type: 'object',
      properties: {
        library: { 
          type: 'enum',
          values: ['lucide', 'heroicons', 'fontawesome', 'tabler', 'phosphor'],
          default: 'lucide'
        }
      }
    },
    styling: {
      type: 'object',
      properties: {
        codeblocks: {
          type: 'enum',
          values: ['system', 'light', 'dark'],
          default: 'system'
        }
      }
    },
    contextual: {
      type: 'object',
      properties: {
        options: {
          type: 'array',
          items: ['copy', 'view', 'chatgpt', 'claude', 'perplexity', 'mcp', 'cursor', 'vscode']
        }
      }
    },
    font: {
      type: 'object',
      properties: {
        family: { type: 'string' },
        weight: { type: 'string' },
        url: { type: 'url' },
        format: { type: 'string' }
      }
    },
    background: {
      type: 'object',
      properties: {
        style: { type: 'string' }
      }
    },
    backgroundImage: { type: 'string' }
  },

  // API Settings
  api: {
    openapi: {
      type: 'union',
      string: { type: 'string' },
      array: { type: 'array', items: { type: 'string' } }
    },
    api: {
      type: 'object',
      properties: {
        baseUrl: { type: 'url' },
        server: { type: 'url' },
        auth: {
          type: 'object',
          properties: {
            method: { type: 'enum', values: ['bearer', 'basic', 'key', 'none'] }
          }
        },
        playground: {
          type: 'object',
          properties: {
            mode: { type: 'enum', values: ['show', 'simple', 'hide'] }
          }
        },
        proxy: { type: 'boolean' }
      }
    }
  },

  // Analytics (all 14 providers)
  analytics: {
    analytics: {
      type: 'object',
      properties: {
        ga4: {
          type: 'object',
          properties: {
            measurementId: { type: 'string', pattern: '^G-' }
          }
        },
        gtm: {
          type: 'object',
          properties: {
            containerId: { type: 'string', pattern: '^GTM-' }
          }
        },
        posthog: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', pattern: '^phc_' }
          }
        },
        mixpanel: {
          type: 'object',
          properties: {
            projectToken: { type: 'string' }
          }
        },
        amplitude: {
          type: 'object',
          properties: {
            apiKey: { type: 'string' }
          }
        },
        segment: {
          type: 'object',
          properties: {
            key: { type: 'string' }
          }
        },
        heap: {
          type: 'object',
          properties: {
            appId: { type: 'string' }
          }
        },
        clearbit: {
          type: 'object',
          properties: {
            apiKey: { type: 'string' }
          }
        },
        fathom: {
          type: 'object',
          properties: {
            siteId: { type: 'string' }
          }
        },
        hotjar: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            scriptVersion: { type: 'string' }
          }
        },
        koala: {
          type: 'object',
          properties: {
            publicKey: { type: 'string' }
          }
        },
        plausible: {
          type: 'object',
          properties: {
            domain: { type: 'string' }
          }
        },
        logrocket: {
          type: 'object',
          properties: {
            appId: { type: 'string' }
          }
        },
        pirsch: {
          type: 'object',
          properties: {
            code: { type: 'string' }
          }
        }
      }
    }
  },

  // Social & Footer
  social: {
    footer: {
      type: 'object',
      properties: {
        socials: {
          type: 'object',
          properties: {
            x: { type: 'url' },
            twitter: { type: 'url' },
            github: { type: 'url' },
            discord: { type: 'url' },
            slack: { type: 'url' },
            linkedin: { type: 'url' },
            youtube: { type: 'url' },
            facebook: { type: 'url' },
            instagram: { type: 'url' },
            website: { type: 'url' }
          }
        }
      }
    },
    footerSocials: {
      type: 'object',
      description: 'Alternative social links location'
    }
  },

  // Features
  features: {
    feedback: {
      type: 'object',
      properties: {
        thumbsRating: { type: 'boolean' },
        suggestEdit: { type: 'boolean' },
        raiseIssue: { type: 'boolean' }
      }
    },
    search: {
      type: 'object',
      properties: {
        prompt: { type: 'string' },
        placeholder: { type: 'string' },
        location: { type: 'enum', values: ['side', 'top'] }
      }
    },
    hideFeedbackButtons: { type: 'boolean' }
  },

  // Navigation & Top Bar
  navigation: {
    topbarLinks: {
      type: 'array',
      items: {
        name: { type: 'string' },
        url: { type: 'string' },
        type: { type: 'enum', values: ['link', 'github'] }
      }
    },
    topbarCtaButton: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        url: { type: 'string' },
        type: { type: 'enum', values: ['link', 'github'] }
      }
    }
  },

  // SEO & Meta
  seo: {
    metadata: {
      type: 'object',
      description: 'Custom meta tags'
    },
    seo: {
      type: 'object',
      properties: {
        indexing: { type: 'enum', values: ['navigable', 'all'] }
      }
    },
    redirects: {
      type: 'array',
      items: {
        from: { type: 'string' },
        to: { type: 'string' }
      }
    }
  },

  // Advanced
  advanced: {
    integrations: {
      type: 'object',
      description: 'Third-party integrations'
    },
    versions: {
      type: 'array',
      description: 'Legacy version configuration (use navigation.versions instead)'
    }
  }
};

// Helper function to validate hex color
function isValidHexColor(color) {
  return /^#[0-9A-F]{6}$/i.test(color);
}

// Helper function to get current config value
function getCurrentValue(config, path) {
  const keys = path.split('.');
  let value = config;
  for (const key of keys) {
    if (value && typeof value === 'object') {
      value = value[key];
    } else {
      return undefined;
    }
  }
  return value;
}

// Helper function to set config value
function setConfigValue(config, path, value) {
  const keys = path.split('.');
  let obj = config;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!obj[key] || typeof obj[key] !== 'object') {
      obj[key] = {};
    }
    obj = obj[key];
  }
  obj[keys[keys.length - 1]] = value;
}

// Edit navigation structure
async function editNavigation(config) {
  console.log(chalk.yellow('\n Navigation Configuration'));
  
  if (!config.navigation) {
    config.navigation = {};
  }

  const navType = await select({
    message: 'What navigation structure would you like to use?',
    choices: [
      { name: 'Simple Pages', value: 'pages' },
      { name: 'Grouped Pages', value: 'groups' },
      { name: 'Tabbed Navigation', value: 'tabs' },
      { name: 'Multi-Version', value: 'versions' },
      { name: 'Multi-Language', value: 'languages' },
      { name: 'Skip', value: 'skip' }
    ]
  });

  if (navType === 'skip') return;

  switch (navType) {
    case 'pages':
      const pageList = await input({
        message: 'Enter page paths (comma-separated):',
        default: config.navigation.pages ? config.navigation.pages.join(', ') : 'index, getting-started, api-reference'
      });
      config.navigation.pages = pageList.split(',').map(p => p.trim());
      break;

    case 'groups':
      config.navigation.groups = config.navigation.groups || [];
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
      config.navigation.tabs = config.navigation.tabs || [];
      const addTab = await confirm({
        message: 'Add a navigation tab?',
        default: true
      });
      if (addTab) {
        const tab = {
          tab: await input({ message: 'Tab name:' }),
          pages: (await input({ 
            message: 'Pages (comma-separated):',
            default: 'index, overview'
          })).split(',').map(p => p.trim())
        };
        config.navigation.tabs.push(tab);
      }
      break;

    case 'versions':
      config.navigation.versions = config.navigation.versions || [];
      const version = {
        version: await input({ message: 'Version identifier (e.g., v2.0):' }),
        default: await confirm({ message: 'Is this the default version?', default: false }),
        pages: (await input({ 
          message: 'Pages (comma-separated):',
          default: 'index, changelog'
        })).split(',').map(p => p.trim())
      };
      config.navigation.versions.push(version);
      break;

    case 'languages':
      config.navigation.languages = config.navigation.languages || [];
      const langCode = await select({
        message: 'Select language:',
        choices: [
          { name: 'English', value: 'en' },
          { name: 'Chinese (Simplified)', value: 'zh-Hans' },
          { name: 'Spanish', value: 'es' },
          { name: 'French', value: 'fr' },
          { name: 'German', value: 'de' },
          { name: 'Japanese', value: 'ja' },
          { name: 'Korean', value: 'ko' },
          { name: 'Portuguese', value: 'pt' },
          { name: 'Russian', value: 'ru' },
          { name: 'Italian', value: 'it' },
          { name: 'Arabic', value: 'ar' },
          { name: 'Turkish', value: 'tr' }
        ]
      });
      const language = {
        language: langCode,
        default: await confirm({ message: 'Is this the default language?', default: false }),
        url: await input({ message: 'URL path for this language:' })
      };
      config.navigation.languages.push(language);
      break;
  }
}

// Main edit function
export async function editExistingConfig(configPath) {
  console.log(chalk.cyan.bold('\n Editing docs.json Configuration\n'));
  
  try {
    // Load existing config
    const config = await fs.readJson(configPath);
    
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
          { name: ' Analytics', value: 'analytics' },
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
            choices: [
              { name: 'Mint (Default)', value: 'mint' },
              { name: 'Maple', value: 'maple' },
              { name: 'Palm', value: 'palm' },
              { name: 'Willow', value: 'willow' },
              { name: 'Linden', value: 'linden' },
              { name: 'Almond', value: 'almond' },
              { name: 'Aspen', value: 'aspen' }
            ],
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
              choices: [
                { name: 'Lucide', value: 'lucide' },
                { name: 'Heroicons', value: 'heroicons' },
                { name: 'Font Awesome', value: 'fontawesome' },
                { name: 'Tabler', value: 'tabler' },
                { name: 'Phosphor', value: 'phosphor' }
              ],
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
              choices: [
                { name: 'Copy', value: 'copy', checked: true },
                { name: 'View', value: 'view', checked: true },
                { name: 'ChatGPT', value: 'chatgpt' },
                { name: 'Claude', value: 'claude' },
                { name: 'Perplexity', value: 'perplexity' },
                { name: 'MCP', value: 'mcp' },
                { name: 'Cursor', value: 'cursor' },
                { name: 'VS Code', value: 'vscode' }
              ]
            });
            config.contextual = { options };
          }
          break;

        case 'api':
          const hasOpenAPI = await confirm({
            message: 'Do you have OpenAPI specifications?',
            default: !!config.openapi
          });
          if (hasOpenAPI) {
            const openAPIInput = await input({
              message: 'OpenAPI file paths (comma-separated):',
              default: Array.isArray(config.openapi) ? config.openapi.join(', ') : config.openapi || '/openapi.json'
            });
            const paths = openAPIInput.split(',').map(p => p.trim());
            config.openapi = paths.length === 1 ? paths[0] : paths;
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
            if (!config.analytics) config.analytics = {};
            switch (provider) {
              case 'ga4':
                config.analytics.ga4 = {
                  measurementId: await input({
                    message: 'GA4 Measurement ID:',
                    validate: (value) => value.startsWith('G-') ? true : 'Must start with G-'
                  })
                };
                break;
              case 'posthog':
                config.analytics.posthog = {
                  apiKey: await input({
                    message: 'PostHog API Key:',
                    validate: (value) => value.startsWith('phc_') ? true : 'Must start with phc_'
                  })
                };
                break;
              // Add other providers as needed
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
          // Feedback options
          if (!config.feedback) config.feedback = {};
          config.feedback.thumbsRating = await confirm({
            message: 'Enable thumbs rating?',
            default: config.feedback.thumbsRating !== false
          });
          config.feedback.suggestEdit = await confirm({
            message: 'Enable suggest edit?',
            default: config.feedback.suggestEdit !== false
          });
          
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
          await fs.writeJson(configPath, config, { spaces: 2 });
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
  const errors = [];
  const warnings = [];
  
  // Check required fields
  if (!config.name) errors.push('Missing required field: name');
  if (!config.theme) errors.push('Missing required field: theme');
  if (!config.colors?.primary) errors.push('Missing required field: colors.primary');
  if (!config.navigation) errors.push('Missing required field: navigation');
  
  // Validate theme
  const validThemes = ['mint', 'maple', 'palm', 'willow', 'linden', 'almond', 'aspen'];
  if (config.theme && !validThemes.includes(config.theme)) {
    errors.push(`Invalid theme: ${config.theme}. Must be one of: ${validThemes.join(', ')}`);
  }
  
  // Validate colors
  if (config.colors?.primary && !isValidHexColor(config.colors.primary)) {
    errors.push('Invalid primary color: must be a hex color (#RRGGBB)');
  }
  
  // Add schema warning if missing
  if (!config.$schema) {
    warnings.push('Consider adding "$schema": "https://mintlify.com/docs.json" for better IDE support');
  }
  
  return { errors, warnings, valid: errors.length === 0 };
}