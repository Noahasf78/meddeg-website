import { Logo } from './ui';
import { site } from '@/content/site';
export function Footer() {
  return <footer className="site-footer"><div className="container footer-grid"><div><Logo/><p>Praktisk og sosial hjelp i hverdagen,<br className="desktop-break"/> for eldre i Oslo og omegn.</p></div><div><h2>Kontakt</h2><address><a href={site.phoneHref}>Telefon: {site.phone}</a><a href={`mailto:${site.email}`}>E-post: {site.email}</a><span>{site.address}</span></address></div><div><h2>Åpningstider</h2><p>Mandag – fredag: 08:00 – 20:00</p><p>Vakttelefon: hele døgnet</p></div></div><div className="wide-container footer-bottom">© 2026 {site.company}. Alle rettigheter forbeholdt. Org nr: {site.org}</div></footer>;
}
