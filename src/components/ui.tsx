import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { images, type ImageAsset, type ImageId } from '@/content/images';
import { site } from '@/content/site';

export function Logo() {
  return <span className="logo"><svg width="20" height="26" viewBox="0 0 24 30" fill="none" aria-hidden="true"><path d="M12 27S4 17 4 10a8 8 0 0 1 16 0c0 7-8 17-8 17Z" stroke="currentColor" strokeWidth="1.5"/><path d="M8 10c1 4 7 4 8 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg><span>Med Deg</span></span>;
}
export function ButtonLink({ href, children, variant = '', className = '' }: { href: string; children: ReactNode; variant?: string; className?: string }) {
  return <Link href={href} className={`button ${variant} ${className}`}>{children}</Link>;
}
export function SectionHeading({ eyebrow, title, children, hero = false }: { eyebrow: string; title: string; children?: ReactNode; hero?: boolean }) {
  const Tag = hero ? 'h1' : 'h2';
  return <div className={`section-heading ${hero ? 'page-heading' : ''}`}><p className="eyebrow">{eyebrow}</p><Tag>{title}</Tag>{children && <div className="intro">{children}</div>}</div>;
}
export function Media({ id, className = '', priority = false }: { id: ImageId; className?: string; priority?: boolean }) {
  const asset: ImageAsset = images[id];
  return <div className={`media ${asset.treatment || ''} ${className}`}>
    <Image src={asset.src} alt={asset.alt} fill quality={asset.quality} sizes={asset.sizes || '(max-width: 639px) calc(100vw - 40px), (max-width: 899px) calc(100vw - 64px), 480px'} fetchPriority={priority ? 'high' : undefined} loading={priority ? 'eager' : 'lazy'} style={{ objectFit: 'cover', objectPosition: asset.position || 'center' }} />
  </div>;
}
export function ContactCTA() {
  return <section className="cta wide-container" aria-labelledby="cta-heading"><div><p className="eyebrow">Kom i gang</p><h2 id="cta-heading">La oss ta en hyggelig og uforpliktende prat!</h2><p>Ring oss eller send en melding så tar vi kontakt innen kort tid. Vi finner sammen ut hva som passer best for deg eller din pårørende.</p></div><div className="cta-actions"><ButtonLink href={site.phoneHref} variant="light">Ring {site.phone}</ButtonLink><ButtonLink href={`mailto:${site.email}`} variant="outline-light">{site.email}</ButtonLink></div></section>;
}
