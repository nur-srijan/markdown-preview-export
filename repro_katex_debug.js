const { Marked } = require('marked');
const markedKatex = require('marked-katex-extension');
const sanitizeHtml = require('sanitize-html');

const marked = new Marked();

marked.use(markedKatex({
    throwOnError: false,
    nonStandard: true,
    output: 'html',
    block: true
}));

// Test cases matching user report
const testCases = [
    {
        name: "Inline Math (Classic)",
        markdown: "Inline math: $E = mc^2$"
    },
    {
        name: "Block Math (Strict)",
        markdown: `
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$
`
    },
    {
        name: "Block Math (Preceded by text, no blank line)",
        markdown: `Block math:
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$`
    },
    {
        name: "Block Math (Same line)",
        markdown: "Block math: $$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$"
    }
];

testCases.forEach(test => {
    console.log(`\n--- Test: ${test.name} ---`);
    const html = marked.parse(test.markdown);

    // Check if it rendered as HTML (contains class="katex") or stayed as raw text ($$)
    const isRendered = html.includes('class="katex"') || html.includes('<math');
    console.log(`Rendered properly? ${isRendered ? 'YES' : 'NO'}`);
    console.log('Snippet:', html.substring(0, 150).replace(/\n/g, '\\n'));

    const sanitized = sanitizeHtml(html, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat([
            'math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'sub', 'sup', 'annotation',
            'svg', 'path', 'rect', 'span', 'style', 'link', 'div', 'button', 'use', 'img'
        ]),
        allowedAttributes: {
            ...sanitizeHtml.defaults.allowedAttributes,
            '*': ['style', 'class', 'id', 'title', 'aria-hidden', 'data-copy-text', 'onclick']
        },
        allowVulnerableTags: true
    });

    // Check sanitization
    const isSanitizedValuesValid = sanitized.includes('class="katex"');
    console.log(`Survived Sanitization? ${isSanitizedValuesValid ? 'YES' : 'NO'}`);
});
