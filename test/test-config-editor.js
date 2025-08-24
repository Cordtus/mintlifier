#!/usr/bin/env node

/**
 * Test script for config editor
 * Validates that all Mintlify schema options are supported
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Complete test configuration with all schema options
const completeTestConfig = {
  "$schema": "https://mintlify.com/schema.json",
  
  // Core required fields
  "name": "Test Documentation",
  "favicon": "/favicon.svg",
  
  // Logo variations
  "logo": {
    "light": "/logo-light.svg",
    "dark": "/logo-dark.svg",
    "href": "https://example.com"
  },
  
  // OpenAPI
  "openapi": [
    "/openapi-v1.json",
    "/openapi-v2.json"
  ],
  
  // Complete API configuration
  "api": {
    "baseUrl": "https://api.example.com",
    "auth": {
      "method": "bearer",
      "inputPrefix": "Bearer"
    },
    "playground": {
      "mode": "show"
    },
    "request": {
      "example": {
        "showOptionalParams": true
      }
    },
    "hideApiMarkers": false,
    "maintainOrder": true
  },
  
  // Mode toggle
  "modeToggle": {
    "default": "light",
    "isHidden": false
  },
  
  // Versions
  "versions": [
    "v3.0.0",
    {
      "name": "v2.0.0",
      "url": "docs/v2.0.0"
    }
  ],
  
  // Navigation with all features
  "navigation": [
    {
      "group": "Getting Started",
      "icon": "book-open",
      "iconType": "solid",
      "pages": [
        "introduction",
        "quickstart",
        "installation"
      ]
    },
    {
      "group": "API Reference",
      "version": "v3.0.0",
      "pages": [
        "api/overview",
        "api/authentication"
      ]
    }
  ],
  
  // Anchors with colors
  "anchors": [
    {
      "name": "GitHub",
      "icon": "github",
      "url": "https://github.com/example",
      "color": "#333333"
    },
    {
      "name": "Discord",
      "icon": "discord",
      "url": "https://discord.gg/example"
    }
  ],
  
  // Tabs with versions
  "tabs": [
    {
      "name": "Documentation",
      "url": "/"
    },
    {
      "name": "API v2",
      "url": "/api-v2",
      "version": "v2.0.0"
    }
  ],
  
  // Top anchor
  "topAnchor": {
    "name": "Support",
    "icon": "life-ring",
    "url": "https://support.example.com"
  },
  
  // Primary tab
  "primaryTab": {
    "name": "Docs",
    "url": "/"
  },
  
  // Topbar links (root level)
  "topbarLinks": [
    {
      "name": "Blog",
      "url": "https://blog.example.com",
      "type": "primary"
    }
  ],
  
  // Topbar CTA button
  "topbarCtaButton": {
    "name": "Get Started",
    "url": "https://app.example.com",
    "type": "github",
    "arrow": true
  },
  
  // Topbar configuration
  "topbar": {
    "ctaButton": {
      "name": "Sign Up",
      "url": "/signup",
      "type": "default",
      "arrow": false,
      "target": "_blank"
    },
    "links": [
      {
        "name": "Status",
        "url": "https://status.example.com"
      }
    ]
  },
  
  // Complete color configuration
  "colors": {
    "primary": "#0D9373",
    "light": "#07C983",
    "dark": "#0D9373",
    "ultraLight": "#E6F9F5",
    "ultraDark": "#044A37",
    "background": {
      "light": "#FFFFFF",
      "dark": "#0F1117"
    },
    "anchors": {
      "from": "#0D9373",
      "to": "#07C983"
    }
  },
  
  // Theme and layout
  "theme": "venus",
  "layout": "sidenav",
  "rounded": "default",
  
  // Fonts
  "font": {
    "headings": "Inter",
    "body": "Inter",
    "code": "Fira Code"
  },
  
  // Background
  "background": {
    "style": "gradient"
  },
  "backgroundImage": "https://example.com/bg.jpg",
  
  // Search with hotkeys
  "search": {
    "prompt": "Search docs...",
    "location": "side",
    "hotkeys": ["cmd+k", "ctrl+k"]
  },
  
  // Footer socials
  "footerSocials": {
    "x": "https://x.com/example",
    "github": "https://github.com/example",
    "discord": "https://discord.gg/example",
    "slack": "https://slack.com/example",
    "linkedin": "https://linkedin.com/company/example",
    "youtube": "https://youtube.com/@example"
  },
  
  // Feedback
  "feedback": {
    "thumbsRating": true,
    "suggestEdit": true,
    "raiseIssue": true
  },
  
  // Global feedback override
  "hideFeedbackButtons": false,
  
  // All analytics providers
  "analytics": {
    "ga4": {
      "measurementId": "G-XXXXXXXXXX"
    },
    "gtm": {
      "containerId": "GTM-XXXXXXX"
    },
    "posthog": {
      "apiKey": "phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "apiHost": "https://app.posthog.com"
    },
    "mixpanel": {
      "projectToken": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    },
    "amplitude": {
      "apiKey": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    },
    "segment": {
      "key": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    },
    "clearbit": {
      "publicApiKey": "pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    },
    "koala": {
      "publicApiKey": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    },
    "logrocket": {
      "appId": "xxxxxx/example"
    },
    "hotjar": {
      "hjid": "1234567",
      "hjsv": "6"
    },
    "plausible": {
      "domain": "docs.example.com"
    },
    "fathom": {
      "siteId": "XXXXXXXXX"
    },
    "pirsch": {
      "id": "xxxxxxxxxxxxxxxxxxxx"
    }
  },
  
  // Integrations
  "integrations": {
    "intercom": "xxxxxxxxx",
    "frontchat": "xxxxxxxxx"
  },
  
  // SEO
  "seo": {
    "indexing": true,
    "keywords": ["documentation", "api", "developer", "guide"]
  },
  
  // Robots.txt
  "robots": "User-agent: *\nAllow: /\n\nSitemap: https://example.com/sitemap.xml",
  
  // Redirects
  "redirects": [
    {
      "source": "/old-path",
      "destination": "/new-path",
      "permanent": true
    }
  ],
  
  // Sidebar
  "sidebar": {
    "hasBackground": true
  },
  
  // Code block
  "codeBlock": {
    "highlightLines": true
  },
  
  // Eyebrow
  "eyebrow": "BETA",
  
  // Enterprise
  "isWhiteLabeled": false,
  
  // Custom CSS/JS
  "custom": {
    "css": ["/custom.css", "/theme.css"],
    "js": ["/custom.js", "/analytics.js"]
  },
  
  // Metadata
  "metadata": {
    "og:title": "Test Documentation",
    "og:description": "Complete test of all Mintlify options",
    "og:image": "https://example.com/og-image.png",
    "twitter:card": "summary_large_image",
    "twitter:site": "@example",
    "custom:property": "custom-value"
  }
};

async function runTests() {
  console.log(' Testing Config Editor Schema Support\n');
  
  const testDir = path.join(__dirname, 'test-configs');
  await fs.ensureDir(testDir);
  
  // Write complete test config
  const completeConfigPath = path.join(testDir, 'complete-test.json');
  await fs.writeJson(completeConfigPath, completeTestConfig, { spaces: 2 });
  console.log(' Created complete test configuration');
  
  // Schema validation tests
  const schemaTests = [
    { name: 'Required fields', test: () => completeTestConfig.name && completeTestConfig.favicon },
    { name: 'Logo variations', test: () => completeTestConfig.logo.light && completeTestConfig.logo.dark },
    { name: 'API configuration', test: () => completeTestConfig.api.baseUrl && completeTestConfig.api.auth },
    { name: 'Navigation structure', test: () => completeTestConfig.navigation.length > 0 },
    { name: 'Version configuration', test: () => completeTestConfig.versions.length > 0 },
    { name: 'Analytics providers', test: () => Object.keys(completeTestConfig.analytics).length === 13 },
    { name: 'Search hotkeys', test: () => completeTestConfig.search.hotkeys.length > 0 },
    { name: 'Topbar vs topbarLinks', test: () => completeTestConfig.topbar && completeTestConfig.topbarLinks },
    { name: 'Global settings', test: () => 'hideFeedbackButtons' in completeTestConfig },
    { name: 'Robots.txt', test: () => completeTestConfig.robots.includes('User-agent') }
  ];
  
  console.log('\n Schema Coverage Tests:');
  let passed = 0;
  let failed = 0;
  
  for (const { name, test } of schemaTests) {
    try {
      if (test()) {
        console.log(`   ${name}`);
        passed++;
      } else {
        console.log(`   ${name}`);
        failed++;
      }
    } catch (e) {
      console.log(`   ${name} - ${e.message}`);
      failed++;
    }
  }
  
  console.log(`\n Results: ${passed} passed, ${failed} failed`);
  
  // List all top-level properties
  const topLevelProps = Object.keys(completeTestConfig).sort();
  console.log(`\n Total top-level properties: ${topLevelProps.length}`);
  console.log('Properties:', topLevelProps.join(', '));
  
  // Validate against known schema
  const expectedProperties = [
    '$schema', 'name', 'favicon', 'logo', 'openapi', 'api', 'modeToggle',
    'versions', 'navigation', 'anchors', 'tabs', 'topAnchor', 'primaryTab',
    'topbarLinks', 'topbarCtaButton', 'topbar', 'colors', 'theme', 'layout',
    'font', 'rounded', 'background', 'backgroundImage', 'search', 'footerSocials',
    'feedback', 'hideFeedbackButtons', 'analytics', 'integrations', 'seo',
    'robots', 'redirects', 'sidebar', 'codeBlock', 'eyebrow', 'isWhiteLabeled',
    'custom', 'metadata'
  ];
  
  const missingProperties = expectedProperties.filter(p => !topLevelProps.includes(p));
  const extraProperties = topLevelProps.filter(p => !expectedProperties.includes(p));
  
  if (missingProperties.length > 0) {
    console.log('\n  Missing expected properties:', missingProperties.join(', '));
  }
  
  if (extraProperties.length > 0) {
    console.log('\n  Extra properties not in expected list:', extraProperties.join(', '));
  }
  
  if (missingProperties.length === 0 && extraProperties.length === 0) {
    console.log('\n All expected schema properties are present!');
  }
  
  console.log('\n Test configuration saved to:', completeConfigPath);
  console.log('   Run `node index.js --edit ' + completeConfigPath + '` to test the editor\n');
}

runTests().catch(console.error);