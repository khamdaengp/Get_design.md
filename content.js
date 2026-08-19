/**
 * Design Extractor - Content Script Engine (Updated with CSS Custom Variables Extraction)
 * Injected on demand via chrome.scripting.executeScript.
 * Walks the DOM, samples visible elements, collects computed styles into frequency maps,
 * extracts media breakpoints, extracts CSS custom variables (--*), and returns a structured token object.
 */

(function () {
  const MAX_ELEMENTS_SAMPLE = 3000;

  // Helper: Convert rgb/rgba string to uppercase HEX code
  function rgbToHex(rgbStr) {
    if (!rgbStr || rgbStr === 'transparent') return null;
    const match = rgbStr.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/i);
    if (!match) {
      if (rgbStr.startsWith('#')) return rgbStr.toUpperCase();
      return rgbStr;
    }
    const r = parseInt(match[1], 10);
    const g = parseInt(match[2], 10);
    const b = parseInt(match[3], 10);
    const a = match[4] !== undefined ? parseFloat(match[4]) : 1;

    if (a === 0) return null; // Skip fully transparent

    const toHex = (n) => n.toString(16).padStart(2, '0').toUpperCase();
    if (a < 1) {
      const alphaHex = Math.round(a * 255).toString(16).padStart(2, '0').toUpperCase();
      return `#${toHex(r)}${toHex(g)}${toHex(b)}${alphaHex}`;
    }
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  // Frequency map collector
  class FrequencyMap {
    constructor() {
      this.map = new Map();
    }
    add(val) {
      if (!val || val === 'none' || val === '0px' || val === 'normal' || val === 'auto') return;
      this.map.set(val, (this.map.get(val) || 0) + 1);
    }
    getTop(limit = 10, parseFn = null) {
      const entries = Array.from(this.map.entries()).map(([value, count]) => {
        return {
          value,
          formatted: parseFn ? parseFn(value) : value,
          count
        };
      });
      // Sort by count descending
      entries.sort((a, b) => b.count - a.count);
      return entries.slice(0, limit);
    }
  }

  const allElements = document.querySelectorAll('*');
  const totalElements = allElements.length;
  const sampleLimit = Math.min(totalElements, MAX_ELEMENTS_SAMPLE);

  const colors = new FrequencyMap();
  const backgroundColors = new FrequencyMap();
  const fontFamilies = new FrequencyMap();
  const fontSizes = new FrequencyMap();
  const fontWeights = new FrequencyMap();
  const lineHeights = new FrequencyMap();
  const borderRadii = new FrequencyMap();
  const boxShadows = new FrequencyMap();
  const spacingScale = new FrequencyMap();

  let sampledCount = 0;

  for (let i = 0; i < sampleLimit; i++) {
    const el = allElements[i];

    // Basic visibility check
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'NOSCRIPT' || el.tagName === 'SVG' || el.tagName === 'PATH') {
      continue;
    }

    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
      continue;
    }

    sampledCount++;

    // Text & Background Colors
    const textColor = rgbToHex(style.color);
    if (textColor) colors.add(textColor);

    const bgColor = rgbToHex(style.backgroundColor);
    if (bgColor) backgroundColors.add(bgColor);

    // Typography
    if (style.fontFamily) {
      const primaryFont = style.fontFamily
        .split(',')[0]
        .trim()
        .replace(/["']/g, '');
      if (primaryFont) fontFamilies.add(primaryFont);
    }

    if (style.fontSize) fontSizes.add(style.fontSize);
    if (style.fontWeight) fontWeights.add(style.fontWeight);
    if (style.lineHeight && style.lineHeight !== 'normal') lineHeights.add(style.lineHeight);

    // Border Radius
    if (style.borderRadius && style.borderRadius !== '0px') {
      borderRadii.add(style.borderRadius);
    }

    // Box Shadows
    if (style.boxShadow && style.boxShadow !== 'none') {
      boxShadows.add(style.boxShadow);
    }

    // Spacing (Margins & Paddings)
    const margins = [style.marginTop, style.marginRight, style.marginBottom, style.marginLeft];
    const paddings = [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft];

    [...margins, ...paddings].forEach(val => {
      if (val && val !== '0px' && val !== 'auto') {
        spacingScale.add(val);
      }
    });
  }

  // Extract CSS Custom Variables (--*) from :root and Stylesheets
  const cssVarMap = new Map();
  
  // 1. Inspect computed styles on :root (document.documentElement)
  try {
    const rootStyles = window.getComputedStyle(document.documentElement);
    for (let i = 0; i < rootStyles.length; i++) {
      const prop = rootStyles[i];
      if (prop.startsWith('--')) {
        const rawVal = rootStyles.getPropertyValue(prop).trim();
        const formattedVal = rgbToHex(rawVal) || rawVal;
        if (formattedVal) {
          cssVarMap.set(prop, { name: prop, value: formattedVal, count: 1 });
        }
      }
    }
  } catch (e) {
    // Ignore root computed style error
  }

  // 2. Safely traverse document.styleSheets for declared CSS custom properties
  const breakpointsMap = new Map();
  try {
    const styleSheets = Array.from(document.styleSheets);
    styleSheets.forEach(sheet => {
      try {
        const rules = Array.from(sheet.cssRules || sheet.rules || []);
        rules.forEach(rule => {
          // Check Media Breakpoints
          if (rule.type === CSSRule.MEDIA_RULE || rule.media) {
            const mediaText = rule.media ? rule.media.mediaText : '';
            if (mediaText) {
              const widthMatches = mediaText.match(/\((min|max)-width:\s*([\d.]+(px|em|rem))\)/gi);
              if (widthMatches) {
                widthMatches.forEach(match => {
                  const cleaned = match.replace(/[\(\)]/g, '').trim();
                  breakpointsMap.set(cleaned, (breakpointsMap.get(cleaned) || 0) + 1);
                });
              }
            }
          }

          // Check CSS Variables in Style Rules (e.g. :root, body)
          if (rule.style) {
            for (let i = 0; i < rule.style.length; i++) {
              const propName = rule.style[i];
              if (propName.startsWith('--')) {
                const val = rule.style.getPropertyValue(propName).trim();
                const formattedVal = rgbToHex(val) || val;
                if (cssVarMap.has(propName)) {
                  cssVarMap.get(propName).count += 1;
                } else if (formattedVal) {
                  cssVarMap.set(propName, { name: propName, value: formattedVal, count: 1 });
                }
              }
            }
          }
        });
      } catch (err) {
        // Cross-origin stylesheet security restriction - silently ignore
      }
    });
  } catch (e) {
    // Top level stylesheet error fallback
  }

  const sortedBreakpoints = Array.from(breakpointsMap.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const sortedCssVars = Array.from(cssVarMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 35);

  const sortedSpacing = spacingScale.getTop(20).sort((a, b) => {
    const parseFloatPx = (str) => parseFloat(str) * (str.includes('rem') ? 16 : str.includes('em') ? 16 : 1);
    return parseFloatPx(a.value) - parseFloatPx(b.value);
  });

  return {
    url: window.location.href,
    title: document.title || 'Untitled Page',
    timestamp: new Date().toISOString(),
    sampledCount,
    totalElements,
    colors: colors.getTop(12),
    backgroundColors: backgroundColors.getTop(12),
    fontFamilies: fontFamilies.getTop(8),
    fontSizes: fontSizes.getTop(10).sort((a, b) => parseFloat(a.value) - parseFloat(b.value)),
    fontWeights: fontWeights.getTop(8).sort((a, b) => parseInt(a.value, 10) - parseInt(b.value, 10)),
    lineHeights: lineHeights.getTop(8),
    radii: borderRadii.getTop(10),
    shadows: boxShadows.getTop(8),
    spacing: sortedSpacing,
    breakpoints: sortedBreakpoints,
    cssVariables: sortedCssVars
  };
})();
