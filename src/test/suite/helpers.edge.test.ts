import * as assert from 'assert';
import { getHtmlForWebview } from '../../helpers';

suite('Helpers Edge Tests', () => {

    suite('marked parse resilience', () => {
        test('throws when marked.parse fails via runtime injection', () => {
            const runtime = { marked: { use: () => {}, setOptions: () => {}, parse: () => { throw new Error('katex parse fail'); } } };
            assert.throws(() => getHtmlForWebview('Inline math: $E=mc^2$', false, undefined, runtime as any), /katex parse fail/);
        });
    });

    suite('twemoji variations', () => {
        test('accepts twemoji returning unchanged string via runtime injection', () => {
            const runtime = { twemoji: { parse: (text: string) => text } };
            const html = getHtmlForWebview('Hello 😄', true, undefined, runtime as any);
            assert.ok(html.includes('Hello 😄'));
            assert.strictEqual(html.includes('<img class="emoji"'), false);
        });

        test('uses provided base when twemoji returns img via runtime injection', () => {
            const runtime = { twemoji: { parse: () => '<img class="emoji" src="https://cdn.example/1f604.svg">' } };
            const html = getHtmlForWebview('Hello 😄', true, undefined, runtime as any);
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
