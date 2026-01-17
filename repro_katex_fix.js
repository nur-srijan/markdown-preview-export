const { Marked } = require('marked');
const markedKatex = require('marked-katex-extension');

const marked = new Marked();

marked.use(markedKatex({
    throwOnError: false,
    nonStandard: true,
    output: 'html'
}));

const testCases = [
    {
        name: "Block Math (Preceded by text, no blank line)",
        markdown: `Block math:
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$`
    },
    {
        name: "Block Math (Preceded by text, newline+spaces)",
        markdown: `Block math:
  
$$
E=mc^2
$$`
    }
];

// Regex to fix spacing
const fixMathSpacing = (text) => {
    // Look for $$ not preceded by a blank line (simplified)
    return text.replace(/([^\n])\n(\$\$)/g, '$1\n\n$2');
};

testCases.forEach(test => {
    console.log(`\n--- Test: ${test.name} ---`);
    const fixed = fixMathSpacing(test.markdown);
    console.log('Fixed Markdown:\n', fixed.replace(/\n/g, '\\n'));

    const html = marked.parse(fixed);
    const isRendered = html.includes('class="katex"') || html.includes('<math');
    console.log(`Rendered properly? ${isRendered ? 'YES' : 'NO'}`);
});
