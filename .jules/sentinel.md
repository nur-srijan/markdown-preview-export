## 2024-05-23 - XSS in Markdown Preview
**Vulnerability:** Markdown preview rendered unsanitized HTML, allowing XSS.
**Learning:** `marked` library does not sanitize output by default.
**Prevention:** Always use `dompurify` (or equivalent) on HTML output from markdown parsers, especially in VS Code webviews with `enableScripts: true`. Also, ensure sanitization configuration preserves MathML and other expected specialized markup.
