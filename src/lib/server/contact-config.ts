import 'server-only';
import { validEmail } from '../contact-schema';

export type ContactConfig = { recipient: string; from: string; origins: string[]; hashSecret: string; resendKey: string; redisUrl: string; redisToken: string };
export function getContactConfig(env: Record<string, string | undefined> = process.env): ContactConfig {
  const { CONTACT_RECIPIENT_EMAIL: recipient, CONTACT_FROM_EMAIL: from, CONTACT_ALLOWED_ORIGINS: originsValue,
    CONTACT_HASH_SECRET: hashSecret, RESEND_API_KEY: resendKey, UPSTASH_REDIS_REST_URL: redisUrl, UPSTASH_REDIS_REST_TOKEN: redisToken } = env;
  if (!recipient || !from || !validEmail(recipient) || !validEmail(from) || recipient === from ||
      !originsValue || !hashSecret || hashSecret.length < 32 || !resendKey?.trim() || !redisUrl || !redisToken?.trim()) throw new Error('contact_configuration');
  const redis = new URL(redisUrl);
  if (redis.protocol !== 'https:' || !redis.hostname.endsWith('.upstash.io') || redis.username || redis.password || redis.port || redis.pathname !== '/' || redis.search || redis.hash) throw new Error('contact_configuration');
  const origins = originsValue.split(',').map(value => value.trim());
  for (const origin of origins) {
    const url = new URL(origin);
    if (url.origin !== origin || url.username || url.password ||
        (url.protocol !== 'https:' && !(env.NODE_ENV === 'development' && url.protocol === 'http:'))) throw new Error('contact_configuration');
  }
  return { recipient, from, origins, hashSecret, resendKey, redisUrl: redis.origin, redisToken };
}
