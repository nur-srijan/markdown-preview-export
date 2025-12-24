## Sentinel Journal

## 2024-05-23 - Content Security Policy in Webviews
**Vulnerability:** Missing Content Security Policy (CSP) in Webview and generated HTML.
**Learning:** Webviews with `enableScripts: true` are vulnerable to XSS if the generated HTML doesn't strictly control script execution sources. Even with `DOMPurify` sanitization, a defense-in-depth layer like CSP is critical to prevent execution of unauthorized scripts (e.g., if sanitization is bypassed or if malicious external resources are loaded).
**Prevention:** Always include a strict CSP meta tag in Webview HTML. Use nonces for inline scripts and restrict `script-src` and `style-src` to trusted sources (including local extension resources).
