import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CURRENT_CONTEXTUAL_OPTIONS,
  CURRENT_ICON_LIBRARIES,
  CURRENT_MINTLIFY_THEMES,
  buildAutomatedDocsConfig,
  normalizeDocsConfig,
  validateDocsConfig
} from '../lib/current-mintlify.js';

const LEGACY_CONFIG = {
  $schema: 'https://mintlify.com/schema.json',
  name: 'Legacy Docs',
  theme: 'mint',
  layout: 'sidenav',
  rounded: 'default',
  colors: {
    primary: '#0D9373',
    background: {
      light: '#ffffff',
      dark: '#0f1117'
    },
    anchors: {
      from: '#0D9373',
      to: '#07C983'
    }
  },
  navigation: [
    {
      group: 'Guides',
      pages: ['intro', 'setup']
    }
  ],
  tabs: [
    {
      name: 'Docs',
      url: '/'
    }
  ],
  openapi: ['/openapi.json'],
  api: {
    baseUrl: 'https://api.example.com',
    auth: {
      method: 'bearer'
    },
    playground: {
      mode: 'show'
    },
    proxy: false
  },
  analytics: {
    gtm: {
      containerId: 'GTM-EXAMPLE'
    },
    clearbit: {
      apiKey: 'pk_example'
    },
    hotjar: {
      id: '123',
      scriptVersion: '6'
    },
    koala: {
      publicKey: 'koala-key'
    },
    pirsch: {
      code: 'pirsch-code'
    }
  },
  feedback: {
    thumbsRating: true
  },
  search: {
    prompt: 'Search docs',
    location: 'side',
    placeholder: 'Find content'
  },
  modeToggle: {
    default: 'dark',
    isHidden: true
  },
  versions: ['v1.0.0'],
  topbarLinks: [
    {
      name: 'GitHub',
      url: 'https://github.com/example',
      type: 'github'
    }
  ],
  topbarCtaButton: {
    name: 'Start',
    url: '/start',
    type: 'link'
  },
  font: {
    family: 'Inter',
    weight: 500,
    url: '/fonts/inter.woff2',
    format: 'woff2'
  },
  backgroundImage: '/images/bg.png',
  metadata: {
    'og:title': 'Legacy Docs'
  },
  redirects: [
    {
      from: '/old',
      to: '/new'
    }
  ],
  hideFeedbackButtons: true
};

test('current constants include new themes and only supported icon libraries', () => {
  assert.ok(CURRENT_MINTLIFY_THEMES.includes('sequoia'));
  assert.ok(CURRENT_MINTLIFY_THEMES.includes('luma'));
  assert.deepEqual(CURRENT_ICON_LIBRARIES, ['fontawesome', 'lucide', 'tabler']);
  assert.ok(CURRENT_CONTEXTUAL_OPTIONS.includes('assistant'));
  assert.ok(CURRENT_CONTEXTUAL_OPTIONS.includes('download-spec'));
  assert.ok(CURRENT_CONTEXTUAL_OPTIONS.includes('add-mcp'));
});

