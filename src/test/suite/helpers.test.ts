import * as assert from 'assert';
import { afterEach } from 'mocha';
import { getChromeExecutableCandidates, getHtmlForWebview } from '../../helpers';

suite('Helpers Test Suite', () => {

    suite('getChromeExecutableCandidates', () => {
        const originalPlatform = process.platform;
        const originalEnv = { ...process.env };

        afterEach(() => {
            Object.defineProperty(process, 'platform', {
                value: originalPlatform
            });
            process.env = { ...originalEnv };
        });

        test('should return correct candidates for Linux', () => {
            Object.defineProperty(process, 'platform', { value: 'linux' });
            const candidates = getChromeExecutableCandidates();
            assert.ok(candidates.includes('/usr/bin/google-chrome-stable'));
            assert.ok(candidates.includes('/usr/bin/chromium-browser'));
        });

        test('should return correct candidates for macOS (darwin)', () => {
            Object.defineProperty(process, 'platform', { value: 'darwin' });
            const candidates = getChromeExecutableCandidates();
            assert.ok(candidates.includes('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'));
        });

        test('should return correct candidates for Windows (win32)', () => {
            Object.defineProperty(process, 'platform', { value: 'win32' });
            const candidates = getChromeExecutableCandidates();
            assert.ok(candidates.includes('C:/Program Files/Google/Chrome/Application/chrome.exe'));
        });

        test('should include environment variables at the start', () => {
            process.env.PUPPETEER_EXECUTABLE_PATH = '/env/puppeteer/chrome';
            process.env.CHROME_PATH = '/env/chrome/path';
            const candidates = getChromeExecutableCandidates();
            assert.strictEqual(candidates[0], '/env/puppeteer/chrome');
            assert.strictEqual(candidates[1], '/env/chrome/path');
        });

        test('should deduplicate paths from env and platform lists', () => {
            Object.defineProperty(process, 'platform', { value: 'linux' });
            process.env.CHROME_PATH = '/usr/bin/google-chrome';
            const candidates = getChromeExecutableCandidates();
            const count = candidates.filter(p => p === '/usr/bin/google-chrome').length;
            assert.strictEqual(count, 1, 'Path should only appear once');
        });
    });

    suite('getHtmlForWebview', () => {
        test('should convert basic Markdown to HTML', () => {
            const markdown = '# Hello\n\nThis is **bold** text.';
            const html = getHtmlForWebview(markdown);
            assert.ok(html.includes('<h1>Hello</h1>'));
            assert.ok(html.includes('<strong>bold</strong>'));
        });

        test('should include KaTeX for math expressions', () => {
            const markdown = 'Inline math: $E=mc^2$';
            const html = getHtmlForWebview(markdown);
            assert.ok(html.includes('class="katex"'));
            assert.ok(html.includes('E=mc^2'));
        });

        test('should highlight code blocks using highlight.js', () => {
            const markdown = "```js\nconsole.log('hello');\n```";
            const html = getHtmlForWebview(markdown);
            assert.ok(html.includes('<code class="hljs language-js">'));
            assert.ok(html.includes('<span class="hljs-variable language_">console</span>'));
        });

        test('should use local vendor assets when assetBase is provided', () => {
            const markdown = 'test';
            const assetBase = 'vscode-resource:/path/to/assets/vendor';
            const html = getHtmlForWebview(markdown, false, assetBase);
            assert.ok(html.includes('src="vscode-resource:/path/to/assets/vendor/highlight/highlight.min.js"'));
            assert.ok(html.includes('href="vscode-resource:/path/to/assets/vendor/katex/katex.min.css"'));
        });

        test('should use CDN assets when assetBase is not provided', () => {
            const markdown = 'test';
            const html = getHtmlForWebview(markdown, false, undefined);
            assert.ok(html.includes('src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js"'));
            assert.ok(html.includes('href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"'));
        });

        test('should parse twemoji when isForPdf is true', () => {
            const markdown = 'Hello ☺️';
            const html = getHtmlForWebview(markdown, true);
            assert.ok(html.includes('<img class="emoji"'));
            assert.ok(html.includes('https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/263a.svg'));
        });

        test('should NOT parse twemoji when isForPdf is false', () => {
            const markdown = 'Hello ☺️';
            const html = getHtmlForWebview(markdown, false);
            assert.strictEqual(html.includes('<img class="emoji"'), false);
        });
    });

    suite('Image Path Resolution', () => {
        const workspaceRoot = '/path/to/workspace';
        const documentPath = '/path/to/workspace/docs/readme.md';

        test('should resolve root-relative paths relative to workspace root', () => {
            const markdown = '![alt](/images/test.png)';
            const html = getHtmlForWebview(markdown, false, undefined, documentPath, workspaceRoot);
            assert.ok(html.includes('src="file:///path/to/workspace/images/test.png"'));
        });

        test('should resolve relative paths relative to document directory', () => {
            const markdown = '![alt](images/test.png)';
            const html = getHtmlForWebview(markdown, false, undefined, documentPath, workspaceRoot);
            assert.ok(html.includes('src="file:///path/to/workspace/docs/images/test.png"'));
        });

        test('should use imageResolver if provided', () => {
            const markdown = '![alt](/images/test.png)';
            const imageResolver = (href: string) => `webview-uri://${href}`;
            const html = getHtmlForWebview(markdown, false, undefined, documentPath, workspaceRoot, imageResolver);
            assert.ok(html.includes('src="webview-uri:///path/to/workspace/images/test.png"'));
        });

        test('should not change external URLs', () => {
            const markdown = '![alt](https://example.com/test.png)';
            const html = getHtmlForWebview(markdown, false, undefined, documentPath, workspaceRoot);
            assert.ok(html.includes('src="https://example.com/test.png"'));
        });
    });
});