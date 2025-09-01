# Testing Guide

This document explains the testing setup for the Markdown Rich Preview & Export extension.

## Test Structure

### Unit Tests (`src/test/suite/extension.test.ts`)
- Extension activation and command registration tests
- VS Code integration tests

### Dependency Compatibility Tests (`src/test/suite/extension.test.ts`)
- Puppeteer API compatibility tests
- Browser launch and PDF generation tests
- Network resource handling tests

### Standalone Dependency Tests (`scripts/test-dependencies.js`)
- Comprehensive Puppeteer compatibility testing
- Tests for marked, highlight.js, and KaTeX
- Can be run independently of VS Code environment

## Running Tests

### Local Testing
```bash
# Run all tests
npm test

# Run only dependency compatibility tests
npm run test:dependencies

# Compile and run linting before tests
npm run pretest
```

### CI Testing
Tests automatically run on:
- Every push to main/master branches
- Every pull request
- Weekly schedule (Monday 2 AM UTC)
- When package.json or package-lock.json changes

## Dependency Update Testing

When dependencies are updated (especially via Dependabot), the CI system automatically:

1. **Compatibility Testing**: Tests critical APIs used by the extension
2. **Security Auditing**: Runs `npm audit` to check for vulnerabilities
3. **Compilation Testing**: Ensures the extension still compiles
4. **Integration Testing**: Runs full test suite with updated dependencies
5. **VS Code Compatibility**: Tests against multiple VS Code versions

### Puppeteer-Specific Tests

Since Puppeteer is critical for PDF export functionality, we have comprehensive tests for:
- Browser launching with extension's exact configuration
- Page creation and content setting
- PDF generation with all extension options
- Network resource loading and timeout handling
- Browser process management and cleanup

## Auto-merge Policy

- **Patch and minor updates**: Auto-merged after CI passes
- **Major updates**: Require manual review due to potential breaking changes
- **Security updates**: Prioritized and flagged for immediate attention

## Troubleshooting

### Common Issues

1. **Puppeteer fails to launch**: Usually due to missing system dependencies
   - Solution: Ensure Chrome/Chromium is available in CI environment
   - Our CI uses `--no-sandbox` flags for containerized environments

2. **VS Code tests fail**: May be due to display/GUI requirements
   - Solution: Use `xvfb` for headless testing (included in CI)

3. **Network timeouts**: External resources may be slow to load
   - Solution: Tests handle network timeouts gracefully (expected behavior)

### Running Tests in Different Environments

#### GitHub Actions
Tests run automatically in Ubuntu with Node.js 18 and 20, against stable and insiders VS Code versions.

#### Local Development
Ensure you have:
- Node.js 18+ installed
- Chrome or Chromium available for Puppeteer
- VS Code for integration tests

## Test Coverage

Current test coverage includes:
- ✅ Extension activation and command registration
- ✅ Puppeteer browser management and PDF generation
- ✅ Markdown parsing with marked
- ✅ Syntax highlighting with highlight.js
- ✅ Math rendering with KaTeX
- ✅ External resource loading
- ✅ Error handling and cleanup

## Adding New Tests

When adding new dependencies or features:

1. Add unit tests to `src/test/suite/extension.test.ts`
2. Add compatibility tests to `scripts/test-dependencies.js`
3. Update this documentation
4. Ensure tests cover critical functionality paths