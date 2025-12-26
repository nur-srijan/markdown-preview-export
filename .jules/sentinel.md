## 2024-05-23 - Missing Content Security Policy in Webview
**Vulnerability:** The `getHtmlForWebview` function generated HTML for the VS Code Webview without a Content Security Policy (CSP), allowing potentially unsafe scripts to run if sanitization failed or via other injection vectors.
**Learning:** Even with `DOMPurify`, a CSP is a critical defense-in-depth layer for VS Code extensions to prevent XSS.
**Prevention:** Always include a strict CSP meta tag in Webview HTML, using nonces for inline scripts and restricting external sources.
