const sanitizeHtml = require('sanitize-html');

const katexHtml = `<span class="katex"><span class="katex-html" aria-hidden="true"><span class="base"><span class="strut" style="height:1.04em;vertical-align:-0.2397em;"></span><span class="mord sqrt"><span class="vlist-t vlist-t2"><span class="vlist-r"><span class="vlist" style="height:0.8003em;"><span class="svg-align" style="top:-3em;"><span class="pstrut" style="height:3em;"></span><span class="mord" style="padding-left:0.833em;">x</span></span><span style="top:-2.9603em;"><span class="pstrut" style="height:3em;"></span><span class="hide-tail" style="min-width:0.853em;height:1.08em;"><svg xmlns="http://www.w3.org/2000/svg" width="400em" height="1.08em" viewBox="0 0 400000 1080" preserveAspectRatio="xMinYMin slice"><path d="M95,705.5c-12.9,-0.5 -25.7,2.2 -36.9,7.6c-4.2,2.1 -8.3,4.4 -12.3,6.9c-11.7,7.2 -22.5,15.8 -32,25.6c-7.9,8.2 -14.6,17.7 -19.7,28c-5.7,11.5 -9.6,23.7 -11.5,36.4c-1.8,11.7 -1.6,23.7 0.7,35.3c2.4,12.2 6.9,23.8 13.2,34.4c9.1,15.1 22.1,27.3 37.6,35.1c11.3,5.7 23.9,8.5 36.6,8.1c13.7,-0.4 27.1,-3.9 39.1,-10.2c10.4,-5.5 19.9,-12.7 28.1,-21.5c9.1,-9.8 16.5,-21.2 21.8,-33.6c4.6,-10.7 7.7,-22 9.1,-33.5c1.1,-9.5 0.9,-19.1 -0.6,-28.6c-1.7,-10.9 -5.5,-21.2 -11,-30.5c-7.2,-12.3 -17.5,-22.4 -29.8,-29c-10.3,-5.6 -21.8,-8.5 -33.4,-8.4zM95,705.5" fill="currentColor"></path></svg></span></span></span><span class="vlist-s">​</span></span><span class="vlist-r"><span class="vlist" style="height:0.2397em;"><span></span></span></span></span></span></span></span></span>`;

const highlightHtml = `<div class="code-block"><pre><code class="hljs language-javascript"><span class="hljs-keyword">const</span> <span class="hljs-title function_">hello</span> = <span class="hljs-function">(<span class="hljs-params">name</span>) =&gt;</span> {
    <span class="hljs-variable language_">console</span>.<span class="hljs-title function_">log</span>(<span class="hljs-string">\`Hello \${name}\`</span>);
};</code></pre></div>`;

const config = {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
        'math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'sub', 'sup', 'annotation',
        'svg', 'path', 'rect', 'span', 'style', 'link', 'div', 'button', 'use', 'img'
    ]),
    allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        '*': ['style', 'class', 'id', 'title', 'aria-hidden', 'data-copy-text', 'onclick'],
        'svg': ['xmlns', 'viewBox', 'fill', 'stroke', 'stroke-width', 'width', 'height', 'preserveAspectRatio'],
        'path': ['d', 'fill', 'stroke'],
        'rect': ['x', 'y', 'width', 'height', 'rx', 'ry', 'fill'],
        'img': ['src', 'alt', 'title'],
        'a': ['href', 'title', 'target'],
        'link': ['rel', 'href', 'type']
    },
    allowedSchemes: ['http', 'https', 'ftp', 'mailto', 'tel', 'file', 'data', 'webview-uri', 'vscode-resource', 'vscode-webview-resource'],
    allowedSchemesByTag: {
        'img': ['http', 'https', 'file', 'data', 'webview-uri', 'vscode-resource', 'vscode-webview-resource'],
        'link': ['http', 'https', 'file', 'webview-uri', 'vscode-resource', 'vscode-webview-resource']
    },
    allowProtocolRelative: false,
    allowVulnerableTags: true, // Allow style tags for KaTeX
    parser: {
        lowerCaseTags: false,
    }
};

console.log('--- Testing KaTeX Sanitization ---');
const sanitizedKatex = sanitizeHtml(katexHtml, config);
// Check if class="mord sqrt" is preserved
if (sanitizedKatex.includes('mord sqrt')) {
    console.log('[PASS] KaTeX sqrt class preserved');
} else {
    console.log('[FAIL] KaTeX sqrt class removed');
}
// Check if svg path matches
if (sanitizedKatex.includes('<path d="M95')) {
    console.log('[PASS] SVG path preserved');
} else {
    console.log('[FAIL] SVG path removed');
    console.log('Cleaned output fragment:', sanitizedKatex.substring(0, 500));
}


console.log('\n--- Testing Highlight.js Sanitization ---');
const sanitizedHighlight = sanitizeHtml(highlightHtml, config);

if (sanitizedHighlight.includes('hljs-keyword')) {
    console.log('[PASS] Highlight spans preserved');
} else {
    console.log('[FAIL] Highlight spans removed');
    console.log('Cleaned output:', sanitizedHighlight);
}
