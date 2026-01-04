import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as puppeteer from 'puppeteer-core';
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
        '--no-first-run',
        '--allow-file-access-from-files',
        '--enable-local-file-accesses'
    ];

    const errors: Array<string> = [];

    // 1) Default bundled Chromium (if available)
    try {
        return await puppeteer.launch({
            headless: true,
            args: commonArgs,
            userDataDir: path.join(os.tmpdir(), `puppeteer_user_data_default_${Date.now()}`)
        });
    } catch (error) {
        errors.push(`Default launch failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 2) Try system Chrome via channel (stable)
    try {
        return await puppeteer.launch({
            channel: 'chrome',
            headless: true,
            args: commonArgs,
            userDataDir: path.join(os.tmpdir(), `puppeteer_user_data_chrome_${Date.now()}`)
        } as any);
    } catch (error) {
        errors.push(`Channel chrome launch failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 3) Try system Chromium via channel
    try {
        return await puppeteer.launch({
            channel: 'chromium',
            headless: true,
            args: commonArgs,
            userDataDir: path.join(os.tmpdir(), `puppeteer_user_data_chromium_${Date.now()}`)
        } as any);
    } catch (error) {
        errors.push(`Channel chromium launch failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 4) Try known executable paths
    const candidates = getChromeExecutableCandidates();
    for (const executablePath of candidates) {
        try {
            // eslint-disable-next-line no-await-in-loop
            const browser = await puppeteer.launch({
                executablePath,
                headless: true,
                args: commonArgs,
                userDataDir: path.join(os.tmpdir(), `puppeteer_user_data_path_${Date.now()}`)
            });
            return browser;
        } catch (error) {
            errors.push(`Executable ${executablePath} failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // 5) Last resort: try puppeteer.executablePath() if available
    try {
        const p = (puppeteer as any).executablePath ? (puppeteer as any).executablePath() : undefined;
        if (p) {
            return await puppeteer.launch({
                executablePath: p,
                headless: true,
                args: commonArgs,
                userDataDir: path.join(os.tmpdir(), `puppeteer_user_data_${Date.now()}`)
            });
        }
    } catch (error) {
        errors.push(`executablePath() launch failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 6) Manual entry fallback
    const manualPath = await vscode.window.showInputBox({
        prompt: 'Puppeteer could not find a Chrome/Chromium executable. Please enter the absolute path to your Chrome/Chromium executable manually.',
        placeHolder: 'e.g. /Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        ignoreFocusOut: true
    });

    if (manualPath) {
        try {
            return await puppeteer.launch({
                executablePath: manualPath,
                headless: true,
                args: commonArgs,
                userDataDir: path.join(os.tmpdir(), `puppeteer_user_data_manual_${Date.now()}`)
            });
        } catch (error) {
            errors.push(`Manual path "${manualPath}" launch failed: ${error instanceof Error ? error.message : String(error)}`);
        }
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
    console.log('Markdown Rich Preview & Export: activate() started');
    try {
        console.log('Markdown Rich Preview & Export: Registering commands...');
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
                        vscode.Uri.file(path.join(context.extensionPath, 'media')),
                        vscode.Uri.file(path.join(context.extensionPath, 'assets')),
                        vscode.Uri.file(context.extensionPath), // Allow entire extension folder just in case
                        ...(vscode.workspace.workspaceFolders?.map(folder => folder.uri) || [])
                    ]
                }
            );

            // Initial update
            updateContent(panel, editor.document, context);

            // Update content when the document changes
            const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
                if (e.document.uri.toString() === editor.document.uri.toString()) {
                    updateContent(panel, e.document, context);
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
            const workspaceRoot = vscode.workspace.getWorkspaceFolder(editor.document.uri)?.uri.fsPath;
            // For exported HTML we can reference local files via file://
            const assetBaseForExport = `file://${path.join(context.extensionPath, 'assets', 'vendor')}`;
            const htmlContent = getHtmlForWebview(markdownContent, false, assetBaseForExport, editor.document.fileName, workspaceRoot);

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
            console.log('Markdown Rich Preview & Export: exportToPdf command triggered');
            const editor = vscode.window.activeTextEditor;

            if (!editor || editor.document.languageId !== 'markdown') {
                vscode.window.showErrorMessage('Please open a Markdown file first to export to PDF.');
                return;
            }

            const markdownContent = editor.document.getText();
            const workspaceRoot = vscode.workspace.getWorkspaceFolder(editor.document.uri)?.uri.fsPath;
            // Pass true for isForPdf to include PDF-specific styles
            // For PDF export we prefer absolute file URIs so Puppeteer can load local assets
            const assetBaseForExport = `file://${path.join(context.extensionPath, 'assets', 'vendor')}`;
            const htmlContent = getHtmlForWebview(markdownContent, true, assetBaseForExport, editor.document.fileName, workspaceRoot);

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

                            // Save HTML to a temporary file to allow local file access (needed for file:// images)
                            const tempHtmlPath = path.join(os.tmpdir(), `markdown_export_${Date.now()}.html`);
                            fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');

                            // Load the local file to establish file:// origin
                            await page.goto(vscode.Uri.file(tempHtmlPath).toString(), { waitUntil: 'networkidle0' });

                            // Clean up temp file
                            try {
                                fs.unlinkSync(tempHtmlPath);
                            } catch (e) {
                                console.warn('Failed to delete temp HTML file:', e);
                            }

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
        console.log('Markdown Rich Preview & Export: activate() completed successfully');
    } catch (error) {
        console.error('Markdown Rich Preview & Export: activate() failed:', error);
        vscode.window.showErrorMessage(`Failed to activate Markdown Rich Preview & Export: ${error instanceof Error ? error.message : String(error)}`);
    }
}

function updateContent(panel: vscode.WebviewPanel, document: vscode.TextDocument, context: vscode.ExtensionContext) {
    // Get the markdown content
    const markdownContent = document.getText();

    // Compute asset base for webview resources using asWebviewUri
    let assetBase;
    try {
        const vendorFolder = vscode.Uri.file(path.join(context.extensionPath, 'assets', 'vendor'));
        assetBase = panel.webview.asWebviewUri(vendorFolder).toString();
    } catch (e) {
        // fallback to undefined (CDN)
        assetBase = undefined;
    }

    // Convert markdown to HTML, preferring bundled assets for the webview
    const html = getHtmlForWebview(
        markdownContent,
        false,
        assetBase,
        document.fileName,
        vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath,
        (href) => panel.webview.asWebviewUri(vscode.Uri.file(href)).toString(),
        panel.webview.cspSource
    );

    // Update webview content
    panel.webview.html = html;
}



export function deactivate() {
    void cleanupBrowser();
}
