import { spawnSync } from 'node:child_process';
import {
    copyFileSync,
    lstatSync,
    mkdtempSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const projectRoot = process.cwd();
const extensionDir = path.join(projectRoot, 'extension');
const compiledDir = path.join(projectRoot, '.build', 'extension');
const distDir = path.join(projectRoot, 'dist', 'crx');
const unpackedDir = path.join(distDir, 'unpacked');
const stagingDir = mkdtempSync(path.join(tmpdir(), 'akuma-crx-build-'));
const manifestBasePath = path.join(extensionDir, 'manifest.base.json');
const manifestOverridePath = path.join(extensionDir, 'manifest.crx.json');
const { version } = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8')) as {
    version: string;
};
const outputZip = path.join(distDir, `akuma-crx-v${version}.zip`);
const apiBaseUrl = process.env.AKUMA_CRX_API_BASE_URL || 'https://akuma.sessatakuma.dev';
const appUrl = process.env.AKUMA_CRX_APP_URL || apiBaseUrl;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

function isRecordObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && value.constructor === Object;
}

function mergeManifestEntries(
    base: Readonly<Record<string, unknown>>,
    override: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
    const merged = { ...base };

    for (const [key, value] of Object.entries(override)) {
        if (value === null) {
            Reflect.deleteProperty(merged, key);
            continue;
        }

        const baseValue = merged[key];
        if (isRecordObject(value) && isRecordObject(baseValue)) {
            merged[key] = mergeManifestEntries(baseValue, value);
            continue;
        }

        merged[key] = value;
    }

    return merged;
}

function copyTree(
    sourceDir: string,
    targetDir: string,
    shouldCopy: (sourcePath: string, isDirectory: boolean) => boolean,
) {
    mkdirSync(targetDir, { recursive: true });

    for (const entryName of readdirSync(sourceDir)) {
        const sourcePath = path.join(sourceDir, entryName);
        const targetPath = path.join(targetDir, entryName);
        const isDirectory = lstatSync(sourcePath).isDirectory();

        if (!shouldCopy(sourcePath, isDirectory)) {
            continue;
        }

        if (isDirectory) {
            copyTree(sourcePath, targetPath, shouldCopy);
            continue;
        }

        mkdirSync(path.dirname(targetPath), { recursive: true });
        copyFileSync(sourcePath, targetPath);
    }
}

function shouldCopyStaticExtensionPath(sourcePath: string, isDirectory: boolean) {
    if (isDirectory) {
        return true;
    }

    const basename = path.basename(sourcePath);
    return !sourcePath.endsWith('.ts') && !sourcePath.endsWith('.d.ts') && !basename.startsWith('manifest.');
}

function shouldCopyCompiledPath(sourcePath: string, isDirectory: boolean) {
    return isDirectory || sourcePath.endsWith('.js');
}

function writeManifest(outputPath: string) {
    const baseManifest = JSON.parse(readFileSync(manifestBasePath, 'utf8')) as Record<string, unknown>;
    const targetManifest = JSON.parse(readFileSync(manifestOverridePath, 'utf8')) as Record<string, unknown>;
    const manifest = mergeManifestEntries(baseManifest, targetManifest);
    manifest.version = version;

    writeFileSync(outputPath, `${JSON.stringify(manifest, undefined, 4)}\n`);
}

function writeRuntimeConfig(outputPath: string) {
    writeFileSync(
        outputPath,
        [
            '(function registerAkumaExtensionConfig(globalScope) {',
            '    const runtimeScope = globalScope;',
            '    runtimeScope.AKUMA_EXTENSION ??= {};',
            '    runtimeScope.AKUMA_EXTENSION.config = {',
            `        apiBaseUrl: ${JSON.stringify(apiBaseUrl)},`,
            `        appUrl: ${JSON.stringify(appUrl)},`,
            `        supabasePublishableKey: ${JSON.stringify(supabasePublishableKey)},`,
            `        supabaseUrl: ${JSON.stringify(supabaseUrl)},`,
            '    };',
            '})(globalThis);',
            '',
        ].join('\n'),
    );
}

try {
    mkdirSync(distDir, { recursive: true });
    rmSync(compiledDir, { recursive: true, force: true });
    rmSync(unpackedDir, { recursive: true, force: true });
    rmSync(outputZip, { force: true });
    mkdirSync(unpackedDir, { recursive: true });

    const compileResult = spawnSync('bunx', ['tsc', '-p', 'tsconfig.extension.json'], {
        cwd: projectRoot,
        stdio: 'inherit',
    });

    if (compileResult.status !== 0) {
        throw new Error('TypeScript extension build failed');
    }

    copyTree(extensionDir, stagingDir, shouldCopyStaticExtensionPath);
    copyTree(extensionDir, unpackedDir, shouldCopyStaticExtensionPath);
    copyTree(compiledDir, stagingDir, shouldCopyCompiledPath);
    copyTree(compiledDir, unpackedDir, shouldCopyCompiledPath);
    mkdirSync(path.join(stagingDir, 'assets'), { recursive: true });
    mkdirSync(path.join(unpackedDir, 'assets'), { recursive: true });
    copyFileSync(path.join(projectRoot, 'public', 'images', 'logo-64.png'), path.join(stagingDir, 'assets', 'logo-64.png'));
    copyFileSync(path.join(projectRoot, 'public', 'images', 'logo-128.png'), path.join(stagingDir, 'assets', 'logo-128.png'));
    copyFileSync(path.join(projectRoot, 'public', 'images', 'logo-64.png'), path.join(unpackedDir, 'assets', 'logo-64.png'));
    copyFileSync(path.join(projectRoot, 'public', 'images', 'logo-128.png'), path.join(unpackedDir, 'assets', 'logo-128.png'));

    writeRuntimeConfig(path.join(stagingDir, 'config.js'));
    writeRuntimeConfig(path.join(unpackedDir, 'config.js'));
    writeManifest(path.join(stagingDir, 'manifest.json'));
    writeManifest(path.join(unpackedDir, 'manifest.json'));

    const zipResult = spawnSync('zip', ['-q', '-r', outputZip, '.'], {
        cwd: stagingDir,
        stdio: 'inherit',
    });

    if (zipResult.status !== 0) {
        throw new Error('zip command failed');
    }

    process.stdout.write(`Built ${outputZip}\nUnpacked extension: ${unpackedDir}\nVersion: ${version}\n`);
} finally {
    rmSync(stagingDir, { recursive: true, force: true });
}
