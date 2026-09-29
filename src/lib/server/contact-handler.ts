import 'server-only';
import { LIMITS, parseSubmission, invalidContactFields, type ContactField } from '../contact-schema';
import { getContactConfig } from './contact-config';
import { claimDelivery, consumeRateLimit, finishDelivery, fingerprint } from './contact-store';
import { deliverEmail } from './contact-email';

const invalid = 'Kontroller opplysningene og prøv igjen.';
const unavailable = 'Meldingen kunne ikke sendes nå. Prøv igjen litt senere, eller kontakt oss på telefon.';
const deps = { getConfig: getContactConfig, limit: consumeRateLimit, claim: claimDelivery, finish: finishDelivery, deliver: deliverEmail,
  report: (event: string) => console.error(`[contact] ${event}`) };
type Dependencies = typeof deps;
class RequestError extends Error { constructor(public status: number) { super('invalid_request'); } }
function reply(status: number, message?: string, retry?: number, invalidFields?: ContactField[], code?: string): Response {
  return Response.json(status === 200 ? { ok: true } : { ok: false, message, ...(invalidFields?.length ? { invalidFields } : {}), ...(code ? { code } : {}) }, {
    status, headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Content-Type-Options': 'nosniff',
      ...(retry ? { 'Retry-After': String(retry) } : {}) },
  });
}
async function readBody(request: Request): Promise<unknown> {
  const length = request.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > LIMITS.payload)) throw new RequestError(413);
  if (!request.body) throw new RequestError(400);
  const reader = request.body.getReader();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { void reader.cancel().catch(() => {}); reject(new RequestError(408)); }, 5000); });
  try {
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const chunk = await Promise.race([reader.read(), timeout]);
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > LIMITS.payload) { void reader.cancel().catch(() => {}); throw new RequestError(413); }
      chunks.push(chunk.value);
    }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
  } catch (error) {
    if (error instanceof RequestError) throw error;
    throw new RequestError(400);
  } finally { clearTimeout(timer); reader.releaseLock(); }
}

// Dependency injection is used only by local tests, never selected by a request
// or a runtime "mock mode". The public route always uses the real dependencies.
export function createContactHandler(dependencies: Dependencies = deps) {
  return async function contact(request: Request): Promise<Response> {
    if (request.method !== 'POST') return reply(405, invalid);
    if (new URL(request.url).search) return reply(400, invalid);
    if (!/^application\/json(?:;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') || '') || request.headers.has('content-encoding')) return reply(415, invalid);
    try {
      const config = dependencies.getConfig();
      if (!config.origins.includes(request.headers.get('origin') || '') || request.headers.get('sec-fetch-site') === 'cross-site') {
        dependencies.report('origin_rejected');
        return reply(403, invalid);
      }
      const body = await readBody(request);
      const submission = parseSubmission(body);
      if (!submission) {
        // Fixed event labels only; never log submitted data or configuration.
        dependencies.report(body && typeof body === 'object' && 'website' in body && body.website !== '' ? 'honeypot_rejected' : 'schema_rejected');
        return reply(400, invalid, undefined, invalidContactFields(body));
      }
      // Future Turnstile verification belongs here, on the server, before claim/send.
      const retry = await dependencies.limit(config, submission.email);
      if (retry) return reply(429, 'Du har sendt flere henvendelser på kort tid. Vent litt før du prøver igjen, eller ring oss.', retry);
      const { submissionId, ...content } = submission;
      const hash = fingerprint(config.hashSecret, JSON.stringify(content));
      const claim = await dependencies.claim(config, submissionId, hash);
      if (claim.state === 'conflict') return reply(409, invalid, undefined, undefined, 'duplicate_conflict');
      if (claim.state === 'busy') return reply(409, 'Meldingen behandles allerede. Vent litt før du prøver igjen.', 3, undefined, 'duplicate_pending');
      if (claim.state === 'sent') return reply(200); // An earlier provider acceptance was recorded.
      try {
        await dependencies.deliver(config, submission, claim.record);
      } catch {
        // Preserve operation ID/timestamp so uncertain provider timeouts retry
        // with the same Resend idempotency key and exactly the same message.
        await dependencies.finish(config, submissionId, claim.record.operationId, false);
        dependencies.report('delivery_failed');
        return reply(503, unavailable);
      }
      await dependencies.finish(config, submissionId, claim.record.operationId, true);
      return reply(200);
    } catch (error) {
      if (error instanceof RequestError) { dependencies.report('request_body_rejected'); return reply(error.status, invalid); }
      dependencies.report('submission_unavailable');
      return reply(503, unavailable);
    }
  };
}
