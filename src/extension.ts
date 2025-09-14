import * as vscode from 'vscode';
import * as path from 'path';
// moved heavy helpers to `src/helpers.ts` and import them there
import * as fs from 'fs';
import * as puppeteer from 'puppeteer';
// marked-katex and twemoji are used in helpers
import { getChromeExecutableCandidates, getHtmlForWebview } from './helpers';

// Fix for missing types for marked-katex-extension
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="node" />

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
        browserInstance = await launchPuppeteerWithFallbacks();
    }
    return browserInstance;
}

// Try launching Puppeteer with multiple strategies to avoid version pinning issues
async function launchPuppeteerWithFallbacks(): Promise<puppeteer.Browser> {
    const commonArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote',
        '--no-first-run'
    ];

    const errors: Array<string> = [];

    // 1) Default bundled Chromium (if available)
    try {
        return await puppeteer.launch({ headless: true, args: commonArgs });
    } catch (error) {
        errors.push(`Default launch failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 2) Try system Chrome via channel (stable)
    try {
        return await puppeteer.launch({ channel: 'chrome', headless: true, args: commonArgs } as any);
    } catch (error) {
        errors.push(`Channel chrome launch failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 3) Try system Chromium via channel
    try {
        return await puppeteer.launch({ channel: 'chromium', headless: true, args: commonArgs } as any);
    } catch (error) {
        errors.push(`Channel chromium launch failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 4) Try known executable paths
    const candidates = getChromeExecutableCandidates();
    for (const executablePath of candidates) {
        try {
            // eslint-disable-next-line no-await-in-loop
            const browser = await puppeteer.launch({ executablePath, headless: true, args: commonArgs });
            return browser;
        } catch (error) {
            errors.push(`Executable ${executablePath} failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // 5) Last resort: try puppeteer.executablePath() if available
    try {
        const p = (puppeteer as any).executablePath ? (puppeteer as any).executablePath() : undefined;
        if (p) {
            return await puppeteer.launch({ executablePath: p, headless: true, args: commonArgs });
        }
    } catch (error) {
        errors.push(`executablePath() launch failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    throw new Error(
        'Failed to launch Chrome/Chromium for PDF export. Attempts: \n' + errors.join('\n') +
        '\nPlease ensure Google Chrome or Chromium is installed and accessible.'
    );
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

// Helpers moved to `src/helpers.ts` to allow unit tests without `vscode` runtime

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

    

export function deactivate() {
    void cleanupBrowser();
}
