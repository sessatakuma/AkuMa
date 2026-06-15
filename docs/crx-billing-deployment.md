# CRX Billing and Deployment

This document captures the Chrome extension, Supabase, Stripe, quota, and release decisions from the CRX billing thread.

## Business Model

- Free: signed-in users can annotate one selected Japanese word at a time, up to 50 successful requests per UTC day.
- Pro: annual checkout defaults to $49/year through the Stripe annual Price ID. Monthly checkout is still available through a separate monthly Price ID.
- Pro feature scope: full-page annotation and multi-word selected text annotation are enabled, subject to fair-use and anti-abuse limits.
- TODO: JLPT highlighting is not implemented yet. Do not describe it as a live feature outside TODO/planned copy.

## Quota and Fair Use

- The `/api/mark-accent/stream` route authenticates every request before calling the upstream accent API.
- Free quota is reserved atomically with `private.increment_akuma_daily_usage`.
- Pro usage is recorded in `public.akuma_annotation_events` with `private.record_akuma_pro_annotation_usage`.
- If the upstream request fails before a successful upstream response, the route rolls the reservation back with `private.decrement_akuma_daily_usage` or `private.delete_akuma_annotation_event`.
- Current pro fair-use limits are 10,000 characters per request, 60 requests per minute, 1,000 per hour, 10,000 per day, and 1,000,000 characters per day.

## Supabase Structure

Apply migrations in timestamp order:

1. `supabase/migrations/20260615143000_billing_entitlements.sql`
2. `supabase/migrations/20260615152000_extension_token_auth.sql`
3. `supabase/migrations/20260615162000_pro_fair_use_limits.sql`

Tables:

- `public.akuma_profiles`: one row per Supabase user, stores Stripe customer mapping.
- `public.akuma_subscriptions`: one row per Supabase user, stores Stripe subscription status and period end.
- `public.akuma_daily_usage`: free daily usage counter.
- `public.akuma_extension_auth_codes`: one-time hosted-auth code for the CRX flow.
- `public.akuma_extension_tokens`: hashed app-scoped CRX bearer tokens.
- `public.akuma_annotation_events`: pro fair-use event ledger.

Security model:

- RLS is enabled on every public table created for AkuMa.
- `akuma_profiles`, `akuma_subscriptions`, and `akuma_daily_usage` grant `select` to `authenticated` and rely on own-row RLS policies.
- Token/code/event ledgers are revoked from `anon` and `authenticated`; server code uses the Supabase secret/service role only.
- Private `security definer` functions live in the `private` schema and grant `execute` only to `service_role`.
- Never expose `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in browser or CRX code. Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are public.

## Stripe Setup

Required env:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_ANNUAL_PRICE_ID`: recurring annual Pro Price configured as $49/year.
- `STRIPE_PRO_MONTHLY_PRICE_ID`: recurring monthly Pro Price.

Checkout:

- `POST /api/billing/checkout` accepts `{ "interval": "year" }` or `{ "interval": "month" }`.
- The annual interval is the default when omitted.
- Checkout sets `client_reference_id`, Checkout Session metadata, Subscription metadata, and Customer metadata with the Supabase user ID.

Webhook:

- Configure Stripe to send events to `/api/webhooks/stripe`.
- Required events are `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`.
- The webhook verifies the raw request body with the `Stripe-Signature` header and `STRIPE_WEBHOOK_SECRET`.
- Subscription sync resolves the Supabase user from subscription metadata first, then local profile by `stripe_customer_id`, then Stripe Customer metadata.

## Chrome Extension Auth and Permissions

- The CRX uses hosted web auth at `/extension/auth`, then exchanges a short-lived code for an app-scoped extension token.
- Add this Supabase redirect URL after Chrome assigns the extension ID:
  `https://<extension-id>.chromiumapp.org/akuma`
- Set `AKUMA_EXTENSION_ORIGINS=chrome-extension://<extension-id>` on the app deployment.
- The extension manifest intentionally uses `activeTab` plus `scripting`, not `<all_urls>`.
- Content scripts are injected only after a user opens the popup and clicks the annotate action.
- The content script responds to a ping so the popup can avoid duplicate injection, invalidates account cache on storage changes, and re-checks Japanese page content on DOM/hash/popstate changes.

## CRX Release

- Build the upload zip with `bun run build:crx`.
- Output zip: `dist/crx/akuma-crx-v<package-version>.zip`.
- Use `bun run release:crx` to choose a version bump, build the zip, and create the release commit.
- Build-time CRX URLs:
  - `AKUMA_CRX_API_BASE_URL`
  - `AKUMA_CRX_APP_URL`

## Deployment Checklist

1. Apply all Supabase migrations.
2. Set production env in Vercel or the deployment host.
3. Create Stripe annual and monthly recurring Prices, with annual Pro set to $49/year.
4. Configure Stripe webhook URL and signing secret.
5. Configure Supabase Auth site URL and redirect URLs, including the CRX redirect URL.
6. Build and upload the CRX zip to the Chrome dashboard.
7. After Chrome assigns or changes the extension ID, update `AKUMA_EXTENSION_ORIGINS` and rebuild if needed.

## References Checked

- Supabase changelog: public tables now need explicit Data API grants as the default rollout progresses: https://supabase.com/changelog
- Supabase API security docs: enable RLS on exposed tables and restrict function `execute` grants: https://supabase.com/docs/guides/api/securing-your-api
- Stripe webhook signature docs: verify raw request bodies with `Stripe-Signature`: https://docs.stripe.com/webhooks/signature
- Stripe subscription webhook docs: use subscription lifecycle events to provision and revoke access: https://docs.stripe.com/billing/subscriptions/webhooks
