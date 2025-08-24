/**
 * Mintlify docs.json Configuration Types
 * Complete type definitions for Mintlify docs.json (2024-2025)
 */

export interface DocsConfig {
  /** Schema reference for validation and autocomplete */
  $schema?: string;
  
  /** Name of your documentation site */
  name: string;
  
  /** Description of your documentation site */
  description?: string;
  
  /** Visual theme preset */
  theme: 'mint' | 'maple' | 'palm' | 'willow' | 'linden' | 'almond' | 'aspen';
  
  /** Color configuration */
  colors: {
    /** Primary color (hex) */
    primary: string;
    /** Light mode variant color (hex) */
    light?: string;
    /** Dark mode variant color (hex) */
    dark?: string;
  };
  
  /** Icon library configuration */
  icons?: {
    /** Icon library to use */
    library?: 'lucide' | 'heroicons' | 'fontawesome' | 'tabler' | 'phosphor';
  };
  
  /** Styling configuration */
  styling?: {
    /** Code block color scheme */
    codeblocks?: 'system' | 'light' | 'dark';
  };
  
  /** Favicon configuration */
  favicon?: string | {
    light?: string;
    dark?: string;
  };
  
  /** Logo configuration */
  logo?: string | {
    light?: string;
    dark?: string;
    href?: string;
  };
  
  /** Contextual menu configuration */
  contextual?: {
    options?: Array<'copy' | 'view' | 'chatgpt' | 'claude' | 'perplexity' | 'mcp' | 'cursor' | 'vscode'>;
  };
  
  /** Navigation structure */
  navigation: Navigation;
  
  /** Legacy tabs configuration (deprecated, use navigation.tabs) */
  tabs?: Tab[];
  
  /** OpenAPI specification files */
  openapi?: string | string[];
  
  /** API configuration */
  api?: {
    baseUrl?: string;
    server?: string;
    auth?: {
      method?: 'bearer' | 'basic' | 'key' | 'none';
    };
    playground?: {
      mode?: 'show' | 'simple' | 'hide';
    };
    proxy?: boolean;
  };
  
  /** Footer configuration */
  footer?: {
    socials?: {
      x?: string;
      twitter?: string;
      github?: string;
      discord?: string;
      slack?: string;
      linkedin?: string;
      youtube?: string;
      facebook?: string;
      instagram?: string;
      website?: string;
    };
  };
  
  /** Social media links (alternative location) */
  footerSocials?: Record<string, string>;
  
  /** Analytics integrations */
  analytics?: {
    ga4?: { measurementId: string };
    gtm?: { containerId: string };
    posthog?: { apiKey: string };
    mixpanel?: { projectToken: string };
    amplitude?: { apiKey: string };
    segment?: { key: string };
    heap?: { appId: string };
    clearbit?: { apiKey: string };
    fathom?: { siteId: string };
    hotjar?: { id: string; scriptVersion?: string };
    koala?: { publicKey: string };
    plausible?: { domain: string };
    logrocket?: { appId: string };
    pirsch?: { code: string };
  };
  
  /** Third-party integrations */
  integrations?: Record<string, any>;
  
  /** Feedback widget configuration */
  feedback?: {
    thumbsRating?: boolean;
    suggestEdit?: boolean;
    raiseIssue?: boolean;
  };
  
  /** Search configuration */
  search?: {
    prompt?: string;
    placeholder?: string;
    location?: 'side' | 'top';
  };
  
  /** Dark/light mode toggle settings */
  modeToggle?: {
    default?: 'light' | 'dark';
    isHidden?: boolean;
  };
  
  /** Version switcher (deprecated, use navigation.versions) */
  versions?: Array<string | { name: string; url: string }>;
  
  /** Links in the top navigation bar */
  topbarLinks?: Array<{
    name: string;
    url: string;
    type?: 'link' | 'github';
  }>;
  
