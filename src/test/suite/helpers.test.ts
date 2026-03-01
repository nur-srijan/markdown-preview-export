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
            assert.ok(html.includes('id="hello"'), 'Should have heading ID');
            assert.ok(html.includes('Hello'), 'Should include heading text');
            assert.ok(html.includes('<strong>bold</strong>'));
        });

        test('should include KaTeX for math expressions', () => {
            const markdown = 'Inline math: $E=mc^2$';
            const html = getHtmlForWebview(markdown);
            assert.ok(html.includes('katex'));
            assert.ok(html.includes('katex') || html.includes('<math'));
        });

        test('should highlight code blocks using highlight.js', () => {
            const markdown = "```js\nconsole.log('hello');\n```";
            const html = getHtmlForWebview(markdown);
            assert.ok(html.includes('<code class="hljs language-js">'));
            assert.ok(html.includes('<span class="hljs-variable language_">console</span>'));
        });

        test('should use local vendor assets when assetBase is provided', () => {
            const assetBase = 'file:///path/to/assets';
            const html = getHtmlForWebview('# Hello', false, assetBase);
            assert.ok(html.includes('href="file:///path/to/assets/highlight/styles/github-dark.min.css"'));
            assert.ok(html.includes('href="file:///path/to/assets/katex/katex.min.css"'));
        });

        test('should use CDN assets when assetBase is not provided', () => {
            const html = getHtmlForWebview('# Hello', false);
            assert.ok(html.includes('href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github-dark.min.css"'));
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

        test('should parse GitHub-style alerts', () => {
            const markdown = '> [!TIP]\n> This is a tip';
            const html = getHtmlForWebview(markdown);
            assert.ok(html.includes('class="markdown-alert markdown-alert-tip"'), 'Should have alert classes');
            assert.ok(html.includes('class="markdown-alert-title"'), 'Should have alert title class');
            assert.ok(html.includes('svg'), 'Should include SVG icon');
            assert.ok(html.includes('Tip'), 'Should include alert title text');
            assert.ok(html.includes('This is a tip'), 'Should include alert content');
        });

        test('should parse footnotes', () => {
            const markdown = 'Text with footnote[^1]\n\n[^1]: Footnote content';
            const html = getHtmlForWebview(markdown);
            assert.ok(html.includes('<sup'), 'Should have sup tag for reference');
            assert.ok(html.includes('class="footnotes"'), 'Should have footnotes section');
            assert.ok(html.includes('Footnote content'), 'Should include footnote text');
        });

        test('should parse front matter', () => {
        test('should parse front matter into a table', () => {
            const markdown = '---\ntitle: My Page\nauthor: Jules\ntags: [testing, improve]\n---\n# Content';
            const html = getHtmlForWebview(markdown);
            
            // Check table structure
            assert.ok(html.includes('<div class="front-matter">'), 'Should have front-matter div');
            assert.ok(html.includes('<div class="front-matter-title">Front Matter</div>'), 'Should have title');
            assert.ok(html.includes('<table>'), 'Should have table');
            
            // Check key-value pairs
            assert.ok(html.includes('<td><strong>title</strong></td><td>My Page</td>'), 'Should have title row');
            assert.ok(html.includes('<td><strong>author</strong></td><td>Jules</td>'), 'Should have author row');
            
            // Check array value joining
            assert.ok(html.includes('<td><strong>tags</strong></td><td>testing, improve</td>'), 'Should join array values with comma');
            
            // Check content is still there
            assert.ok(html.includes('id="content"'), 'Should include heading ID');
            assert.ok(html.includes('Content'), 'Should include content');
            
            // Check front matter block is removed from the body content (it shouldn't appear as raw text)
            // We search for the raw block in the HTML
            assert.strictEqual(html.includes('---\ntitle: My Page'), false, 'Raw front matter block should be removed');
        });

        test('should handle non-string scalar values in front matter', () => {
            const markdown = '---\nversion: 1.2\npublished: true\n---\n# Content';
            const html = getHtmlForWebview(markdown);
            assert.ok(html.includes('<td><strong>version</strong></td><td>1.2</td>'), 'Should handle numbers');
            assert.ok(html.includes('<td><strong>published</strong></td><td>true</td>'), 'Should handle booleans');
        });

        test('should handle invalid YAML in front matter gracefully', () => {
            const markdown = '---\nkey: : invalid\n---\n# Content';
            const html = getHtmlForWebview(markdown);
            // If YAML parsing fails, frontMatterTable stays empty
            assert.strictEqual(html.includes('class="front-matter"'), false, 'Should not have front matter table on invalid YAML');
            // But content should still be rendered (it will include the original block as per code)
            assert.ok(html.includes('key: : invalid'), 'Original content should be preserved if parsing fails');
        });

        test('should generate heading IDs', () => {
            const markdown = '# My Heading';
            const html = getHtmlForWebview(markdown);
            assert.ok(html.includes('id="my-heading"'), 'Should have heading ID');
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

        test('should encode paths with spaces correctly', () => {
            const workspaceRoot = '/path/with spaces';
            const html = getHtmlForWebview('![Image](/img.png)', false, undefined, undefined, workspaceRoot);
            // On Unix, it should be file:///path/with%20spaces/img.png
            assert.ok(html.includes('src="file:///path/with%20spaces/img.png"'));
        });
    });
});
});