# Sentinel's Journal

## 2024-05-22 - Missing Sentinel Journal
**Vulnerability:** The repository was missing the `.jules/sentinel.md` journal file.
**Learning:** Security learnings need a centralized place to be recorded to ensure knowledge transfer and continuous improvement.
**Prevention:** Created the file to start tracking critical security learnings.

## 2024-05-22 - Missing Content Security Policy
**Vulnerability:** The webview HTML was missing a Content Security Policy (CSP), allowing unrestricted script execution.
**Learning:** Even with sanitized HTML, XSS is possible if CSP is not present to restrict script sources.
**Prevention:** Implemented a strict CSP using a cryptographic nonce for script execution.
