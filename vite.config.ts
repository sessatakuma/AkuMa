import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

import {
    buildMarkAccentStreamUrl,
    DEFAULT_MARK_ACCENT_UPSTREAM_URL,
    MARK_ACCENT_PROXY_PATH,
    MARK_ACCENT_STREAM_PROXY_PATH,
    normalizeMarkAccentUrl,
} from './proxy.config.js';

declare const process: {
    cwd: () => string;
};

interface MarkAccentProxyOptions {
    apiKey?: string;
    upstreamUrl: string;
}

type ProxyRequest = object & {
    method?: string;
    headers?: Record<string, string | string[] | undefined>;
    on?: {
        (event: 'data', listener: (chunk: Uint8Array | string) => void): void;
        (event: 'end', listener: () => void): void;
        (event: 'error', listener: (error: Error) => void): void;
    };
};

type ProxyResponse = object & {
    statusCode: number;
    setHeader: (name: string, value: string) => void;
    write: (chunk: Uint8Array | string) => boolean;
    end: (body?: string) => void;
};

function createMarkAccentProxy(options: MarkAccentProxyOptions): Plugin {
    const normalizedUpstreamUrl = normalizeMarkAccentUrl(options.upstreamUrl);
    const streamUpstreamUrl = buildMarkAccentStreamUrl(options.upstreamUrl);

    const readRequestBody = (req: ProxyRequest): Promise<string> =>
        new Promise((resolve, reject) => {
            let rawBody = '';

            if (!req.on) {
                reject(new Error('Request stream is unavailable'));
                return;
            }

            req.on('data', chunk => {
                rawBody += chunk.toString();
            });
            req.on('end', () => resolve(rawBody));
            req.on('error', reject);
        });

    const buildUpstreamHeaders = (req: ProxyRequest): Record<string, string> => {
        const contentType = req.headers?.['content-type'];
        const headers: Record<string, string> = {
            'Content-Type': Array.isArray(contentType)
                ? contentType[0]
                : contentType || 'application/json',
        };

        if (options.apiKey) {
            headers['X-API-KEY'] = options.apiKey;
        }

        return headers;
    };

    const rejectMissingApiKey = (res: ProxyResponse): boolean => {
        if (options.apiKey) {
            return false;
        }

        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(
            JSON.stringify({
                error: 'Missing MARK_ACCENT_API_KEY or VITE_X_API_KEY for local MarkAccent proxy',
            }),
        );
        return true;
    };

    const proxyRequest = async (req: ProxyRequest, res: ProxyResponse) => {
        if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Allow', 'POST');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Method Not Allowed' }));
            return;
        }

        if (rejectMissingApiKey(res)) {
            return;
        }

        try {
            const body = await readRequestBody(req);

            const upstreamResponse = await fetch(normalizedUpstreamUrl, {
                method: 'POST',
                headers: buildUpstreamHeaders(req),
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

    const proxyStreamRequest = async (req: ProxyRequest, res: ProxyResponse) => {
        if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Allow', 'POST');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Method Not Allowed' }));
            return;
        }

        if (rejectMissingApiKey(res)) {
            return;
        }

        try {
            const body = await readRequestBody(req);

            const upstreamResponse = await fetch(streamUpstreamUrl, {
                method: 'POST',
                headers: buildUpstreamHeaders(req),
                body,
            });

            res.statusCode = upstreamResponse.status;
            res.setHeader(
                'Content-Type',
                upstreamResponse.headers.get('content-type') ||
                    'application/x-ndjson; charset=utf-8',
            );
            res.setHeader('Cache-Control', 'no-cache, no-transform');
            res.setHeader('X-Accel-Buffering', 'no');

            const upstreamBody = upstreamResponse.body;
            if (!upstreamBody) {
                res.end(await upstreamResponse.text());
                return;
            }

            const reader = upstreamBody.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                if (value && value.byteLength > 0) {
                    res.write(value);
                }
            }
            res.end();
        } catch (error) {
            console.error('Local MarkAccent stream proxy failed:', error);
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Upstream request failed' }));
        }
    };

    return {
        name: 'mark-accent-proxy',
        configureServer(server) {
            server.middlewares.use(MARK_ACCENT_STREAM_PROXY_PATH, proxyStreamRequest);
            server.middlewares.use(MARK_ACCENT_PROXY_PATH, proxyRequest);
        },
        configurePreviewServer(server) {
            server.middlewares.use(MARK_ACCENT_STREAM_PROXY_PATH, proxyStreamRequest);
            server.middlewares.use(MARK_ACCENT_PROXY_PATH, proxyRequest);
        },
    };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const markAccentApiKey = env.MARK_ACCENT_API_KEY?.trim() || env.VITE_X_API_KEY?.trim();
    const markAccentUpstreamUrl =
        env.MARK_ACCENT_UPSTREAM_URL?.trim() || DEFAULT_MARK_ACCENT_UPSTREAM_URL;

    return {
        plugins: [
            react(),
            createMarkAccentProxy({
                apiKey: markAccentApiKey,
                upstreamUrl: markAccentUpstreamUrl,
            }),
        ],
        resolve: {
            alias: {
                components: '/src/components',
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
