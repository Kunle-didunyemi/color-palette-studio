// Color extraction functionality for Palette Studio

class ColorExtractor {
  constructor() {
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
  }

  // Extract dominant colors from an image
  async extractColors(imageSrc, numColors = 8, quality = 1) {
    try {
      const img = await loadImage(imageSrc);
      return this.extractColorsFromImage(img, numColors, quality);
    } catch (error) {
      console.error("Error extracting colors:", error);
      throw error;
    }
  }

  // Extract colors from an Image element
  extractColorsFromImage(img, numColors = 8, quality = 1) {
    // Set canvas size to image dimensions
    this.canvas.width = img.width;
    this.canvas.height = img.height;

    // Draw image to canvas
    this.ctx.drawImage(img, 0, 0);

    // Get image data
    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
    const pixels = imageData.data;

    // Adaptive sampling based on numColors and quality for performance
    const sampledPixels = [];
    let step;

    if (numColors > 15) {
      // For high color counts, sample less frequently for performance
      step = Math.max(2, Math.floor(quality * 1.5));
    } else if (numColors > 10) {
      // Medium-high color counts
      step = Math.max(1, Math.floor(quality * 1.2));
    } else {
      // Lower color counts, use full quality
      step = Math.max(1, Math.floor(quality));
    }

    for (let i = 0; i < pixels.length; i += 4 * step) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];

