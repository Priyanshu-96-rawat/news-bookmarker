import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: 'https://news-bookmarker.vercel.app',
            lastModified: new Date(),
        },
    ]
}