test('normalizeDocsConfig migrates legacy fields to current docs.json shape', () => {
  const normalized = normalizeDocsConfig(LEGACY_CONFIG);

  assert.equal(normalized.$schema, 'https://mintlify.com/docs.json');
  assert.equal(normalized.appearance.default, 'dark');
  assert.equal(normalized.appearance.strict, true);
  assert.deepEqual(normalized.background.color, {
    light: '#ffffff',
    dark: '#0f1117'
  });
  assert.equal(normalized.background.image, '/images/bg.png');
  assert.deepEqual(normalized.navigation.groups, LEGACY_CONFIG.navigation);
  assert.deepEqual(normalized.navigation.global.tabs, [
    {
      tab: 'Docs',
      href: '/'
    }
  ]);
  assert.deepEqual(normalized.api.openapi, ['openapi.json']);
  assert.equal(normalized.api.mdx.server, 'https://api.example.com');
  assert.deepEqual(normalized.api.mdx.auth, { method: 'bearer' });
  assert.deepEqual(normalized.api.playground, {
    display: 'interactive',
    proxy: false
  });
  assert.deepEqual(normalized.integrations.gtm, { tagId: 'GTM-EXAMPLE' });
  assert.deepEqual(normalized.integrations.clearbit, { publicApiKey: 'pk_example' });
  assert.deepEqual(normalized.integrations.hotjar, { hjid: '123', hjsv: '6' });
  assert.deepEqual(normalized.integrations.koala, { publicApiKey: 'koala-key' });
  assert.deepEqual(normalized.integrations.pirsch, { id: 'pirsch-code' });
  assert.deepEqual(normalized.integrations.telemetry, { enabled: false });
  assert.deepEqual(normalized.search, { prompt: 'Search docs' });
  assert.deepEqual(normalized.navbar.links, [
    {
      type: 'github',
      href: 'https://github.com/example'
    }
  ]);
  assert.deepEqual(normalized.navbar.primary, {
    type: 'button',
    label: 'Start',
    href: '/start'
  });
  assert.deepEqual(normalized.fonts, {
    family: 'Inter',
    weight: 500,
    source: '/fonts/inter.woff2',
    format: 'woff2'
  });
  assert.deepEqual(normalized.seo.metatags, {
    'og:title': 'Legacy Docs'
  });
  assert.deepEqual(normalized.redirects, [
    {
      source: '/old',
      destination: '/new'
    }
  ]);

  for (const obsoleteKey of [
    'layout',
    'rounded',
    'modeToggle',
    'openapi',
    'analytics',
    'feedback',
    'versions',
    'topbarLinks',
    'topbarCtaButton',
    'font',
    'backgroundImage',
    'hideFeedbackButtons',
    'tabs'
  ]) {
    assert.equal(Object.hasOwn(normalized, obsoleteKey), false, obsoleteKey);
  }
  assert.equal(Object.hasOwn(normalized.colors, 'background'), false);
  assert.equal(Object.hasOwn(normalized.colors, 'anchors'), false);
});

test('buildAutomatedDocsConfig emits current schema fields only', () => {
  const config = buildAutomatedDocsConfig({ name: 'API Docs' });
  const validation = validateDocsConfig(config);

  assert.equal(validation.valid, true, validation.errors.join('\n'));
  assert.equal(config.name, 'API Docs');
  assert.equal(config.theme, 'mint');
  assert.equal(config.appearance.default, 'dark');
  assert.ok(config.navigation.groups.length > 0);
  assert.deepEqual(config.api.openapi, [
    'openapi-v1.json',
    'openapi-v2.json',
    'openapi-internal.json'
  ]);
  assert.equal(Object.hasOwn(config, 'layout'), false);
  assert.equal(Object.hasOwn(config, 'rounded'), false);
  assert.equal(Object.hasOwn(config, 'openapi'), false);
  assert.equal(Object.hasOwn(config, 'analytics'), false);
  assert.equal(Object.hasOwn(config, 'feedback'), false);
  assert.equal(Object.hasOwn(config, 'modeToggle'), false);
});

test('validateDocsConfig rejects stale theme and icon library choices', () => {
  const valid = validateDocsConfig({
    name: 'Docs',
    theme: 'luma',
    colors: { primary: '#123456' },
    navigation: { pages: ['index'] },
    icons: { library: 'lucide' }
  });
  assert.equal(valid.valid, true, valid.errors.join('\n'));

  const invalid = validateDocsConfig({
    name: 'Docs',
    theme: 'venus',
    colors: { primary: '#123456' },
    navigation: { pages: ['index'] },
    icons: { library: 'heroicons' }
  });
  assert.equal(invalid.valid, false);
  assert.match(invalid.errors.join('\n'), /Invalid theme: venus/);
  assert.match(invalid.errors.join('\n'), /Invalid icon library: heroicons/);
});
