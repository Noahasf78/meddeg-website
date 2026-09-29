import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createContactHandler } from '../../src/lib/server/contact-handler';
import { getContactConfig, type ContactConfig } from '../../src/lib/server/contact-config';
import { deliverEmail } from '../../src/lib/server/contact-email';
import { claimDelivery, consumeRateLimit, finishDelivery, RATE_SCRIPT, redisCommand, type DeliveryRecord, type Claim } from '../../src/lib/server/contact-store';
import { parseSubmission, LIMITS } from '../../src/lib/contact-schema';

// These fixtures are used exclusively with injected mocks, never live services.
const config: ContactConfig = { recipient: 'recipient@example.test', from: 'contact@example.test', origins: ['https://meddeg.com'], hashSecret: 'unit-test-only-not-a-production-secret', resendKey: 'unit-test-not-a-credential', redisUrl: 'https://unit-test.upstash.io', redisToken: 'unit-test-not-a-credential' };
const valid = { kind: 'message', submissionId: '12345678-1234-4123-8123-123456789abc', name: '  Kari Nordmann  ', email: 'kari@example.com', phone: '+47 12345678', message: 'Hei! Jeg ønsker en samtale.', website: '', packageId: 'fast-folge' };
const record: DeliveryRecord = { hash: '', timestamp: '2026-09-29T10:00:00.000Z', operationId: '12345678-1234-4123-8123-123456789abc', sent: false, lockUntil: 0 };
function request(body: unknown = valid, headers: Record<string, string> = {}) {
  return new Request('https://meddeg.com/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://meddeg.com', ...headers }, body: JSON.stringify(body) });
}
function harness(overrides: Partial<Parameters<typeof createContactHandler>[0]> = {}) {
  let delivered = 0; let limited = 0;
  const handler = createContactHandler({ getConfig: () => config, limit: async () => { limited++; return 0; }, claim: async () => ({ state: 'send', record }), finish: async () => {}, deliver: async () => { delivered++; }, report: () => {}, ...overrides });
  return { handler, delivered: () => delivered, limited: () => limited };
}

