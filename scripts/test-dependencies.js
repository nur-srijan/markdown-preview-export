#!/usr/bin/env node

/**
 * Dependency Compatibility Test Script
 * 
 * This script tests critical dependencies to ensure they work correctly
 * after version updates, particularly focusing on Puppeteer compatibility.
 */

const puppeteer = require('puppeteer');
const { marked } = require('marked');
const hljs = require('highlight.js');
const katex = require('katex');
const fs = require('fs');
const path = require('path');

async function testPuppeteerCompatibility() {
  console.log('\n🎭 Testing Puppeteer Compatibility...');
  console.log(`Puppeteer version: ${require('puppeteer/package.json').version}`);
  
  let browser = null;
  let page = null;
  
  try {
    // Test browser launch with extension's exact configuration
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('✓ Browser launched successfully');
    
    // Test browser version and process methods
    const version = await browser.version();
    console.log(`✓ Browser version: ${version}`);
    
    const process = browser.process();
    if (!process || process.killed) {
      throw new Error('Browser process is not available or killed');
    }
    console.log('✓ Browser process is healthy');
    
    // Test page creation and content setting
    page = await browser.newPage();
    console.log('✓ Page created successfully');
    
    // Test setting timeout (used in extension)
    page.setDefaultNavigationTimeout(30000);
    console.log('✓ Navigation timeout set successfully');
    
    // Test HTML content setting with external resources (mirrors extension usage)
    const testHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Dependency Test</title>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github-dark.min.css">
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
      </head>
      <body>
          <h1>Test Document</h1>
          <p>Testing <strong>markdown</strong> rendering with dependencies.</p>
          <pre><code class="javascript">console.log('test');</code></pre>
      </body>
      </html>
    `;
    
    await page.setContent(testHtml, { waitUntil: 'domcontentloaded' });
    console.log('✓ HTML content set with external resources');
    
    // Test network idle waiting (used in extension, should handle timeout gracefully)
    try {
      await page.waitForNetworkIdle({ timeout: 2000 });
      console.log('✓ Network idle completed');
    } catch (e) {
      console.log('✓ Network idle timeout handled gracefully (expected behavior)');
    }
    
    // Test PDF generation with exact extension options
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      preferCSSPageSize: true
    });
    
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('PDF generation failed - empty buffer');
    }
    console.log(`✓ PDF generated successfully (${pdfBuffer.length} bytes)`);
    
    // Test page closing and browser cleanup
    await page.close();
    console.log('✓ Page closed successfully');
    
    await browser.close();
    console.log('✓ Browser closed successfully');
    
    console.log('🎉 Puppeteer compatibility test PASSED');
    return true;
    
  } catch (error) {
    console.error('💥 Puppeteer compatibility test FAILED:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  } finally {
    // Cleanup in case of errors
    try {
      if (page && !page.isClosed()) await page.close();
      if (browser) await browser.close();
    } catch (e) {
      console.error('Cleanup error:', e.message);
    }
  }
}

async function testOtherDependencies() {
  console.log('\n📦 Testing Other Dependencies...');
  
  try {
    // Test marked
    console.log(`Marked version: ${require('marked/package.json').version}`);
    const testMarkdown = '# Test Heading\n\n```javascript\nconsole.log("test");\n```\n\nThis is **bold** text.';
    const html = marked.parse(testMarkdown);
    
    if (!html.includes('<h1>') || !html.includes('<code>') || !html.includes('<strong>')) {
      throw new Error('Marked parsing failed');
    }
    console.log('✓ Marked markdown parsing works');
    
    // Test highlight.js
    console.log(`Highlight.js version: ${require('highlight.js/package.json').version}`);
    const highlightResult = hljs.highlight('console.log("test");', { language: 'javascript' });
    
    if (!highlightResult.value) {
      throw new Error('Highlight.js highlighting failed');
    }
    console.log('✓ Highlight.js syntax highlighting works');
    
    // Test KaTeX
    console.log(`KaTeX version: ${require('katex/package.json').version}`);
    const mathHtml = katex.renderToString('E = mc^2', { throwOnError: false });
    
    if (!mathHtml.includes('katex')) {
      throw new Error('KaTeX rendering failed');
    }
    console.log('✓ KaTeX math rendering works');
    
    console.log('🎉 Other dependencies compatibility test PASSED');
    return true;
    
  } catch (error) {
    console.error('💥 Other dependencies test FAILED:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Dependency Compatibility Tests...');
  console.log('=' * 50);
  
  const results = await Promise.all([
    testPuppeteerCompatibility(),
    testOtherDependencies()
  ]);
  
  const allPassed = results.every(result => result === true);
  
  console.log('\n' + '=' * 50);
  console.log('📊 Test Summary:');
  console.log(`Puppeteer compatibility: ${results[0] ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Other dependencies: ${results[1] ? '✅ PASS' : '❌ FAIL'}`);
  
  if (allPassed) {
    console.log('\n🎉 All dependency compatibility tests PASSED!');
    console.log('The dependency updates are safe to proceed.');
    process.exit(0);
  } else {
    console.log('\n💥 Some dependency compatibility tests FAILED!');
    console.log('⚠️  Review the dependency updates before merging.');
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

if (require.main === module) {
  main();
}