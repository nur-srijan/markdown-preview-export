# Markdown Rich Preview & Export 🚀

A powerful Visual Studio Code extension that transforms your Markdown editing experience with beautiful previews and seamless export options. Say goodbye to switching between tools - preview, export to PDF, or generate HTML files without leaving your editor!

Yes, no Pandoc hacks at all!

## ✨ Features

- **Rich Markdown Preview** - Instant, side-by-side preview with GitHub-like styling

![Enhanced Preview Demo](https://raw.githubusercontent.com/nur-srijan/markdown-preview-export/main/assets/EnhancedPreviewDemo.gif)

- **Export to PDF** - Create professional PDF documents with proper formatting

![Export to PDF Demo](https://raw.githubusercontent.com/nur-srijan/markdown-preview-export/main/assets/ExportToPdf.png)

- **Export to HTML** - Generate standalone HTML files with all styles included

![Export to HTML Demo](https://raw.githubusercontent.com/nur-srijan/markdown-preview-export/main/assets/ExportToHtml.png)

- **Real-time Updates** - See changes instantly as you type
- **Syntax Highlighting** - Beautiful code blocks with syntax highlighting
- **Math Support** - Support for KaTeX math rendering
- **Responsive Design** - Looks great on any device or screen size

## 🚀 Quick Start

1. **Install** the extension from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?item=your-extension-id)
2. **Open** any Markdown ([.md](cci:7://file:///c:/Users/somit/MyDevOps/VSCode_xtension/README.md:0:0-0:0)) file
3. **Right-click** in the editor and choose one of these options:
   - "Markdown: Open Enhanced Preview" - For live preview
   - "Markdown: Export to HTML" - To save as HTML
   - "Markdown: Export to PDF" - To create a PDF document

## 🎯 Why Choose This Extension?

✅ **All-in-One Solution** - Preview and export without leaving VS Code  
✅ **No Pandoc Hacks** - No need to switch to another tool or use Pandoc for export  
✅ **Beautiful Output** - Professional, clean formatting for all your documents  
✅ **Keyboard Shortcuts** - Quick access to all features  
✅ **Lightweight** - Fast performance with minimal resource usage  
✅ **Open Source** - Free to use and contribute to

## 🛠️ For Developers

### Prerequisites
- Node.js
- VS Code
- npm

### Building from Source

```bash
# Clone the repository
git clone [https://github.com/nur-srijan/markdown-preview-export.git](https://github.com/nur-srijan/markdown-preview-export.git)
cd markdown-preview-export

# Install dependencies
npm install

# Build the extension
npm run compile

# Package the extension (creates .vsix file)
npx vsce package

# Install the extension
code --install-extension markdown-rich-preview-*.vsix
```

### Testing
1. Press F5 to open a new VS Code window with the extension loaded
2. Open a Markdown file
3. Use the right-click context menu to test all features

## 📝 Contributing
We welcome contributions! Here's how you can help:

1. Fork the repository
2. Create a feature branch (git checkout -b feature/amazing-feature)
3. Commit your changes (git commit -m 'Add some amazing feature')
4. Push to the branch (git push origin feature/amazing-feature)
5. Open a Pull Request

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments
- [Marked](https://github.com/markedjs/marked) - For Markdown parsing
- [Highlight.js](https://highlightjs.org/) - For syntax highlighting
- [Puppeteer](https://pptr.dev/) - For PDF generation

---

Made with ❤️ by Nur Srijan | [GitHub](https://github.com/nur-srijan) | [Twitter](https://twitter.com/nur_srijan)