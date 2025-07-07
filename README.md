# NVDA PDF Editor

**Professional PDF Editor optimized for NVDA screen reader**

A fully accessible desktop application designed specifically for educators and professionals working with visually impaired students. Built with Electron, this PDF editor provides comprehensive screen reader support, keyboard navigation, and WCAG 2.1 AA compliance.

## Features

### 🎯 Core PDF Editing
- **Open and Edit PDFs** - Load, modify, and save PDF documents
- **Form Field Editing** - Create and edit text fields, checkboxes, dropdowns, and signature fields
- **Unstructured Text Editing** - Edit any text content in PDFs with intelligent detection
- **Digital Signatures** - Add and manage digital signatures
- **OCR Support** - Extract text from scanned PDFs
- **Zoom Controls** - Flexible zoom from 25% to 500%

### ♿ Accessibility Features
- **Full Screen Reader Support** - Compatible with NVDA, JAWS, and Narrator
- **Keyboard Navigation** - Complete keyboard access to all features
- **High Contrast Mode** - Enhanced visibility for low vision users
- **Focus Indicators** - Clear visual focus indicators
- **Screen Reader Announcements** - Comprehensive ARIA live regions
- **Skip Navigation** - Quick access to main content areas

### 🔧 Professional Tools
- **Form Field Detection** - Automatic detection of existing form fields
- **Unstructured Text Detection** - Intelligent detection of editable text content
- **Structure Analysis** - Document structure evaluation
- **Export Options** - Export form data as JSON or CSV
- **Error Recovery** - Robust error handling with user-friendly messages
- **Professional UI** - Clean, emoji-free interface suitable for educational and government use

## Installation

### Requirements
- Windows 10 or later
- 4GB RAM minimum
- 200MB free disk space

