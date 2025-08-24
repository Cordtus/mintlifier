# Mintlify Schema Analysis

## Complete Schema Review

Based on the full Mintlify schema, here are ALL available configuration options:

### Core Properties

#### 1. **$schema** (string)
- Schema reference URL
- Default: "https://mintlify.com/schema.json"

#### 2. **name** (string) - REQUIRED
- Documentation name displayed in header

#### 3. **favicon** (string) - REQUIRED  
- Path to favicon file (.svg, .png, .ico)

#### 4. **logo** (string | object)
- Simple: Path to single logo
- Object form:
  - `light`: Path to light mode logo
  - `dark`: Path to dark mode logo  
  - `href`: URL when logo is clicked

#### 5. **openapi** (string | array)
- Single spec: String path/URL
- Multiple specs: Array of paths/URLs

#### 6. **api** (object)
- `baseUrl`: API server URL
- `auth`: Authentication config
  - `method`: "bearer" | "basic" | "key" | "none"
  - `name`: Header name (for "key" method)
  - `inputPrefix`: Prefix for auth input
- `playground`: API playground settings
  - `mode`: "show" | "simple" | "hide"
- `request`: Request display settings
  - `example`: Code example settings
    - `showOptionalParams`: boolean
- `hideApiMarkers`: boolean
- `maintainOrder`: boolean

#### 7. **modeToggle** (object)
- `default`: "light" | "dark"
- `isHidden`: boolean

#### 8. **versions** (array)
- Array of strings or objects
- Object form:
  - `name`: Version display name
  - `url`: Path to version docs

#### 9. **metadata** (object)
- Open Graph and meta tags
- Custom properties for SEO

#### 10. **favicon** (object) - Alternative form
- Detailed favicon configuration

### Navigation

#### 11. **navigation** (array) - REQUIRED
- Array of navigation groups
- Each group:
  - `group`: Group name
  - `pages`: Array of page paths or nested groups
  - `icon`: Icon identifier
  - `iconType`: Icon style
  - `version`: Version-specific group

#### 12. **anchors** (array)
- Top navigation anchors
- Properties:
  - `name`: Display text
  - `icon`: Icon identifier
  - `url`: Link URL
  - `color`: Icon color

#### 13. **tabs** (array)
- Navigation tabs
- Properties:
  - `name`: Tab display name
  - `url`: Tab URL
  - `version`: Version-specific tab

#### 14. **topAnchor** (object)
- Special top-right anchor
- Properties:
  - `name`: Display text
  - `icon`: Icon identifier  
  - `url`: Link URL

#### 15. **primaryTab** (object)
- Main documentation tab
- Properties:
  - `name`: Tab name
  - `url`: Tab URL

### Topbar

#### 16. **topbarLinks** (array)
- Links in top bar
- Each link:
  - `name`: Link text
  - `url`: Link URL
  - `type`: Link type

#### 17. **topbarCtaButton** (object)
- Call-to-action button
- Properties:
  - `name`: Button text
  - `url`: Button URL
  - `style`: Button style
  - `type`: "default" | "github"
  - `arrow`: boolean

### Appearance

#### 18. **colors** (object)
- `primary`: Primary brand color
- `light`: Light mode primary  
- `dark`: Dark mode primary
- `ultraLight`: Extra light variant
- `ultraDark`: Extra dark variant
- `background`:
  - `light`: Light mode background
  - `dark`: Dark mode background
- `anchors`: Gradient colors
  - `from`: Start color
  - `to`: End color

#### 19. **theme** (string)
- "venus" | "quill" | "prism"

#### 20. **layout** (string)
- "topnav" | "sidenav" | "solidSidenav"

#### 21. **font** (object)
- `headings`: Font family for headings
- `body`: Font family for body text
- `code`: Font family for code blocks

#### 22. **rounded** (string)
- "default" | "sharp"

#### 23. **background** (object)
- `style`: "gradient" | "grid" | "dots"

#### 24. **backgroundImage** (string)
- URL to background image

#### 25. **hideFeedbackButtons** (boolean)
- Hide all feedback buttons

