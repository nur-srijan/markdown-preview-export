const { Marked } = require('marked');
const markedKatex = require('marked-katex-extension');
const sanitizeHtml = require('sanitize-html');

const markdownContent = `
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$
`;

const marked = new Marked();

marked.use(markedKatex({
    throwOnError: false,
    nonStandard: true
}));

let htmlContent = marked.parse(markdownContent);

console.log('--- BEFORE SANITIZATION ---');
console.log(htmlContent);

htmlContent = sanitizeHtml(htmlContent, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
        'math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'sub', 'sup', 'annotation',
        'svg', 'path', 'rect', 'span', 'style', 'link', 'div', 'button', 'use', 'img'
    ]),
    allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        '*': ['style', 'class', 'id', 'title', 'aria-hidden', 'data-copy-text', 'onclick'],
        'svg': ['xmlns', 'viewBox', 'fill', 'stroke', 'stroke-width', 'width', 'height'],
        'path': ['d', 'fill', 'stroke'],
        'rect': ['x', 'y', 'width', 'height', 'rx', 'ry', 'fill'],
        'img': ['src', 'alt', 'title'],
        'a': ['href', 'title', 'target']
    },
    allowedSchemes: ['http', 'https', 'ftp', 'mailto', 'tel', 'file', 'data', 'webview-uri', 'vscode-resource', 'vscode-webview-resource'],
    allowedSchemesByTag: {
        'img': ['http', 'https', 'file', 'data', 'webview-uri', 'vscode-resource', 'vscode-webview-resource']
    },
    allowProtocolRelative: false,
    parser: {
        lowerCaseTags: false,
    }
});

console.log('--- AFTER SANITIZATION ---');
console.log(htmlContent);
