# Mintlify Schema - Complete Reference

This document provides a complete reference of all Mintlify configuration options supported by Mintlifier's config editor.

## Schema Validation

All configurations can include the schema reference:
```json
{
  "$schema": "https://mintlify.com/schema.json"
}
```

## Required Fields

### `name` (string) **REQUIRED**
The name of your documentation site displayed in the header.

### `favicon` (string) **REQUIRED**
Path to your favicon file (.svg, .png, or .ico).

### `navigation` (array) **REQUIRED**
Your documentation's navigation structure.

## Core Configuration

### `logo` (string | object)
Your site's logo configuration.

**Simple form:**
```json
"logo": "/logo.svg"
```

**Advanced form:**
```json
"logo": {
  "light": "/logo-light.svg",
  "dark": "/logo-dark.svg",
  "href": "https://yoursite.com"
}
```

### `modeToggle` (object)
Light/dark mode toggle configuration.
```json
"modeToggle": {
  "default": "light",  // or "dark"
  "isHidden": false
}
```

## Navigation

### `navigation` (array)
Main navigation structure with groups and pages.
```json
"navigation": [
  {
    "group": "Getting Started",
    "icon": "book-open",      // optional
    "iconType": "solid",       // optional: "solid" | "outline"
    "version": "v2.0.0",       // optional: version-specific
    "pages": [
      "introduction",
      "quickstart"
    ]
  }
]
```

### `tabs` (array)
Top-level navigation tabs.
```json
"tabs": [
  {
    "name": "Documentation",
    "url": "/",
    "version": "v2.0.0"  // optional: version-specific
  }
]
```

### `anchors` (array)
Navigation anchors (usually for external links).
```json
"anchors": [
  {
    "name": "GitHub",
    "icon": "github",
    "url": "https://github.com/yourrepo",
    "color": "#333333"  // optional
  }
]
```

### `topAnchor` (object)
Special top-right anchor.
```json
"topAnchor": {
  "name": "Support",
  "icon": "life-ring",
  "url": "https://support.example.com"
}
```

### `primaryTab` (object)
Main documentation tab.
```json
"primaryTab": {
  "name": "Docs",
  "url": "/"
}
```

## Topbar

### `topbarLinks` (array)
Root-level topbar links.
```json
"topbarLinks": [
  {
    "name": "Blog",
    "url": "https://blog.example.com",
    "type": "primary"  // optional: "primary" | "secondary"
  }
]
```

### `topbarCtaButton` (object)
Root-level CTA button.
```json
"topbarCtaButton": {
  "name": "Get Started",
  "url": "/signup",
  "type": "github",  // "default" | "github"
  "arrow": true
}
```

### `topbar` (object)
Nested topbar configuration.
```json
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
}
```

## API Configuration

### `openapi` (string | array)
OpenAPI/Swagger specification files.
```json
"openapi": "/openapi.json"
// or
"openapi": ["/openapi-v1.json", "/openapi-v2.json"]
```

### `api` (object)
API documentation settings.
```json
"api": {
  "baseUrl": "https://api.example.com",
  "auth": {
    "method": "bearer",  // "bearer" | "basic" | "key" | "none"
    "name": "X-API-Key",  // for "key" method
    "inputPrefix": "Bearer"
  },
  "playground": {
    "mode": "show"  // "show" | "simple" | "hide"
  },
  "request": {
    "example": {
      "showOptionalParams": true
    }
  },
  "hideApiMarkers": false,
  "maintainOrder": true
}
```

## Appearance

### `theme` (string)
Documentation theme.
- `"venus"` - Modern theme
- `"quill"` - Classic theme
- `"prism"` - Vibrant theme

### `layout` (string)
Layout style.
- `"topnav"` - Top navigation
- `"sidenav"` - Side navigation
- `"solidSidenav"` - Solid side navigation

### `rounded` (string)
Corner style.
- `"default"` - Rounded corners
- `"sharp"` - Sharp corners

### `colors` (object)
Color configuration.
```json
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
}
```

### `font` (object)
Font configuration.
```json
"font": {
  "headings": "Inter",
  "body": "Inter",
  "code": "Fira Code"
}
```

### `background` (object)
Background style.
```json
"background": {
  "style": "gradient"  // "gradient" | "grid" | "dots"
}
```

### `backgroundImage` (string)
Custom background image URL.

### `sidebar` (object)
Sidebar configuration.
```json
"sidebar": {
  "hasBackground": true
}
```

### `codeBlock` (object)
Code block settings.
```json
"codeBlock": {
  "highlightLines": true
}
```

### `eyebrow` (string)
Small text above main heading (e.g., "BETA").

## Search

