import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};

export default nextConfig;

// Enables Cloudflare bindings (env vars, secrets) during `next dev`.
// Required by the @opennextjs/cloudflare adapter; no-op in production builds.
initOpenNextCloudflareForDev();
