import { test, expect } from '@playwright/test';
import { indexingPolicy, productionIndexingApproved } from '../src/lib/seo';

const pages = [
  { path: '/', title: 'Med Deg \u2013 Praktisk og sosial hjelp i Oslo', description: 'Praktisk og sosial hjelp i hverdagen for eldre i Oslo og omegn. Hjelp hjemme, f\u00f8lge til avtaler og hyggelig selskap.', h1: 'Tilstede n\u00e5r hverdagen krever det' },
  { path: '/om-oss', title: 'Om oss | Med Deg', description: 'Historien bak Med Deg og verdiene v\u00e5re: verdighet, \u00e5penhet, kontinuitet og lokal tilh\u00f8righet.', h1: 'Fra rettssalen og sykehuset til fast f\u00f8lge' },
  { path: '/tjenester', title: 'Tjenester og priser | Med Deg', description: 'Praktisk hjelp hjemme, f\u00f8lge og transport, sosialt samv\u00e6r og avlastning for p\u00e5r\u00f8rende. Se tjenester og avtaler hos Med Deg.', h1: 'Hjelp som du kan bygge en hverdag rundt' },
  { path: '/kontakt', title: 'Kontakt oss | Med Deg', description: 'Ta kontakt med Med Deg for en uforpliktende prat. Ring 454 22 161 eller send e-post til info@meddeg.com.', h1: 'Ta gjerne kontakt, vi svarer raskt' },
];
for (const item of pages) {
  test(`SEO metadata remains correct for ${item.path}`, async ({ page }) => {
    await page.goto(item.path);
    await expect(page).toHaveTitle(item.title);
    await expect(page.locator('html')).toHaveAttribute('lang', 'nb');
    await expect(page.locator('h1')).toHaveText(item.h1);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', item.description);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://meddeg.com${item.path === '/' ? '' : item.path}`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', `https://meddeg.com${item.path === '/' ? '' : item.path}`);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', item.title);
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', item.description);
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'nb_NO');
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://meddeg.com/images/med-deg-og.png');
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200');
    await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', '630');
    await expect(page.locator('meta[property="og:image:type"]')).toHaveAttribute('content', 'image/png');
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute('content', 'Med Deg – en yngre og en eldre kvinne ser på en mobiltelefon sammen i en park');
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', 'https://meddeg.com/images/med-deg-og.png');
    await expect(page.locator('meta[name="twitter:image:alt"]')).toHaveAttribute('content', 'Med Deg – en yngre og en eldre kvinne ser på en mobiltelefon sammen i en park');
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute('content', item.title);
    await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute('content', item.description);
  });
}

test('sharing image is served as a 1200 by 630 PNG', async ({ request }) => {
  const response = await request.get('/images/med-deg-og.png');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('image/png');
  const image = await response.body();
  expect(image.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(image.readUInt32BE(16)).toBe(1200);
  expect(image.readUInt32BE(20)).toBe(630);
});

test('indexing is enabled only on approved production deployments', () => {
  expect(productionIndexingApproved).toBe(true);
  for (const environment of ['production', 'preview', 'development', 'unexpected']) {
    const blocked = indexingPolicy(environment, false);
    expect(blocked.robots).toEqual({ index: false, follow: false });
    expect(blocked.robotsFile.sitemap).toBeUndefined();
    expect(blocked.robotsFile.rules).toEqual({ userAgent: '*', allow: '/' });
    const policy = indexingPolicy(environment);
    expect(policy.indexable).toBe(environment === 'production');
    expect(policy.robots).toEqual({ index: environment === 'production', follow: environment === 'production' });
    expect(policy.robotsFile.sitemap).toBe(environment === 'production' ? 'https://meddeg.com/sitemap.xml' : undefined);
  }
});

test('sitemap lists exactly the four canonical pages and robots permits reading noindex', async ({ request }) => {
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  const urls = [...(await sitemap.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  expect(urls.sort()).toEqual(pages.map(item => `https://meddeg.com${item.path}`).sort());
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  const text = await robots.text();
  expect(text).toContain('User-Agent: *');
  expect(text).toContain('Allow: /');
  expect(text).not.toMatch(/Disallow:|Sitemap:/i);
});

test('homepage exposes only confirmed organization data', async ({ page }) => {
  await page.goto('/');
  const script = page.locator('script[type="application/ld+json"]');
  await expect(script).toHaveCount(1);
  expect(JSON.parse((await script.textContent())!)).toEqual({
    '@context': 'https://schema.org', '@type': 'Organization', '@id': 'https://meddeg.com/#organization',
    name: 'Med Deg AS', url: 'https://meddeg.com', telephone: '+4745422161',
    email: 'info@meddeg.com', address: 'C. J. Hambros plass 2D, 0164 Oslo', identifier: '938 305 951',
  });
});

test('package selection does not create another canonical contact URL', async ({ page }) => {
  await page.goto('/kontakt?avtale=fast-folge');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://meddeg.com/kontakt');
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', 'https://meddeg.com/kontakt');
});
