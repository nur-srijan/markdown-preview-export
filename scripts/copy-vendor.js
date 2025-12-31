const fs = require('fs');
const path = require('path');

function copyFileSync(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(srcDir, destDir, filterFn) {
  if (!fs.existsSync(srcDir)) {
    return;
  }
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, filterFn);
    } else if (!filterFn || filterFn(srcPath)) {
      copyFileSync(srcPath, destPath);
    }
  }
}

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'assets', 'vendor');

console.log('Copying vendor assets to', out);

// Whitelist minimal assets we actually use:
// - highlight.js: github-dark.min.css + highlight.min.js (if available)
// - KaTeX: katex.min.css + fonts/
try {
  const hljsPkg = require.resolve('highlight.js');
  const hljsDir = path.dirname(hljsPkg);
  // copy single theme
  const themeSrc = path.join(hljsDir, '..', 'styles', 'github-dark.min.css');
  const lightThemeSrc = path.join(hljsDir, '..', 'styles', 'github.min.css');
  if (fs.existsSync(themeSrc)) {
    copyFileSync(themeSrc, path.join(out, 'highlight', 'styles', 'github-dark.min.css'));
  }
  if (fs.existsSync(lightThemeSrc)) {
    copyFileSync(lightThemeSrc, path.join(out, 'highlight', 'styles', 'github.min.css'));
  }
  // try to find a minified bundle or fallback to lib/index.js
  const possibleMin = path.join(hljsDir, '..', 'build', 'highlight.min.js');
  const libIndex = path.join(hljsDir, '..', 'lib', 'index.js');
  if (fs.existsSync(possibleMin)) {
    copyFileSync(possibleMin, path.join(out, 'highlight', 'highlight.min.js'));
  } else if (fs.existsSync(libIndex)) {
    copyFileSync(libIndex, path.join(out, 'highlight', 'highlight.min.js'));
  }
} catch (e) {
  console.warn('highlight.js not found, skipping copy');
}

// KaTeX CSS and fonts (minimal)
try {
  const katexPkg = require.resolve('katex');
  const katexDir = path.dirname(katexPkg);
  const katexCss = path.join(katexDir, '..', 'dist', 'katex.min.css');
  if (fs.existsSync(katexCss)) {
    copyFileSync(katexCss, path.join(out, 'katex', 'katex.min.css'));
  }
  const katexFonts = path.join(katexDir, '..', 'dist', 'fonts');
  if (fs.existsSync(katexFonts)) {
    copyDir(katexFonts, path.join(out, 'katex', 'fonts'));
  }
} catch (e) {
  console.warn('katex not found, skipping copy');
}

console.log('Vendor copy complete');

process.exit(0);
