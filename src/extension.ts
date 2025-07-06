import * as vscode from 'vscode';
import * as path from 'path';
import { marked } from 'marked';
import type { MarkedOptions } from 'marked';
import hljs from 'highlight.js';
import * as fs from 'fs';
import * as puppeteer from 'puppeteer';
import markedKatex from 'marked-katex-extension';

declare const global: { browserInstance?: puppeteer.Browser };

// Reusable browser instance for PDF exports
let browserInstance: puppeteer.Browser | null = null;

// Function to get or create browser instance
async function getBrowserInstance(): Promise<puppeteer.Browser> {
    if (!browserInstance || !await isBrowserAvailable(browserInstance)) {
        if (browserInstance) {
            try {
                await browserInstance.close();
            } catch (error) {
                console.error('Error closing browser instance:', error);
            }
        }
        browserInstance = await puppeteer.launch({ 
            headless: true, // Using boolean for compatibility
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }
    return browserInstance;
}

// Check if browser instance is still available
async function isBrowserAvailable(browser: puppeteer.Browser): Promise<boolean> {
    try {
        // Try to get the browser process ID to check if it's still running
        const process = browser.process();
        return !!process && !process.killed;
    } catch (error) {
        return false;
    }
}

// Function to clean up browser instance
async function cleanupBrowser(): Promise<void> {
    if (browserInstance) {
        try {
            await browserInstance.close();
            browserInstance = null;
        } catch (error) {
            console.error('Error cleaning up browser instance:', error);
        }
    }
}

// Extend the MarkedOptions interface to include all necessary properties
interface ExtendedMarkedOptions extends MarkedOptions {
    highlight?: (code: string, lang: string) => string;
    langPrefix?: string;
    gfm?: boolean;
    breaks?: boolean;
    smartLists?: boolean;
    smartypants?: boolean;
    xhtml?: boolean;
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Markdown Rich Preview & Export is now active!');

    // Register the command
    const disposable = vscode.commands.registerCommand('markdown-rich-preview.showPreview', () => {
        const editor = vscode.window.activeTextEditor;
        
        if (!editor || editor.document.languageId !== 'markdown') {
            vscode.window.showErrorMessage('Please open a markdown file first');
            return;
        }
        
        // Create and show webview panel
        const panel = vscode.window.createWebviewPanel(
            'markdown-rich-preview',
            `Preview: ${path.basename(editor.document.fileName)}`,
            vscode.ViewColumn.Active,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(context.extensionPath, 'media'))
                ]
            }
        );
        
        // Initial update
        updateContent(panel, editor.document);
        
        // Update content when the document changes
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === editor.document.uri.toString()) {
                updateContent(panel, e.document);
            }
        });
        
        // Clean up resources when panel is closed
        panel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });
    });
    
    context.subscriptions.push(disposable);

    // Register the export to HTML command
    const exportToHtmlCommand = vscode.commands.registerCommand('markdown-rich-preview.exportToHtml', async () => {
        const editor = vscode.window.activeTextEditor;

        if (!editor || editor.document.languageId !== 'markdown') {
            vscode.window.showErrorMessage('Please open a Markdown file first to export.');
            return;
        }

        const markdownContent = editor.document.getText();
        const htmlContent = getHtmlForWebview(markdownContent);

        const defaultFileName = path.basename(editor.document.fileName, path.extname(editor.document.fileName)) + '.html';
        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(path.join(editor.document.uri.fsPath, '..', defaultFileName)),
            filters: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'HTML Files': ['html']
            }
        });

        if (uri) {
            try {
                fs.writeFileSync(uri.fsPath, htmlContent, 'utf8');
                vscode.window.showInformationMessage(`Successfully exported HTML to ${uri.fsPath}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to export HTML: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    });

    context.subscriptions.push(exportToHtmlCommand);

    // Register the export to PDF command
    const exportToPdfCommand = vscode.commands.registerCommand('markdown-rich-preview.exportToPdf', async () => {
        const editor = vscode.window.activeTextEditor;

        if (!editor || editor.document.languageId !== 'markdown') {
            vscode.window.showErrorMessage('Please open a Markdown file first to export to PDF.');
            return;
        }

        const markdownContent = editor.document.getText();
        // Pass true for isForPdf to include PDF-specific styles
        const htmlContent = getHtmlForWebview(markdownContent, true);

        const defaultFileName = path.basename(editor.document.fileName, path.extname(editor.document.fileName)) + '.pdf';
        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(path.join(editor.document.uri.fsPath, '..', defaultFileName)),
            filters: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'PDF Files': ['pdf']
            }
        });

        if (uri) {
            let page: puppeteer.Page | null = null;
            try {
                vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'Generating PDF...',
                    cancellable: false
                }, async () => {
                    try {
                        const browser = await getBrowserInstance();
                        page = await browser.newPage();
                        
                        // Set a timeout for page operations
                        page.setDefaultNavigationTimeout(30000);
                        
                        // Use domcontentloaded for faster rendering since we're not waiting for network resources
                        await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
                        
                        // Wait for any remaining resources to load (with a timeout)
                        try {
                            await page.waitForNetworkIdle({ timeout: 2000 });
                        } catch (e) {
                            // Ignore timeout errors, proceed with what we have
                        }
                        
                        const pdfBuffer = await page.pdf({
                            format: 'A4',
                            printBackground: true,
                            margin: {
                                top: '20mm',
                                right: '20mm',
                                bottom: '20mm',
                                left: '20mm'
                            },
                            preferCSSPageSize: true
                        });

                        fs.writeFileSync(uri.fsPath, pdfBuffer);
                        vscode.window.showInformationMessage(`Successfully exported PDF to ${path.basename(uri.fsPath)}`);
                    } catch (error) {
                        vscode.window.showErrorMessage(`Failed to export PDF: ${error instanceof Error ? error.message : String(error)}`);
                        console.error('PDF Export Error:', error);
                        throw error; // Re-throw to ensure the progress indicator shows the error
                    } finally {
                        if (page && !page.isClosed()) {
                            await page.close().catch(console.error);
                        }
                    }
                });
            } catch (error) {
                console.error('Error in PDF export:', error);
                // Don't close the browser here as we want to reuse it
            }
        }
    });

    context.subscriptions.push(exportToPdfCommand);
}

function updateContent(panel: vscode.WebviewPanel, document: vscode.TextDocument) {
    // Get the markdown content
    const markdownContent = document.getText();
    
    // Convert markdown to HTML
    const html = getHtmlForWebview(markdownContent);
    
    // Update webview content
    panel.webview.html = html;
}

function getHtmlForWebview(markdownContent: string, isForPdf: boolean = false): string {
    // Create a custom renderer
    const renderer = new marked.Renderer();
    
    // Customize code block rendering
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
            // If highlighting fails, return the code as plain text
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

    // Configure marked options with type assertion for highlight function
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
    
    // Configure KaTeX with default options
    marked.use(markedKatex());
    
    // Configure marked options with type assertion for highlight function
    marked.setOptions(markedOptions);
    
    // Clean up browser instance when extension is deactivated
    vscode.workspace.onDidCloseTextDocument(() => {
        // Clean up browser instance when no more markdown previews are open
        if (vscode.window.visibleTextEditors.filter(e => e.document.languageId === 'markdown').length === 0) {
            void cleanupBrowser();
        }
    });

    // Convert markdown to HTML
    const htmlContent = marked.parse(markdownContent);
    
    // Return the complete HTML document
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown: Rich Preview</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github-dark.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js"></script>
    <script>
        // Initialize highlight.js
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
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
            background-color:rgb(37, 35, 39);
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

export function deactivate() {}
