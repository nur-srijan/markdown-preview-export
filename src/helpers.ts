import * as process from 'process';
import * as path from 'path';
import { Marked } from 'marked';
import hljs from 'highlight.js';
import twemoji from 'twemoji';
import markedKatex from 'marked-katex-extension';
import markedAlert from 'marked-alert';
import markedFootnote from 'marked-footnote';
import markedHookFrontmatter from 'marked-hook-frontmatter';
import { gfmHeadingId } from 'marked-gfm-heading-id';
import sanitizeHtml from 'sanitize-html';

export function getChromeExecutableCandidates(): string[] {
    const candidates: Array<string> = [];
    const platform = process.platform;
    if (platform === 'linux') {
        candidates.push(
            '/usr/bin/google-chrome-stable',
            '/usr/bin/google-chrome',
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
            '/snap/bin/chromium',
            '/opt/google/chrome/chrome',
            '/usr/bin/brave'
        );
    } else if (platform === 'darwin') {
        candidates.push(
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Chromium.app/Contents/MacOS/Chromium',
            '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
            '/Applications/Comet.app/Contents/MacOS/Comet'
        );
    } else if (platform === 'win32') {
        candidates.push(
            'C:/Program Files/Google/Chrome/Application/chrome.exe',
            'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
            'C:/Program Files/Chromium/Application/chrome.exe',
            'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',
            'C:/Program Files/Comet/Comet.exe'
        );
    }

    const envPaths = [
        process.env.PUPPETEER_EXECUTABLE_PATH,
        process.env.CHROME_PATH
    ].filter((p): p is string => !!p && p.length > 0);
    return [...envPaths, ...candidates].filter((p, idx, arr) => arr.indexOf(p) === idx);
}


