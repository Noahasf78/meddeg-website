import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { indexingPolicy } from '@/lib/seo';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/dm-serif-display/latin-400.css';
import './globals.css';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
export const metadata: Metadata = {
  metadataBase: new URL('https://meddeg.com'),
  title: { default: 'Med Deg – Praktisk og sosial hjelp i Oslo', template: '%s | Med Deg' },
  description: 'Praktisk og sosial hjelp i hverdagen for eldre i Oslo og omegn. Hjelp hjemme, følge til avtaler og hyggelig selskap.',
  openGraph: { siteName: 'Med Deg', locale: 'nb_NO', type: 'website' },
  // Prevent iOS data detectors from inserting links into server-rendered text
  // before React hydrates. Explicit tel:, mailto: and map links still work.
  formatDetection: { telephone: false, date: false, email: false, address: false },
  robots: indexingPolicy().robots,
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="nb"><body><a className="skip-link" href="#main">Hopp til innhold</a><Header/><main id="main">{children}</main><Footer/><Analytics/></body></html>;
}