  /** Call-to-action button in top bar */
  topbarCtaButton?: {
    name: string;
    url: string;
    type?: 'link' | 'github';
  };
  
  /** Custom font configuration */
  font?: {
    family?: string;
    weight?: string | number;
    url?: string;
    format?: string;
  };
  
  /** Global layout style */
  layout?: 'topnav' | 'sidenav' | 'solidSidenav';
  
  /** Corner style */
  rounded?: 'default' | 'sharp';
  
  /** Background configuration */
  background?: {
    style?: string;
  };
  
  /** Custom background image URL */
  backgroundImage?: string;
  
  /** Meta tags added to every page */
  metadata?: Record<string, string>;
  
  /** SEO configuration */
  seo?: {
    indexing?: 'navigable' | 'all';
  };
  
  /** URL redirect configurations */
  redirects?: Array<{
    from: string;
    to: string;
  }>;
  
  /** Hide all feedback buttons globally */
  hideFeedbackButtons?: boolean;
}

export interface Navigation {
  /** Simple page list (for single-version docs) */
  pages?: string[];
  
  /** Navigation groups (for single-version docs) */
  groups?: Group[];
  
  /** Top-level tabs (for single-version docs) */
  tabs?: NavigationTab[];
  
  /** Multi-version navigation */
  versions?: Version[];
  
  /** Multi-language navigation */
  languages?: Language[];
  
  /** Dropdown menus */
  dropdowns?: Dropdown[];
  
  /** Anchor sections */
  anchors?: Anchor[];
}

export interface Group {
  /** Group name */
  group: string;
  
  /** Group icon */
  icon?: string;
  
  /** Icon style type */
  iconType?: 'solid' | 'regular' | 'light' | 'thin' | 'duotone';
  
  /** Pages or nested groups */
  pages?: Array<string | Group>;
}

export interface NavigationTab {
  /** Tab name */
  tab: string;
  
  /** Tab icon */
  icon?: string;
  
  /** External URL */
  href?: string;
  
  /** Pages in this tab */
  pages?: Array<string | Group>;
  
  /** Groups in this tab */
  groups?: Group[];
}

export interface Tab {
  /** Tab display name */
  name: string;
  
  /** Tab URL path or external link */
  url: string;
  
  /** External URL */
  href?: string;
}

export interface Version {
  /** Version identifier */
  version: string;
  
  /** Is this the default version? */
  default?: boolean;
  
  /** Hide this version? */
  hidden?: boolean;
  
  /** Tabs for this version */
  tabs?: NavigationTab[];
  
  /** Groups for this version */
  groups?: Group[];
  
  /** Pages for this version */
  pages?: Array<string | Group>;
}

export interface Language {
  /** Language code */
  language: 'en' | 'cn' | 'zh' | 'zh-Hans' | 'zh-Hant' | 'es' | 'fr' | 'ja' | 'jp' | 'pt' | 'pt-BR' | 'de' | 'ko' | 'it' | 'ru' | 'id' | 'ar' | 'tr';
  
  /** Is this the default language? */
  default?: boolean;
  
  /** Hide this language? */
  hidden?: boolean;
  
  /** URL path for this language */
  url?: string;
  
  /** Tabs for this language */
  tabs?: NavigationTab[];
  
  /** Groups for this language */
  groups?: Group[];
  
  /** Pages for this language */
  pages?: Array<string | Group>;
}

export interface Dropdown {
  /** Dropdown menu name */
  dropdown: string;
  
  /** Dropdown icon */
  icon?: string;
  
  /** Dropdown menu items */
  items?: Array<{
    name: string;
    url: string;
  }>;
}

export interface Anchor {
  /** Anchor section name */
  anchor: string;
  
  /** Anchor icon */
  icon?: string;
  
  /** Anchor color (hex) */
  color?: string;
  
  /** Pages in this anchor section */
  pages?: Array<string | Group>;
  
  /** Groups in this anchor section */
  groups?: Group[];
}