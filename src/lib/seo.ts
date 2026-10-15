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
  return {
    openGraph: { siteName: site.name, locale: 'nb_NO', type: 'website', url: new URL(path, site.url).href },
    twitter: { card: 'summary' },
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
