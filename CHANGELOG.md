# Changelog

## [1.2.1](https://marketplace.visualstudio.com/items?itemName=nur-srijan.markdown-rich-preview&version=1.2.1) - 2026-04-21
### 🐛 Bug Fixes

- **Theme Support**: Fixed an issue where the preview was not loading on some systems.
- **Code Block Theme**: Fixed an issue where the code block theme was not loading on some systems.
- **Dependencies**: Updated dependencies to fix CVEs.

## [1.2.0](https://marketplace.visualstudio.com/items?itemName=nur-srijan.markdown-rich-preview&version=1.2.0) - 2026-01-21
### 🚀 New Features

- **Advanced GFM Support**: Added support for Footnotes, Task Lists, and automatically generated Heading IDs for easier section linking.
- **Front Matter Rendering**: YAML front matter is now correctly parsed and rendered as a clean, GitHub-style table at the top of the preview.
- **Theme Awareness**: Tables and front matter now dynamically adapt to VS Code's light and dark themes using native CSS variables.
- **Enhanced Security**: Implemented robust HTML sanitization to ensure safe rendering of untrusted markdown content.
- **Community Documentation**: Added `SECURITY.md`, `CONTRIBUTING.md`, and `CODE_OF_CONDUCT.md` to foster a better open-source environment.

### 🐛 Bug Fixes

- **Local Image Loading**: Fixed `401 Unauthorized` errors when loading local relative images (e.g., `assets/image.png`) in the webview by correctly configuring `localResourceRoots`.
- **Renderer Compatibility**: Updated extension to work seamlessly with `marked` v15 renderer API changes.

## [1.1.2](https://marketplace.visualstudio.com/items?itemName=nur-srijan.markdown-rich-preview&version=1.1.2) - 2025-09-03
### 🐛 Bug Fixes

- Improve browser launch reliability with multi-strategy Puppeteer initialization

## [1.1.0](https://marketplace.visualstudio.com/items?itemName=nur-srijan.markdown-rich-preview&version=1.1.0) - 2025-07-24
### 🚀 New Features

- 🎨 Emojis are now visible in exported PDFs: Emoji characters are automatically replaced with Twemoji SVG images during PDF export, ensuring consistent emoji rendering across all platforms.

### 🐛 Bug Fixes

- 🐛 General optimizations and code improvements.
- 📦 Extension size significantly reduced: Minified from ~38MB to ~7MB for faster installs and updates!

All notable changes to this project will be documented in this file.

---

## [1.0.3](https://marketplace.visualstudio.com/items?itemName=nur-srijan.markdown-rich-preview&version=1.0.3) - 2025-07-07
### Fixed

- 🐛 Fixed some internal issues.

## [1.0.2](https://marketplace.visualstudio.com/items?itemName=nur-srijan.markdown-rich-preview&version=1.0.2) - 2025-07-06
### Added

- 🌃 Dark theme support for the code blocks.
- 📄 Created discussions page for general questions and ideas.

### Fixed

- 🐛 Fixed an issue where the preview was not loading on some systems.
- 🐛 Fixed some components that were broken.

## [1.0.1](https://marketplace.visualstudio.com/items?itemName=nur-srijan.markdown-rich-preview&version=1.0.1) - 2025-07-06
### Added

- 🧩 Support for VSCode forks (e.g. VSCodium) with OpenVSX.
- 📄 Added Issue templates for bug reports and feature requests on GitHub.

### Fixed

- 🐛 Fixed an issue where the preview was not loading on some systems.

## [1.0.0](https://marketplace.visualstudio.com/items?itemName=nur-srijan.markdown-rich-preview) - 2025-06-16
### 🚀 Initial Release

- ✨ Rich, GitHub-style Markdown preview inside VS Code.
- 📄 Export Markdown to beautifully styled **PDF** and **HTML** files.
- ⚡ Real-time rendering with syntax highlighting for code blocks.
- 📱 Responsive preview design — looks sharp across all screen sizes.
- 💡 Seamless integration with VS Code, no external tools required.
- 🧮 LaTeX rendering support via KaTeX.

---

## [Planned]
### 🚧 Coming Soon

- 🧜‍♀️ Support for **Mermaid diagrams** and **PlantUML**.
- 🎨 Support for custom themes.
- ⚡ Fixing possible performance issues, memory leaks and other bugs.
- 🚀 Support for JetBrains, Vim, Sublime Text (as standalone tools or plugins).
- 🤖 AI-powered README and Changelog generation based on workspace analysis.
