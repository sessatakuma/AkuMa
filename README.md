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
