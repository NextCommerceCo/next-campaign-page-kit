# Next Campaign Page Kit

Eleventy plugin and CLI tools for building Next Commerce campaign funnels. Provides a customized 11ty static site generator tailored for multi-page campaign flows (presale, checkout, upsell, receipt).

## Getting Started

### 1. Create a project directory

```bash
mkdir my-campaign && cd my-campaign
```

### 2. Create a `package.json`

```json
{
  "name": "my-campaign",
  "version": "1.0.0",
  "scripts": {
    "init": "campaign-init",
    "start": "campaign-dev",
    "dev": "campaign-dev",
    "build": "eleventy",
    "clone": "campaign-clone",
    "config": "campaign-config"
  },
  "dependencies": {
    "next-campaign-page-kit": "github:NextCommerceCo/next-campaign-page-kit",
    "@11ty/eleventy": "^3.1.2"
  }
}
```

### 3. Install dependencies

```bash
npm install
```

### 4. Run the init script

```bash
npm run init
```

This will create:
- `.eleventy.js` — Eleventy config wired up to this package
- `_data/campaigns.json` — empty campaign registry to get you started

### 5. Add your first campaign to `_data/campaigns.json`

```json
{
  "campaigns": [
    {
      "name": "My Campaign",
      "slug": "my-campaign",
      "description": "My first campaign",
      "sdk_version": "0.3.10"
    }
  ]
}
```

### 6. Create your campaign files

```
src/
└── my-campaign/
    ├── _layouts/
    │   └── base.html
    ├── assets/
    │   └── config.js
    └── presale.html
```

### 7. Set your Campaign API key

```bash
npm run config
```

