# AkuMa

A web tool for automatic Japanese furigana and accent markings to plain text, to help Japanese learners to improve their speaking and reading skills.

<img src="docs/images/demo.png" alt="AkuMa demo" />

## What It Does

- Analyzes Japanese text and renders furigana with pitch-accent markings automatically
- Lets you click the generated result to adjust furigana and accent output manually
- Supports plain-text copy, Markdown export, and image download for study notes

## How It Works

1. Paste or generate a Japanese sentence.
2. Let the app analyze and mark the text.
3. Tweak furigana or accent presentation directly in the result panel if needed.
4. Export the formatted output in the format you need.

## Quick Start (Internal Development)

Install dependencies with [bun](https://bun.com/):

```bash
bun i
```

Start the local dev server:

```bash
bun dev
```

## Local API Setup (Internal Development)

Production on Cloudflare manages the upstream API key server-side.

If you run the app locally, the Next.js route handler for `/api/mark-accent/stream`
needs an API key in `.env`:

```bash
MARK_ACCENT_API_KEY=<your_api_key>
```

`.env` is picked up on `process.env` both by `bun dev` and by `bun run preview`
(the Workers runtime), so one file covers both local modes.

## Deployment (Cloudflare Workers)

The app is deployed to **Cloudflare Workers** using the
[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) adapter.

Useful scripts:

```bash
bun run preview   # build with OpenNext + run locally on the Workers runtime
bun run deploy    # build + deploy to Cloudflare from your machine
```

### Continuous deployment (Workers Builds)

CD is handled by **Cloudflare Workers Builds** (connect this Git repo in the
Cloudflare dashboard → Workers & Pages → the `akuma` Worker → Settings → Builds):

- **Build command:** `bunx opennextjs-cloudflare build`
- **Deploy command (production):** `npx wrangler deploy --keep-vars`
- **Version command (non-production branches):** `npx wrangler versions upload`
- **Production branch:** `main` (other branches upload preview versions)

`--keep-vars` stops each deploy from wiping runtime vars/secrets set in the
dashboard, since they are not declared in `wrangler.jsonc`.

### Cloudflare routing

The `routes` block in `wrangler.jsonc` declares two production hosts as
Cloudflare Custom Domains (`custom_domain: true`):

| Host                            | Source                                    | Behaviour                                                                                                             |
| ------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `akuma.sessatakuma.dev`         | `custom_domain: true` in `wrangler.jsonc` | Production origin (Worker = sole origin). Cutover tracked in [#117](https://github.com/sessatakuma/AkuMa/issues/117). |
| `accent-marker.sessatakuma.dev` | `custom_domain: true` in `wrangler.jsonc` | Bound to the same Worker; middleware 301-redirects to `akuma.sessatakuma.dev`, preserving path + query.               |
| `akuma-cf.sessatakuma.dev`      | Ad-hoc test binding (dashboard)           | Ephemeral. To be torn down post-cutover — tracked in [#116](https://github.com/sessatakuma/AkuMa/issues/116).         |
| `*.workers.dev`                 | Cloudflare default (preview deployments)  | Workers Builds preview deployments for non-`main` branches. Auto-tagged `noindex` via middleware.                     |

`custom_domain: true` tells Cloudflare to provision the required DNS record and
managed TLS certificate automatically when the Worker is first deployed — no
manual DNS setup is required for the two in-repo hosts.

The legacy-host 301 redirect is implemented in `src/middleware.ts` (Edge
runtime) rather than a Cloudflare Redirect Rule so the routing table stays
declarative in the repo and survives across accounts/zones.

### Workers Builds token permissions

`wrangler deploy` on `main` calls `PUT /accounts/{account_id}/workers/scripts/{name}/domains/records`
to provision the Custom Domains declared in `routes`. If the Workers Builds
service token lacks the scope to call that endpoint, the deploy fails with:

```
✘ [ERROR] Some triggers failed to deploy for akuma:
    - A request to the Cloudflare API (/accounts/{id}/workers/scripts/{name}/domains/records) failed.
```

The token must permit (Cloudflare native names → OAuth scope names seen by
`wrangler whoami`):

| Required permission              | OAuth scope                                                                        | Why                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Account › Workers Scripts › Edit | `workers_scripts (write)`                                                          | Upload and trigger deploy of the Worker.                             |
| Zone › Workers Routes › Edit     | `workers_routes (write)`                                                           | Bind the Custom Domain route to the script at the zone.              |
| Zone › DNS › Edit                | (no OAuth equivalent surfaced by `wrangler whoami`; per-zone API token permission) | Auto-provision / overwrite the DNS CNAME when `custom_domain: true`. |

Verification: run `bun run check-cf-scopes` locally with a `wrangler login`
session (or `CLOUDFLARE_API_TOKEN` set). The script reads `routes` from
`wrangler.jsonc`, resolves the zone for each `custom_domain: true` entry, and
probes the Cloudflare API to confirm the current token can list existing
Custom Domain records and read the zone + DNS records. It does **not** mutate
anything — the failing PUT call is only exercised by an actual `wrangler deploy`.

Mitigation paths when CI deploy fails on `/domains/records`:

1. Grant the missing scope to the Workers Builds integration in the Cloudflare
   dashboard (Account › API Tokens, or Account › Members & Roles depending on
   how the GitHub/GitLab integration was authorised), then push a no-op commit
   on `main` (e.g. `git commit --allow-empty -m "ci: retry cutover deploy"`)
   to re-trigger Workers Builds.
2. Run `bun run deploy` locally with a `wrangler login` session that has the
   required scopes. The custom*domain records are provisioned on the first
   successful deploy; subsequent `main` CI deploys only need to \_update* the
   existing records and may succeed even under the narrower Workers Builds
   token.
3. Switch the production branch's deploy command (`npx wrangler deploy
--keep-vars`) to `npx wrangler versions upload` (code only, no triggers) and
   run `wrangler triggers deploy` separately with a verified-scoped token.

See the [Cloudflare Workers Builds documentation](https://developers.cloudflare.com/workers/ci-cd/builds/)
for dashboard-side configuration. The token-scope failure mode is also tracked
upstream at `cloudflare/workers-sdk`.

### Secrets & environment variables (Cloudflare)

Runtime (dashboard → the Worker → Settings → Variables, or `wrangler secret put`):

| Name                       | Type   | Required | Notes                                  |
| -------------------------- | ------ | -------- | -------------------------------------- |
| `MARK_ACCENT_API_KEY`      | Secret | Yes      | Upstream API key for the stream proxy. |
| `MARK_ACCENT_UPSTREAM_URL` | Var    | No       | Overrides the default upstream URL.    |

Build-time (dashboard → Settings → Builds → Build variables), inlined at build:

| Name                          | Required | Notes                                                                                      |
| ----------------------------- | -------- | ------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_CF_BEACON_TOKEN` | No       | Cloudflare Web Analytics token; the beacon is injected only on the production host if set. |
