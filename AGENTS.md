# AGENTS.md

## Repo Workflow

- Always commit changes with conventional commits.
- Use `style` only for formatting-only changes, not CSS changes.
- Prefer patch staging when unrelated user edits are present.
- Keep prompted tasks and browser annotations in atomic commits. Implement and commit one meaningful chunk at a time.
- Use `bun`; use `bunx` for tools that are not installed.
- When changing CSS, use existing tokens instead of hardcoded values, keep sizes and spacing in multiples of 4, and check override impact.
- Assume the dev server may already be running on localhost. Only start one if needed.
- Leave the in-app browser intact for further annotation.

## Current CRX and Billing Context

This repo is on the `feat/crx` line of work for the AkuMa Chrome extension and Pro billing model.

The current product model is:

- Free: selected single Japanese word annotation only, capped at 50 successful requests per UTC day.
- Pro: $49/year annual checkout by default, monthly checkout also available, full-page annotation, and selected multi-word/sentence/paragraph annotation.
- Pro is subject to fair-use and anti-abuse limits.
- JLPT highlighting is TODO/planned and is not implemented yet.

Important implementation decisions:

- Supabase Auth is the source of user identity.
- The CRX uses hosted web auth at `/extension/auth`, then exchanges a one-time code for an app-scoped extension token.
- The extension token is stored in `chrome.storage.local`; Supabase secrets are never shipped in the CRX.
- The CRX manifest intentionally uses `activeTab` plus user action. It does not use `<all_urls>` host permissions or always-on content scripts.
- The popup injects `config.js`, accent modules, renderer, API, and `content.js` into the active tab with `chrome.scripting` only after a user action.
- The content script is idempotent, responds to `akuma:ping`, invalidates account state on storage changes, and re-checks Japanese content on DOM/hash/popstate changes.
- Free quota/pro fair-use is reserved before the upstream accent API call and rolled back if the upstream request fails before a successful response.
- Stripe checkout uses separate env-backed Price IDs for annual and monthly Pro. Annual must point to a recurring $49/year Price in Stripe.
- Stripe webhook sync resolves Supabase user identity from subscription/session metadata first, then local profile by `stripe_customer_id`, then Stripe Customer metadata.

Primary reference doc:

- `docs/crx-billing-deployment.md`

Critical env names:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` or legacy `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_ANNUAL_PRICE_ID`
- `STRIPE_PRO_MONTHLY_PRICE_ID`
- `MARK_ACCENT_API_KEY`
- `AKUMA_EXTENSION_ORIGINS`
- `AKUMA_CRX_API_BASE_URL`
- `AKUMA_CRX_APP_URL`

Before release:

1. Apply Supabase migrations in timestamp order.
2. Configure Supabase Auth redirect URLs, including `https://<extension-id>.chromiumapp.org/akuma`.
3. Configure Stripe webhook events for checkout and subscription lifecycle.
4. Run `bun run typecheck`, `bun run lint`, and `bun run build:crx`.
5. Upload `dist/crx/akuma-crx-v<package-version>.zip` to the Chrome dashboard.
