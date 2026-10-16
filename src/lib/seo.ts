import type { Metadata, MetadataRoute } from 'next';
import { site } from '@/content/site';

// Production indexing is approved after canonical-domain verification.
// Vercel previews and local builds remain noindex.
export const productionIndexingApproved = true;

export function indexingPolicy(environment = process.env.VERCEL_ENV, approved: boolean = productionIndexingApproved) {
  const indexable = approved && environment === 'production';
  const robots: Metadata['robots'] = { index: indexable, follow: indexable };
  // Crawling must be allowed for search engines to read the noindex metadata.
  const robotsFile: MetadataRoute.Robots = {
    rules: { userAgent: '*', allow: '/' },
    ...(indexable ? { sitemap: `${site.url}/sitemap.xml` } : {}),
  };
  return { indexable, robots, robotsFile };
}

export function socialMetadata(path: string): Pick<Metadata, 'openGraph' | 'twitter'> {
  const image = {
    url: new URL('/images/med-deg-og.png', site.url).href,
    width: 1200,
    height: 630,
    type: 'image/png',
    alt: 'Med Deg – en yngre og en eldre kvinne ser på en mobiltelefon sammen i en park',
  };
  return {
    openGraph: { siteName: site.name, locale: 'nb_NO', type: 'website', url: new URL(path, site.url).href, images: [image] },
    twitter: { card: 'summary_large_image', images: [{ url: image.url, alt: image.alt }] },
  };
}

export const businessStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${site.url}/#organization`,
  name: site.company,
  url: site.url,
  telephone: site.phoneHref.replace('tel:', ''),
  email: site.email,
  address: site.address,
  identifier: site.org,
};
