import * as assert from 'assert';
import * as hljs from 'highlight.js';
import { getChromeExecutableCandidates, getHtmlForWebview } from '../../helpers';

suite('Helpers Extra Tests', () => {

    suite('renderer code fallback', () => {
        test('falls back to raw code when highlight throws', () => {
            const markdown = "```js\nconsole.log('x');\n```";
            const runtime = {
                hljs: {
                    getLanguage: () => true,
                    highlight: () => { throw new Error('boom'); }
                }
            };
            const html = getHtmlForWebview(markdown, false, undefined, runtime as any);
            assert.ok(html.includes("console.log('x');"));
            assert.strictEqual(html.includes('hljs'), false);
        });
    });

    suite('getChromeExecutableCandidates extra', () => {
        const originalPlatform = process.platform;
        const originalEnv = { ...process.env };

        teardown(() => {
            Object.defineProperty(process, 'platform', {
                value: originalPlatform
            });
            process.env = { ...originalEnv };
        });

        test('returns env paths only for unknown platform', () => {
            Object.defineProperty(process, 'platform', { value: 'sunos' });
            process.env.PUPPETEER_EXECUTABLE_PATH = '/env/one';
            process.env.CHROME_PATH = '/env/two';
            const candidates = getChromeExecutableCandidates();
            assert.deepStrictEqual(candidates, ['/env/one', '/env/two']);
        });
    });
});
