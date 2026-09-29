import 'server-only';
import { PACKAGE_LABELS, type ContactSubmission } from '../contact-schema';
import type { ContactConfig } from './contact-config';
import type { DeliveryRecord } from './contact-store';

export async function deliverEmail(config: ContactConfig, data: ContactSubmission, record: DeliveryRecord, fetcher: typeof fetch = fetch): Promise<void> {
  const text = [
    `Navn: ${data.name}`, `E-post: ${data.email}`, `Telefon: ${data.phone || 'Ikke oppgitt'}`,
    `Skjema: ${data.kind === 'callback' ? 'Ønsker å bli kontaktet' : 'Kontaktskjema'}`,
    `Valgt avtale: ${data.packageId ? PACKAGE_LABELS[data.packageId] : 'Ikke valgt'}`,
    `Mottatt (UTC): ${record.timestamp}`, '', 'Melding:',
    data.message || 'Ønsker en uforpliktende samtale om tjenestene.',
  ].join('\n');
  const response = await fetcher('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.resendKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `contact/${record.operationId}` },
    body: JSON.stringify({ from: `Med Deg <${config.from}>`, to: [config.recipient], reply_to: data.email,
      subject: `Ny henvendelse fra Med Deg-nettsiden – ${data.name}`, text }),
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('contact_delivery_failed');
  const result: unknown = await response.json();
  if (!result || typeof result !== 'object' || !('id' in result) || typeof result.id !== 'string' || !result.id.trim()) throw new Error('contact_delivery_failed');
}
