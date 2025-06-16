import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { readdir, unlink, rmdir, stat } from 'fs/promises';
import esbuild from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create out directory if it doesn't exist (VS Code expects extension files in out/ by default)
const outDir = join(__dirname, 'out');
const distDir = join(__dirname, 'dist');

[outDir, distDir].forEach(dir => {
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
});

// Clean previous builds
const cleanBuild = async () => {
    const cleanDirectory = async (directory) => {
        try {
            const files = await readdir(directory);
            await Promise.all(files.map(async (file) => {
                const curPath = join(directory, file);
                const stats = await stat(curPath);
                
                if (stats.isDirectory()) {
                    await cleanDirectory(curPath);
                    await rmdir(curPath);
                } else {
                    await unlink(curPath);
                }
            }));
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
    };

    await Promise.all([
        cleanDirectory(outDir),
        cleanDirectory(distDir)
    ]);
};

// Clean before building
cleanBuild();

// Build the extension
async function build() {
    try {
        // First, compile TypeScript to JavaScript
        await esbuild.build({
            entryPoints: [join(__dirname, 'src/extension.ts')],
            bundle: true,
            outfile: join(outDir, 'extension.js'),
            platform: 'node',
            format: 'cjs',
            sourcemap: true,
            target: 'es2020',
            // VS Code provides the 'vscode' module at runtime
            external: ['vscode'],
        });

        // Copy package.json to out directory with necessary modifications
        const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8'));
        
        // Clean up package.json for distribution
        delete packageJson.devDependencies;
        delete packageJson.scripts;
        
        // Ensure main points to the correct file
        packageJson.main = './extension.js';
        
        // Add all production dependencies to the bundle
        const prodDependencies = {};
        if (packageJson.dependencies) {
            for (const [dep, version] of Object.entries(packageJson.dependencies)) {
                if (!['vscode'].includes(dep)) {
                    prodDependencies[dep] = version;
                }
            }
        }
        packageJson.dependencies = prodDependencies;
        
        // Write the cleaned package.json to out directory
        writeFileSync(
            join(outDir, 'package.json'),
            JSON.stringify(packageJson, null, 2)
        );
        
        // Also copy to dist for reference
        writeFileSync(
            join(distDir, 'package.json'),
            JSON.stringify(packageJson, null, 2)
        );
        
        console.log('Production dependencies included in bundle:', Object.keys(prodDependencies).join(', '));

        // Copy additional files to dist
        const filesToCopy = [
            'README.md',
            'CHANGELOG.md',
            'LICENSE'
        ];

        for (const file of filesToCopy) {
            const src = join(__dirname, file);
            const dest = join(distDir, file);
            
            if (existsSync(src)) {
                if (file.endsWith('/')) {
                    // Create directory
                    if (!existsSync(dest)) {
                        mkdirSync(dest, { recursive: true });
                    }
                    // Copy directory contents
                    execSync(`xcopy "${src}" "${dest}\\" /E /I /Y`);
                } else {
                    // Copy file
                    copyFileSync(src, dest);
                }
            }
        }

        console.log('Build completed successfully!');
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

// Run the build
build().catch(console.error);
