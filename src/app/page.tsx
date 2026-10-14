import { ButtonLink, ContactCTA, Media, SectionHeading } from '@/components/ui';
import type { ImageId } from '@/content/images';
import { ContactForm } from '@/components/contact-form';
export const metadata = { alternates: { canonical: '/' } };
const previews = [
  { title: 'Praktisk hjelp hjemme', text: 'Rydding, vask, handling og enkel matlaging, så hjemmet føles levelig og trygt.' },
  { title: 'Følge til avtaler', text: 'Vi blir med på handleturen, til legen, fysioterapeuten eller frisøren, og sikrer trygg transport begge veier.' },
  { title: 'Sosialt samvær', text: 'En fast time til samtale, kortspill eller en tur i nabolaget. Selskap som gjør godt.' },
];
const week: { id: ImageId; caption: string }[] = [
  { id: 'monday', caption: 'Mandag: tur til legen og fysioterapeuten.' },
  { id: 'tuesday', caption: 'Tirsdag: handling og litt baking før barnebarna kommer på besøk.' },
  { id: 'wednesday', caption: 'Onsdag: en rolig samtale over kaffen.' },
  { id: 'thursday', caption: 'Torsdag: kort tur i nabolaget mens været tillater det.' },
];
export default function Home() {
  return <>
    <section className="container home-hero section"><div>
      <SectionHeading hero eyebrow="Praktisk og sosial støtte" title="Tilstede når hverdagen krever det"><p>Ensomhet er utbredt blant eldre og det ønsker vi å gjøre noe med! Derfor tilbyr Med Deg praktisk og sosial hjelp. Fra husarbeid og følge til legetimer - til en god prat over en kopp kaffe - vi er med deg.</p></SectionHeading>
      <a href="/tjenester" className="text-link mobile-service-link">Se hva vi kan hjelpe med <span aria-hidden="true">→</span></a>
      <ContactForm compact/>
    </div><div className="hero-photo"><Media id="hero" priority/><figure className="quote-badge"><blockquote>«De kommer når de sier de skal.»</blockquote><figcaption>Randi, 82 år, Årvoll</figcaption></figure></div></section>
    <section className="trust-strip" aria-label="Trygghet og kontinuitet"><div className="container grid gap-8 md:grid-cols-3">{[
      ['Godkjente hjelpere', 'Alle hos oss er referansesjekket og er kvalitetssikret.'],
      ['Samme ansikt hver gang', 'Du møter de samme 1–2 personene, ikke en ny fremmed hver uke.'],
      ['Fleksibel avtale', 'Fra noen timer i uken til daglig følge - tilpasset akkurat ditt behov.'],
    ].map(([title, text]) => <div key={title}><h2>{title}</h2><p>{text}</p></div>)}</div></section>
    <section className="container section"><SectionHeading eyebrow="Tjenester" title="Hjelp som passer inn i livet ditt"><p>Du velger hva du trenger hjelp til. Vi setter opp en løsning som føles naturlig, ikke som en tjeneste.</p></SectionHeading><div className="grid gap-6 md:grid-cols-3 cards-grid">{previews.map(item => <article className="card service-preview" key={item.title}><div className="card-body"><h3>{item.title}</h3><p>{item.text}</p></div></article>)}</div><ButtonLink href="/tjenester" variant="outline" className="services-link">Se alle tjenester og priser <span aria-hidden="true">→</span></ButtonLink></section>
    <section className="tinted section"><div className="container"><SectionHeading eyebrow="Slik ser det ut" title="En uke med Med Deg"><p>Dette er et eksempel på en ukesplan. Alle planer skreddersys etter dine ønsker.</p></SectionHeading><div className="week-grid cards-grid">{week.map(item => <figure className={`week-item ${item.id} has-photo`} key={item.id}><Media id={item.id}/><figcaption>{item.caption}</figcaption></figure>)}</div></div></section>
    <section className="container section testimonial"><Media id="testimonial"/><figure><span className="quote-mark" aria-hidden="true">“</span><blockquote>Før tilbrakte jeg mye tid alene og nå får jeg fast besøk. Vi pleier å spille kortspill, baker boller og går turer sammen. Jeg føler meg sett og satt pris på, og jeg gleder meg til å få besøk.</blockquote><figcaption><strong>Randi Johansen</strong><span>82 år, Årvoll, kunde siden august 2026</span></figcaption></figure></section>
    <ContactCTA/>
  </>;
}
