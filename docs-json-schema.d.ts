/**
 * Mintlify docs.json configuration types.
 *
 * Keep this file aligned with https://mintlify.com/docs.json. It intentionally
 * omits older mint.json-era fields such as layout, rounded, analytics,
 * feedback, modeToggle, top-level openapi, and top-level versions.
 */

export type MintlifyTheme =
  | 'mint'
  | 'maple'
  | 'palm'
  | 'willow'
  | 'linden'
  | 'almond'
  | 'aspen'
  | 'sequoia'
  | 'luma';

export type IconLibrary = 'fontawesome' | 'lucide' | 'tabler';

export type AppearanceMode = 'system' | 'light' | 'dark';

export type CodeblockStyle = 'system' | 'dark' | string | {
  theme?: string | {
    light: string;
    dark: string;
  };
  languages?: {
    custom?: string[];
  };
};

export type ContextualOption =
  | 'assistant'
  | 'copy'
  | 'view'
  | 'download-pdf'
  | 'download-spec'
  | 'chatgpt'
  | 'claude'
  | 'perplexity'
  | 'grok'
  | 'aistudio'
  | 'devin'
  | 'windsurf'
  | 'mcp'
  | 'add-mcp'
  | 'cursor'
  | 'vscode'
  | 'devin-mcp'
  | {
      title: string;
      description: string;
      icon?: string;
      href: string | {
        base: string;
        query?: Array<{ key: string; value: string }>;
      };
    };

export interface DocsConfig {
  $schema?: string;
  theme: MintlifyTheme;
  name: string;
  colors: {
    primary: string;
    light?: string;
    dark?: string;
  };
  navigation: Navigation;
  public?: boolean;
  description?: string;
  logo?: ImageConfig & { href?: string };
  favicon?: ImageConfig;
  appearance?: {
    default?: AppearanceMode;
    strict?: boolean;
  };
  fonts?: FontConfig | {
    heading?: FontConfig;
    body?: FontConfig;
  };
  icons?: {
    library: IconLibrary;
  };
  background?: {
    decoration?: 'gradient' | 'grid' | 'windows';
    color?: ColorPair;
    image?: ImageConfig;
  };
  styling?: {
    eyebrows?: 'section' | 'breadcrumbs';
    latex?: boolean;
    codeblocks?: CodeblockStyle;
  };
  thumbnails?: {
    appearance?: 'light' | 'dark';
    background?: string;
    fonts?: Pick<FontConfig, 'family'>;
  };
  navbar?: {
    links?: NavbarLink[];
    primary?: NavbarPrimary;
  };
  footer?: {
    socials?: Partial<Record<FooterSocial, string>>;
    links?: Array<{
      header: string;
      items: Array<{ label: string; href: string }>;
    }>;
  };
  banner?: {
    content: string;
    dismissible?: boolean;
    type?: 'info' | 'warning' | 'critical';
    color?: string | ColorPair;
  };
  interaction?: {
    drilldown?: boolean;
  };
  contextual?: {
    options: ContextualOption[];
    display?: 'header' | 'toc';
  };
  redirects?: Array<{
    source: string;
    destination: string;
    permanent?: boolean;
  }>;
  variables?: Record<string, string>;
  metadata?: {
    timestamp?: boolean;
  };
  errors?: {
    404: {
      redirect?: boolean;
      title?: string;
      description?: string;
    };
  };
  api?: ApiConfig;
  seo?: {
    indexing?: 'navigable' | 'all';
    metatags?: Record<string, string>;
  };
  search?: {
    prompt?: string;
  };
  integrations?: IntegrationsConfig;
}

export type ImageConfig = string | {
  light: string;
  dark: string;
};

export interface FontConfig {
  family: string;
  weight?: number;
  source?: string;
  format?: 'woff' | 'woff2';
}

export interface ColorPair {
  light: string;
  dark: string;
}

export interface Navigation {
  global?: {
    tabs?: GlobalNavItem[];
    anchors?: GlobalNavItem[];
    dropdowns?: GlobalNavItem[];
    languages?: GlobalNavItem[];
    versions?: GlobalNavItem[];
    products?: ProductNavItem[];
  };
  directory?: 'none' | 'accordion' | 'card';
  products?: ProductNavItem[];
  languages?: LanguageNavItem[];
  versions?: VersionNavItem[];
  tabs?: TabNavItem[];
  dropdowns?: DropdownNavItem[];
  anchors?: AnchorNavItem[];
  groups?: GroupNavItem[];
  pages?: PageRef[];
}

export type PageRef = string | GroupNavItem;