export function getHtmlForWebview(
    markdownContent: string,
    isForPdf: boolean = false,
    assetBase?: string,
    documentPath?: string,
    workspaceRoot?: string,
    imageResolver?: (href: string) => string,
    cspSource?: string
): string {
    const marked = new Marked();
    const renderer = new marked.Renderer();

    renderer.image = ({ href, title, text }: { href: string | null, title: string | null, text: string }) => {
        if (!href) {
            return `<img src="" alt="${text}" title="${title || ''}">`;
        }

        let resolvedHref = href;

        // Resolve absolute paths (starting with /) relative to workspace root
        if (href.startsWith('/') && workspaceRoot) {
            resolvedHref = path.join(workspaceRoot, href);
        }
        // Resolve relative paths relative to document directory
        else if (!href.startsWith('/') && !href.match(/^[a-z]+:\/\//i) && documentPath) {
            const documentDir = path.dirname(documentPath);
            resolvedHref = path.resolve(documentDir, href);
        }

        // Use custom resolver if provided, but ONLY for local resources
        if (imageResolver && !resolvedHref.match(/^[a-z]+:\/\//i)) {
            resolvedHref = imageResolver(resolvedHref);
        } else if (path.isAbsolute(resolvedHref) && !resolvedHref.startsWith('http') && !imageResolver) {
            // Default to file:// for absolute paths if no resolver provided (mainly for exports)
            // Encode the path to handle spaces and special characters
            const encodedPath = resolvedHref.split(path.sep).map(segment => encodeURIComponent(segment)).join('/');
            resolvedHref = `file://${encodedPath.startsWith('/') ? '' : '/'}${encodedPath}`;
        }

        return `<img src="${resolvedHref}" alt="${text}" title="${title || ''}">`;
    };

    renderer.code = ({ text: code, lang: language }: { text: string, lang?: string }) => {
        const lang = language || 'plaintext';
        try {
            const validLanguage = hljs.getLanguage(lang) ? lang : 'plaintext';
            const highlightedCode = hljs.highlight(code, { language: validLanguage }).value;

            return `
                <div class="code-block">
                    <div class="code-header">
                        <span class="language">${lang}</span>
                        <button class="copy-button" onclick="copyToClipboard(this)" title="Copy to clipboard">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </button>
                    </div>
                    <pre><code class="hljs language-${validLanguage}">${highlightedCode}</code></pre>
                </div>
            `;
        } catch (e) {
            return `
                <div class="code-block">
                    <div class="code-header">
                        <span class="language">${lang}</span>
                        <button class="copy-button" onclick="copyToClipboard(this)" title="Copy to clipboard">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </button>
                    </div>
                    <pre><code>${code}</code></pre>
                </div>
            `;
        }
    };


    // Use plugins instead of setOptions for better stability
    marked.use(markedKatex({
        throwOnError: false,
        nonStandard: true,
        output: 'html'
    }));

    marked.use(markedAlert());
    marked.use(markedFootnote());
    marked.use(gfmHeadingId());
    let frontMatterTable = '';
    marked.use(markedHookFrontmatter((data: any) => {
        if (data && Object.keys(data).length > 0) {
            frontMatterTable = '<div class="front-matter"><div class="front-matter-title">Front Matter</div><table>';
            for (const [key, value] of Object.entries(data)) {
                frontMatterTable += `<tr><td><strong>${key}</strong></td><td>${value}</td></tr>`;
            }
            frontMatterTable += '</table></div>';
        }
    }));

    marked.use({
        renderer,
        gfm: true,
        breaks: false,
    });

    // Fix math block spacing: Ensure empty line before $$
    // This fixes the issue where $$ block following text directly is treated as inline or ignored
    let processedMarkdown = markdownContent.replace(/([^\n])\n(\$\$)/g, '$1\n\n$2');

    let htmlContent = marked.parse(processedMarkdown) as string;

    if (frontMatterTable) {
        htmlContent = frontMatterTable + htmlContent;
    }

    // Sanitize the HTML content
    // We need to allow specific tags and attributes for KaTeX and highlighting
    // Sanitize the HTML content
    // We need to allow specific tags and attributes for KaTeX and highlighting
    htmlContent = sanitizeHtml(htmlContent, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat([
            'math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'sub', 'sup', 'annotation', 'mtable', 'mtr', 'mtd', 'none', 'mpadded', 'mphantom', 'maligngroup', 'malignmark',
            'svg', 'path', 'rect', 'span', 'style', 'link', 'div', 'button', 'use', 'img',
            'defs', 'linearGradient', 'radialGradient', 'stop', 'clipPath', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan', 'g', 'symbol', 'marker', 'mask', 'pattern', 'foreignObject'
        ]),
        allowedAttributes: {
            ...sanitizeHtml.defaults.allowedAttributes,
            '*': ['style', 'class', 'id', 'title', 'aria-hidden', 'data-copy-text', 'onclick'],
            'div': ['class', 'id', 'style'],
            'p': ['class', 'id', 'style'],
            'span': ['class', 'id', 'style'],
            'li': ['class', 'id', 'style'],
            'input': ['type', 'checked', 'disabled', 'class'],
            'section': ['class', 'id'],
            'ol': ['start', 'class', 'id'],
            'sup': ['id', 'class'],
            'svg': ['xmlns', 'viewBox', 'fill', 'stroke', 'stroke-width', 'width', 'height', 'preserveAspectRatio', 'version'],
            'path': ['d', 'fill', 'stroke', 'stroke-width', 'transform'],
            'rect': ['x', 'y', 'width', 'height', 'rx', 'ry', 'fill', 'stroke', 'stroke-width'],
            'circle': ['cx', 'cy', 'r', 'fill', 'stroke', 'stroke-width'],
            'ellipse': ['cx', 'cy', 'rx', 'ry', 'fill', 'stroke', 'stroke-width'],
            'line': ['x1', 'y1', 'x2', 'y2', 'stroke', 'stroke-width'],
            'polyline': ['points', 'fill', 'stroke', 'stroke-width'],
            'polygon': ['points', 'fill', 'stroke', 'stroke-width'],
            'linearGradient': ['id', 'gradientUnits', 'x1', 'y1', 'x2', 'y2', 'gradientTransform', 'spreadMethod'],
            'radialGradient': ['id', 'gradientUnits', 'cx', 'cy', 'r', 'fx', 'fy', 'gradientTransform', 'spreadMethod'],
            'stop': ['offset', 'stop-color', 'stop-opacity'],
            'use': ['href', 'x', 'y', 'width', 'height', 'fill'],
            'text': ['x', 'y', 'dx', 'dy', 'text-anchor', 'fill', 'font-family', 'font-size', 'font-weight'],
            'tspan': ['x', 'y', 'dx', 'dy', 'fill'],
            'g': ['fill', 'stroke', 'stroke-width', 'transform', 'clip-path', 'mask', 'filter'],
            'marker': ['id', 'markerWidth', 'markerHeight', 'refX', 'refY', 'orient', 'markerUnits'],
            'mask': ['id', 'x', 'y', 'width', 'height', 'maskUnits', 'maskContentUnits'],
            'pattern': ['id', 'x', 'y', 'width', 'height', 'patternUnits', 'patternContentUnits', 'preserveAspectRatio', 'viewBox', 'patternTransform'],
            'img': ['src', 'alt', 'title', 'width', 'height'],
            'a': ['href', 'title', 'target'],
            'link': ['rel', 'href', 'type']
        },
        allowedSchemes: ['http', 'https', 'ftp', 'mailto', 'tel', 'file', 'data', 'webview-uri', 'vscode-resource', 'vscode-webview-resource'],
        allowedSchemesByTag: {
            'img': ['http', 'https', 'file', 'data', 'webview-uri', 'vscode-resource', 'vscode-webview-resource'],
            'link': ['http', 'https', 'file', 'webview-uri', 'vscode-resource', 'vscode-webview-resource']
        },
        allowProtocolRelative: false,
        allowVulnerableTags: true, // Allow style tags for KaTeX
        parser: {
            lowerCaseTags: false,
            lowerCaseAttributeNames: false
        }
    });

    if (isForPdf) {
        htmlContent = twemoji.parse(htmlContent, {
            folder: 'svg',
            ext: '.svg',
            base: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/'
        }) as string;
    }

    let vendor = assetBase ? assetBase.replace(/\/$/, '') : undefined;
    if (vendor && vendor.startsWith('file://')) {
        const urlPart = vendor.substring(7);
        const encodedPath = urlPart.split('/').map(segment => encodeURIComponent(segment)).join('/');
        vendor = `file://${encodedPath.startsWith('/') ? '' : '/'}${encodedPath}`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource || '*'} 'self' data: https: file:; script-src ${cspSource || '*'} 'unsafe-inline'; style-src ${cspSource || '*'} 'unsafe-inline' https: file:; font-src ${cspSource || '*'} https: file:;">
    <title>Markdown: Rich Preview</title>
    <link rel="stylesheet" href="${vendor ? (isForPdf ? vendor + '/highlight/styles/github.min.css' : vendor + '/highlight/styles/github-dark.min.css') : (isForPdf ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github.min.css' : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github-dark.min.css')}" onerror="console.error('Failed to load Highlight.js CSS:', this.href)">
    <link rel="stylesheet" href="${vendor ? vendor + '/katex/katex.min.css' : 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css'}" onerror="console.error('Failed to load KaTeX CSS:', this.href)">
    <script>
        // Highlighting is done on the extension side during markdown parsing.
        // No browser-side initialization of highlight.js is needed.

        // Copy to clipboard function
        function copyToClipboard(button) {
            const codeBlock = button.closest('.code-block');
            const code = codeBlock.querySelector('code').textContent;
            navigator.clipboard.writeText(code).then(() => {
                const originalText = button.textContent;
                button.textContent = 'Copied!';
                button.style.backgroundColor = '#4CAF50';
                button.style.color = 'white';
                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.backgroundColor = '';
                    button.style.color = '';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy: ', err);
            });
        }
    </script>
    <style>
        ${isForPdf ? `
        @media print {
            h1, h2, h3 {
                page-break-before: auto;
            }
            pre, .code-block, figure, table {
                page-break-inside: avoid;
            }
            pre, code {
                background-color: #f6f8fa !important;
                color: #24292e !important;
            }
            .hljs {
                background: #f6f8fa !important;
                color: #24292e !important;
            }
            hr {
                page-break-after: auto;
            }
        }
        ` : ''}
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe WPC', 'Segoe UI', system-ui, 'Ubuntu', 'Droid Sans', sans-serif;
            font-size: 14px;
            line-height: 1.6;
            padding: 0 20px;
        }
        img.emoji {
            height: 1em;
            width: 1em;
            margin: 0 .05em 0 .1em;
            vertical-align: -0.1em;
            display: inline;
        }
        h1, h2, h3, h4, h5, h6 {
            font-weight: 600;
            margin-top: 24px;
            margin-bottom: 16px;
            line-height: 1.25;
        }
        h1 { 
            font-size: 2em; 
            border-bottom: 1px solid #eaecef; 
            padding-bottom: 0.3em;
            margin-top: 0.67em 0;
        }
        h2 { 
            font-size: 1.5em; 
            border-bottom: 1px solid #eaecef; 
            padding-bottom: 0.3em;
            margin-top: 1.5em;
        }
        h3 { 
            font-size: 1.25em; 
            margin-top: 1.25em;
        }
        h4 { 
            font-size: 1em; 
            margin-top: 1em;
        }
        a { 
            color: #0366d6; 
            text-decoration: none; 
        }
        a:hover { 
            text-decoration: underline; 
        }
        strong { 
            font-weight: 600; 
        }
        pre {
            background-color:rgb(9, 7, 10);
            overflow: auto;
            margin: 0;
        }
        code {
            font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
            padding: 0.2em 0.4em;
            font-size: 90%;
        }
        pre code {
            background-color: transparent;
            padding: 0;
        }
        .code-block {
            position: relative;
            background-color:rgb(9, 7, 10);
            border-radius: 6px;
            margin: 1em 0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .code-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 4px 10px;
            background-color:rgb(32, 30, 43);
            border-top-left-radius: 6px;
            border-top-right-radius: 6px;
        }
        .language {
            color: #efe9e9;
            font-size: 0.9em;
            font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
        }
        .copy-button {
            padding: 4px 8px;
            font-size: 0.9em;
            color: #efe9e9;
            background-color: transparent;
            border: 1px solid #ddd;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .copy-button:hover {
            background-color: #e9e9e9;
            border-color: #ccc;
        }
        blockquote {
            margin: 0;
            padding: 0 1em;
            color: #6a737d;
            border-left: 0.25em solid #dfe2e5;
        }
        ul, ol {
            padding-left: 2em;
        }
        table {
            border-collapse: collapse;
            border-spacing: 0;
            width: 100%;
            overflow: auto;
            margin-bottom: 16px;
        }
        table th {
            font-weight: 600;
        }
        table th, table td {
            padding: 6px 13px;
            border: 1px solid #dfe2e5;
        }
        table tr {
            background-color: #fff;
            border-top: 1px solid #c6cbd1;
        }
        table tr:nth-child(2n) {
            background-color: #f6f8fa;
        }
        img {
            max-width: 100%;
            box-sizing: content-box;
        }
        /* GitHub-style Alerts */
        .markdown-alert {
            padding: 0.25rem 1rem;
            margin-bottom: 1rem;
            color: inherit;
            border-left: 0.25em solid #dfe2e5;
            border-radius: 6px;
        }
        .markdown-alert-title {
            display: flex;
            align-items: center;
            font-weight: 500;
            line-height: 1;
        }
        .markdown-alert-title svg {
            margin-right: 8px;
        }
        .markdown-alert-note { border-left-color: #0969da; }
        .markdown-alert-note .markdown-alert-title { color: #0969da; }
        .markdown-alert-tip { border-left-color: #1a7f37; }
        .markdown-alert-tip .markdown-alert-title { color: #1a7f37; }
        .markdown-alert-important { border-left-color: #8250df; }
        .markdown-alert-important .markdown-alert-title { color: #8250df; }
        .markdown-alert-warning { border-left-color: #9a6700; }
        .markdown-alert-warning .markdown-alert-title { color: #9a6700; }
        .markdown-alert-caution { border-left-color: #d1242f; }
        .markdown-alert-caution .markdown-alert-title { color: #d1242f; }

        /* Footnotes */
        .footnotes {
            font-size: 12px;
            color: #6a737d;
            border-top: 1px solid #dfe2e5;
            margin-top: 24px;
        }
        .footnotes ol {
            padding-left: 16px;
        }
        .footnote-backref {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            margin-left: 4px;
        }

        /* Task Lists */
        ul.contains-task-list {
            list-style-type: none;
            padding-left: 0;
        }
        .task-list-item {
            display: flex;
            align-items: flex-start;
            margin-bottom: 4px;
        }
        .task-list-item input[type="checkbox"] {
            margin: 0.25em 0.5em 0 0;
            vertical-align: middle;
        }

        /* Front Matter */
        .front-matter {
            margin-bottom: 24px;
            border: 1px solid #dfe2e5;
            border-radius: 6px;
            padding: 12px;
            background-color: #f6f8fa;
        }
        .front-matter table {
            margin-bottom: 0;
            border: none;
        }
        .front-matter table tr {
            background-color: transparent;
            border: none;
        }
        .front-matter table td {
            border: none;
            padding: 4px 8px;
        }
        .front-matter-title {
            font-weight: 600;
            margin-bottom: 8px;
            font-size: 12px;
            color: #6a737d;
            text-transform: uppercase;
        }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`;
}
