// Pre-cutover verification that the active Cloudflare token has the scopes
// required by `wrangler deploy` when `routes` contains `custom_domain: true`.
// Read-only — does NOT trigger any custom_domain provisioning, so it is safe
// to run before the actual cutover.
//
// Why: PR #118's Workers Builds CI deploy failed on
//   PUT /accounts/{account_id}/workers/scripts/{name}/domains/records
// because the CI service token lacked a required scope. This script probes
// the same auth surface area with read-only GETs so maintainers can see
// what scope their token reaches before retrying cutover.

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

const CF_API = 'https://api.cloudflare.com/client/v4';

// ── Auth: prefer CLOUDFLARE_API_TOKEN env, fall back to wrangler's OAuth
// token at the XDG location wrangler writes to (`~/.config/.wrangler/config/
// default.toml`). The latter is what `wrangler login` populates.
async function resolveToken() {
    if (process.env.CLOUDFLARE_API_TOKEN) {
        return { token: process.env.CLOUDFLARE_API_TOKEN, source: 'CLOUDFLARE_API_TOKEN env' };
    }
    const wranglerConfigPath = join(homedir(), '.config', '.wrangler', 'config', 'default.toml');
    let content;
    try {
        content = readFileSync(wranglerConfigPath, 'utf8');
    } catch {
        return null;
    }
    const match = content.match(/^oauth_token\s*=\s*"([^"]+)"/m);
    if (!match) return null;
    return { token: match[1], source: `wrangler config (${wranglerConfigPath})` };
}

// ── Read the `scopes` array that wrangler persists alongside the OAuth
// token. Listing these helps the maintainer see what `wrangler whoami` would
// also show, without shelling out.
function readWranglerScopes() {
    const wranglerConfigPath = join(homedir(), '.config', '.wrangler', 'config', 'default.toml');
    let content;
    try {
        content = readFileSync(wranglerConfigPath, 'utf8');
    } catch {
        return null;
    }
    const scopesLineMatch = content.match(/^scopes\s*=\s*\[([^\]]*)\]/m);
    if (!scopesLineMatch) return null;
    return scopesLineMatch[1]
        .split(',')
        .map(s => s.trim().replace(/^"|"$/g, ''))
        .filter(Boolean);
}

// ── Strip JSONC comments + trailing commas and parse. wrangler.jsonc uses
// `//` line comments, `/* */` block comments, and trailing commas that strict
// `JSON.parse` rejects. None of those need a JSONC library; three regexes
// cover the cases this repo's `wrangler.jsonc` actually uses.
function parseJsonc(path) {
    const raw = readFileSync(path, 'utf8');
    const stripped = raw
        .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
        .replace(/^\s*\/\/.*$/gm, '') // line comments
        .replace(/,(\s*[\]}])/g, '$1'); // trailing commas before ] or }
    return JSON.parse(stripped);
}

// ── Parent zone derivation: `akuma.sessatakuma.dev` → `sessatakuma.dev`.
// Sufficient for this repo's two Custom Domain routes; doesn't try to handle
// public-suffix edge cases because the maintainer controls the hostnames.
function parentZone(hostname) {
    const labels = hostname.split('.');
    if (labels.length < 2) return hostname;
    return labels.slice(-2).join('.');
}

async function cfFetch(token, path, init) {
    const url = path.startsWith('http') ? path : `${CF_API}${path}`;
    const res = await fetch(url, {
        ...init,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...(init?.headers ?? {}),
        },
    });
    let body = null;
    try {
        body = await res.json();
    } catch {
        // tolerate non-JSON responses
    }
    return { status: res.status, body };
}

async function probeZone(token, parentDomain) {
    const r = await cfFetch(token, `/zones?name=${encodeURIComponent(parentDomain)}`);
    if (r.status !== 200 || !r.body?.success) {
        return { ok: false, status: r.status, error: r.body?.errors?.[0]?.message ?? 'unknown' };
    }
    const zones = r.body.result ?? [];
    if (zones.length === 0) {
        return {
            ok: false,
            status: r.status,
            error: 'zone not found (token cannot see this zone)',
        };
    }
    return { ok: true, status: r.status, zoneId: zones[0].id, zoneName: zones[0].name };
}