export interface GroupNavItem {
  group: string;
  pages?: PageRef[];
  groups?: GroupNavItem[];
  icon?: string;
  iconType?: string;
  root?: string;
  tag?: string;
  expanded?: boolean;
  hidden?: boolean;
  searchable?: boolean;
  boost?: number;
  directory?: Navigation['directory'];
  openapi?: OpenApiConfig;
  asyncapi?: OpenApiConfig;
}

export interface TabNavItem {
  tab: string;
  pages?: PageRef[];
  groups?: GroupNavItem[];
  dropdowns?: DropdownNavItem[];
  anchors?: AnchorNavItem[];
  versions?: VersionNavItem[];
  languages?: LanguageNavItem[];
  menu?: MenuNavItem[];
  icon?: string;
  hidden?: boolean;
  searchable?: boolean;
  align?: 'left' | 'right';
  directory?: Navigation['directory'];
  openapi?: OpenApiConfig;
  asyncapi?: OpenApiConfig;
}

export interface VersionNavItem extends Omit<TabNavItem, 'tab'> {
  version: string;
  default?: boolean;
  tag?: string;
}

export interface LanguageNavItem extends Omit<TabNavItem, 'tab'> {
  language: string;
  default?: boolean;
}

export interface DropdownNavItem extends Omit<TabNavItem, 'tab'> {
  dropdown: string;
  description?: string;
}

export interface AnchorNavItem extends Omit<TabNavItem, 'tab'> {
  anchor: string;
  href?: string;
  color?: string | ColorPair;
}

export interface ProductNavItem extends Omit<TabNavItem, 'tab'> {
  product: string;
  name?: string;
  description?: string;
  icon?: string;
  color?: string | ColorPair;
}

export interface MenuNavItem {
  item: string;
  href?: string;
  pages?: PageRef[];
  groups?: GroupNavItem[];
  icon?: string;
  description?: string;
  hidden?: boolean;
}

export interface GlobalNavItem {
  tab?: string;
  anchor?: string;
  dropdown?: string;
  language?: string;
  version?: string;
  href: string;
  icon?: string;
  iconType?: string;
  hidden?: boolean;
  default?: boolean;
  color?: string | ColorPair;
}

export type OpenApiConfig = string | string[] | {
  source: string;
  directory?: string;
};

export interface ApiConfig {
  openapi?: OpenApiConfig;
  asyncapi?: OpenApiConfig;
  playground?: {
    display?: 'interactive' | 'simple' | 'none' | 'auth';
    proxy?: boolean;
    credentials?: boolean;
  };
  params?: {
    expanded?: 'all' | 'closed';
    post?: string[];
  };
  url?: 'full';
  examples?: {
    languages?: string[];
    defaults?: 'required' | 'all';
    prefill?: boolean;
    autogenerate?: boolean;
  };
  mdx?: {
    auth?: {
      method?: 'bearer' | 'basic' | 'key' | 'cobo';
      name?: string;
    };
    server?: string | string[];
  };
}

export interface IntegrationsConfig {
  adobe?: { launchUrl: string };
  amplitude?: { apiKey: string };
  clarity?: { projectId: string };
  clearbit?: { publicApiKey: string };
  fathom?: { siteId: string };
  frontchat?: { snippetId: string };
  ga4?: { measurementId: string };
  gtm?: { tagId: string };
  heap?: { appId: string };
  hightouch?: { writeKey: string; apiHost?: string };
  hotjar?: { hjid: string; hjsv: string };
  intercom?: { appId: string };
  koala?: { publicApiKey: string };
  logrocket?: { appId: string };
  mixpanel?: { projectToken: string; region?: 'us' | 'eu' | 'in' };
  onetrust?: { domainScript: string; categoryId?: string; scriptSource?: string };
  pirsch?: { id: string };
  plausible?: { domain: string; server?: string };
  posthog?: { apiKey: string; apiHost?: string; sessionRecording?: boolean };
  segment?: { key: string };
  telemetry?: { enabled?: boolean };
  cookies?: { key?: string; value?: string };
}

export type FooterSocial =
  | 'x'
  | 'website'
  | 'facebook'
  | 'youtube'
  | 'discord'
  | 'slack'
  | 'github'
  | 'linkedin'
  | 'instagram'
  | 'hacker-news'
  | 'medium'
  | 'telegram'
  | 'twitter'
  | 'x-twitter'
  | 'earth-americas'
  | 'bluesky'
  | 'threads'
  | 'reddit'
  | 'podcast';

export type NavbarLink =
  | { type: 'github' | 'discord'; href: string; icon?: string; iconType?: string }
  | { label: string; href: string; icon?: string; iconType?: string };

export type NavbarPrimary =
  | { type: 'github' | 'discord'; href: string }
  | { type: 'button'; label: string; href: string };