### Quick Install
1. Download the latest release from the [Releases](https://github.com/your-repo/nvda-pdf-editor/releases) page
2. Run the installer (`NVDA-PDF-Editor-Setup.exe`)
3. Follow the installation wizard
4. Launch from Desktop shortcut or Start Menu

### Development Setup
```bash
# Clone the repository
git clone https://github.com/your-repo/nvda-pdf-editor.git
cd nvda-pdf-editor

# Install dependencies
npm install

# Start development
npm run dev

# Build for production
npm run build-win
```

## Usage

### Getting Started
1. **Open the Application** - Launch NVDA PDF Editor from your desktop or Start Menu
2. **Load a PDF** - Press `Ctrl+O` or click "Open PDF" to select a file
3. **Navigate** - Use Tab to move between controls, Arrow keys to navigate content
4. **Edit Forms** - Click on form fields to edit, or use toolbar to add new fields
5. **Edit Text Content** - Press `Ctrl+Shift+E` to enable unstructured text editing mode
6. **Save Changes** - Press `Ctrl+S` to save your modifications

### Keyboard Shortcuts

#### File Operations
- `Ctrl+O` - Open PDF file
- `Ctrl+S` - Save PDF file
- `Ctrl+Shift+S` - Save As...

#### View Controls
- `Ctrl+Plus` - Zoom in
- `Ctrl+Minus` - Zoom out
- `Ctrl+0` - Reset zoom to 100%

#### Editing Tools
- `Ctrl+Shift+T` - Add text field
- `Ctrl+Shift+C` - Add checkbox
- `Ctrl+Shift+D` - Add dropdown
- `Ctrl+Shift+S` - Add signature field
- `Ctrl+Shift+E` - Toggle unstructured text editing mode

#### Accessibility
- `F1` - Show keyboard shortcuts help
- `Ctrl+Shift+H` - Toggle high contrast mode
- `Ctrl+Shift+F` - Toggle focus indicators
- `Ctrl+Shift+Space` - Announce current focus
- `Ctrl+Shift+R` - Read document structure

### Screen Reader Instructions

#### NVDA Users
1. Ensure NVDA is running before launching the application
2. Use browse mode (`NVDA+Space`) to read document content
3. Use focus mode for form field editing
4. Enable "Report dynamic content changes" in NVDA settings

#### JAWS Users
1. Start JAWS before opening the application
2. Use virtual cursor (`Insert+NumPad Plus`) for document navigation
3. Use PC cursor for precise editing
4. Enable "Announce HTML access keys" in JAWS settings

#### Narrator Users
1. Enable Narrator in Windows Settings
2. Use scan mode (`Caps Lock+Space`) for reading
3. Use navigation commands (`Caps Lock+Arrow Keys`)
4. Enable developer mode for enhanced web content support

## Accessibility Compliance

This application follows **WCAG 2.1 AA** guidelines and includes:

### Level A Compliance
- ✅ Alternative text for all images
- ✅ Keyboard accessibility
- ✅ Color contrast ratios
- ✅ Proper heading structure
- ✅ Focus management

### Level AA Compliance
- ✅ Enhanced color contrast (4.5:1 minimum)
- ✅ Resize text up to 200%
- ✅ Multiple ways to navigate
- ✅ Consistent navigation
- ✅ Error identification and suggestions

### Additional Features
- **High Contrast Mode** - Forced high contrast for better visibility
- **Reduced Motion** - Respects user's motion preferences
- **Screen Reader Optimization** - Enhanced announcements and live regions
- **Focus Indicators** - Enhanced visual focus indicators
- **Skip Links** - Quick navigation to main content areas

## For Teachers of the Visually Impaired

### Educational Use Cases
- **IEP Document Review** - Edit and review Individualized Education Programs
- **Assessment Forms** - Create accessible assessment forms for students
- **Resource Preparation** - Prepare accessible educational materials
- **Student Portfolios** - Organize and edit student work samples
- **Collaboration** - Share accessible documents with colleagues and parents
- **Text Content Editing** - Modify any text content in educational PDFs

### Unstructured Text Editing
The application includes advanced unstructured text editing capabilities designed specifically for educational use:

- **Intelligent Text Detection** - Automatically identifies editable text content in PDFs
- **Professional Interface** - Clean, emoji-free editing interface suitable for institutional use
- **Screen Reader Optimized** - Full NVDA compatibility with proper ARIA labels and announcements
- **Keyboard Navigation** - Complete keyboard access to all text editing features
- **Auto-save** - Automatic saving of text modifications with user notifications
- **Modification Tracking** - Visual indicators for modified text content
- **Accessibility Compliance** - WCAG 2.1 AA compliant text editing interface

### Best Practices
1. **Test with Screen Readers** - Always verify accessibility with actual assistive technology
2. **Use Meaningful Labels** - Provide clear, descriptive labels for all form fields
3. **Maintain Structure** - Preserve logical reading order and heading hierarchy
4. **Provide Instructions** - Include clear instructions for complex forms
5. **Regular Updates** - Keep the application updated for latest accessibility improvements

## Supported File Formats

### Input
- **PDF** - All standard PDF versions (1.4 through 2.0)
- **PDF/A** - Archival PDF formats
- **XFA Forms** - Adobe XML Forms Architecture
- **AcroForms** - Adobe Acrobat forms

### Output
- **PDF** - Standard PDF with preserved accessibility features
- **JSON** - Form data export
- **CSV** - Tabular form data export

## Technical Specifications

### System Requirements
- **Operating System** - Windows 10 version 1903 or later
- **Memory** - 4GB RAM minimum, 8GB recommended
- **Storage** - 200MB for application, additional space for documents
- **Display** - 1024x768 minimum resolution
- **Assistive Technology** - NVDA 2020.1+, JAWS 2020+, Narrator (Windows 10)

### Security Features
- **Local Processing** - All PDF processing done locally, no cloud uploads
- **Digital Signatures** - Support for standard digital signature formats
- **Secure Storage** - Encrypted storage of user preferences and signatures
- **Privacy First** - No telemetry or data collection

## Troubleshooting

### Common Issues

#### PDF Won't Open
- **Check File Format** - Ensure file is a valid PDF
- **File Size** - Maximum supported size is 50MB
- **Permissions** - Verify you have read access to the file
- **Corruption** - Try opening the file in another PDF viewer first

#### Screen Reader Not Working
- **Restart Application** - Close and reopen the application
- **Check SR Settings** - Verify screen reader is configured for web content
- **Focus Mode** - Switch between browse and focus modes
- **Windows Updates** - Ensure Windows and assistive technology are updated

#### Performance Issues
- **Close Other Applications** - Free up system memory
- **Reduce Zoom Level** - Lower zoom levels use less memory
- **Restart Application** - Clear any memory leaks
- **Check System Resources** - Monitor CPU and memory usage

### Getting Help
- **Built-in Help** - Press `F1` for keyboard shortcuts and help
- **User Guide** - Access from Help menu
- **Support** - Contact support at support@accessiblepdfeditor.com
- **Community** - Join our accessibility community forum

## Development

### Contributing
We welcome contributions that improve accessibility and usability for visually impaired users.

1. Fork the repository
2. Create a feature branch
3. Test with multiple screen readers
4. Submit a pull request with accessibility testing results

### Building from Source
```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build for Windows
npm run build-win

# Run accessibility tests
npm run test:a11y
```

### Accessibility Testing
- **Automated Testing** - axe-core integration for WCAG compliance
- **Manual Testing** - Test with NVDA, JAWS, and Narrator
- **User Testing** - Regular testing with visually impaired users
- **Keyboard Testing** - Verify all functionality works without mouse

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- **PDF.js** - Mozilla's PDF rendering library
- **Electron** - Cross-platform desktop app framework
- **NVDA Community** - Testing and feedback
- **JAWS Users** - Accessibility insights
- **Teachers of the Visually Impaired** - Requirements and usability testing

---

**AccessiblePDF Editor** - Making PDF editing accessible for everyone.

For support, feature requests, or accessibility feedback, please contact us at support@accessiblepdfeditor.com or create an issue on GitHub. 