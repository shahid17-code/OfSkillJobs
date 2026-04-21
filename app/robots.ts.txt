import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || 'https://ofskilljobs.vercel.app'

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/profile/edit',
        '/company/profile/edit',
        '/company/jobs/new',
        '/company/jobs/edit/',
        '/applications/',
        '/api/',
        '/auth/callback',
        '/submit/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}