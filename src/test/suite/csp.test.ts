
import * as assert from 'assert';
import { getHtmlForWebview } from '../../helpers';

suite('CSP Test Suite', () => {
    test('should include a CSP meta tag with nonce', () => {
        const html = getHtmlForWebview('test', false, undefined, 'vscode-resource:');
        assert.ok(html.includes('<meta http-equiv="Content-Security-Policy"'), 'CSP meta tag missing');
        assert.ok(html.includes('nonce-'), 'Nonce missing in CSP');
    });

    test('should not use inline event handlers', () => {
        const html = getHtmlForWebview('```\ncode\n```');
        assert.ok(!html.includes('onclick='), 'Inline onclick handler found');
    });

    test('should allow cdn in csp if no assetBase', () => {
        const html = getHtmlForWebview('test', false, undefined, 'vscode-resource:');
        assert.ok(html.includes('https://cdnjs.cloudflare.com'), 'CDN link missing');
    });

    test('should allow provided cspSource', () => {
        const html = getHtmlForWebview('test', false, undefined, 'vscode-webview-resource:');
        // Check content of meta tag
        const match = html.match(/style-src ([^;]+);/);
        assert.ok(match, 'style-src not found');
        assert.ok(match[1].includes('vscode-webview-resource:'), 'cspSource missing in style-src');
    });
});