test('valid full enquiry is normalized, limited, delivered, and confirmed without caching', async () => {
  const h = harness();
  const response = await h.handler(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.match(response.headers.get('cache-control')!, /no-store/);
  assert.equal(h.limited(), 1); assert.equal(h.delivered(), 1);
  assert.equal(parseSubmission(valid)?.name, 'Kari Nordmann');
});
test('valid callback needs no message or package', async () => {
  const data = { kind: 'callback', submissionId: valid.submissionId, name: valid.name, email: valid.email, phone: valid.phone, website: '' };
  const h = harness();
  assert.equal((await h.handler(request({ ...data, kind: 'callback' }))).status, 200);
  assert.equal(h.delivered(), 1);
});
test('message form permits an empty optional phone', async () => {
  assert.equal((await harness().handler(request({ ...valid, phone: '' }))).status, 200);
});
for (const [name, body] of Object.entries({
  null: null, array: [], string: 'hello', nameMissing: { ...valid, name: undefined }, emailMissing: { ...valid, email: undefined }, phoneMissing: { ...valid, phone: undefined }, messageMissing: { ...valid, message: undefined }, honeypotMissing: { ...valid, website: undefined }, kindMissing: { ...valid, kind: undefined }, idMissing: { ...valid, submissionId: undefined },
  nameType: { ...valid, name: 123 }, messageType: { ...valid, message: {} }, whitespace: { ...valid, message: '   ' }, invalidEmail: { ...valid, email: 'bad@' }, emailInjection: { ...valid, email: 'kari@example.com\r\nBcc: other@example.com' }, subjectInjection: { ...valid, name: 'Kari\r\nBcc: other@example.com' }, invalidPhone: { ...valid, phone: '12' },
  honeypot: { ...valid, website: 'bot.example' }, honeypotWhitespace: { ...valid, website: ' ' }, nameOversize: { ...valid, name: 'x'.repeat(101) }, messageOversize: { ...valid, message: 'x'.repeat(5001) }, emailOversize: { ...valid, email: 'x'.repeat(255) }, phoneOversize: { ...valid, phone: '1'.repeat(31) },
  extraRecipient: { ...valid, to: 'attacker@example.com' }, extraHtml: { ...valid, html: '<script>bad</script>' }, unknownService: { ...valid, serviceId: 'arbitrary' }, unknownPackage: { ...valid, packageId: 'unlimited' }, objectPackage: { ...valid, packageId: { id: 'fast-folge' } }, inheritedPackage: { ...valid, packageId: 'toString' },
  invalidKind: { ...valid, kind: 'admin' }, invalidId: { ...valid, submissionId: 'not-a-uuid' }, callbackUnexpectedFields: { ...valid, kind: 'callback' }, controlCharacter: { ...valid, message: 'bad\u0000text' },
})) {
  test(`rejects ${name} before rate store and email`, async () => {
    const h = harness(); const response = await h.handler(request(body));
    assert.equal(response.status, 400); assert.equal(h.delivered(), 0); assert.equal(h.limited(), 0);
    const result = await response.json();
    assert.equal(result.ok, false);
    assert.equal(result.message, 'Kontroller opplysningene og prøv igjen.');
    assert.ok(Object.keys(result).every(key => ['ok', 'message', 'invalidFields'].includes(key)));
    assert.ok((result.invalidFields || []).every((field: string) => ['name', 'email', 'phone', 'message'].includes(field)));
  });
}
test('every known package is accepted; package omission is accepted', async () => {
  for (const packageId of ['fast-folge', 'utvidet-stotte', 'etter-behov', undefined]) assert.equal((await harness().handler(request({ ...valid, packageId }))).status, 200);
});

test('server field errors identify invalid input without reflecting submitted values', async () => {
  for (const field of ['name', 'email', 'phone', 'message'] as const) {
    const response = await harness().handler(request({ ...valid, [field]: field === 'phone' ? 'abc' : '' }));
    assert.equal(response.status, 400);
    assert.deepEqual((await response.json()).invalidFields, [field]);
  }
  const response = await harness().handler(request({ ...valid, website: 'autofilled', email: '' }));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { ok: false, message: 'Kontroller opplysningene og prøv igjen.' });
});

