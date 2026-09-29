import 'server-only';
import { createHmac, randomUUID } from 'node:crypto';
import type { ContactConfig } from './contact-config';

export function fingerprint(secret: string, value: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}
export async function redisCommand(config: ContactConfig, command: (string | number)[], fetcher: typeof fetch = fetch): Promise<unknown> {
  const response = await fetcher(config.redisUrl, {
    method: 'POST', headers: { Authorization: `Bearer ${config.redisToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(4000),
  });
  if (!response.ok) throw new Error('contact_store_unavailable');
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object' || !('result' in data) || ('error' in data && data.error)) throw new Error('contact_store_unavailable');
  return data.result;
}

// Check and increment all budgets atomically across serverless instances.
export const RATE_SCRIPT = `
for i, key in ipairs(KEYS) do
  local count = tonumber(redis.call('GET', key) or '0')
  if count >= tonumber(ARGV[i * 2 - 1]) then
    return {0, math.max(1, math.ceil(redis.call('PTTL', key) / 1000))}
  end
end
for i, key in ipairs(KEYS) do
  if redis.call('INCR', key) == 1 then redis.call('PEXPIRE', key, ARGV[i * 2]) end
end
return {1, 0}`;

// Global budgets protect against rotating/forged emails; email budgets protect
// repeat abuse. No client IP/forwarding header is trusted (Cloudflare can proxy).
export async function consumeRateLimit(config: ContactConfig, email: string, fetcher: typeof fetch = fetch): Promise<number> {
  const keys = ['contact:{contact}:quarter-hour', 'contact:{contact}:day', `contact:{contact}:email:${fingerprint(config.hashSecret, email.toLowerCase())}`];
  const result = await redisCommand(config, ['EVAL', RATE_SCRIPT, 3, ...keys, 30, 900_000, 100, 86_400_000, 5, 3_600_000], fetcher);
  if (!Array.isArray(result) || result.length !== 2 || ![0, 1].includes(result[0]) || !Number.isFinite(result[1]) || result[1] < 0) throw new Error('contact_store_unavailable');
  return result[0] === 1 ? 0 : Math.max(1, result[1]);
}

export type DeliveryRecord = { hash: string; timestamp: string; operationId: string; sent: boolean; lockUntil: number };
export type Claim = { state: 'send' | 'sent' | 'busy' | 'conflict'; record: DeliveryRecord };
export const CLAIM_SCRIPT = `
local existing = redis.call('GET', KEYS[1])
local record = cjson.decode(ARGV[1])
if existing then
  local old = cjson.decode(existing)
  if old.hash ~= record.hash then return {'conflict', existing} end
  if old.sent then return {'sent', existing} end
  if old.lockUntil > tonumber(ARGV[2]) then return {'busy', existing} end
  old.lockUntil = record.lockUntil
  record = old
end
local encoded = cjson.encode(record)
if existing then redis.call('SET', KEYS[1], encoded, 'KEEPTTL')
else redis.call('SET', KEYS[1], encoded, 'PX', 86400000) end
return {'send', encoded}`;
export async function claimDelivery(config: ContactConfig, id: string, hash: string, fetcher: typeof fetch = fetch): Promise<Claim> {
  const now = Date.now();
  const record: DeliveryRecord = { hash, timestamp: new Date(now).toISOString(), operationId: randomUUID(), sent: false, lockUntil: now + 30_000 };
  const result = await redisCommand(config, ['EVAL', CLAIM_SCRIPT, 1, `contact:{contact}:submission:${fingerprint(config.hashSecret, id)}`, JSON.stringify(record), now], fetcher);
  if (!Array.isArray(result) || !['send', 'sent', 'busy', 'conflict'].includes(result[0]) || typeof result[1] !== 'string') throw new Error('contact_store_unavailable');
  const stored: DeliveryRecord = JSON.parse(result[1]);
  if (typeof stored.operationId !== 'string' || typeof stored.timestamp !== 'string' || typeof stored.hash !== 'string' || typeof stored.sent !== 'boolean' || !Number.isFinite(stored.lockUntil)) throw new Error('contact_store_unavailable');
  return { state: result[0], record: stored };
}
export const FINISH_SCRIPT = `
local value = redis.call('GET', KEYS[1])
if not value then return 0 end
local record = cjson.decode(value)
if record.operationId ~= ARGV[1] then return 0 end
record.sent = record.sent or ARGV[2] == 'sent'
record.lockUntil = 0
redis.call('SET', KEYS[1], cjson.encode(record), 'KEEPTTL')
return 1`;
export async function finishDelivery(config: ContactConfig, id: string, operationId: string, sent: boolean, fetcher: typeof fetch = fetch): Promise<void> {
  const result = await redisCommand(config, ['EVAL', FINISH_SCRIPT, 1, `contact:{contact}:submission:${fingerprint(config.hashSecret, id)}`, operationId, sent ? 'sent' : 'retry'], fetcher);
  if (result !== 1) throw new Error('contact_store_unavailable');
}
