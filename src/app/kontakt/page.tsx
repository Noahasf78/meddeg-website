import { socialMetadata } from '@/lib/seo';
import { Media, SectionHeading } from '@/components/ui';
import { ContactForm } from '@/components/contact-form';
import { plans, site } from '@/content/site';
import { isPackageId } from '@/lib/contact-schema';
export const metadata = { ...socialMetadata('/kontakt'), title: 'Kontakt oss', description: `Ta kontakt med Med Deg for en uforpliktende prat. Ring 454 22 161 eller send e-post til ${site.email}.`, alternates: { canonical: '/kontakt' } };
export default async function Contact({ searchParams }: { searchParams: Promise<{ avtale?: string }> }) {
  const { avtale } = await searchParams;
  const selectedPlan = plans.find(plan => plan.id === avtale)?.title;
  const selectedPackage = isPackageId(avtale) ? avtale : undefined;
  return <section className="container section"><div className="photo-intro"><SectionHeading hero eyebrow="Kontakt" title="Ta gjerne kontakt, vi svarer raskt"><p>Ring oss for en uforpliktende prat om hva du eller din pårørende trenger hjelp til, eller send en e-post. Vi svarer normalt innen én virkedag.</p></SectionHeading><Media id="contact" priority/></div><div className="grid gap-6 md:grid-cols-3 cards-grid contact-cards"><article className="card"><h2>Ring oss</h2><p>Mandag til fredag, 08:00–20:00.</p><a className="text-link" href={site.phoneHref}>{site.phone}</a></article><article className="card"><h2>Send e-post</h2><p>Fortell kort hva du trenger hjelp til, så tar vi kontakt.</p><a className="text-link" href={`mailto:${site.email}`}>{site.email}</a></article><article className="card"><h2>Besøk oss</h2><p>Kontoret vårt ligger sentralt i Oslo, åpent etter avtale.</p><a className="text-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address)}`}>{site.address}</a></article></div><div id="kontaktskjema" className="full-contact"><ContactForm selectedPlan={selectedPlan} selectedPackage={selectedPackage}/></div></section>;
}
