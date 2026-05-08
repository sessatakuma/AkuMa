import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

import {
    DEFAULT_MARK_ACCENT_PUBLIC_PROXY_TARGET,
    DEFAULT_MARK_ACCENT_UPSTREAM_URL,
    MARK_ACCENT_PROXY_PATH,
    normalizeMarkAccentUrl,
} from './config/mark-accent.js';

interface MarkAccentProxyOptions {
    apiKey?: string;
    publicProxyTarget: string;
    upstreamUrl: string;
}

function createMarkAccentProxy(options: MarkAccentProxyOptions) {
    const normalizedPublicProxyTarget = normalizeMarkAccentUrl(options.publicProxyTarget);
    const normalizedUpstreamUrl = normalizeMarkAccentUrl(options.upstreamUrl);

    const proxyRequest = async (
        req: NodeJS.ReadableStream & {
            method?: string;
            headers: Record<string, string | string[] | undefined>;
        },
        res: {
            statusCode: number;
            setHeader: (name: string, value: string) => void;
            end: (body: string) => void;
        },
    ) => {
        if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Allow', 'POST');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Method Not Allowed' }));
            return;
        }

        try {
            const body = await new Promise<string>((resolve, reject) => {
                let rawBody = '';

                req.on('data', chunk => {
                    rawBody += chunk;
                });
                req.on('end', () => resolve(rawBody));
                req.on('error', reject);
            });

            const requestHeaders: Record<string, string> = {
                'Content-Type': Array.isArray(req.headers['content-type'])
                    ? req.headers['content-type'][0]
                    : req.headers['content-type'] || 'application/json',
            };

            const requestUrl = options.apiKey
                ? normalizedUpstreamUrl
                : `${normalizedPublicProxyTarget}/api/mark-accent`;

            if (options.apiKey) {
                requestHeaders['X-API-KEY'] = options.apiKey;
            }

            const upstreamResponse = await fetch(requestUrl, {
                method: 'POST',
                headers: requestHeaders,
                body,
            });

            res.statusCode = upstreamResponse.status;
            res.setHeader(
                'Content-Type',
                upstreamResponse.headers.get('content-type') || 'application/json',
            );
            res.end(await upstreamResponse.text());
        } catch (error) {
            console.error('Local MarkAccent proxy failed:', error);
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Upstream request failed' }));
        }
    };

    return {
        name: 'mark-accent-proxy',
        configureServer(server: {
            middlewares: { use: (path: string, handler: typeof proxyRequest) => void };
        }) {
            server.middlewares.use(MARK_ACCENT_PROXY_PATH, proxyRequest);
        },
        configurePreviewServer(server: {
            middlewares: { use: (path: string, handler: typeof proxyRequest) => void };
        }) {
            server.middlewares.use(MARK_ACCENT_PROXY_PATH, proxyRequest);
        },
    };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const devMarkAccentProxyTarget =
        env.VITE_MARK_ACCENT_API_URL?.trim() || DEFAULT_MARK_ACCENT_PUBLIC_PROXY_TARGET;
    const markAccentApiKey = env.MARK_ACCENT_API_KEY?.trim();
    const markAccentUpstreamUrl =
        env.MARK_ACCENT_UPSTREAM_URL?.trim() || DEFAULT_MARK_ACCENT_UPSTREAM_URL;

    return {
        plugins: [
            react(),
            createMarkAccentProxy({
                apiKey: markAccentApiKey,
                publicProxyTarget: devMarkAccentProxyTarget,
                upstreamUrl: markAccentUpstreamUrl,
            }),
        ],
        resolve: {
            alias: {
                app: '/src/app',
                components: '/src/components',
                features: '/src/features',
                shared: '/src/shared',
                utilities: '/src/utilities',
            },
        },
        server: {
            port: 3000,
            open: true,
        },
        build: {
            outDir: 'dist',
            chunkSizeWarningLimit: 1000, // Export libs (jspdf+deps) are large but lazy-loaded
            rollupOptions: {
                output: {
                    manualChunks(id) {
                        if (id.includes('node_modules')) {
                            if (id.includes('react') || id.includes('scheduler')) {
                                return 'vendor-react';
                            }
                            // jspdf + html-to-image + their deps (canvg, dompurify, html2canvas)
                            // These are lazy-loaded together when user exports
                            if (
                                id.includes('jspdf') ||
                                id.includes('canvg') ||
                                id.includes('dompurify') ||
                                id.includes('html2canvas') ||
                                id.includes('html-to-image')
                            ) {
                                return 'vendor-export';
                            }
                            if (id.includes('lucide')) {
                                return 'vendor-icons';
                            }
                        }
                    },
                },
            },
        },
    };
});
