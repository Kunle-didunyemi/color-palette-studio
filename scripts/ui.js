// UI interaction handlers for Palette Studio

class UI {
  constructor() {
    this.currentImage = null;
    this.extractedColors = [];
    this.activePalette = [];
    this.savedPalettes = [];
    this.contrastColors = {
      left: { r: 17, g: 17, b: 17 }, // #111111
      right: { r: 255, g: 255, b: 255 }, // #ffffff
    };

    this.init();
  }

  init() {
    this.bindEvents();
    this.loadSavedPalettes();
    this.updateContrastDisplay();
  }

  bindEvents() {
    // Image upload
    const uploadArea = $("#upload-area");
    const fileInput = $("#file-input");
    const fileBtn = $("#file-btn");

    // Drag and drop
    uploadArea.on("dragover", (e) => {
      e.preventDefault();
      uploadArea.addClass("drag-over");
    });

    uploadArea.on("dragleave", () => {
      uploadArea.removeClass("drag-over");
    });

    uploadArea.on("drop", (e) => {
      e.preventDefault();
      uploadArea.removeClass("drag-over");
      const files = e.originalEvent.dataTransfer.files;
      if (files.length > 0) {
        this.handleFileUpload(files[0]);
      }
    });

    // File input
    fileBtn.on("click", () => fileInput.click());
    fileInput.on("change", (e) => {
      if (e.target.files.length > 0) {
        this.handleFileUpload(e.target.files[0]);
      }
    });

    // Demo image
    $("#demo-btn").on("click", () => this.loadDemoImage());

    // Color count slider
    $("#color-count").on("input", (e) => {
      const value = e.target.value;
      $("#color-count-display").text(value);
      if (this.currentImage) {
        this.extractColorsFromCurrentImage();
      }
    });

    // Header buttons
    $("#export-btn").on("click", () => this.exportPalette());
    $("#clear-btn").on("click", () => this.clearActivePalette());

    // Palette management
    $("#save-palette-btn").on("click", () => this.saveActivePalette());
    $("#new-palette-btn").on("click", () => this.createNewPalette());

    // Contrast drop areas
    $("#contrast-left, #contrast-right").on("dragover", (e) => {
      e.preventDefault();
      $(e.target).closest(".contrast-drop-area").addClass("drag-over");
    });

    $("#contrast-left, #contrast-right").on("dragleave", () => {
      $(".contrast-drop-area").removeClass("drag-over");
    });

    $("#contrast-left, #contrast-right").on("drop", (e) => {
      e.preventDefault();
      $(".contrast-drop-area").removeClass("drag-over");

      const colorHex = e.originalEvent.dataTransfer.getData("text/plain");
      if (colorHex) {
        const color = hexToRgb(colorHex);
        const targetId = $(e.target).closest(".contrast-drop-area").attr("id");
        if (targetId === "contrast-left") {
          this.contrastColors.left = color;
        } else {
          this.contrastColors.right = color;
        }
        this.updateContrastDisplay();
      }
    });
  }

  async handleFileUpload(file) {
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    try {
      const dataURL = await fileToDataURL(file);
      await this.loadImage(dataURL);
    } catch (error) {
      console.error("Error loading image:", error);
      alert("Error loading image. Please try again.");
    }
  }

  async loadImage(src) {
    try {
      this.currentImage = src;

      // Show image preview
      $("#preview-img").attr("src", src);
      $("#image-preview").removeClass("hidden");

      // Extract colors
      await this.extractColorsFromCurrentImage();
    } catch (error) {
      console.error("Error loading image:", error);
    }
  }

  async loadDemoImage() {
    const demoUrl =
      "https://images.unsplash.com/photo-1503264116251-35a269479413?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=6e1b7dac1a1822b12e3c3dca5b3f1e5a";
    await this.loadImage(demoUrl);
  }

  async extractColorsFromCurrentImage() {
    if (!this.currentImage) return;

    const numColors = parseInt($("#color-count").val());
    const extractedColorsContainer = $("#extracted-colors");

    // Show loading
    showLoading(extractedColorsContainer[0], "Extracting colors...");

    try {
      this.extractedColors = await colorExtractor.extractColors(
        this.currentImage,
        numColors
      );
      this.displayExtractedColors();
    } catch (error) {
      console.error("Error extracting colors:", error);
      extractedColorsContainer.html(
        '<div class="text-red-500">Error extracting colors</div>'
      );
    }
  }

  displayExtractedColors() {
    const container = $("#extracted-colors");
    container.empty();

    this.extractedColors.forEach((color) => {
      const swatch = createColorSwatch(color, (selectedColor) => {
        this.addToActivePalette(selectedColor);
      });
      container.append(swatch);
    });
  }

  addToActivePalette(color) {
    if (this.activePalette.length >= 20) {
      alert("Maximum 20 colors allowed in active palette.");
      return;
    }

    this.activePalette.push(color);
    this.updateActivePaletteDisplay();
  }

  removeFromActivePalette(color) {
    const index = this.activePalette.findIndex(
      (c) => c.r === color.r && c.g === color.g && c.b === color.b
    );
    if (index > -1) {
      this.activePalette.splice(index, 1);
      this.updateActivePaletteDisplay();
    }
  }

  updateActivePaletteDisplay() {
    const container = $("#active-palette");
    container.empty();

    if (this.activePalette.length === 0) {
      container.html(
        '<div class="text-gray-400 text-center py-4">Click colors above to add to palette</div>'
      );
      return;
    }

    this.activePalette.forEach((color) => {
      const paletteColor = createPaletteColor(color, (colorToRemove) => {
        this.removeFromActivePalette(colorToRemove);
      });
      container.append(paletteColor);
    });
  }

