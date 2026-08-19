/**
 * Design Extractor - Popup Controller (Updated with Exporters & CSS Variables)
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Element References
  const extractBtn = document.getElementById('extractBtn');
  const btnSpinner = document.getElementById('btnSpinner');
  const btnText = document.getElementById('btnText');

  const statusBox = document.getElementById('statusBox');
  const statusIcon = document.getElementById('statusIcon');
  const statusText = document.getElementById('statusText');

  const previewSection = document.getElementById('previewSection');
  const markdownPreview = document.getElementById('markdownPreview');
  const varsPreview = document.getElementById('varsPreview');
  const jsonPreview = document.getElementById('jsonPreview');
  const swatchesGrid = document.getElementById('swatchesGrid');

  const tabMarkdown = document.getElementById('tabMarkdown');
  const tabVars = document.getElementById('tabVars');
  const tabSwatches = document.getElementById('tabSwatches');
  const tabJson = document.getElementById('tabJson');

  const contentMarkdown = document.getElementById('contentMarkdown');
  const contentVars = document.getElementById('contentVars');
  const contentSwatches = document.getElementById('contentSwatches');
  const contentJson = document.getElementById('contentJson');

  const downloadMdBtn = document.getElementById('downloadMdBtn');
  const downloadJsonBtn = document.getElementById('downloadJsonBtn');
  const downloadTailwindBtn = document.getElementById('downloadTailwindBtn');
  const downloadScssBtn = document.getElementById('downloadScssBtn');
  const downloadW3cBtn = document.getElementById('downloadW3cBtn');
  const copyMdBtn = document.getElementById('copyMdBtn');

  let extractedData = null;
  let markdownContent = '';

  // Helper: Set status box message
  function setStatus(message, type = 'info', icon = '💡') {
    statusBox.className = `status-box ${type}`;
    statusIcon.textContent = icon;
    statusText.textContent = message;
  }

  // Helper: Set loading state on button
  function setLoading(isLoading) {
    extractBtn.disabled = isLoading;
    if (isLoading) {
      btnSpinner.style.display = 'inline-block';
      btnText.textContent = 'Scanning DOM & Stylesheets...';
    } else {
      btnSpinner.style.display = 'none';
      btnText.textContent = 'Extract from this page';
    }
  }

  // Tab Switching Logic
  const tabs = [
    { btn: tabMarkdown, content: contentMarkdown },
    { btn: tabVars, content: contentVars },
    { btn: tabSwatches, content: contentSwatches },
    { btn: tabJson, content: contentJson }
  ];

  tabs.forEach(({ btn, content }) => {
    btn.addEventListener('click', () => {
      tabs.forEach(t => {
        t.btn.classList.remove('active');
        t.btn.setAttribute('aria-selected', 'false');
        t.content.classList.remove('active');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      content.classList.add('active');
    });
  });

  // Extract Action Handler
  extractBtn.addEventListener('click', async () => {
    setLoading(true);
    setStatus('Injecting scanner script into active tab...', 'info', '⏳');

    try {
      // 1. Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.id) {
        throw new Error('No active browser tab found.');
      }

      // Check restricted URLs
      const restrictedPrefixes = ['chrome://', 'chrome-extension://', 'edge://', 'about:', 'view-source:'];
      const isRestricted = restrictedPrefixes.some(prefix => tab.url && tab.url.startsWith(prefix)) ||
                           (tab.url && tab.url.includes('chrome.google.com/webstore'));

      if (isRestricted) {
        throw new Error('Cannot extract design tokens from restricted system pages (e.g. chrome:// pages or Web Store).');
      }

      // 2. Execute content script on active tab
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      if (!results || !results[0] || !results[0].result) {
        throw new Error('Extraction script returned empty results.');
      }

      extractedData = results[0].result;

      // 3. Format outputs
      markdownContent = buildMarkdown(extractedData);
      markdownPreview.textContent = markdownContent;
      varsPreview.textContent = buildVarsPreview(extractedData);
      jsonPreview.textContent = JSON.stringify(extractedData, null, 2);

      renderSwatches(extractedData);

      // 4. Reveal Preview UI & Success status
      previewSection.style.display = 'flex';
      setStatus(`Extracted tokens & ${extractedData.cssVariables ? extractedData.cssVariables.length : 0} CSS variables! (${extractedData.sampledCount} nodes sampled)`, 'success', '✅');

    } catch (err) {
      console.error("Design Extractor error:", err);
      setStatus(err.message || 'Failed to extract design tokens from page.', 'error', '⚠️');
      previewSection.style.display = 'none';
    } finally {
      setLoading(false);
    }
  });

  // Convert Structured Token Object to Clean Markdown Document
  function buildMarkdown(data) {
    const lines = [];

    lines.push(`# Design Tokens: ${data.title}`);
    lines.push(`- **Source URL**: [${data.url}](${data.url})`);
    lines.push(`- **Extracted Date**: ${new Date(data.timestamp).toLocaleString()}`);
    lines.push(`- **DOM Coverage**: Sampled ${data.sampledCount} visible elements out of ${data.totalElements} total DOM nodes.`);
    lines.push('');

    // Colors
    lines.push('## Text Colors');
    if (data.colors && data.colors.length > 0) {
      data.colors.forEach(item => {
        lines.push(`- \`${item.value}\` — **${item.count}** usages`);
      });
    } else {
      lines.push('*No text colors detected.*');
    }
    lines.push('');

    // Background Colors
    lines.push('## Background Colors');
    if (data.backgroundColors && data.backgroundColors.length > 0) {
      data.backgroundColors.forEach(item => {
        lines.push(`- \`${item.value}\` — **${item.count}** usages`);
      });
    } else {
      lines.push('*No background colors detected.*');
    }
    lines.push('');

    // CSS Custom Variables
    lines.push('## CSS Custom Variables (--*)');
    if (data.cssVariables && data.cssVariables.length > 0) {
      data.cssVariables.forEach(item => {
        lines.push(`- \`${item.name}\`: \`${item.value}\``);
      });
    } else {
      lines.push('*No CSS custom variables found on :root or in accessible stylesheets.*');
    }
    lines.push('');

    // Typography: Font Families
    lines.push('## Typography — Font Families');
    if (data.fontFamilies && data.fontFamilies.length > 0) {
      data.fontFamilies.forEach(item => {
        lines.push(`- **${item.value}** (${item.count} usages)`);
      });
    } else {
      lines.push('*No font families detected.*');
    }
    lines.push('');

    // Typography: Font Sizes
    lines.push('## Typography — Font Sizes');
    if (data.fontSizes && data.fontSizes.length > 0) {
      data.fontSizes.forEach(item => {
        lines.push(`- \`${item.value}\` (${item.count} usages)`);
      });
    } else {
      lines.push('*No font sizes detected.*');
    }
    lines.push('');

    // Typography: Font Weights
    lines.push('## Typography — Font Weights');
    if (data.fontWeights && data.fontWeights.length > 0) {
      data.fontWeights.forEach(item => {
        lines.push(`- \`${item.value}\` (${item.count} usages)`);
      });
    } else {
      lines.push('*No font weights detected.*');
    }
    lines.push('');

    // Typography: Line Heights
    lines.push('## Typography — Line Heights');
    if (data.lineHeights && data.lineHeights.length > 0) {
      data.lineHeights.forEach(item => {
        lines.push(`- \`${item.value}\` (${item.count} usages)`);
      });
    } else {
      lines.push('*No custom line heights detected.*');
    }
    lines.push('');

    // Spacing Scale
    lines.push('## Spacing Scale (Margins & Paddings)');
    if (data.spacing && data.spacing.length > 0) {
      data.spacing.forEach(item => {
        lines.push(`- \`${item.value}\` (${item.count} usages)`);
      });
    } else {
      lines.push('*No spacing scale values detected.*');
    }
    lines.push('');

    // Border Radius
    lines.push('## Border Radius Tokens');
    if (data.radii && data.radii.length > 0) {
      data.radii.forEach(item => {
        lines.push(`- \`${item.value}\` (${item.count} usages)`);
      });
    } else {
      lines.push('*No border radii detected.*');
    }
    lines.push('');

    // Shadows
    lines.push('## Box Shadows');
    if (data.shadows && data.shadows.length > 0) {
      data.shadows.forEach(item => {
        lines.push(`- \`${item.value}\` (${item.count} usages)`);
      });
    } else {
      lines.push('*No box shadows detected.*');
    }
    lines.push('');

    // Media Breakpoints
    lines.push('## Media Breakpoints');
    if (data.breakpoints && data.breakpoints.length > 0) {
      data.breakpoints.forEach(item => {
        lines.push(`- \`${item.value}\` (${item.count} rules found)`);
      });
    } else {
      lines.push('*No media breakpoints extracted (may be in cross-origin stylesheets).*');
    }

    return lines.join('\n');
  }

  // Format CSS Variables (:root { ... })
  function buildVarsPreview(data) {
    if (!data.cssVariables || data.cssVariables.length === 0) {
      return '/* No CSS custom properties (--*) detected on :root or in accessible stylesheets */';
    }

    const lines = [':root {'];
    data.cssVariables.forEach(v => {
      lines.push(`  ${v.name}: ${v.value};`);
    });
    lines.push('}');
    return lines.join('\n');
  }

  // Format Tailwind CSS Configuration Snippet
  function buildTailwindConfig(data) {
    const config = {
      theme: {
        extend: {
          colors: {},
          fontFamily: {},
          spacing: {},
          borderRadius: {}
        }
      }
    };

    // Color mapping
    (data.backgroundColors || []).slice(0, 8).forEach((item, idx) => {
      config.theme.extend.colors[`brand-${idx + 1}`] = item.value;
    });

    // Font families
    (data.fontFamilies || []).slice(0, 4).forEach((item, idx) => {
      const name = idx === 0 ? 'sans' : `font-${idx + 1}`;
      config.theme.extend.fontFamily[name] = [item.value, 'sans-serif'];
    });

    // Spacing
    (data.spacing || []).slice(0, 10).forEach((item, idx) => {
      config.theme.extend.spacing[`custom-${idx + 1}`] = item.value;
    });

    // Radii
    (data.radii || []).slice(0, 6).forEach((item, idx) => {
      config.theme.extend.borderRadius[`radius-${idx + 1}`] = item.value;
    });

    return `/** @type {import('tailwindcss').Config} */\nmodule.exports = ${JSON.stringify(config, null, 2)};\n`;
  }

  // Format SCSS Variables Snippet
  function buildScssVariables(data) {
    const lines = [`// SCSS Variables extracted from ${data.title}`, `// Source: ${data.url}`, ''];

    // Colors
    lines.push('// Color Tokens');
    (data.backgroundColors || []).slice(0, 10).forEach((item, idx) => {
      lines.push(`$color-bg-${idx + 1}: ${item.value};`);
    });
    (data.colors || []).slice(0, 10).forEach((item, idx) => {
      lines.push(`$color-text-${idx + 1}: ${item.value};`);
    });
    lines.push('');

    // Fonts
    lines.push('// Typography');
    (data.fontFamilies || []).slice(0, 5).forEach((item, idx) => {
      lines.push(`$font-family-${idx + 1}: "${item.value}", sans-serif;`);
    });
    lines.push('');

    // Spacing
    lines.push('// Spacing');
    (data.spacing || []).slice(0, 10).forEach((item, idx) => {
      lines.push(`$spacing-${idx + 1}: ${item.value};`);
    });
    lines.push('');

    // CSS Custom Variables fallback
    if (data.cssVariables && data.cssVariables.length > 0) {
      lines.push('// Custom Properties');
      data.cssVariables.forEach(v => {
        const scssName = v.name.replace(/^--/, '$');
        lines.push(`${scssName}: ${v.value};`);
      });
    }

    return lines.join('\n');
  }

  // Format W3C Design Tokens JSON format
  function buildW3cTokens(data) {
    const tokens = {
      $schema: "https://unpkg.com/design-tokens-format-module@latest/deftok.json",
      color: {},
      typography: {
        fontFamily: {}
      },
      spacing: {},
      borderRadius: {}
    };

    // Colors
    (data.colors || []).slice(0, 10).forEach((item, idx) => {
      tokens.color[`text-${idx + 1}`] = {
        $value: item.value,
        $type: "color",
        $description: `Used ${item.count} times for text`
      };
    });

    (data.backgroundColors || []).slice(0, 10).forEach((item, idx) => {
      tokens.color[`background-${idx + 1}`] = {
        $value: item.value,
        $type: "color",
        $description: `Used ${item.count} times for background`
      };
    });

    // Fonts
    (data.fontFamilies || []).slice(0, 5).forEach((item, idx) => {
      tokens.typography.fontFamily[`font-${idx + 1}`] = {
        $value: item.value,
        $type: "fontFamily"
      };
    });

    // Spacing
    (data.spacing || []).slice(0, 10).forEach((item, idx) => {
      tokens.spacing[`scale-${idx + 1}`] = {
        $value: item.value,
        $type: "dimension"
      };
    });

    return JSON.stringify(tokens, null, 2);
  }

  // Render Visual Color Swatches
  function renderSwatches(data) {
    swatchesGrid.innerHTML = '';

    const allColorTokens = [
      ...(data.colors || []).slice(0, 6),
      ...(data.backgroundColors || []).slice(0, 6)
    ];

    // Remove duplicates
    const uniqueColors = new Map();
    allColorTokens.forEach(item => {
      if (!uniqueColors.has(item.value)) {
        uniqueColors.set(item.value, item);
      }
    });

    if (uniqueColors.size === 0) {
      swatchesGrid.innerHTML = '<p style="color:var(--text-muted); padding: 12px; grid-column: 1 / -1;">No colors detected.</p>';
      return;
    }

    uniqueColors.forEach(item => {
      const card = document.createElement('div');
      card.className = 'swatch-card';

      const colorBox = document.createElement('div');
      colorBox.className = 'swatch-color';
      colorBox.style.backgroundColor = item.value;

      const info = document.createElement('div');
      info.className = 'swatch-info';

      const hex = document.createElement('span');
      hex.className = 'swatch-hex';
      hex.textContent = item.value;

      const count = document.createElement('span');
      count.className = 'swatch-count';
      count.textContent = `${item.count}x`;

      info.appendChild(hex);
      info.appendChild(count);
      card.appendChild(colorBox);
      card.appendChild(info);

      swatchesGrid.appendChild(card);
    });
  }

  // File Download Helper
  function triggerDownload(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    }, () => {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }

  // Download Event Listeners
  downloadMdBtn.addEventListener('click', () => {
    if (!markdownContent) return;
    triggerDownload(markdownContent, 'design.md', 'text/markdown;charset=utf-8');
  });

  downloadTailwindBtn.addEventListener('click', () => {
    if (!extractedData) return;
    triggerDownload(buildTailwindConfig(extractedData), 'tailwind.config.js', 'application/javascript;charset=utf-8');
  });

  downloadScssBtn.addEventListener('click', () => {
    if (!extractedData) return;
    triggerDownload(buildScssVariables(extractedData), '_variables.scss', 'text/x-scss;charset=utf-8');
  });

  downloadW3cBtn.addEventListener('click', () => {
    if (!extractedData) return;
    triggerDownload(buildW3cTokens(extractedData), 'tokens.json', 'application/json;charset=utf-8');
  });

  downloadJsonBtn.addEventListener('click', () => {
    if (!extractedData) return;
    triggerDownload(JSON.stringify(extractedData, null, 2), 'design.json', 'application/json;charset=utf-8');
  });

  // Copy Markdown to Clipboard
  copyMdBtn.addEventListener('click', async () => {
    if (!markdownContent) return;
    try {
      await navigator.clipboard.writeText(markdownContent);
      const originalText = copyMdBtn.innerHTML;
      copyMdBtn.innerHTML = '✅ Copied!';
      setTimeout(() => {
        copyMdBtn.innerHTML = originalText;
      }, 1800);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  });
});
