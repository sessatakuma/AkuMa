import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            allow: '/',
            userAgent: '*',
        },
        sitemap: 'https://accent-marker.sessatakuma.dev/sitemap.xml',
    };
}