  clearActivePalette() {
    this.activePalette = [];
    this.updateActivePaletteDisplay();
  }

  saveActivePalette() {
    if (this.activePalette.length === 0) {
      alert("No colors in active palette to save.");
      return;
    }

    const name =
      $("#palette-name").val().trim() ||
      `Palette ${this.savedPalettes.length + 1}`;

    const palette = {
      id: generateId(),
      name: name,
      colors: [...this.activePalette],
      created: new Date().toISOString(),
    };

    this.savedPalettes.push(palette);
    this.savePalettesToStorage();
    this.displaySavedPalettes();

    // Clear active palette and name
    this.clearActivePalette();
    $("#palette-name").val("");
  }

  createNewPalette() {
    this.clearActivePalette();
    $("#palette-name").val("");
  }

  displaySavedPalettes() {
    const container = $("#saved-palettes");
    container.empty();

    if (this.savedPalettes.length === 0) {
      container.html(
        '<div class="text-gray-400 text-center py-4">No saved palettes</div>'
      );
      return;
    }

    this.savedPalettes.forEach((palette) => {
      const paletteElement = this.createSavedPaletteElement(palette);
      container.append(paletteElement);
    });
  }

  createSavedPaletteElement(palette) {
    const element = document.createElement("div");
    element.className = "saved-palette";
    element.innerHTML = `
            <div class="saved-palette-header">
                <h4 class="font-medium text-gray-900">${palette.name}</h4>
                <div class="flex space-x-2">
                    <button class="text-blue-600 hover:text-blue-700 text-sm load-palette-btn" data-palette-id="${
                      palette.id
                    }">Load</button>
                    <button class="text-red-600 hover:text-red-700 text-sm delete-palette-btn" data-palette-id="${
                      palette.id
                    }">Delete</button>
                </div>
            </div>
            <div class="saved-palette-colors">
                ${palette.colors
                  .map(
                    (color) =>
                      `<div class="saved-palette-color" style="background-color: ${rgbToHex(
                        color.r,
                        color.g,
                        color.b
                      )}" title="${rgbToHex(color.r, color.g, color.b)}"></div>`
                  )
                  .join("")}
            </div>
        `;

    // Bind events
    $(element)
      .find(".load-palette-btn")
      .on("click", () => this.loadPalette(palette.id));
    $(element)
      .find(".delete-palette-btn")
      .on("click", () => this.deletePalette(palette.id));

    return element;
  }

  loadPalette(paletteId) {
    const palette = this.savedPalettes.find((p) => p.id === paletteId);
    if (palette) {
      this.activePalette = [...palette.colors];
      $("#palette-name").val(palette.name);
      this.updateActivePaletteDisplay();
    }
  }

  deletePalette(paletteId) {
    if (confirm("Are you sure you want to delete this palette?")) {
      this.savedPalettes = this.savedPalettes.filter((p) => p.id !== paletteId);
      this.savePalettesToStorage();
      this.displaySavedPalettes();
    }
  }

  updateContrastDisplay() {
    // Update color displays
    $("#contrast-left-color").text(formatColor(this.contrastColors.left));
    $("#contrast-left")[0].style.backgroundColor = formatColor(
      this.contrastColors.left
    );

    $("#contrast-right-color").text(formatColor(this.contrastColors.right));
    $("#contrast-right")[0].style.backgroundColor = formatColor(
      this.contrastColors.right
    );

    // Calculate and display contrast ratio
    const ratio = getContrastRatio(
      this.contrastColors.left,
      this.contrastColors.right
    );
    const compliance = checkWCAGCompliance(ratio);

    $("#contrast-ratio").text(ratio.toFixed(2) + ":1");

    // Update compliance badges
    $("#aa-normal")
      .toggleClass("bg-green-100 text-green-800", compliance.AA.normal)
      .toggleClass("bg-red-100 text-red-800", !compliance.AA.normal)
      .text(compliance.AA.normal ? "Pass" : "Fail");

    $("#aa-large")
      .toggleClass("bg-green-100 text-green-800", compliance.AA.large)
      .toggleClass("bg-red-100 text-red-800", !compliance.AA.large)
      .text(compliance.AA.large ? "Pass" : "Fail");

    $("#aaa-normal")
      .toggleClass("bg-green-100 text-green-800", compliance.AAA.normal)
      .toggleClass("bg-red-100 text-red-800", !compliance.AAA.normal)
      .text(compliance.AAA.normal ? "Pass" : "Fail");
  }

  exportPalette() {
    if (this.activePalette.length === 0) {
      alert("No colors in active palette to export.");
      return;
    }

    const paletteName = $("#palette-name").val().trim() || "My Palette";
    const exportData = {
      name: paletteName,
      colors: this.activePalette.map((color) => ({
        hex: rgbToHex(color.r, color.g, color.b),
        rgb: `rgb(${color.r}, ${color.g}, ${color.b})`,
        hsl: rgbToHsl(color.r, color.g, color.b),
      })),
      exported: new Date().toISOString(),
    };

    // Create and download JSON file
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${paletteName
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()}_palette.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  loadSavedPalettes() {
    this.savedPalettes = loadPalettesFromStorage();
    this.displaySavedPalettes();
  }

  savePalettesToStorage() {
    savePalettesToStorage(this.savedPalettes);
  }
}

// Create global UI instance
const ui = new UI();

// Export for use in other modules
window.UI = UI;
window.ui = ui;
