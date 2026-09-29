import { createContactHandler } from '@/lib/server/contact-handler';

export const runtime = 'nodejs';
export const maxDuration = 30;
export const POST = createContactHandler();
