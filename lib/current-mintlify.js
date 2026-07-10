export const CURRENT_MINTLIFY_SCHEMA_URL = 'https://mintlify.com/docs.json';

export const CURRENT_MINTLIFY_THEMES = [
  'mint',
  'maple',
  'palm',
  'willow',
  'linden',
  'almond',
  'aspen',
  'sequoia',
  'luma'
];

export const CURRENT_ICON_LIBRARIES = ['fontawesome', 'lucide', 'tabler'];

export const CURRENT_CONTEXTUAL_OPTIONS = [
  'assistant',
  'copy',
  'view',
  'download-pdf',
  'download-spec',
  'chatgpt',
  'claude',
  'perplexity',
  'grok',
  'aistudio',
  'devin',
  'windsurf',
  'mcp',
  'add-mcp',
  'cursor',
  'vscode',
  'devin-mcp'
];

const PLAYGROUND_DISPLAY_BY_LEGACY_MODE = {
  show: 'interactive',
  hide: 'none',
  simple: 'simple',
  auth: 'auth',
  interactive: 'interactive',
  none: 'none'
};

const BACKGROUND_DECORATIONS = new Set(['gradient', 'grid', 'windows']);

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function ensureObject(parent, key) {
  if (!isObject(parent[key])) {
    parent[key] = {};
  }
  return parent[key];
}

