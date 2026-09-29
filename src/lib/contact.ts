import { LIMITS, validEmail, validPhone, CONTACT_FIELDS, invalidContactFields, type ContactField, type ContactSubmission } from './contact-schema';
export type ContactData = { name: string; email: string; phone: string; message: string };
export type ContactErrors = Partial<Record<keyof ContactData, string>>;
export const fieldMessages: Record<ContactField, string> = {
  name: 'Skriv inn navnet ditt (2–100 tegn).',
  email: 'Skriv inn en gyldig e-postadresse.',
  phone: 'Skriv inn et gyldig telefonnummer (8–15 sifre).',
  message: 'Skriv en melding (2–5000 tegn).',
};
export function validateContact(data: ContactData, compact: boolean): ContactErrors {
  const errors: ContactErrors = {};
  if (data.name.trim().length < 2 || data.name.length > LIMITS.name) errors.name = 'Skriv inn navnet ditt (2–100 tegn).';
  if (!validEmail(data.email.trim())) errors.email = 'Skriv inn en gyldig e-postadresse.';
  if (compact && !data.phone.trim()) errors.phone = 'Skriv inn telefonnummeret ditt.';
  else if (data.phone.trim() && !validPhone(data.phone.trim())) errors.phone = 'Skriv inn et gyldig telefonnummer (8–15 sifre).';
  if (!compact && (data.message.trim().length < 2 || data.message.length > LIMITS.message)) errors.message = 'Skriv en melding (2–5000 tegn).';
  for (const field of invalidContactFields({ ...data, kind: compact ? 'callback' : 'message', website: '' })) errors[field] ||= fieldMessages[field];
  return errors;
}
export type ContactResult = { status: number; invalidFields?: ContactField[]; code?: 'duplicate_conflict' | 'duplicate_pending' };
export async function submitContact(data: ContactSubmission): Promise<ContactResult> {
  const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: AbortSignal.timeout(35_000) });
  const result: unknown = await response.json().catch(() => null);
  const body = result && typeof result === 'object' ? result as Record<string, unknown> : {};
  if (response.ok) return { status: body.ok === true ? 200 : 503 };
  return {
    status: response.status,
    invalidFields: response.status === 400 && Array.isArray(body.invalidFields) ? CONTACT_FIELDS.filter(field => (body.invalidFields as unknown[]).includes(field)) : [],
    code: response.status === 409 && (body.code === 'duplicate_conflict' || body.code === 'duplicate_pending') ? body.code : undefined,
  };
}
export function contactFailure(result: ContactResult): string {
  if (result.status === 429) return 'Du har sendt flere henvendelser på kort tid. Vent litt før du prøver igjen, eller ring oss.';
  if (result.status === 409) return result.code === 'duplicate_conflict' ? 'Denne innsendingen er allerede brukt. Last siden på nytt før du sender en ny melding.' : 'Meldingen behandles allerede. Vent litt før du prøver igjen.';
  if (result.status === 400 && result.invalidFields?.length) return 'Kontroller de markerte feltene og prøv igjen.';
  if (result.status === 400 || result.status === 403) return 'Skjemaet kunne ikke sendes. Last siden på nytt og prøv igjen, eller kontakt oss på telefon.';
  if (result.status === 413) return 'Meldingen er for lang. Forkort teksten og prøv igjen.';
  return 'Meldingen kunne ikke sendes nå. Prøv igjen litt senere, eller kontakt oss på telefon.';
}
export function submissionId(): string {
  // getRandomValues also works for phone previews on a local HTTP network URL.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
