import type { MetadataRoute } from 'next';
import { navigation, site } from '@/content/site';
export default function sitemap(): MetadataRoute.Sitemap { return navigation.map(item => ({ url: `${site.url}${item.href}` })); }
