# Design Extractor — Chrome Extension (Manifest V3)

**Design Extractor** is a powerful Chrome browser extension designed for designers, developers, and UI engineers to reverse-engineer any website's design system tokens in seconds.

It scans the active web page, collects computed styles from the DOM, calculates token frequencies, extracts responsive media breakpoints, extracts CSS custom variables (`:root` properties), and generates structured design tokens across multiple export formats.

---

## Key Features

- 🎨 **Color Palette Extraction**: Normalizes RGB/RGBA colors to clean HEX format, groups text & background colors, and filters transparent values.
- ⚙️ **CSS Custom Properties (`--*`)**: Inspects `:root` and stylesheets to extract declared CSS custom variables (`--primary-color`, `--font-sans`, etc.).
- 🔤 **Typography System**: Ranks primary font families, font sizes, font weights, and line heights by usage.
- 📐 **Spacing Scale**: Groups margin and padding values into a clean, numerically sorted spacing scale.
- 🔳 **Borders & Radii**: Extracts top border radius tokens used across cards, buttons, and inputs.
- 🌗 **Box Shadows**: Captures drop-shadow and elevation definitions.
- 📱 **Media Breakpoints**: Reads `@media` rules from page stylesheets to capture responsive breakpoint thresholds.
- 👁️ **Visual Swatch & Code Preview**: View visual color swatches or inspect raw Markdown and CSS variables before exporting.

---

## Export Formats Supported

Export your reverse-engineered design tokens into your framework of choice with one click:

1. **`design.md`**: Clean markdown document summarizing design tokens with counts and source details.
2. **`tailwind.config.js`**: Ready-to-use Tailwind CSS theme extension snippet.
3. **`_variables.scss`**: SCSS variables file (`$color-bg-1`, `$font-family-1`, `$spacing-1`).
4. **`tokens.json`**: W3C Design Tokens standard format.
5. **`design.json`**: Complete raw extracted token metadata JSON.

---

## Installation Guide (Unpacked Extension)

1. Open **Google Chrome** and navigate to `chrome://extensions`.
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click the **Load unpacked** button in the top-left toolbar.
4. Select the directory containing this project (`Extension_design_md`).
5. The **Design Extractor** extension icon will appear in your extension toolbar.

---

## How to Use

1. Navigate to any web page you want to inspect (e.g., GitHub, Stripe, Vercel).
2. Click the **Design Extractor** extension icon in your Chrome toolbar.
3. Click **"Extract from this page"**.
4. Explore the **Markdown**, **CSS Variables**, **Swatches**, and **JSON** preview tabs.
5. Download your preferred format: **`design.md`**, **Tailwind Config**, **SCSS Vars**, or **W3C Tokens**.

---

## Technical Architecture & Permissions

### Permissions Requested
- `activeTab`: Grants temporary access to inspect the currently focused tab when invoked.
- `scripting`: Allows injecting the DOM token extraction script (`content.js`) on demand.
- `downloads`: Enables triggering browser file downloads.

### Project Structure
```
Extension_design_md/
├── manifest.json       # Manifest V3 configuration & permission definitions
├── background.js       # Minimal background service worker
├── content.js          # DOM & CSS Variable extraction engine
├── popup.html          # Extension UI layout with export tools
├── popup.js            # UI controller & multi-format export generators
├── styles.css          # Dark-themed UI design system
├── icons/              # Extension icons (16px, 48px, 128px)
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md           # Documentation & instructions
```

---

## Known Technical Limitations

1. **Cross-Origin Stylesheets (`SecurityError`)**:
   - Modern browsers block reading CSS rules from cross-origin stylesheets (`<link rel="stylesheet">` hosted on external CDNs without CORS headers).
   - The breakpoint and stylesheet variable parser safely skips cross-origin stylesheets without throwing uncaught errors.

2. **Restricted System Pages**:
   - Chrome's security policies forbid injecting content scripts into `chrome://` internal pages, `chrome-extension://` pages, `about:` pages, or the Chrome Web Store.
   - Design Extractor displays a clear warning message when attempted on restricted pages.

3. **DOM Element Sampling Limit (~3,000 nodes)**:
   - For optimal browser performance on large single-page applications with tens of thousands of DOM elements, extraction samples up to ~3,000 visible nodes.
