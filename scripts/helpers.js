// Helper functions for Palette Studio

// Color utility functions
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function rgbToHex(r, g, b) {
  return (
    "#" +
    ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
  );
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

// Calculate relative luminance for WCAG contrast
function getRelativeLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Calculate contrast ratio between two colors
function getContrastRatio(color1, color2) {
  const lum1 = getRelativeLuminance(color1.r, color1.g, color1.b);
  const lum2 = getRelativeLuminance(color2.r, color2.g, color2.b);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Check WCAG compliance
function checkWCAGCompliance(contrastRatio) {
  return {
    AA: {
      normal: contrastRatio >= 4.5,
      large: contrastRatio >= 3.0,
    },
    AAA: {
      normal: contrastRatio >= 7.0,
      large: contrastRatio >= 4.5,
    },
  };
}

// LocalStorage utilities for palettes
function savePalettesToStorage(palettes) {
  try {
    localStorage.setItem("paletteStudio_palettes", JSON.stringify(palettes));
    return true;
  } catch (e) {
    console.error("Failed to save palettes to localStorage:", e);
    return false;
  }
}

function loadPalettesFromStorage() {
  try {
    const palettes = localStorage.getItem("paletteStudio_palettes");
    return palettes ? JSON.parse(palettes) : [];
  } catch (e) {
    console.error("Failed to load palettes from localStorage:", e);
    return [];
  }
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Format color for display
function formatColor(color) {
  if (typeof color === "string") {
    return color.toUpperCase();
  }
  return rgbToHex(color.r, color.g, color.b);
}

// Create color swatch element
function createColorSwatch(color, onClick = null, size = "normal") {
  const swatch = document.createElement("div");
  swatch.className = `color-swatch ${size === "small" ? "small" : ""}`;
  swatch.style.backgroundColor = formatColor(color);
  swatch.title = formatColor(color);

  if (onClick) {
    swatch.addEventListener("click", () => onClick(color));
  }

  return swatch;
}

// Create palette color element (draggable)
function createPaletteColor(color, onRemove = null) {
  // Create container for color and controls
  const container = document.createElement("div");
  container.className = "palette-color-item flex items-center space-x-2 max-w-min mb-2";

  // Create color swatch
  const paletteColor = document.createElement("div");
  paletteColor.className = "palette-color flex-shrink-0";
  paletteColor.style.backgroundColor = formatColor(color);
  paletteColor.title = formatColor(color);
  paletteColor.draggable = true;
  paletteColor.dataset.color = formatColor(color);

  // Create hex code display
  const hexDisplay = document.createElement("span");
  hexDisplay.className = "text-sm font-mono text-gray-700 flex-1";
  hexDisplay.textContent = formatColor(color);

  // Create remove button
  const removeBtn = document.createElement("button");
  removeBtn.className =
    "text-red-500 hover:text-red-700 text-sm font-bold px-2 py-1 hover:bg-red-50 rounded transition-colors";
  removeBtn.textContent = "×";
  removeBtn.title = "Remove color";

  if (onRemove) {
    removeBtn.addEventListener("click", () => onRemove(color));
  }

  // Add drag functionality to the color swatch
  paletteColor.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", formatColor(color));
    e.dataTransfer.effectAllowed = "copy";
  });

  // Assemble the container
  container.appendChild(paletteColor);
  container.appendChild(hexDisplay);
  container.appendChild(removeBtn);

  return container;
}

// Debounce function for performance
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Load image from URL or file
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Convert file to data URL
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Show loading state
function showLoading(element, message = "Loading...") {
  element.innerHTML = `<div class="loading text-center py-8 text-gray-500">${message}</div>`;
}

// Hide loading state
function hideLoading(element) {
  const loading = element.querySelector(".loading");
  if (loading) {
    loading.remove();
  }
}
