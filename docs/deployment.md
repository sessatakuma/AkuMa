# Deployment & Local Setup

Internal development and operations notes for AkuMa.

## Service Status and Ownership

AkuMa should remain active during the Sago Cloud consolidation. It is a small,
stateless public service, production is healthy on the organization-owned
Cloudflare account, and active product work still targets this repository.
Pausing it would interrupt the public tool without removing a database or
realtime migration dependency.

- Repository ownership is defined in `.github/CODEOWNERS`.
- Runtime ownership is the `Sessatakuma` Cloudflare account and its `akuma`
  Worker. Do not deploy from a personal Cloudflare account.
- The production host is `akuma.sessatakuma.dev`; the
  `accent-marker.sessatakuma.dev` host is a compatibility redirect only.
- Vercel is no longer in the production request path. Any remaining legacy
  `accent-marker` Vercel project may be retired only by an owner with access to
  its former team, after confirming that no domains, environment variables, or
  rollback retention are still needed.

The only unresolved operational ownership is the upstream
`api.sessatakuma.dev` service. A Sago Cloud owner must accept responsibility for
its availability and for rotating the Worker-side `MARK_ACCENT_API_KEY`, or
provide a verified replacement before the upstream is paused. This does not
require pausing AkuMa while ownership is assigned.

### State and dependency boundary

| Capability              | Dependency                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| Authentication          | None. The app has no user accounts or sessions.                                                     |
| Database/server storage | None. The Worker does not bind KV, D1, R2, Durable Objects, or an external database.                |
| Client storage          | Browser `localStorage` stores only the locale preference.                                           |
| Realtime                | None. Analysis uses a request-scoped NDJSON HTTP stream, not WebSockets or a persistent connection. |
| Accent analysis         | `api.sessatakuma.dev/v1/mark-accent`, authenticated by the Worker-side API key.                     |
| Analytics               | Optional Cloudflare Web Analytics beacon; no application data depends on it.                        |

Local `.env` files are not an inventory of production dependencies. Only the
variables documented below are consumed by the current application.

## Local API Setup

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

| Host                            | Source                                    | Behaviour                                                                                               |
| ------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `akuma.sessatakuma.dev`         | `custom_domain: true` in `wrangler.jsonc` | Production origin (Worker = sole origin).                                                               |
| `accent-marker.sessatakuma.dev` | `custom_domain: true` in `wrangler.jsonc` | Bound to the same Worker; middleware 301-redirects to `akuma.sessatakuma.dev`, preserving path + query. |
| `<version>-akuma.*.workers.dev` | `preview_urls`                            | Per-version preview deployments for non-`main` branches. Auto-tagged `noindex` via middleware.          |

`custom_domain: true` tells Cloudflare to provision the required DNS record and
managed TLS certificate automatically when the Worker is first deployed — no
manual DNS setup is required for the two in-repo hosts.

The legacy-host 301 redirect is implemented in `src/middleware.ts` (Edge
runtime) rather than a Cloudflare Redirect Rule so the routing table stays
declarative in the repo and survives across accounts/zones.

### Secrets & environment variables

Runtime (dashboard → the Worker → Settings → Variables, or `wrangler secret put`):

| Name                       | Type   | Required | Notes                                  |
| -------------------------- | ------ | -------- | -------------------------------------- |
| `MARK_ACCENT_API_KEY`      | Secret | Yes      | Upstream API key for the stream proxy. |
| `MARK_ACCENT_UPSTREAM_URL` | Var    | No       | Overrides the default upstream URL.    |

Build-time (dashboard → Settings → Builds → Build variables), inlined at build:

| Name                          | Required | Notes                                                                                      |
| ----------------------------- | -------- | ------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_CF_BEACON_TOKEN` | No       | Cloudflare Web Analytics token; the beacon is injected only on the production host if set. |
