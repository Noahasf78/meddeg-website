import type { MetadataRoute } from 'next';
import { indexingPolicy } from '@/lib/seo';
export default function robots(): MetadataRoute.Robots { return indexingPolicy().robotsFile; }
