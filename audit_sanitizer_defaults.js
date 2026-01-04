const sanitizeHtml = require('sanitize-html');

// Current configuration being used (mimicked from src/helpers.ts)
const currentConfig = {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
        'math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'sub', 'sup', 'annotation', 'mtable', 'mtr', 'mtd', 'none', 'mpadded', 'mphantom', 'maligngroup', 'malignmark',
        'svg', 'path', 'rect', 'span', 'style', 'link', 'div', 'button', 'use', 'img',
        'defs', 'linearGradient', 'radialGradient', 'stop', 'clipPath', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan', 'g', 'symbol', 'marker', 'mask', 'pattern', 'foreignObject'
    ]),
    allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        '*': ['style', 'class', 'id', 'title', 'aria-hidden', 'data-copy-text', 'onclick'],
        'svg': ['xmlns', 'viewBox', 'fill', 'stroke', 'stroke-width', 'width', 'height', 'preserveAspectRatio', 'version'],
        'path': ['d', 'fill', 'stroke', 'stroke-width', 'transform'],
        'rect': ['x', 'y', 'width', 'height', 'rx', 'ry', 'fill', 'stroke', 'stroke-width'],
        'circle': ['cx', 'cy', 'r', 'fill', 'stroke', 'stroke-width'],
        'ellipse': ['cx', 'cy', 'rx', 'ry', 'fill', 'stroke', 'stroke-width'],
        'line': ['x1', 'y1', 'x2', 'y2', 'stroke', 'stroke-width'],
        'polyline': ['points', 'fill', 'stroke', 'stroke-width'],
        'polygon': ['points', 'fill', 'stroke', 'stroke-width'],
        'linearGradient': ['id', 'gradientUnits', 'x1', 'y1', 'x2', 'y2', 'gradientTransform', 'spreadMethod'],
        'radialGradient': ['id', 'gradientUnits', 'cx', 'cy', 'r', 'fx', 'fy', 'gradientTransform', 'spreadMethod'],
        'stop': ['offset', 'stop-color', 'stop-opacity'],
        'use': ['href', 'x', 'y', 'width', 'height', 'fill'],
        'text': ['x', 'y', 'dx', 'dy', 'text-anchor', 'fill', 'font-family', 'font-size', 'font-weight'],
        'tspan': ['x', 'y', 'dx', 'dy', 'fill'],
        'g': ['fill', 'stroke', 'stroke-width', 'transform', 'clip-path', 'mask', 'filter'],
        'marker': ['id', 'markerWidth', 'markerHeight', 'refX', 'refY', 'orient', 'markerUnits'],
        'mask': ['id', 'x', 'y', 'width', 'height', 'maskUnits', 'maskContentUnits'],
        'pattern': ['id', 'x', 'y', 'width', 'height', 'patternUnits', 'patternContentUnits', 'preserveAspectRatio', 'viewBox', 'patternTransform'],
        'img': ['src', 'alt', 'title', 'width', 'height'],
        'a': ['href', 'title', 'target'],
        'link': ['rel', 'href', 'type']
    },
    allowedSchemes: ['http', 'https', 'ftp', 'mailto', 'tel', 'file', 'data', 'webview-uri', 'vscode-resource', 'vscode-webview-resource'],
    allowVulnerableTags: true,
    parser: {
        lowerCaseTags: false,
        lowerCaseAttributeNames: false
    }
};

const tests = [
    {
        name: 'CamelCase SVG Tag (linearGradient)',
        input: '<svg><defs><linearGradient id="grad1"></linearGradient></defs></svg>',
        expectedSnippet: 'linearGradient'
    },
    {
        name: 'CamelCase SVG Tag (clipPath)',
        input: '<svg><clipPath id="cp1"></clipPath></svg>',
        expectedSnippet: 'clipPath'
    },
    {
        name: 'Self-closing custom tag behavior',
        input: '<path d="M10 10" />',
        expectedSnippet: 'path'
    },
    {
        name: 'Style Attribute Parsing (url)',
        input: '<div style="background-image: url(\'image.png\')"></div>',
        expectedSnippet: 'background-image'
    },
    {
        name: 'Missing MathML Tags (mtable)',
        input: '<math><mtable><mtr><mtd>1</mtd></mtr></mtable></math>',
        expectedSnippet: 'mtable'
    },
    {
        name: 'Unknown SVG attributes (e.g. gradientTransform)',
        input: '<linearGradient gradientTransform="rotate(45)"></linearGradient>',
        expectedSnippet: 'gradientTransform'
    }
];

console.log('--- Starting Sanitizer Audit ---');
let failed = false;

tests.forEach(test => {
    const output = sanitizeHtml(test.input, currentConfig);
    const passed = output.includes(test.expectedSnippet);
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${test.name}`);
    if (!passed) {
        console.log(`   Input:    ${test.input}`);
        console.log(`   Output:   ${output}`);
        console.log(`   Expected: ${test.expectedSnippet}`);
        failed = true;
    }
});

if (failed) {
    console.log('\nAudit revealed potential issues!');
    process.exit(1);
} else {
    console.log('\nAudit passed for checked cases.');
    process.exit(0);
}
