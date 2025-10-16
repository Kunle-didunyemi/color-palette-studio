// Main entry point for Palette Studio

$(document).ready(function () {
  console.log("Palette Studio initialized");

  // Initialize tooltips for color swatches
  $(document).on("mouseenter", ".color-swatch, .palette-color", function () {
    const color = $(this).css("background-color");
    $(this).attr("title", rgbToHexFromCss(color));
  });

  // Add some visual feedback for drag operations
  $(document).on("dragstart", ".palette-color", function () {
    $(this).addClass("opacity-50");
  });

  $(document).on("dragend", ".palette-color", function () {
    $(this).removeClass("opacity-50");
  });

  // Keyboard shortcuts
  $(document).on("keydown", function (e) {
    // Ctrl/Cmd + S to save palette
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      $("#save-palette-btn").click();
    }

    // Ctrl/Cmd + N to new palette
    if ((e.ctrlKey || e.metaKey) && e.key === "n") {
      e.preventDefault();
      ui.createNewPalette();
    }

    // Ctrl/Cmd + E to export
    if ((e.ctrlKey || e.metaKey) && e.key === "e") {
      e.preventDefault();
      ui.exportPalette();
    }
  });

  // Show welcome message if no palettes exist
  if (ui.savedPalettes.length === 0) {
    setTimeout(() => {
      console.log("Welcome to Palette Studio! Upload an image to get started.");
    }, 1000);
  }
});

// Helper function to convert CSS rgb() to hex
function rgbToHexFromCss(rgbString) {
  const match = rgbString.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (match) {
    return rgbToHex(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
  }
  return rgbString;
}

// Error handling for unhandled promise rejections
window.addEventListener("unhandledrejection", function (event) {
  console.error("Unhandled promise rejection:", event.reason);
  // You could show a user-friendly error message here
});

// Service worker registration for offline functionality (optional)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    // We'll implement this later if needed
    // navigator.serviceWorker.register('/sw.js');
  });
}
