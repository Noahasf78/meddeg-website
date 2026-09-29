import { test, expect } from '@playwright/test';
const routes = ['/', '/om-oss', '/tjenester', '/kontakt'];
for (const width of [320, 375, 390, 430, 768, 1440]) {
  test(`all pages fit and render at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('h1')).toHaveCount(1);
      for (const photo of await page.locator('main img').all()) {
        await photo.scrollIntoViewIfNeeded();
        await expect(photo).toHaveAttribute('alt', /\S+/);
        await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const overflows = await page.locator('main *').evaluateAll(elements => elements.filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1); }).map(el => `${el.tagName}.${el.className}`));
      expect(overflows).toEqual([]);
      await page.screenshot({ path: `test-results/screenshots/${width}-${route === '/' ? 'home' : route.slice(1)}.png`, fullPage: true });
    }
    expect(errors).toEqual([]);
  });
}
test('mobile navigation supports keyboard close and routing', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Meny' });
  await toggle.click();
  await expect(page.getByRole('navigation', { name: 'Mobilmeny' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await page.getByRole('navigation', { name: 'Mobilmeny' }).getByRole('link', { name: 'Tjenester' }).click();
  await expect(page).toHaveURL('/tjenester');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});
test('both forms validate and wait for confirmed contact submission', async ({ page }) => {
  await page.route('**/api/contact', async route => {
    await new Promise(resolve => setTimeout(resolve, 300));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });
  for (const route of ['/', '/kontakt']) {
    await page.goto(route);
    const form = page.locator('form');
    await form.getByRole('button').click();
    await expect(page.getByLabel('Navn', { exact: true })).toBeFocused();
    await expect(page.getByText('Skriv inn navnet ditt (2–100 tegn).')).toBeVisible();
    await page.getByLabel('Navn', { exact: true }).fill('Test Person');
    await page.getByLabel('E-post', { exact: true }).fill('test@example.com');
    await page.getByLabel(route === '/' ? 'Telefonnummer' : 'Telefon (valgfritt)', { exact: true }).fill('abc');
    if (route === '/kontakt') await page.getByLabel('Melding', { exact: true }).fill('Dette er en test av demoversjonen.');
    await form.getByRole('button').click();
    await expect(page.getByText('Skriv inn et gyldig telefonnummer (8–15 sifre).')).toBeVisible();
    await page.getByLabel(route === '/' ? 'Telefonnummer' : 'Telefon (valgfritt)', { exact: true }).fill(route === '/' ? '12345678' : '');
    const sentRequests: string[] = [];
    page.on('request', req => { if (req.method() === 'POST') sentRequests.push(req.url()); });
    await form.getByRole('button').click();
    await expect(form.getByRole('button')).toBeDisabled();
    await expect(page.getByRole('status')).toContainText('Meldingen er sendt');
    expect(sentRequests).toHaveLength(1);
    expect(sentRequests[0]).toContain('/api/contact');
  }
});
test('pricing choice is carried to contact form and FAQ is operable', async ({ page }) => {
  await page.goto('/tjenester');
  const answer = page.getByText('Nei. Du kan starte med noen timer', { exact: false });
  await expect(answer).toBeVisible();
  await page.getByText('Må jeg binde meg til en fast avtale?', { exact: true }).click();
  await expect(answer).not.toBeVisible();
  await page.getByRole('link', { name: /Velg denne\s*:\s*Utvidet støtte/ }).click();
  await expect(page.getByText('Valgt avtale: Utvidet støtte')).toBeVisible();
});
