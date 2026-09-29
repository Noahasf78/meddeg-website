// Public constraints shared for UX; the Route Handler independently applies them.
export const PACKAGE_LABELS = {
  'fast-folge': 'Fast følge',
  'utvidet-stotte': 'Utvidet støtte',
  'etter-behov': 'Etter behov',
} as const;
export type PackageId = keyof typeof PACKAGE_LABELS;
export const LIMITS = { name: 100, email: 254, phone: 30, message: 5000, payload: 24_000 } as const;
export type ContactSubmission = {
  kind: 'callback' | 'message';
  submissionId: string;
  name: string;
  email: string;
  phone: string;
  website: string;
  message?: string;
  packageId?: PackageId;
};
export function isPackageId(value: unknown): value is PackageId {
  return typeof value === 'string' && Object.hasOwn(PACKAGE_LABELS, value);
}
export function validEmail(value: string): boolean {
  if (value.length > LIMITS.email || !/^[\x21-\x7e]+$/.test(value)) return false;
  const parts = value.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  return local.length > 0 && local.length <= 64 && !local.startsWith('.') && !local.endsWith('.') && !local.includes('..') &&
    /^[a-zA-Z0-9.!#$%&'*+\-/=?^_`{|}~]+$/.test(local) && domain.length <= 253 && domain.includes('.') &&
    domain.split('.').every(label => /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(label)) &&
    /^[a-zA-Z]{2,63}$/.test(domain.split('.').at(-1)!);
}
export function validPhone(value: string): boolean {
  return value.length <= LIMITS.phone && /^\+?[\d ()-]+$/.test(value) && value.replace(/\D/g, '').length >= 8 && value.replace(/\D/g, '').length <= 15;
}
const controls = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/;
const messageControls = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/;
export const CONTACT_FIELDS = ['name', 'email', 'phone', 'message'] as const;
export type ContactField = typeof CONTACT_FIELDS[number];
// Field diagnostics only. Acceptance still requires the complete strict schema below.
export function invalidContactFields(value: unknown): ContactField[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const raw = value as Record<string, unknown>;
  if ((raw.kind !== 'callback' && raw.kind !== 'message') || raw.website !== '') return [];
  const fields: ContactField[] = [];
  const name = typeof raw.name === 'string' ? raw.name.normalize('NFC').trim().replace(/\s+/g, ' ') : '';
  if (typeof raw.name !== 'string' || raw.name.length > LIMITS.name || controls.test(raw.name) || name.length < 2 || name.length > LIMITS.name || !/[\p{L}\p{N}]/u.test(name)) fields.push('name');
  if (typeof raw.email !== 'string' || raw.email.length > LIMITS.email || controls.test(raw.email) || !validEmail(raw.email.trim())) fields.push('email');
  const phone = typeof raw.phone === 'string' ? raw.phone.trim().replace(/\s+/g, ' ') : '';
  if (typeof raw.phone !== 'string' || raw.phone.length > LIMITS.phone || controls.test(raw.phone) || (raw.kind === 'callback' && !phone) || (phone && !validPhone(phone))) fields.push('phone');
  if (raw.kind === 'message' && (typeof raw.message !== 'string' || raw.message.length > LIMITS.message || messageControls.test(raw.message) || raw.message.normalize('NFC').replace(/\r\n?/g, '\n').trim().length < 2)) fields.push('message');
  return fields;
}
export function parseSubmission(value: unknown): ContactSubmission | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (input.kind !== 'callback' && input.kind !== 'message') return null;
  const required = ['kind', 'submissionId', 'name', 'email', 'phone', 'website', ...(input.kind === 'message' ? ['message'] : [])];
  const allowed = new Set([...required, ...(input.kind === 'message' ? ['packageId'] : [])]);
  if (Object.keys(input).some(key => !allowed.has(key)) || required.some(key => !Object.hasOwn(input, key))) return null;
  if (Object.values(input).some(field => typeof field !== 'string')) return null;
  const raw = input as Record<string, string>;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw.submissionId)) return null;
  if (raw.website !== '') return null; // Same generic rejection as all invalid submissions.
  if (raw.name.length > LIMITS.name || raw.email.length > LIMITS.email || raw.phone.length > LIMITS.phone) return null;
  if ([raw.name, raw.email, raw.phone].some(field => controls.test(field))) return null;
  const name = raw.name.normalize('NFC').trim().replace(/\s+/g, ' ');
  const email = raw.email.trim();
  const phone = raw.phone.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > LIMITS.name || !/[\p{L}\p{N}]/u.test(name) || !validEmail(email)) return null;
  if ((input.kind === 'callback' && !phone) || (phone && !validPhone(phone))) return null;
  const result: ContactSubmission = { kind: input.kind, submissionId: raw.submissionId.toLowerCase(), name, email: email.slice(0, email.lastIndexOf('@')) + email.slice(email.lastIndexOf('@')).toLowerCase(), phone, website: '' };
  if (input.kind === 'message') {
    if (raw.message.length > LIMITS.message || messageControls.test(raw.message)) return null;
    const message = raw.message.normalize('NFC').replace(/\r\n?/g, '\n').trim();
    if (message.length < 2 || message.length > LIMITS.message) return null;
    result.message = message;
    if (Object.hasOwn(input, 'packageId')) {
      if (!isPackageId(input.packageId)) return null;
      result.packageId = input.packageId;
    }
  }
  return result;
}
