'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { navigation } from '@/content/site';
import { Logo } from './ui';

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape' && open) { setOpen(false); toggle.current?.focus(); } };
    const outside = (event: PointerEvent) => { if (!header.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('keydown', close); document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('keydown', close); document.removeEventListener('pointerdown', outside); };
  }, [open]);
  return <header className="site-header" ref={header}><div className="container header-inner">
    <Link href="/" aria-label="Med Deg – hjem" onClick={() => setOpen(false)}><Logo /></Link>
    <nav className="desktop-nav" aria-label="Hovedmeny">{navigation.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}>{item.label}</Link>)}</nav>
    <div className="header-actions"><Link href="/kontakt" className="button header-cta" onClick={() => setOpen(false)}>Ta kontakt</Link><button ref={toggle} className="menu-toggle" aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}><span>{open ? 'Lukk' : 'Meny'}</span><span aria-hidden="true" className={`menu-icon ${open ? 'is-open' : ''}`}><i/><i/></span></button></div>
    <nav id="mobile-navigation" className="mobile-nav" aria-label="Mobilmeny" hidden={!open}>{navigation.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined} onClick={() => setOpen(false)}>{item.label}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M6 18 18 6M6 6h12v12"/></svg></Link>)}</nav>
  </div></header>;
}