async function probeDnsRead(token, zoneId) {
    const r = await cfFetch(token, `/zones/${zoneId}/dns_records?per_page=1`);
    return {
        ok: r.status === 200 && r.body?.success === true,
        status: r.status,
        error: r.body?.errors?.[0]?.message,
    };
}

async function probeCustomDomainRecords(token, accountId, workerName) {
    // Cloudflare exposes this under two URL roots depending on Workers
    // version. Probe the script-scoped one that `wrangler deploy` uses.
    const r = await cfFetch(
        token,
        `/accounts/${accountId}/workers/scripts/${workerName}/domains/records`,
    );
    return {
        ok: r.status === 200 && r.body?.success === true,
        status: r.status,
        error: r.body?.errors?.[0]?.message,
    };
}

async function probeAccountId(token) {
    const r = await cfFetch(token, '/accounts');
    if (r.status !== 200 || !r.body?.success) return null;
    const accounts = r.body.result ?? [];
    return accounts[0]?.id ?? null;
}

function printResult(label, passed, detail) {
    const mark = passed ? '✓' : '✗';
    console.log(`  ${mark} ${label}${detail ? `  (${detail})` : ''}`);
}

async function main() {
    const wrangler = parseJsonc('wrangler.jsonc');
    const workerName = wrangler.name;
    if (!workerName) {
        console.error('✗ wrangler.jsonc missing `name`');
        process.exit(2);
    }
    const routes = Array.isArray(wrangler.routes) ? wrangler.routes : [];
    const customDomains = routes
        .filter(r => typeof r === 'object' && r.custom_domain === true)
        .map(r => r.pattern);

    if (customDomains.length === 0) {
        console.log('No `custom_domain: true` routes in wrangler.jsonc — nothing to verify.');
        return;
    }

    const authed = await resolveToken();
    if (!authed) {
        console.error(
            '✗ No Cloudflare token found. Run `npx wrangler login` or set CLOUDFLARE_API_TOKEN.',
        );
        process.exit(2);
    }
    console.log(`Auth: ${authed.source}\n`);

    const scopes = readWranglerScopes();
    if (scopes) {
        console.log(`wrangler token scopes (${scopes.length}):`);
        for (const s of scopes) console.log(`  - ${s}`);
        console.log();
    }

    const accountId = await probeAccountId(authed.token);
    printResult(
        'Account › read (required by /workers/scripts/{name}/domains/records)',
        Boolean(accountId),
        accountId ? `resolved account id ${accountId}` : '',
    );
    if (!accountId) {
        console.error('\n✗ Token cannot resolve account — cannot continue probes.');
        process.exit(1);
    }

    const cdRecordsOk = await probeCustomDomainRecords(authed.token, accountId, workerName);
    printResult(
        `Account › Workers Scripts › list custom_domain records for "${workerName}"`,
        cdRecordsOk.ok,
        cdRecordsOk.ok
            ? ''
            : `HTTP ${cdRecordsOk.status}${cdRecordsOk.error ? `: ${cdRecordsOk.error}` : ''}`,
    );

    console.log();

    for (const hostname of customDomains) {
        console.log(`Custom domain: ${hostname}`);
        const parent = parentZone(hostname);
        const zone = await probeZone(authed.token, parent);
        printResult(
            `  Zone › read (${parent})`,
            zone.ok,
            !zone.ok ? zone.error : `zone id ${zone.zoneId}`,
        );

        if (zone.ok) {
            const dns = await probeDnsRead(authed.token, zone.zoneId);
            printResult('  Zone › DNS › read', dns.ok, !dns.ok ? dns.error : '');
        }
        console.log();
    }

    console.log('Note: this script only verifies READ scope on the resources');
    console.log('`wrangler deploy` calls. WRITE scope (or the Workers Builds');
    console.log("service token's effective permissions) cannot be probed via");
    console.log('read-only API — test by either running `bun run deploy` locally');
    console.log('or retriggering Workers Builds CI.');
    console.log();
    console.log('If CI fails on `PUT .../workers/scripts/{name}/domains/records`,');
    console.log('see README → "Workers Builds token permissions" for the three');
    console.log('mitigation paths (dashboard grant / local deploy / split triggers).');
}

main().catch(err => {
    console.error(`✗ ${err?.message ?? err}`);
    process.exit(1);
});
