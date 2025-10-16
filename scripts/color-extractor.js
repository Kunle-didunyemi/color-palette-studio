// Color extraction functionality for Palette Studio

class ColorExtractor {
  constructor() {
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
  }

  // Extract dominant colors from an image
  async extractColors(imageSrc, numColors = 6, quality = 10) {
    try {
      const img = await loadImage(imageSrc);
      return this.extractColorsFromImage(img, numColors, quality);
    } catch (error) {
      console.error("Error extracting colors:", error);
      throw error;
    }
  }

  // Extract colors from an Image element
  extractColorsFromImage(img, numColors = 6, quality = 10) {
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

    // Sample pixels (skip some for performance)
    const sampledPixels = [];
    for (let i = 0; i < pixels.length; i += 4 * quality) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];

      // Skip transparent pixels
      if (a > 128) {
        sampledPixels.push({ r, g, b });
      }
    }

    // Use median cut algorithm to find dominant colors
    return this.medianCutQuantization(sampledPixels, numColors);
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
}

// Create global instance
const colorExtractor = new ColorExtractor();

// Export for use in other modules
window.ColorExtractor = ColorExtractor;
window.colorExtractor = colorExtractor;
