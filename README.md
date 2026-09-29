# Med Deg

Four Norwegian pages built with Next.js App Router, TypeScript and Tailwind CSS. The visual design follows the supplied one.com/Aida screenshots, adapted for mobile. Fonts are self-hosted from installed Fontsource packages (DM Serif Display and DM Sans); they are approximate matches.

## Run locally

Node.js 20.9 or newer is required.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. For a production build: `npm run build`, then `npm start`.

## Checks

```sh
npm run lint
npm run typecheck
npm run build
npm run test:server
npm run test:ui
```

Browser tests use installed Microsoft Edge. On another platform, change `channel` in `playwright.config.ts` to an installed Chromium browser or install Playwright Chromium and remove the channel setting. Tests cover four routes at 320, 375, 390, 430, 768 and 1440px; overflow; navigation; form validation, pending/failure/success states, retry and duplicate behavior; package selection and FAQ interaction. Full-page screenshots are written to `test-results/screenshots/`. Server tests use isolated injected Redis/Resend mocks, and browser submission tests intercept `/api/contact`: they never send real email or require credentials. The endpoint has no runtime mock/bypass mode.

### Mobile navigation over the local network

Run `npm run dev -- --hostname 0.0.0.0`, then open this computer's LAN address with port 3000 on the phone. `next.config.ts` allows only this computer's assigned IPv4 addresses as development origins, so Next's dev runtime can connect and activate the menu. Restart the dev server after changing networks. This setting does not change production behavior.

Run `npm exec playwright install webkit` once, then `npm run test:mobile`. This dedicated suite uses the LAN address when available (loopback otherwise), real touch events in Playwright WebKit and Edge, and widths 320, 375, 390 and 430px. It checks label/icon taps, all four page links, closing, keyboard controls, touch targets, sticky-header hit testing and overflow, plus desktop navigation. It starts a dev server or reuses one running on port 3000; stop a production or loopback-only server first. WebKit emulation is not a physical iPhone test.

## Editing

- `src/content/site.ts`: contact details, navigation, services, values, prices, FAQs.
- `src/content/images.ts`: image paths, alt text and crop positions. Add originals to `public/images/`; setting a path switches the placeholder to an optimized Next Image.
- `src/app/*/page.tsx`: page composition and page-specific Norwegian text.
- `src/app/globals.css`: design tokens, typography and reusable responsive styles. Tailwind utilities handle simple grids and spacing.
- `src/components/`: shared UI, header, footer and both form variants.
- `src/lib/contact.ts`: browser validation, submission transport and retry identifiers.
- `src/lib/contact-schema.ts`: strict field constraints and known package IDs.
- `src/lib/server/`: server-only validation orchestration, Redis limits/idempotency, Resend delivery and environment configuration.
- `src/app/api/contact/route.ts`: the only public delivery endpoint.

## Contact delivery

Both forms POST JSON to `/api/contact`. Until all required server-side environment variables are supplied, submissions fail closed with a friendly 503 response. There is no success simulation or fallback delivery. No Hotmail authentication is used: `info@meddeg.com` is the intended recipient only. Public phone/email links remain unchanged.

### Local configuration

Keep credentials exclusively in gitignored `.env.local`; `.env.example` contains names only. `CONTACT_FROM_EMAIL` must be the bare address `nettside@meddeg.com`: the server adds the `Med Deg` display name. The validated visitor email is used only as Reply-To.

`CONTACT_ALLOWED_ORIGINS` is a comma-separated list of exact origins, without trailing slashes. For development use `http://localhost:3000,http://127.0.0.1:3000` plus this computer's current LAN origin for iPhone testing. Update that exact LAN entry when the computer's IP changes and restart `npm run dev -- --hostname 0.0.0.0`. HTTP origins are accepted only in development. For Vercel production configure `https://meddeg.com,https://www.meddeg.com` if both serve the form; omit the redirect-only origin if applicable. Do not carry local HTTP origins into production. `npm start` uses production validation even on a local machine.

Leave both Upstash variables empty until the real store is ready. Missing credentials block delivery before any provider request. Keep `CONTACT_HASH_SECRET` stable: it HMAC-hashes email rate-limit keys and submission identifiers/content fingerprints for duplicate protection.

To provision the pending store manually:

