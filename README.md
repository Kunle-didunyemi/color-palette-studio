# Palette Studio

A web-based color palette extraction and management tool that allows users to extract colors from images and create custom color palettes.

## Features

- **Image Color Extraction**: Upload images or use drag-and-drop to extract dominant colors
- **Adjustable Extraction**: Control the number of colors to extract (2-20 colors)
- **Palette Management**: Build custom palettes by clicking extracted colors
- **WCAG Contrast Testing**: Check accessibility compliance between color pairs
- **Save & Load Palettes**: Persist palettes in browser storage
- **Export Functionality**: Download palettes as JSON files
- **Demo Image**: Try the app with a pre-loaded demo image

## Tech Stack

- **HTML5**: Semantic markup and structure
- **Tailwind CSS**: Utility-first CSS framework for styling
- **jQuery**: DOM manipulation and event handling
- **Vanilla JavaScript**: Custom color extraction algorithms and UI logic

## Color Extraction Algorithm

The app uses a median cut color quantization algorithm to extract dominant colors from images:

1. Sample pixels from the image (configurable quality)
2. Apply median cut algorithm to find color clusters
3. Calculate average colors for each cluster
4. Sort results by brightness for consistent display

## WCAG Compliance

The contrast tester evaluates colors against WCAG guidelines:

- **AA Level**: 4.5:1 ratio (normal text), 3:1 ratio (large text)
- **AAA Level**: 7:1 ratio (normal text), 4.5:1 ratio (large text)

## Usage

1. **Upload an Image**:

   - Click "choose a file" or drag-and-drop an image
   - Or click "Use demo image" to try with a sample image

2. **Extract Colors**:

   - Adjust the color count slider (2-20 colors)
   - Colors are automatically extracted and displayed

3. **Build a Palette**:

   - Click any extracted color to add it to your active palette
   - Colors can be removed by clicking the × that appears on hover

4. **Test Contrast**:

   - Drag colors from saved palettes to the contrast tester
   - View WCAG compliance results instantly

5. **Save & Export**:
   - Name your palette and click "Save"
   - Load previously saved palettes
   - Export palettes as JSON files

## Keyboard Shortcuts

- `Ctrl/Cmd + S`: Save current palette
- `Ctrl/Cmd + N`: Create new palette
- `Ctrl/Cmd + E`: Export current palette

## Browser Support

- Modern browsers with ES6+ support
- Local storage for palette persistence
- File API for image uploads
- Drag and drop API

## Development

To run locally:

```bash
# Start a local server
python3 -m http.server 8000

# Open in browser
http://localhost:8000/index.html
```

## File Structure

```
palette-studio/
├── index.html          # Main HTML file
├── styles/
│   └── main.css        # Custom styles
└── scripts/
    ├── helpers.js      # Utility functions
    ├── color-extractor.js # Color extraction logic
    ├── ui.js           # User interface handlers
    └── main.js         # Application initialization
```

## License

This project is for educational purposes and recreates the functionality of the original Palette Studio app.