      // Skip transparent pixels and very dark pixels that might be noise
      if (a > 200 && (r > 10 || g > 10 || b > 10)) {
        sampledPixels.push({ r, g, b });
      }
    }

    // Use multiple extraction methods for comprehensive color detection
    // Adaptive method usage based on numColors for performance
    const colors1 = this.medianCutQuantization(
      [...sampledPixels],
      numColors > 15 ? Math.min(numColors, 15) : numColors
    );

    const colors2 =
      numColors > 12
        ? this.kMeansQuantization([...sampledPixels], Math.min(numColors, 12))
        : [];

    const colors3 = this.extractDistinctHues(
      [...sampledPixels],
      numColors > 10 ? Math.min(numColors, 10) : numColors
    );

    // Combine and deduplicate colors
    const allColors = [...colors1, ...colors2, ...colors3];
    const uniqueColors = this.removeDuplicateColors(allColors);

    // Sort by saturation and brightness for better visual variety
    return uniqueColors
      .sort((a, b) => {
        const satA = this.getColorSaturation(a);
        const satB = this.getColorSaturation(b);
        const brightA = this.getColorBrightness(a);
        const brightB = this.getColorBrightness(b);

        // Prioritize saturated colors, then brighter colors
        if (Math.abs(satA - satB) > 10) return satB - satA;
        return brightB - brightA;
      })
      .slice(0, numColors);
  }

  // Median cut color quantization algorithm
  medianCutQuantization(pixels, numColors) {
    if (pixels.length === 0) return [];

    // Start with the full color space
    let colorSpaces = [pixels];

    // Split color spaces until we have enough
    while (colorSpaces.length < numColors) {
      const newSpaces = [];

      for (const space of colorSpaces) {
        if (space.length >= 2) {
          // Find the range with the largest spread
          const ranges = this.getColorRanges(space);
          const maxRange = Math.max(ranges.r, ranges.g, ranges.b);

          // Sort by the channel with largest range
          let sortChannel;
          if (maxRange === ranges.r) sortChannel = "r";
          else if (maxRange === ranges.g) sortChannel = "g";
          else sortChannel = "b";

          space.sort((a, b) => a[sortChannel] - b[sortChannel]);

          // Split at median
          const median = Math.floor(space.length / 2);
          newSpaces.push(space.slice(0, median));
          newSpaces.push(space.slice(median));
        } else {
          newSpaces.push(space);
        }
      }

      colorSpaces = newSpaces;
    }

    // Calculate average color for each space
    const colors = colorSpaces.map((space) => this.getAverageColor(space));

    // Sort by brightness (V in HSV)
    return colors.sort((a, b) => {
      const brightnessA = (a.r * 299 + a.g * 587 + a.b * 114) / 1000;
      const brightnessB = (b.r * 299 + b.g * 587 + b.b * 114) / 1000;
      return brightnessB - brightnessA;
    });
  }

  // Get color ranges for a pixel array
  getColorRanges(pixels) {
    let minR = 255,
      maxR = 0;
    let minG = 255,
      maxG = 0;
    let minB = 255,
      maxB = 0;

    for (const pixel of pixels) {
      minR = Math.min(minR, pixel.r);
      maxR = Math.max(maxR, pixel.r);
      minG = Math.min(minG, pixel.g);
      maxG = Math.max(maxG, pixel.g);
      minB = Math.min(minB, pixel.b);
      maxB = Math.max(maxB, pixel.b);
    }

    return {
      r: maxR - minR,
      g: maxG - minG,
      b: maxB - minB,
    };
  }

  // Calculate average color of a pixel array
  getAverageColor(pixels) {
    let totalR = 0,
      totalG = 0,
      totalB = 0;

    for (const pixel of pixels) {
      totalR += pixel.r;
      totalG += pixel.g;
      totalB += pixel.b;
    }

    return {
      r: Math.round(totalR / pixels.length),
      g: Math.round(totalG / pixels.length),
      b: Math.round(totalB / pixels.length),
    };
  }

  // K-means clustering for color quantization (optimized for performance)
  kMeansQuantization(pixels, k) {
    if (pixels.length === 0 || k <= 0) return [];

    // Limit k to prevent excessive computation
    k = Math.min(k, 12);

    // Initialize centroids using a more efficient sampling method
    const centroids = [];
    const step = Math.floor(pixels.length / k);

    for (let i = 0; i < k; i++) {
      const index = Math.min(i * step, pixels.length - 1);
      centroids.push({ ...pixels[index] });
    }

    let hasChanged = true;
    let iterations = 0;
    const maxIterations = k > 8 ? 15 : 20; // Fewer iterations for larger k

    while (hasChanged && iterations < maxIterations) {
      hasChanged = false;
      iterations++;

      // Assign each pixel to nearest centroid
      const clusters = centroids.map(() => []);

      // Sample pixels for assignment when k is large to improve performance
      const sampleStep = k > 10 ? 2 : 1;
      for (let i = 0; i < pixels.length; i += sampleStep) {
        const pixel = pixels[i];
        let minDistance = Infinity;
        let nearestCentroid = 0;

        for (let j = 0; j < centroids.length; j++) {
          const distance = this.getColorDistance(pixel, centroids[j]);
          if (distance < minDistance) {
            minDistance = distance;
            nearestCentroid = j;
          }
        }

        clusters[nearestCentroid].push(pixel);
      }

      // Update centroids
      for (let i = 0; i < centroids.length; i++) {
        if (clusters[i].length > 0) {
          const newCentroid = this.getAverageColor(clusters[i]);
          if (this.getColorDistance(newCentroid, centroids[i]) > 1) {
            hasChanged = true;
            centroids[i] = newCentroid;
          }
        }
      }
    }

    return centroids;
  }

  // Extract colors with distinct hues (ensures color variety)
  extractDistinctHues(pixels, numColors) {
    if (pixels.length === 0) return [];

    const hueBuckets = new Map();
    const hueStep = 360 / numColors;

    // Distribute pixels into hue buckets
    for (const pixel of pixels) {
      const hue = this.getColorHue(pixel);
      const bucketIndex = Math.floor(hue / hueStep);
      const bucketKey = bucketIndex;

      if (!hueBuckets.has(bucketKey)) {
        hueBuckets.set(bucketKey, []);
      }
      hueBuckets.get(bucketKey).push(pixel);
    }

    // Get the most saturated color from each bucket
    const colors = [];
    for (const [bucketKey, bucketPixels] of hueBuckets) {
      if (bucketPixels.length > 0) {
        // Sort by saturation and take the most saturated
        const sortedPixels = bucketPixels.sort((a, b) => {
          const satA = this.getColorSaturation(a);
          const satB = this.getColorSaturation(b);
          return satB - satA;
        });

        colors.push(sortedPixels[0]);
      }
    }

    return colors.slice(0, numColors);
  }

  // Remove duplicate colors (colors that are very similar)
  removeDuplicateColors(colors) {
    const unique = [];

    for (const color of colors) {
      let isDuplicate = false;

      for (const uniqueColor of unique) {
        if (this.getColorDistance(color, uniqueColor) < 15) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        unique.push(color);
      }
    }

    return unique;
  }

  // Calculate color distance in RGB space
  getColorDistance(color1, color2) {
    const dr = color1.r - color2.r;
    const dg = color1.g - color2.g;
    const db = color1.b - color2.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  // Get hue of a color (0-360)
  getColorHue(color) {
    const r = color.r / 255;
    const g = color.g / 255;
    const b = color.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h;

    if (max === min) {
      h = 0;
    } else {
      switch (max) {
        case r:
          h = (g - b) / (max - min) + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / (max - min) + 2;
          break;
        case b:
          h = (r - g) / (max - min) + 4;
          break;
      }
      h /= 6;
    }

    return h * 360;
  }

  // Get saturation of a color (0-100)
  getColorSaturation(color) {
    const r = color.r / 255;
    const g = color.g / 255;
    const b = color.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    if (max === 0) return 0;
    return ((max - min) / max) * 100;
  }

  // Get brightness of a color (0-100)
  getColorBrightness(color) {
    const r = color.r / 255;
    const g = color.g / 255;
    const b = color.b / 255;

    return ((Math.max(r, g, b) + Math.min(r, g, b)) / 2) * 100;
  }
}

// Create global instance
const colorExtractor = new ColorExtractor();

// Export for use in other modules
window.ColorExtractor = ColorExtractor;
window.colorExtractor = colorExtractor;
