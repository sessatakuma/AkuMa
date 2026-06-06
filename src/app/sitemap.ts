import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: 'https://accent-marker.sessatakuma.dev/',
            changeFrequency: 'weekly',
            priority: 1,
        },
        {
            url: 'https://accent-marker.sessatakuma.dev/?lang=ja',
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: 'https://accent-marker.sessatakuma.dev/?lang=zh',
            changeFrequency: 'weekly',
            priority: 0.8,
        },
    ];
}