1. Sign in to the [Upstash Console](https://console.upstash.com), choose **Redis**, then **Create Database**.
2. Name the dedicated local-testing store `meddeg-contact-local`. Choose a European primary region close to the planned server region. Select a suitable plan and create it. Use a separate store for production later so testing cannot consume live submission budgets.
3. Open the database details/connection section. Copy the **HTTPS REST URL** into `UPSTASH_REDIS_REST_URL` in `.env.local`. Use the root `https://…upstash.io` URL, without command paths, query strings or Redis protocol prefixes.
4. Copy the standard **Token**, not **Readonly Token**, into `UPSTASH_REDIS_REST_TOKEN` in `.env.local`. This token must permit the Lua scripts and their read/write commands. Do not use an account management API key.
5. Save locally, restart the development server, and verify Redis rate-limit and duplicate-protection operations before a separately authorized real email test. Do not paste credentials into documentation or test fixtures.

See the official [database creation instructions](https://upstash.com/docs/redis/overall/getstarted) and [REST credential instructions](https://upstash.com/docs/redis/features/restapi). No external store is provisioned automatically.

The server accepts exactly `kind`, `submissionId` (UUID v4), `name`, `email`, `phone`, and empty `website` (honeypot). `kind=message` also requires `message` and permits an optional `packageId`; `kind=callback` accepts neither. Only `fast-folge`, `utvidet-stotte`, and `etter-behov` are accepted packages. There is no separate service field in the UI, so arbitrary service identifiers are rejected rather than expanding the endpoint. Required fields: callback name/email/phone; full form name/email/message, with phone optionally empty. Name is 2–100 characters, email at most 254, phone at most 30 with 8–15 digits, message 2–5000. JSON bodies are capped at 24,000 UTF-8 bytes while streaming (not just by Content-Length), and reads time out after 5 seconds. Unexpected keys, control characters, non-string fields, bad media types, compressed payloads, query parameters and unapproved/missing origins are rejected. Origin checks mitigate browser cross-site submissions; they are not authentication and do not replace abuse controls.

The server sends plain-text email through [Resend's HTTPS API](https://resend.com/docs/api-reference/emails/send-email), using a configured verified sender, fixed recipient, and visitor email only in Reply-To. The subject is `Ny henvendelse fra Med Deg-nettsiden – [navn]`. Name, email, phone, form kind, package label, message and a server-generated UTC timestamp are included. Success requires a successful provider response with an email ID; this means provider acceptance, not proof of inbox placement. Provider errors are never returned to visitors or logged verbatim. No user-supplied HTML is rendered or sent as HTML.

### Shared limits and duplicate protection

A dedicated [Upstash Redis REST store](https://upstash.com/docs/redis/features/restapi) holds only expiring abuse counters and submission metadata. It is not an enquiry database: no names, message text, raw emails or IPs are stored there. No application database, accounts, authentication, admin interface, or payment system is introduced. Provisioning the external rate-limit store remains a manual next step.

Atomic Lua operations enforce fixed windows beginning at the first attempt: **5 validated attempts per email/hour**, **30 attempts globally/15 minutes**, and **100 globally/day**. Retries count too. A request must pass all three budgets before delivery; any store failure blocks sending. A rejected limit returns **429** with `Retry-After`. Email keys are HMAC-hashed with a server secret. Global limits deliberately cap sending cost even if a bot rotates email addresses, but an attacker can exhaust this budget and temporarily prevent legitimate enquiries; edge filtering and monitoring are complementary controls. Invalid bodies/honeypots are rejected cheaply before contacting the store. The endpoint does not trust `X-Forwarded-For`, `CF-Connecting-IP`, or visitor-provided IP fields. Cloudflare can enforce per-IP limits at its own edge, where it knows the connection source.

Submission metadata (HMAC key/content fingerprint, generated operation ID, first submission timestamp, a 30-second processing lease and accepted status) expires after 24 hours. The browser retains the same UUID when retrying unchanged data and blocks duplicate clicks while pending. Concurrent copies receive 409; changed content with a reused UUID receives 409. A previously accepted copy returns success without resending. Ambiguous network/provider failures retry with the same server-created [Resend idempotency key](https://resend.com/docs/dashboard/emails/idempotency-keys) and timestamp. Deduplication is bounded to 24 hours, not permanent exactly-once delivery. Closing/reloading the page loses the browser's in-memory retry ID. Provider timeouts are 8 seconds, Redis timeouts 4 seconds, and the route's Vercel duration is capped at 30 seconds. Responses use `Cache-Control: no-store`.

## External setup checklist — not performed by this implementation

1. **Resend:** create/select an account. Add a sending domain you control (meddeg.com or a dedicated sending subdomain), copy the exact verification records from Resend into DNS, and complete verification. Keep email verification/return-path DNS records DNS-only. Preserve existing email/MX records. Choose an address on that verified domain as the sender; never use the visitor or Hotmail address as From. Create a sending-only API key scoped to that domain where supported. Review provider retention, delivery/bounce visibility and usage alerts.
2. **Shared rate-limit store:** provision a dedicated Upstash Redis store, preferably in the deployment region, for TTL counters/idempotency only. Obtain its HTTPS REST URL and a token with the commands required by the Lua scripts (`EVAL`, `GET`, `SET`, `INCR`, `PTTL`, `PEXPIRE`). Do not use a read-only token or share state with previews/other applications. Test script execution on the provisioned store before enabling public submissions.
3. **Vercel:** add the project and production domain; use the DNS targets Vercel actually provides rather than copied generic IP addresses. Configure these variables server-side in the production environment, then redeploy:

   | Variable | Required value |
   | --- | --- |
   | `CONTACT_RECIPIENT_EMAIL` | `info@meddeg.com` |
   | `CONTACT_FROM_EMAIL` | Bare email address on the verified sending domain |
   | `CONTACT_ALLOWED_ORIGINS` | `https://meddeg.com` (add `,https://www.meddeg.com` only if that origin serves the form) |
   | `CONTACT_HASH_SECRET` | A unique cryptographically random secret of at least 32 characters; generate 32 random bytes, e.g. with a password manager |
   | `RESEND_API_KEY` | The real sending API key |
   | `UPSTASH_REDIS_REST_URL` | The store's actual `https://…upstash.io` REST URL |
   | `UPSTASH_REDIS_REST_TOKEN` | The store's actual REST token |

   `.env.example` contains empty names only. For authorized local delivery testing, copy to ignored `.env.local` and supply actual settings; add the exact local HTTP origin only in development. Never prefix secrets with `NEXT_PUBLIC_`, paste them into source, or reuse production credentials in untrusted preview deployments. Keep preview delivery unconfigured or use separate credentials/store/recipient and exact preview origins. Configure provider/function/store spend alerts. Secret rotation changes HMAC identities and may invalidate short-lived duplicate protection; coordinate it with pending submissions.
4. **Cloudflare DNS/HTTPS:** add the domain to Cloudflare, confirm Vercel domain ownership and origin certificate, then enable proxying for the public web records if proceeding with Cloudflare in front. Use **Full (strict)** TLS and HTTPS redirects, never Flexible TLS. Check both apex and www redirects and certificate renewal. Do not proxy email DNS records. [Vercel cautions that an extra reverse proxy reduces its traffic visibility](https://vercel.com/kb/guide/cloudflare-with-vercel); avoid conflicting bot challenges across both providers and test the chosen setup.
5. **Cloudflare rate limiting:** create an edge rule matching `(http.host in {"meddeg.com" "www.meddeg.com"} and http.request.uri.path eq "/api/contact" and http.request.method eq "POST")`. A starting recommendation is **5 requests per client IP per minute**, blocking for 10 minutes; adapt to plan-supported periods and observed legitimate retries/shared networks. Count all matching requests, not only successes. Use a block/429 action where supported, not an interactive CAPTCHA on this JSON endpoint. [Available controls depend on the Cloudflare plan](https://developers.cloudflare.com/waf/rate-limiting-rules/). Application limits still apply if a request bypasses Cloudflare.
6. **Basic bot protection and caching:** enable appropriate managed WAF/DDoS protections and inspect false positives on real iPhones. Avoid JavaScript/HTML rewriting such as Rocket Loader on the Next.js app. Explicitly **bypass cache for `/api/contact` (and `/api/*`) for every method/status**, respect `no-store`, and never cache POST responses, errors or submitted data. Cache immutable Next static assets/fonts and public images according to origin headers; do not apply a blanket Cache Everything rule to HTML/RSC responses. [Cloudflare's default cache behavior](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/) is not a substitute for checking custom rules. Review Vercel deployment protection/firewall options for preview/direct deployment URLs so Cloudflare is not the only abuse boundary; Origin headers are forgeable outside browsers.
7. **End-to-end acceptance:** after credentials and DNS are ready, send one legitimate submission from each form, verify Hotmail inbox/junk placement, sender authentication and Reply-To, selected package, timestamp, rate limiting, repeated submission behavior and friendly provider-outage handling. Check that API responses are uncached through Cloudflare. Obtain/review appropriate contact-data privacy information and retention arrangements before public collection. These live provider/DNS checks cannot be verified locally without configuration.

### Optional Turnstile later

No CAPTCHA is installed. If observed abuse warrants Turnstile, add its token as an explicitly bounded schema field, add the widget accessibly, and verify the token server-side before claim/delivery at the marked point in `contact-handler.ts`. Use a server-only secret; validate success, expected hostname and action, expiry and single-use behavior. Fail closed on verification failure and reset the widget on retry. Keep rate limits and all existing validation. [Cloudflare requires server-side verification](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/); a rendered widget or hidden token is never sufficient.

## Content and assets outstanding

- All original photographs and the official logo asset. Current logo is a simple SVG approximation; image placeholders are intentional and labeled.
- Exact font identities, if closer matching is needed.
- Three collapsed FAQ answers and the complete Friday gallery caption. Visible TODOs identify these gaps.
- Pricing: screenshots show 475 kr/time, 450 kr/time and 620 kr/time. The crossed-out Fast følge price reads “Fra 2 968 kr”; its unit is unclear. Discount math and the campaign expiry year need confirmation. Values are transcribed, not corrected.
- Confirm business details, opening hours/on-call claim and testimonial permission before launch.
- Live provider configuration/delivery testing and appropriate contact-data privacy information remain launch tasks.

This preview deliberately sets `noindex, nofollow` metadata and disallows crawlers in `robots.ts`. When the content and delivery are ready for launch, update both. Canonicals and sitemap use meddeg.com. Existing live-site routes must be checked before configuring migration redirects.

Implementation setup follows the official [Next.js installation documentation](https://nextjs.org/docs/app/getting-started/installation) and [Tailwind Next.js guide](https://tailwindcss.com/docs/installation/framework-guides/nextjs).
