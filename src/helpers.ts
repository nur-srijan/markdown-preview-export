import * as process from 'process';
import { marked } from 'marked';
import type { MarkedOptions } from 'marked';
import hljs from 'highlight.js';
import twemoji from 'twemoji';
import markedKatex from 'marked-katex-extension';
import DOMPurify from 'isomorphic-dompurify';

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
            '/opt/google/chrome/chrome'
        );
    } else if (platform === 'darwin') {
        candidates.push(
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Chromium.app/Contents/MacOS/Chromium'
        );
    } else if (platform === 'win32') {
        candidates.push(
            'C:/Program Files/Google/Chrome/Application/chrome.exe',
            'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
            'C:/Program Files/Chromium/Application/chrome.exe'
        );
    }

    const envPaths = [
        process.env.PUPPETEER_EXECUTABLE_PATH,
        process.env.CHROME_PATH
    ].filter((p): p is string => !!p && p.length > 0);
    return [...envPaths, ...candidates].filter((p, idx, arr) => arr.indexOf(p) === idx);
}

interface ExtendedMarkedOptions extends MarkedOptions {
    highlight?: (code: string, lang: string) => string;
    langPrefix?: string;
    gfm?: boolean;
    breaks?: boolean;
    smartLists?: boolean;
    smartypants?: boolean;
    xhtml?: boolean;
}

export function getHtmlForWebview(markdownContent: string, isForPdf: boolean = false, assetBase?: string): string {
    const renderer = new marked.Renderer();

    renderer.code = (code: string, language: string | undefined) => {
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

    const markedOptions: ExtendedMarkedOptions = {
        renderer,
        highlight: function(code: string, lang: string) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        },
        langPrefix: 'hljs language-',
        gfm: true,
        breaks: false,
        smartLists: true,
        smartypants: false,
        xhtml: false
    };

    marked.use(markedKatex());
    marked.setOptions(markedOptions);

    let htmlContent = marked.parse(markdownContent);

    if (isForPdf) {
        htmlContent = twemoji.parse(htmlContent as string, {
            folder: 'svg',
            ext: '.svg',
            base: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/'
        }) as string;
    }

    // Sanitize HTML
    htmlContent = DOMPurify.sanitize(htmlContent as string, {
        ADD_TAGS: ['math', 'maction', 'maligngroup', 'malignmark', 'menclose', 'merror', 'mfenced', 'mfrac', 'mglyph', 'mi', 'mlabeledtr', 'mlongdiv', 'mmultiscripts', 'mn', 'mo', 'mover', 'mpadded', 'mphantom', 'mroot', 'mrow', 'ms', 'mscarries', 'mscarry', 'msgroup', 'msline', 'mspace', 'msqrt', 'msrow', 'mstack', 'mstyle', 'msub', 'msubsup', 'msup', 'mtable', 'mtd', 'mtext', 'mtr', 'munder', 'munderover', 'semantics', 'annotation', 'annotation-xml'],
        ADD_ATTR: ['xmlns', 'display', 'class', 'style', 'height', 'width', 'viewBox', 'fill', 'stroke', 'stroke-width', 'd', 'x', 'y', 'rx', 'ry']
    });

    const vendor = assetBase ? assetBase.replace(/\/$/, '') : undefined;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown: Rich Preview</title>
    <link rel="stylesheet" href="${vendor ? vendor + '/highlight/styles/github-dark.min.css' : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github-dark.min.css'}">
    <link rel="stylesheet" href="${vendor ? vendor + '/katex/katex.min.css' : 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css'}">
    <script src="${vendor ? vendor + '/highlight/highlight.min.js' : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js'}"></script>
    <script>
        // Initialize highlight.js
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('pre code').forEach((block) => {
                // @ts-ignore - browser runtime
                if (typeof hljs !== 'undefined' && hljs.highlightElement) {
                    // @ts-ignore
                    hljs.highlightElement(block);
                }
            });
        });

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
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`;
}
