import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import readline from 'node:readline/promises';

const projectRoot = process.cwd();
const packageJsonPath = path.join(projectRoot, 'package.json');
const releaseTypes = ['patch', 'minor', 'major'] as const;
const isDryRun = process.argv.includes('--dry-run');

main().catch(error => {
    console.error(`release-crx: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
});

async function main() {
    assertCleanWorktree();

    const packageJson = readPackageJson();
    const currentVersion = packageJson.version;
    const releaseType = await promptReleaseType(currentVersion);
    const nextVersion = bumpVersion(currentVersion, releaseType);

    packageJson.version = nextVersion;
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 4)}\n`);

    run('bun', ['run', 'build:crx']);

    const archivePath = path.join(projectRoot, 'dist', 'crx', `akuma-crx-v${nextVersion}.zip`);
    if (!existsSync(archivePath)) {
        throw new Error(`Archive was not created: ${archivePath}`);
    }

    if (isDryRun) {
        output.write(`Prepared ${archivePath}\nDry run skipped commit.\n`);
        return;
    }

    run('git', ['add', 'package.json']);
    run('git', ['add', archivePath]);
    run('git', ['commit', '-m', `chore: prepare crx release v${nextVersion}`]);
    output.write(`Prepared ${archivePath}\n`);
}

function assertCleanWorktree() {
    const status = run('git', ['status', '--short'], { capture: true }).trim();
    if (status) {
        throw new Error('Worktree is not clean. Commit, stash, or discard changes before preparing a release.');
    }
}

async function promptReleaseType(currentVersion: string) {
    const rl = readline.createInterface({ input, output });

    try {
        output.write(`Current version: ${currentVersion}\n`);
        output.write('Choose release type:\n');
        releaseTypes.forEach((releaseType, index) => {
            output.write(`  ${index + 1}. ${releaseType} -> ${bumpVersion(currentVersion, releaseType)}\n`);
        });

        while (true) {
            const answer = (await rl.question('Selection [1-3]: ')).trim();
            const selected = releaseTypes[Number.parseInt(answer, 10) - 1];
            if (selected) {
                return selected;
            }
            output.write('Enter 1, 2, or 3.\n');
        }
    } finally {
        rl.close();
    }
}

function bumpVersion(version: string, releaseType: (typeof releaseTypes)[number]) {
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
    if (!match) {
        throw new Error(`Unsupported version format: ${version}`);
    }

    const major = Number.parseInt(match[1], 10);
    const minor = Number.parseInt(match[2], 10);
    const patch = Number.parseInt(match[3], 10);

    if (releaseType === 'major') {
        return `${major + 1}.0.0`;
    }
    if (releaseType === 'minor') {
        return `${major}.${minor + 1}.0`;
    }
    return `${major}.${minor}.${patch + 1}`;
}

function readPackageJson(): { version: string; [key: string]: unknown } {
    return JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version: string; [key: string]: unknown };
}

function run(command: string, args: string[], options: { capture?: boolean } = {}) {
    const result = execFileSync(command, args, {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: options.capture ? 'pipe' : 'inherit',
    });

    return typeof result === 'string' ? result : '';
}