test('callback accepts dotted mixed-case email and plain or country-prefixed phone', async () => {
  for (const phone of ['41360000', '+4741360000']) {
    const h = harness();
    const response = await h.handler(request({ kind: 'callback', submissionId: valid.submissionId, name: 'Randi Testesen', email: 'Noah.test1@example.com', phone, website: '' }));
    assert.equal(response.status, 200);
    assert.equal(h.delivered(), 1);
  }
});
test('malformed JSON and UTF-8 rejected', async () => {
  for (const body of ['{bad', new Uint8Array([0xff])]) {
    const h = harness();
    const response = await h.handler(new Request('https://meddeg.com/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://meddeg.com' }, body }));
    assert.equal(response.status, 400); assert.equal(h.delivered(), 0);
  }
});
test('oversized streamed body is rejected even without or with a false Content-Length', async () => {
  for (const headers of [{}, { 'Content-Length': '1' }, { 'Content-Length': String(LIMITS.payload + 1) }] as Record<string, string>[]) {
    const h = harness(); const response = await h.handler(request({ ...valid, message: 'x'.repeat(LIMITS.payload + 1) }, headers));
    assert.equal(response.status, 413); assert.equal(h.delivered(), 0);
  }
});
test('rejects foreign/missing origins, wrong media types, compression, queries and non-POST', async () => {
  for (const [headers, status] of [[{ Origin: 'https://evil.example' }, 403], [{ Origin: '' }, 403], [{ 'Sec-Fetch-Site': 'cross-site' }, 403], [{ 'Content-Type': 'text/plain' }, 415], [{ 'Content-Encoding': 'gzip' }, 415]] as [Record<string, string>, number][]) {
    const h = harness(); assert.equal((await h.handler(request(valid, headers))).status, status); assert.equal(h.delivered(), 0);
  }
  assert.equal((await harness().handler(new Request('https://meddeg.com/api/contact'))).status, 405);
  assert.equal((await harness().handler(new Request('https://meddeg.com/api/contact?to=anywhere', request()))).status, 400);
});
test('rate-limited submissions receive 429 and Retry-After, never send', async () => {
  const h = harness({ limit: async () => 3600 }); const response = await h.handler(request());
  assert.equal(response.status, 429); assert.equal(response.headers.get('retry-after'), '3600'); assert.equal(h.delivered(), 0);
});
test('configuration and shared limiter failures fail closed and never leak errors', async () => {
  for (const overrides of [{ getConfig: () => { throw new Error('sensitive config details'); } }, { limit: async () => { throw new Error('sensitive Redis token'); } }]) {
    const h = harness(overrides); const response = await h.handler(request());
    assert.equal(response.status, 503); assert.doesNotMatch(await response.text(), /sensitive|token|stack|Redis/); assert.equal(h.delivered(), 0);
  }
});
test('provider failure releases claim for retry and returns generic failure', async () => {
  let marked: boolean | undefined;
  const h = harness({ deliver: async () => { throw new Error('provider token and stack'); }, finish: async (_cfg, _id, _operation, sent) => { marked = sent; } });
  const response = await h.handler(request());
  assert.equal(response.status, 503); assert.equal(marked, false); assert.doesNotMatch(await response.text(), /token|stack|provider/);
});
test('success waits for provider acceptance', async () => {
  let accept!: () => void;
  const accepted = new Promise<void>(resolve => { accept = resolve; });
  const h = harness({ deliver: () => accepted });
  let returned = false;
  const pending = h.handler(request()).then(response => { returned = true; return response; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(returned, false); accept(); assert.equal((await pending).status, 200);
});
test('busy or conflicting duplicate submissions do not send email', async () => {
  for (const state of ['busy', 'conflict'] as const) {
    const h = harness({ claim: async () => ({ state, record }) });
    assert.equal((await h.handler(request())).status, 409); assert.equal(h.delivered(), 0);
  }
  const h = harness({ claim: async () => ({ state: 'sent', record: { ...record, sent: true } }) });
  assert.equal((await h.handler(request())).status, 200); assert.equal(h.delivered(), 0);
});
test('duplicate request across two handler instances shares one accepted delivery', async () => {
  let state: Claim['state'] = 'send'; let sends = 0; let release!: () => void;
  const delivery = new Promise<void>(resolve => { release = resolve; });
  const dependencies = { claim: async (): Promise<Claim> => { const current = state; if (state === 'send') state = 'busy'; return { state: current, record }; }, deliver: async () => { sends++; await delivery; }, finish: async () => { state = 'sent'; } };
  const a = harness(dependencies); const b = harness(dependencies);
  const first = a.handler(request()); await new Promise(resolve => setImmediate(resolve));
  assert.equal((await b.handler(request())).status, 409);
  release(); assert.equal((await first).status, 200);
  assert.equal((await b.handler(request())).status, 200); assert.equal(sends, 1);
});
test('Resend request has fixed sender/recipient, plain text, Reply-To, timestamp and stable idempotency', async () => {
  const calls: RequestInit[] = [];
  const fetcher: typeof fetch = async (url, init) => { assert.equal(url, 'https://api.resend.com/emails'); calls.push(init!); return Response.json({ id: 'accepted-message-id' }); };
  const data = parseSubmission({ ...valid, message: '<img src=x onerror=alert(1)>' })!;
  await deliverEmail(config, data, record, fetcher); await deliverEmail(config, data, record, fetcher);
  assert.equal(calls[0].body, calls[1].body);
  const body = JSON.parse(calls[0].body as string);
  assert.equal(body.from, `Med Deg <${config.from}>`); assert.deepEqual(body.to, [config.recipient]); assert.equal(body.reply_to, data.email);
  assert.equal(body.subject, 'Ny henvendelse fra Med Deg-nettsiden – Kari Nordmann');
  assert.equal(body.html, undefined); assert.match(body.text, /Fast følge/); assert.match(body.text, /2026-09-29T10:00:00.000Z/);
  assert.equal(new Headers(calls[0].headers).get('Idempotency-Key'), `contact/${record.operationId}`);
});
test('Resend non-2xx, malformed/empty acceptance and transport errors are failures', async () => {
  for (const fetcher of [async () => Response.json({ error: 'secret' }, { status: 500 }), async () => Response.json({}), async () => Response.json({ id: '' }), async () => { throw new Error('network'); }]) await assert.rejects(deliverEmail(config, parseSubmission(valid)!, record, fetcher));
});
test('limiter sends atomic Redis EVAL with three budgets and hashed email', async () => {
  const fetcher: typeof fetch = async (_url, init) => {
    const command = JSON.parse(init!.body as string);
    assert.equal(command[0], 'EVAL'); assert.equal(command[1], RATE_SCRIPT); assert.equal(command[2], 3);
    assert.deepEqual(command.slice(6), [30, 900000, 100, 86400000, 5, 3600000]);
    assert.doesNotMatch(init!.body as string, /kari@example/);
    return Response.json({ result: [0, 900] });
  };
  assert.equal(await consumeRateLimit(config, 'kari@example.com', fetcher), 900);
  assert.equal(await consumeRateLimit(config, 'kari@example.com', async () => Response.json({ result: [1, 0] })), 0);
});
test('Redis failure and malformed limiter results fail closed', async () => {
  for (const result of [{}, { error: 'Redis secret' }, { result: null }, { result: [true, 0] }, { result: [0, 'abc'] }]) await assert.rejects(consumeRateLimit(config, 'kari@example.com', async () => Response.json(result)));
  await assert.rejects(redisCommand(config, ['GET', 'test'], async () => new Response('bad', { status: 503 })));
});
test('Redis deduplication stores metadata only and honours prior provider acceptance', async () => {
  const fetcher: typeof fetch = async (_url, init) => {
    const command = JSON.parse(init!.body as string);
    assert.equal(command[0], 'EVAL'); assert.doesNotMatch(command[3], /12345678/);
    return Response.json({ result: ['sent', JSON.stringify({ ...record, sent: true })] });
  };
  assert.equal((await claimDelivery(config, valid.submissionId, 'hash', fetcher)).state, 'sent');
  await finishDelivery(config, valid.submissionId, record.operationId, true, async () => Response.json({ result: 1 }));
  await assert.rejects(finishDelivery(config, valid.submissionId, record.operationId, true, async () => Response.json({ result: 0 })));
});
test('server config requires real explicit settings and refuses unsafe provider URLs/origins', () => {
  const env = { CONTACT_RECIPIENT_EMAIL: config.recipient, CONTACT_FROM_EMAIL: config.from, CONTACT_ALLOWED_ORIGINS: 'https://meddeg.com', CONTACT_HASH_SECRET: config.hashSecret, RESEND_API_KEY: config.resendKey, UPSTASH_REDIS_REST_URL: config.redisUrl, UPSTASH_REDIS_REST_TOKEN: config.redisToken };
  assert.deepEqual(getContactConfig(env), config);
  assert.throws(() => getContactConfig({}));
  for (const field of Object.keys(env)) assert.throws(() => getContactConfig({ ...env, [field]: '' }));
  assert.throws(() => getContactConfig({ ...env, UPSTASH_REDIS_REST_URL: 'http://localhost:6379' }));
  assert.throws(() => getContactConfig({ ...env, CONTACT_ALLOWED_ORIGINS: '*' }));
  assert.throws(() => getContactConfig({ ...env, CONTACT_ALLOWED_ORIGINS: 'http://meddeg.com' }));
});