function deleteIfEmpty(parent, key) {
  if (isObject(parent[key]) && Object.keys(parent[key]).length === 0) {
    delete parent[key];
  }
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function normalizeGlobalTab(tab) {
  const label = firstDefined(tab.tab, tab.name, tab.label);
  const href = firstDefined(tab.href, tab.url);
  if (!label || !href) return null;
  return {
    tab: label,
    href
  };
}

function normalizeNavbarLink(link) {
  const href = firstDefined(link.href, link.url);
  if (!href) return null;

  if (link.type === 'github' || link.type === 'discord') {
    return {
      type: link.type,
      href
    };
  }

  return {
    label: firstDefined(link.label, link.name, 'Link'),
    href
  };
}

function normalizeNavbarPrimary(button) {
  const href = firstDefined(button.href, button.url);
  if (!href) return null;

  if (button.type === 'github' || button.type === 'discord') {
    return {
      type: button.type,
      href
    };
  }

  return {
    type: 'button',
    label: firstDefined(button.label, button.name, 'Open'),
    href
  };
}

function normalizeIntegration(provider, value) {
  if (!isObject(value)) return value;

  switch (provider) {
    case 'gtm':
      return {
        ...value,
        tagId: firstDefined(value.tagId, value.containerId)
      };
    case 'clearbit':
      return {
        ...value,
        publicApiKey: firstDefined(value.publicApiKey, value.apiKey)
      };
    case 'koala':
      return {
        ...value,
        publicApiKey: firstDefined(value.publicApiKey, value.publicKey)
      };
    case 'hotjar':
      return {
        ...value,
        hjid: firstDefined(value.hjid, value.id),
        hjsv: firstDefined(value.hjsv, value.scriptVersion)
      };
    case 'pirsch':
      return {
        ...value,
        id: firstDefined(value.id, value.code)
      };
    default:
      return { ...value };
  }
}

function stripLegacyIntegrationKeys(provider, value) {
  if (!isObject(value)) return value;
  const next = { ...value };

  if (provider === 'gtm') delete next.containerId;
  if (provider === 'clearbit') delete next.apiKey;
  if (provider === 'koala') delete next.publicKey;
  if (provider === 'hotjar') {
    delete next.id;
    delete next.scriptVersion;
  }
  if (provider === 'pirsch') delete next.code;

  return next;
}

export function normalizeDocsConfig(inputConfig = {}) {
  const config = clone(inputConfig) || {};
  config.$schema = CURRENT_MINTLIFY_SCHEMA_URL;

  if (Array.isArray(config.navigation)) {
    config.navigation = { groups: config.navigation };
  } else if (!isObject(config.navigation)) {
    config.navigation = {};
  }

  if (Array.isArray(config.tabs) && config.tabs.length > 0) {
    const tabs = config.tabs.map(normalizeGlobalTab).filter(Boolean);
    if (tabs.length > 0) {
      const global = ensureObject(config.navigation, 'global');
      global.tabs = tabs;
    }
  }

  if (config.colors?.background || config.backgroundImage || config.background?.style) {
    const background = ensureObject(config, 'background');
    if (config.colors?.background && !background.color) {
      background.color = config.colors.background;
    }
    if (config.backgroundImage && !background.image) {
      background.image = config.backgroundImage;
    }
    if (config.background?.style && !config.background.decoration && BACKGROUND_DECORATIONS.has(config.background.style)) {
      background.decoration = config.background.style;
    }
    delete background.style;
  }

  if (config.colors) {
    delete config.colors.background;
    delete config.colors.anchors;
  }

  if (config.modeToggle) {
    const appearance = ensureObject(config, 'appearance');
    const defaultMode = config.modeToggle.default;
    appearance.default = ['system', 'light', 'dark'].includes(defaultMode) ? defaultMode : 'system';
    appearance.strict = Boolean(config.modeToggle.isHidden);
  }

  if (config.openapi || config.api?.baseUrl || config.api?.server || config.api?.auth || config.api?.playground?.mode || config.api?.proxy !== undefined) {
    const api = ensureObject(config, 'api');
    if (config.openapi && !api.openapi) {
      api.openapi = config.openapi;
    }
    if (api.baseUrl || api.server || api.auth) {
      const mdx = ensureObject(api, 'mdx');
      if ((api.baseUrl || api.server) && !mdx.server) {
        mdx.server = firstDefined(api.server, api.baseUrl);
      }
      if (api.auth && !mdx.auth) {
        mdx.auth = api.auth;
      }
    }
    if (api.playground?.mode || api.proxy !== undefined) {
      const playground = ensureObject(api, 'playground');
      if (playground.mode) {
        playground.display = PLAYGROUND_DISPLAY_BY_LEGACY_MODE[playground.mode] || playground.mode;
        delete playground.mode;
      }
      if (api.proxy !== undefined && playground.proxy === undefined) {
        playground.proxy = api.proxy;
      }
    }
    delete api.baseUrl;
    delete api.server;
    delete api.auth;
    delete api.proxy;
    deleteIfEmpty(api, 'mdx');
    deleteIfEmpty(config, 'api');
  }

  if (config.analytics) {
    const integrations = ensureObject(config, 'integrations');
    for (const [provider, value] of Object.entries(config.analytics)) {
      if (integrations[provider] === undefined) {
        integrations[provider] = stripLegacyIntegrationKeys(provider, normalizeIntegration(provider, value));
      }
    }
  }

  if (config.hideFeedbackButtons === true) {
    const integrations = ensureObject(config, 'integrations');
    integrations.telemetry = {
      ...integrations.telemetry,
      enabled: false
    };
  }

  if (config.search) {
    if (!config.search.prompt && config.search.placeholder) {
      config.search.prompt = config.search.placeholder;
    }
    delete config.search.placeholder;
    delete config.search.location;
    delete config.search.hotkeys;
    deleteIfEmpty(config, 'search');
  }

  if (Array.isArray(config.topbarLinks) && config.topbarLinks.length > 0) {
    const links = config.topbarLinks.map(normalizeNavbarLink).filter(Boolean);
    if (links.length > 0) {
      const navbar = ensureObject(config, 'navbar');
      navbar.links = links;
    }
  }

  if (config.topbarCtaButton) {
    const primary = normalizeNavbarPrimary(config.topbarCtaButton);
    if (primary) {
      const navbar = ensureObject(config, 'navbar');
      navbar.primary = primary;
    }
  }

  if (config.font) {
    const family = firstDefined(config.font.family, config.font.headings, config.font.body);
    if (family) {
      config.fonts = {
        ...config.fonts,
        family
      };
      if (config.font.weight !== undefined) config.fonts.weight = config.font.weight;
      if (config.font.url || config.font.source) config.fonts.source = firstDefined(config.font.source, config.font.url);
      if (config.font.format) config.fonts.format = config.font.format;
    }
  }

  if (config.metadata && isObject(config.metadata)) {
    const { timestamp, ...metatags } = config.metadata;
    if (Object.keys(metatags).length > 0) {
      const seo = ensureObject(config, 'seo');
      seo.metatags = {
        ...metatags,
        ...seo.metatags
      };
    }
    if (typeof timestamp === 'boolean') {
      config.metadata = { timestamp };
    } else {
      delete config.metadata;
    }
  }

  if (Array.isArray(config.redirects)) {
    config.redirects = config.redirects.map((redirect) => ({
      source: firstDefined(redirect.source, redirect.from),
      destination: firstDefined(redirect.destination, redirect.to),
      ...(redirect.permanent === undefined ? {} : { permanent: redirect.permanent })
    })).filter((redirect) => redirect.source && redirect.destination);
  }

  delete config.layout;
  delete config.rounded;
  delete config.modeToggle;
  delete config.openapi;
  delete config.analytics;
  delete config.feedback;
  delete config.versions;
  delete config.topbarLinks;
  delete config.topbarCtaButton;
  delete config.font;
  delete config.backgroundImage;
  delete config.hideFeedbackButtons;
  delete config.tabs;
  delete config.footerSocials;

  return config;
}

export function buildAutomatedDocsConfig({ name = 'API Documentation' } = {}) {
  return normalizeDocsConfig({
    $schema: CURRENT_MINTLIFY_SCHEMA_URL,
    name,
    favicon: '/favicon.svg',
    theme: 'mint',
    colors: {
      primary: '#FF6B35',
      light: '#FF8C42',
      dark: '#C1440E'
    },
    appearance: {
      default: 'dark',
      strict: false
    },
    background: {
      color: {
        light: '#FAFAFA',
        dark: '#1A1A1A'
      },
      decoration: 'gradient'
    },
    logo: {
      light: '/logo-light.svg',
      dark: '/logo-dark.svg'
    },
    navigation: {
      groups: [
        {
          group: 'Getting Started',
          pages: ['overview', 'prerequisites', 'installation', 'first-api-call']
        },
        {
          group: 'Core Concepts',
          pages: ['authentication', 'rate-limiting', 'pagination', 'error-handling']
        },
        {
          group: 'API Reference',
          pages: ['endpoints/users', 'endpoints/organizations', 'endpoints/billing', 'endpoints/analytics']
        },
        {
          group: 'SDKs',
          pages: ['javascript-sdk', 'python-sdk', 'go-sdk', 'java-sdk']
        },
        {
          group: 'Advanced Topics',
          pages: ['webhooks', 'batch-operations', 'data-export', 'migrations']
        }
      ]
    },
    api: {
      openapi: ['/openapi-v1.json', '/openapi-v2.json', '/openapi-internal.json'],
      playground: {
        display: 'interactive'
      }
    },
    contextual: {
      options: ['copy', 'view', 'assistant', 'chatgpt', 'claude', 'perplexity', 'mcp', 'cursor', 'vscode']
    },
    search: {
      prompt: `Search ${name}...`
    }
  });
}

export function validateDocsConfig(config = {}) {
  const errors = [];
  const warnings = [];

  if (!config.name) errors.push('Missing required field: name');
  if (!config.theme) errors.push('Missing required field: theme');
  if (!config.colors?.primary) errors.push('Missing required field: colors.primary');
  if (!config.navigation) errors.push('Missing required field: navigation');

  if (Array.isArray(config.navigation)) {
    errors.push('Invalid navigation: current docs.json requires a navigation object, not an array');
  }

  if (config.theme && !CURRENT_MINTLIFY_THEMES.includes(config.theme)) {
    errors.push(`Invalid theme: ${config.theme}. Must be one of: ${CURRENT_MINTLIFY_THEMES.join(', ')}`);
  }

  if (config.icons?.library && !CURRENT_ICON_LIBRARIES.includes(config.icons.library)) {
    errors.push(`Invalid icon library: ${config.icons.library}. Must be one of: ${CURRENT_ICON_LIBRARIES.join(', ')}`);
  }

  if (config.colors?.primary && !/^#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/.test(config.colors.primary)) {
    errors.push('Invalid primary color: must be a hex color (#RGB or #RRGGBB)');
  }

  const contextualOptions = config.contextual?.options || [];
  for (const option of contextualOptions) {
    if (typeof option === 'string' && !CURRENT_CONTEXTUAL_OPTIONS.includes(option)) {
      warnings.push(`Unknown contextual option: ${option}`);
    }
  }

  if (!config.$schema) {
    warnings.push(`Consider adding "$schema": "${CURRENT_MINTLIFY_SCHEMA_URL}" for IDE support`);
  }

  return {
    errors,
    warnings,
    valid: errors.length === 0
  };
}
