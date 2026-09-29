# Med Deg

Official website for Med Deg AS — practical and social support for older people in Oslo and surrounding areas.

## About

The website presents Med Deg and its services, helps older people and their relatives explore available support, and provides contact forms for enquiries. It is designed with accessibility, readability, and mobile use in mind.

## Tech Stack

- Next.js App Router and React
- TypeScript
- Tailwind CSS
- Resend for transactional email
- Upstash Redis for server-side abuse protection
- Playwright and the Node.js test runner for automated tests

## Project Structure

- `src/app` — pages, layouts, and server routes
- `src/components` — reusable UI components
- `src/content` — shared site content and image configuration
- `src/lib` — shared logic and server utilities
- `public/images` — website imagery
- `tests` — browser and server tests
- `docs` — supporting project documentation

## Local Development

Install dependencies and start the development server:

```bash
npm ci
npm run dev
```

The site is available at `http://localhost:3000`. Configure the required environment variables locally to enable contact delivery.

## Environment Variables

Store local secrets in `.env.local`, which is Git-ignored. `.env.example` lists the required variable names:

- `CONTACT_RECIPIENT_EMAIL`
- `CONTACT_FROM_EMAIL`
- `CONTACT_ALLOWED_ORIGINS`
- `CONTACT_HASH_SECRET`
- `RESEND_API_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## Testing

```bash
npm run lint          # Lint checks
npm run typecheck     # TypeScript checks
npm run test:server   # Server tests
npm run build         # Production build
npm run test:ui       # Browser tests
npm run test:mobile   # Mobile navigation tests
```

Run the production build before the UI suite.

## Deployment

The application is intended to be deployed on Vercel. Production deployment and server-side environment configuration are managed separately.

## Security

Sensitive credentials are stored in server-side environment variables and must never be committed to the repository. Contact submissions are processed server-side with validation and abuse protection. Local environment files containing secrets are Git-ignored.

## Copyright

Copyright © 2026 Med Deg AS. All rights reserved.