> [!IMPORTANT]
> Get your Campaign API key from the Campaigns App in your store. See [Campaigns App Guide](https://developers.nextcommerce.com/docs/campaigns/).

### 8. Start the development server

```bash
npm run dev
```

This will:
1. Show a list of available campaigns
2. Let you select which campaign to preview
3. Start the 11ty development server
4. Open your browser to the selected campaign

---

## Commands

| Command | Description |
|---|---|
| `npm run init` | Scaffold `.eleventy.js` and `_data/campaigns.json` |
| `npm run dev` | Start dev server with interactive campaign picker |
| `npm run build` | Build all campaigns to `_site/` |
| `npm run clone` | Clone an existing campaign to a new slug |
| `npm run config` | Set the API key for a campaign |

### Build

Output will be in the `_site` directory:

```bash
npm run build
```

### Clone Campaign

Clone an existing campaign to create a new one:

```bash
npm run clone
```

## Campaign File Structure

```
your-project/
├── _data/
│   └── campaigns.json          # Campaign registry (contains data for all campaigns)
├── src/
│   └── [campaign-slug]/        # Individual campaign directory
│       ├── _layouts/           # Campaign-specific layouts
│       │   └── base.html       # Base layout template
│       ├── assets/             # Campaign assets (CSS, images, JS, config)
│       │   ├── css/            # Campaign styles
│       │   ├── images/         # Campaign images
│       │   ├── js/             # Campaign scripts
│       │   └── config.js       # SDK configuration
│       ├── presale.html        # Presale page (Base URL)
│       ├── checkout.html       # Checkout page
│       ├── upsell.html         # Upsell page
│       ├── receipt.html        # Receipt page
│       └── *.html              # Any other page
├── .eleventy.js                # 11ty config (2 lines)
└── package.json
```

### Key Files

- **`_data/campaigns.json`** - Register all campaigns and their configuration data here
- **`src/[campaign]/_layouts/base.html`** - Campaign's base layout
- **`src/[campaign]/assets/config.js`** - Campaign Cart SDK configuration
- **`.eleventy.js`** - Eleventy config (uses `createEleventyConfig` from this package)

## Page Frontmatter

Each campaign page uses YAML frontmatter to configure the page.

### Example

```yaml
---
page_layout: base.html
title: Checkout
page_type: checkout
next_success_url: upsell.html
styles:
  - https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css
  - css/offer.css
scripts:
  - https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js
  - js/offer.js
footer: true
---
```

### Frontmatter Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `page_layout` | string | No | Layout file in `_layouts/`. Defaults to `base.html` |
| `title` | string | Yes | Page title for `<title>` tag |
| `page_type` | string | No | Page type: `product`, `checkout`, `upsell`, `receipt` |
| `permalink` | string | No | Custom URL path (e.g., `/starter/`) |
| `next_success_url` | string | No | Redirect URL after successful checkout |
| `next_upsell_accept` | string | No | URL when upsell accepted |
| `next_upsell_decline` | string | No | URL when upsell declined |
| `styles` | array | No | Page-specific CSS files (relative paths or external URLs) |
| `scripts` | array | No | Page-specific JS files (relative paths or external URLs) |
| `footer` | boolean | No | Show footer on this page |

## Campaign Context (`campaign`)

Each page automatically has access to its campaign's data from `_data/campaigns.json` via the `campaign` object. This allows you to provide configured context directly to your pages.

### Usage

You can access any key defined in your campaign's entry in `_data/campaigns.json`:

```liquid
<h1>{{ campaign.name }}</h1>
<p>Contact: {{ campaign.support_email }}</p>
```

### Adding Custom Context

To add more context, simply add new keys to your campaign in `_data/campaigns.json`:

```json
{
  "campaigns": [
    {
      "slug": "starter",
      "name": "Starter Campaign",
      "support_email": "support@example.com",
      "custom_headline": "Welcome to our Store!"
    }
  ]
}
```

Then use it in your templates:

```liquid
<h2>{{ campaign.custom_headline }}</h2>
```

### Layout Resolution

Layouts are automatically resolved to the campaign's `_layouts/` directory:

- `page_layout: base.html` → `starter/_layouts/base.html`
- `page_layout: custom.html` → `starter/_layouts/custom.html`

**No layout specified?** Defaults to `base.html`.

## Template Tags (Filters)

Next Campaign Page Kit provides custom 11ty filters for campaign-agnostic paths.

### `campaign_asset`

Resolves asset paths to the current campaign.

**Syntax:**
```liquid
{{ 'filename' | campaign_asset }}
```

**Examples:**
```liquid
<!-- Config -->
<script src="{{ 'config.js' | campaign_asset }}"></script>
<!-- Output: /starter/config.js -->

<!-- CSS -->
<link href="{{ 'css/custom.css' | campaign_asset }}" rel="stylesheet">
<!-- Output: /starter/css/custom.css -->

<!-- Images -->
<img src="{{ 'images/logo.png' | campaign_asset }}" alt="Logo">
<!-- Output: /starter/images/logo.png -->
```

**Use for:** CSS files, JavaScript files, images, config.js, any campaign asset.

---

### `campaign_link`

Generates clean URLs for inter-page navigation.

**Syntax:**
```liquid
{{ 'filename.html' | campaign_link }}
```

**Examples:**
```liquid
<!-- Navigation link -->
<a href="{{ 'checkout.html' | campaign_link }}">Checkout</a>
<!-- Output: /starter/checkout/ -->

<!-- Campaign Cart meta tag -->
<meta name="next-success-url" content="{{ next_success_url | campaign_link }}">
<!-- Output: /starter/upsell/ -->

<!-- Data attribute -->
<button data-next-url="{{ 'upsell.html' | campaign_link }}">Continue</button>
<!-- Output: /starter/upsell/ -->
```

**Features:**
- Removes `.html` extension
- Adds trailing slash
- Prepends campaign slug
- Handles anchor links (`#section`) and absolute URLs

**Use for:** Page links, navigation URLs, redirect URLs, Campaign Cart SDK meta tags.

---

### `campaign_include`

Includes a file relative to the current campaign's `_includes` directory. This is useful for including reusable components that are specific to a campaign.

**Syntax:**
```liquid
{% campaign_include 'filename.html' arg=value %}
```

**Examples:**
```liquid
<!-- Include a slider component -->
{% campaign_include 'slider.html' images=page.slider_images %}

<!-- Include with parameters -->
{% campaign_include 'slider.html' images=page.slider_images show_package_image=true %}
```

**Use for:** Reusable components within a campaign (e.g., sliders, testimonials).

## Connecting to Campaigns App

To connect this campaign to your 29 Next Campaigns App:

1. Run `npm run config`
2. Select your campaign
3. Enter your API key from the Campaigns App
4. Deploy your campaign

For more details, see the [Campaigns App documentation](https://docs.29next.com/apps/campaigns-app).

## Test Orders

You can use our [test cards](https://docs.29next.com/manage/orders/test-orders) to create test orders.
