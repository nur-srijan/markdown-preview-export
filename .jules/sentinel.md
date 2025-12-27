## 2024-05-20 - Missing Content Security Policy
**Vulnerability:** The webview HTML completely lacks a Content Security Policy (CSP), allowing execution of arbitrary scripts if sanitization is bypassed, and allowing loading of resources from any origin.
**Learning:** VS Code Webview extensions must explicitely define a CSP to prevent XSS and limit resource access.
**Prevention:** Always add a strict CSP meta tag to webview HTML.
