const sanitizeHtml = require('sanitize-html');

const inputLower = '<svg preserveaspectratio="xMinYMin slice"></svg>';
const inputCamel = '<svg preserveAspectRatio="xMinYMin slice"></svg>';

const config = {
    allowedTags: ['svg'],
    allowedAttributes: {
        'svg': ['preserveAspectRatio'] // configured as camelCase
    },
    parser: {
        lowerCaseTags: false,
        lowerCaseAttributeNames: false // TRY THIS
    }
};

const outputLower = sanitizeHtml(inputLower, config);
const outputCamel = sanitizeHtml(inputCamel, config);

console.log('Input Camel:', inputCamel);
console.log('Output Camel:', outputCamel);
console.log('Match?', inputCamel === outputCamel);

if (outputCamel.includes('preserveaspectratio')) {
    console.log('FAIL: Attribute was lowercased!');
}
