// Original uploads are preserved in public/images. Crops and treatment are presentational only.
export const images: Record<string, { src: string; alt: string; position?: string; treatment?: string; sizes?: string; quality?: number }> = {
  monday: { src: '/images/bilde3.jpg', alt: 'En yngre kvinne lytter til en eldre kvinne og holder hånden hennes', position: '50% 35%', treatment: 'home-soft-light', quality: 90, sizes: '(max-width: 359px) calc(100vw - 32px), (max-width: 639px) calc(100vw - 40px), (max-width: 1087px) calc((100vw - 82px) / 2), 503px' },
  tuesday: { src: '/images/bilde1.jpg', alt: 'En eldre mann og en kvinne ler sammen mens de ser i et fotoalbum', position: '52% 60%', treatment: 'home-soft-light' },
  // Account for the landscape source covering a 6:5 mobile / square desktop frame.
  hero: { src: '/images/bilde4.jpg', alt: 'To kvinner ser på en mobiltelefon sammen på en benk i en park', position: '38% 45%', treatment: 'phone-photo', quality: 90, sizes: '(max-width: 359px) calc(125vw - 40px), (max-width: 639px) calc(125vw - 50px), (max-width: 899px) calc(125vw - 80px), 690px' },
  wednesday: { src: '/images/bilde6.jpg', alt: 'En smilende eldre mann i samtale med en annen mann hjemme i sofaen', position: '44% 42%' },
  thursday: { src: '/images/bilde2.jpg', alt: 'En eldre og en yngre kvinne står tett sammen mellom trærne', position: '50% 35%', treatment: 'woodland' },
  testimonial: { src: '/images/bilde.png', alt: 'To hender som hviler sammen på et blått stoff', sizes: '(max-width: 374px) calc(100vw - 40px), 340px' },
  services: { src: '/images/bilde3.jpg', alt: 'En yngre kvinne lytter til en eldre kvinne og holder hånden hennes', position: '60% 42%', treatment: 'gentle-warmth' },
  contact: { src: '/images/bilde4.jpg', alt: 'To kvinner ser på en mobiltelefon sammen på en benk i en park', position: '43% 45%', treatment: 'phone-photo', quality: 90, sizes: '(max-width: 359px) calc(100vw - 32px), (max-width: 639px) calc(100vw - 40px), (max-width: 899px) calc(100vw - 64px), 462px' },
};
