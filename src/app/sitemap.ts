import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: 'https://news-bookmarker.vercel.app',
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: 'https://news-bookmarker.vercel.app/login',
            lastModified: new Date(),
            priority: 0.5,
        },
    ];
}