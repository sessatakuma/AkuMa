import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// This app is fully request-time SSR (no ISR / `revalidate` / `"use cache"`),
// so no incremental cache override is needed. Add `incrementalCache` here later
// (e.g. an R2 store) if cached/static-regenerated routes are introduced.
export default defineCloudflareConfig();