### Search

#### 26. **search** (object)
- `prompt`: Custom search prompt text
- `location`: "side" | "top"
- `hotkeys`: Array of keyboard shortcuts

### Footer

#### 27. **footerSocials** (object)
- Social media links in footer
- Properties: x, github, discord, slack, linkedin, facebook, youtube, twitch, website, instagram, hacker-news, medium, telegram

### Feedback

#### 28. **feedback** (object)
- `thumbsRating`: boolean
- `suggestEdit`: boolean  
- `raiseIssue`: boolean

### Analytics

#### 29. **analytics** (object)
Multiple providers supported:
- `ga4`: { measurementId }
- `gtm`: { containerId }
- `posthog`: { apiKey, apiHost }
- `mixpanel`: { projectToken }
- `amplitude`: { apiKey }
- `segment`: { key }
- `clearbit`: { publicApiKey }
- `koala`: { publicApiKey }
- `logrocket`: { appId }
- `hotjar`: { hjid, hjsv }
- `plausible`: { domain }
- `fathom`: { siteId }
- `pirsch`: { id }

### Integrations

#### 30. **integrations** (object)
- `intercom`: Intercom app ID
- `frontchat`: Front chat ID

### SEO

#### 31. **seo** (object)
- `indexing`: boolean (allow search engines)
- `keywords`: Array of keywords

#### 32. **robots** (string)
- Custom robots.txt content

#### 33. **redirects** (array)
- URL redirects
- Each redirect:
  - `source`: From path
  - `destination`: To path
  - `permanent`: boolean (301 vs 302)

### Advanced

#### 34. **isWhiteLabeled** (boolean)
- Remove Mintlify branding (enterprise)

#### 35. **sidebar** (object)
- `hasBackground`: boolean

#### 36. **topbar** (object)
- Complete topbar configuration

#### 37. **codeBlock** (object)
- `highlightLines`: boolean

#### 38. **eyebrow** (string)
- Small text above main heading

#### 39. **custom** (object)
- `css`: String or array of CSS file paths
- `js`: String or array of JS file paths

## Type Constraints

### Color Values
- Must be valid hex colors (#RRGGBB)
- Some fields accept CSS color names

### URLs
- Must be valid URLs (http/https)
- Relative paths for internal links

### Icons
- Heroicons library identifiers
- FontAwesome identifiers (with prefix)
- Custom SVG paths

### Arrays
- Can be empty
- Order matters for navigation

### Version-specific
- Certain properties can be scoped to versions
- Version URLs must be unique

## Validation Rules

1. **Required fields**: name, favicon, navigation
2. **Conditional requirements**:
   - API playground "show" requires baseUrl
   - API key auth requires header name
   - Theme "prism" works best with primary color
3. **Type validations**:
   - GA4 measurementId must start with "G-"
   - GTM containerId must start with "GTM-"
   - PostHog apiKey must start with "phc_"
   - Clearbit publicApiKey must start with "pk_"
4. **Compatibility**:
   - topnav layout may not work well with many nav groups
   - Multiple analytics providers impact performance

## Missing from Current Implementation

After reviewing the schema, these options need to be added/fixed:

1. **api.request.example.showOptionalParams** - Not implemented
2. **api.hideApiMarkers** - Not implemented
3. **api.maintainOrder** - Not implemented
4. **navigation group icons** - Not fully implemented
5. **anchors.color** - Not implemented
6. **topbarLinks** (different from topbar.links) - Need to verify
7. **hideFeedbackButtons** - Not implemented (global option)
8. **search.hotkeys** - Not implemented
9. **robots** - Not implemented
10. **integrations** - Partially implemented
11. **custom properties in metadata** - Not fully flexible
12. **version-specific navigation/tabs** - Not implemented

## Schema Definitions to Note

### Conditional Types
- Some properties can be either string or object
- Arrays can contain mixed types (strings and objects)

### Nested Objects
- Deep nesting in api, colors, metadata
- Optional properties at various levels

### Default Behaviors
- Many properties have sensible defaults
- Omitting optional properties uses Mintlify defaults