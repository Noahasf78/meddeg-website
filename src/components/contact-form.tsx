'use client';
import { useId, useRef, useState, type FormEvent } from 'react';
import { submitContact, submissionId, validateContact, contactFailure, fieldMessages, type ContactData, type ContactErrors } from '@/lib/contact';
import { LIMITS, type ContactSubmission, type PackageId } from '@/lib/contact-schema';
export function ContactForm({ compact = false, selectedPlan, selectedPackage }: { compact?: boolean; selectedPlan?: string; selectedPackage?: PackageId }) {
  const id = useId();
  const [errors, setErrors] = useState<ContactErrors>({});
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [failure, setFailure] = useState('');
  const inFlight = useRef(false);
  const attempt = useRef<{ content: string; id: string } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || status === 'success') return;
    const form = event.currentTarget;
    const raw = new FormData(form);
    const data: ContactData = { name: String(raw.get('name') || ''), email: String(raw.get('email') || ''), phone: String(raw.get('phone') || ''), message: String(raw.get('message') || '') };
    const nextErrors = validateContact(data, compact);
    setErrors(nextErrors); setStatus('idle');
    const first = Object.keys(nextErrors)[0];
    if (first) { (form.elements.namedItem(first) as HTMLElement)?.focus(); return; }
    const content = { kind: compact ? 'callback' as const : 'message' as const, name: data.name, email: data.email, phone: data.phone,
      website: String(raw.get('website') || ''), ...(!compact ? { message: data.message, ...(selectedPackage ? { packageId: selectedPackage } : {}) } : {}) };
    const serialized = JSON.stringify(content);
    if (!attempt.current || attempt.current.content !== serialized) attempt.current = { content: serialized, id: submissionId() };
    const payload: ContactSubmission = { ...content, submissionId: attempt.current.id };
    inFlight.current = true;
    setStatus('pending');
    try {
      const result = await submitContact(payload);
      if (result.status === 200) { setStatus('success'); }
      else {
        const serverErrors: ContactErrors = {};
        for (const field of result.invalidFields || []) serverErrors[field] = fieldMessages[field];
        setErrors(serverErrors);
        const invalidField = result.invalidFields?.[0];
        if (invalidField) (form.elements.namedItem(invalidField) as HTMLElement)?.focus();
        setFailure(contactFailure(result));
        setStatus('error');
      }
    } catch {
      setFailure('Vi kunne ikke bekrefte at meldingen ble sendt. Kontroller forbindelsen og prøv igjen.');
      setStatus('error');
    } finally { inFlight.current = false; }
  }
  function field(name: keyof ContactData, label: string, type: string, placeholder?: string) {
    return <div className={`form-field field-${name}`}><label htmlFor={`${id}-${name}`}>{label}</label><input id={`${id}-${name}`} name={name} type={type} placeholder={placeholder} autoComplete={name === 'name' ? 'name' : name === 'phone' ? 'tel' : 'email'} inputMode={name === 'phone' ? 'tel' : undefined} required={name !== 'phone' || compact} maxLength={LIMITS[name]} readOnly={status === 'pending'} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${id}-${name}-error` : undefined}/>{errors[name] && <span className="field-error" id={`${id}-${name}-error`}>{errors[name]}</span>}</div>;
  }
  return <section className={`card contact-form ${compact ? 'compact-form' : ''}`} aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`}>{compact ? 'Er du interessert i våre tjenester?' : 'Send oss en melding'}</h2>
    <p className="form-intro">{compact ? 'Vi tar gjerne en hyggelig og uforpliktende prat. Fyll ut skjemaet under og vi kontakter deg innen kort tid.' : 'Fyll ut skjemaet, så tar vi kontakt så snart vi kan.'}</p>
    {selectedPlan && <p className="selected-plan">Valgt avtale: <strong>{selectedPlan}</strong></p>}
    <form noValidate onSubmit={submit} aria-busy={status === 'pending'} onChange={() => { if (!inFlight.current && (status === 'success' || status === 'error')) setStatus('idle'); }}>
      <div className="contact-honeypot" aria-hidden="true"><label htmlFor={`${id}-website`}>La dette feltet stå tomt</label><input id={`${id}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" maxLength={200}/></div>
      <div className="form-fields">{field('name', 'Navn', 'text', compact ? 'Ditt navn' : undefined)}{compact && field('phone', 'Telefonnummer', 'tel', 'Ditt telefonnummer')}{field('email', 'E-post', 'email', compact ? 'din@epost.no' : undefined)}{!compact && field('phone', 'Telefon (valgfritt)', 'tel')}
      {!compact && <div className="form-field"><label htmlFor={`${id}-message`}>Melding</label><textarea id={`${id}-message`} name="message" rows={5} required maxLength={LIMITS.message} readOnly={status === 'pending'} aria-invalid={!!errors.message} aria-describedby={errors.message ? `${id}-message-error` : undefined}/>{errors.message && <span className="field-error" id={`${id}-message-error`}>{errors.message}</span>}</div>}</div>
      <button type="submit" className="button" disabled={status === 'pending' || status === 'success'}>{status === 'pending' ? 'Sender melding…' : status === 'success' ? 'Melding sendt' : compact ? 'Send inn' : 'Send melding'}</button>
      <div role="status" aria-live="polite">{status === 'success' && <p className="form-status">Takk! Meldingen er sendt. Vi tar kontakt så snart vi kan.</p>}</div>
      {status === 'error' && <p className="field-error" role="alert">{failure}</p>}
    </form>
  </section>;
}