### `search` (object)
Search configuration.
```json
"search": {
  "prompt": "Search docs...",
  "location": "side",  // "side" | "top"
  "hotkeys": ["cmd+k", "ctrl+k"]
}
```

## Footer

### `footerSocials` (object)
Social media links in footer.
```json
"footerSocials": {
  "x": "https://x.com/example",
  "github": "https://github.com/example",
  "discord": "https://discord.gg/example",
  "slack": "https://slack.com/example",
  "linkedin": "https://linkedin.com/company/example",
  "youtube": "https://youtube.com/@example",
  "facebook": "...",
  "twitch": "...",
  "website": "...",
  "instagram": "...",
  "hacker-news": "...",
  "medium": "...",
  "telegram": "..."
}
```

## Feedback

### `feedback` (object)
Individual feedback settings.
```json
"feedback": {
  "thumbsRating": true,
  "suggestEdit": true,
  "raiseIssue": true
}
```

### `hideFeedbackButtons` (boolean)
Hide all feedback buttons globally (overrides individual settings).

## Analytics

### `analytics` (object)
Analytics provider configurations.

Supported providers:
- **Google Analytics 4**: `ga4.measurementId` (starts with "G-")
- **Google Tag Manager**: `gtm.containerId` (starts with "GTM-")
- **PostHog**: `posthog.apiKey` (starts with "phc_"), `posthog.apiHost`
- **Mixpanel**: `mixpanel.projectToken`
- **Amplitude**: `amplitude.apiKey`
- **Segment**: `segment.key`
- **Clearbit**: `clearbit.publicApiKey` (starts with "pk_")
- **Koala**: `koala.publicApiKey`
- **LogRocket**: `logrocket.appId`
- **Hotjar**: `hotjar.hjid`, `hotjar.hjsv`
- **Plausible**: `plausible.domain`
- **Fathom**: `fathom.siteId`
- **Pirsch**: `pirsch.id`

Example:
```json
"analytics": {
  "ga4": {
    "measurementId": "G-XXXXXXXXXX"
  },
  "posthog": {
    "apiKey": "phc_xxxxxxxxx",
    "apiHost": "https://app.posthog.com"
  }
}
```

## Integrations

### `integrations` (object)
Chat and support integrations.
```json
"integrations": {
  "intercom": "app_id_here",
  "frontchat": "chat_id_here"
}
```

## Versioning

### `versions` (array)
Documentation versions.
```json
"versions": [
  "v3.0.0",  // current version (string)
  {
    "name": "v2.0.0",
    "url": "docs/v2.0.0"  // frozen version (object)
  }
]
```

## SEO & Metadata

### `seo` (object)
SEO configuration.
```json
"seo": {
  "indexing": true,
  "keywords": ["documentation", "api", "developer"]
}
```

### `robots` (string)
Custom robots.txt content.
```json
"robots": "User-agent: *\nAllow: /\n\nSitemap: https://example.com/sitemap.xml"
```

### `metadata` (object)
Meta tags and Open Graph configuration.
```json
"metadata": {
  "og:title": "Documentation",
  "og:description": "API Documentation",
  "og:image": "https://example.com/og-image.png",
  "twitter:card": "summary_large_image",
  "twitter:site": "@example",
  "custom:property": "custom-value"
}
```

### `redirects` (array)
URL redirects.
```json
"redirects": [
  {
    "source": "/old-path",
    "destination": "/new-path",
    "permanent": true  // 301 vs 302
  }
]
```

## Advanced

### `custom` (object)
Custom CSS and JavaScript files.
```json
"custom": {
  "css": ["/custom.css", "/theme.css"],
  "js": ["/custom.js", "/analytics.js"]
}
```

### `isWhiteLabeled` (boolean)
Remove Mintlify branding (Enterprise only).

## Validation Rules

1. **Required Fields**: `name`, `favicon`, `navigation`
2. **Color Format**: Hex colors must be valid (#RRGGBB)
3. **Analytics IDs**: 
   - GA4: Must start with "G-"
   - GTM: Must start with "GTM-"
   - PostHog: Must start with "phc_"
   - Clearbit: Must start with "pk_"
4. **API Playground**: Mode "show" requires `api.baseUrl`
5. **Compatibility**:
   - `topnav` layout works best with ≤5 navigation groups
   - Multiple analytics providers may impact performance
   - `hideFeedbackButtons` overrides individual feedback settings

## Using the Config Editor

### Create New Configuration
```bash
node index.js
```

### Edit Existing Configuration
```bash
node index.js --edit
# or edit specific file
node index.js --edit /path/to/mint.json
```

### Features
- Interactive menus for all options
- Validation against schema
- Compatibility warnings
- Automatic backups before saving
- Preview before save

## Complete Example

See `/test/test-configs/complete-test.json` for a configuration using all available options.