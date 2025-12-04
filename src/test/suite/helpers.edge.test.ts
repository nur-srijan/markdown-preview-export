import * as assert from 'assert';
import { marked } from 'marked';
import twemoji from 'twemoji';
import { getHtmlForWebview } from '../../helpers';

suite('Helpers Edge Tests', () => {

    suite('katex resilience', () => {
        const originalParse = (marked as any).parse;

        teardown(() => {
            (marked as any).parse = originalParse;
        });

        test('throws when marked.parse fails', () => {
            (marked as any).parse = () => { throw new Error('katex parse fail'); };
            assert.throws(() => getHtmlForWebview('Inline math: $E=mc^2$', false), /katex parse fail/);
        });
    });

    suite('twemoji variations', () => {
        const originalTw = (twemoji as any).parse;

        teardown(() => {
            (twemoji as any).parse = originalTw;
        });

        test('accepts twemoji returning unchanged string', () => {
            (twemoji as any).parse = (text: string) => text;
            const html = getHtmlForWebview('Hello :smile:', true);
            assert.ok(html.includes('Hello :smile:'));
            assert.strictEqual(html.includes('<img class="emoji"'), false);
        });

        test('uses provided base when twemoji returns img', () => {
            (twemoji as any).parse = () => '<img class="emoji" src="https://cdn.example/1f604.svg">';
            const html = getHtmlForWebview('Hello :smile:', true);
            assert.ok(html.includes('https://cdn.example/1f604.svg'));
            assert.ok(html.includes('<img class="emoji"'));
        });
    });

    suite('assetBase trailing slash', () => {
        test('removes trailing slash from assetBase', () => {
            const html = getHtmlForWebview('test', false, 'vscode-resource:/path/to/assets/vendor/');
            assert.ok(html.includes('src="vscode-resource:/path/to/assets/vendor/highlight/highlight.min.js"'));
        });
    });

});
