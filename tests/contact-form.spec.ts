import { expect, test } from '@playwright/test';

for (const scenario of [
  { status: 400, extra: { invalidFields: ['email', 'unknown'], message: 'private details' }, text: 'Kontroller de markerte feltene' },
  { status: 400, extra: { message: 'private details' }, text: 'Last siden på nytt' },
  { status: 403, extra: {}, text: 'Last siden på nytt' },
  { status: 409, extra: { code: 'duplicate_pending' }, text: 'Meldingen behandles allerede' },
  { status: 409, extra: { code: 'duplicate_conflict' }, text: 'Denne innsendingen er allerede brukt' },
  { status: 503, extra: { message: 'private details' }, text: 'Meldingen kunne ikke sendes nå' },
]) {
  test(`safe error mapping ${scenario.status} ${scenario.text}`, async ({ page }) => {
    await page.route('**/api/contact', route => route.fulfill({ status: scenario.status, contentType: 'application/json', body: JSON.stringify({ ok: false, ...scenario.extra }) }));
    await page.goto('/');
    await page.getByLabel('Navn', { exact: true }).fill('Randi Testesen');
    await page.getByLabel('Telefonnummer', { exact: true }).fill('41360000');
    await page.getByLabel('E-post', { exact: true }).fill('Noah.test1@example.com');
    await page.getByRole('button', { name: 'Send inn', exact: true }).click();
    await expect(page.locator('form').getByRole('alert')).toContainText(scenario.text);
    await expect(page.locator('form')).not.toContainText('private details');
    await expect(page.getByLabel('Navn', { exact: true })).toHaveValue('Randi Testesen');
    if ('invalidFields' in scenario.extra) {
      await expect(page.getByLabel('E-post', { exact: true })).toHaveAttribute('aria-invalid', 'true');
      await expect(page.getByLabel('E-post', { exact: true })).toBeFocused();
      await expect(page.getByText('Skriv inn en gyldig e-postadresse.', { exact: true })).toBeVisible();
    }
  });
}

test('failed delivery preserves data; retry reuses id; duplicate submits are blocked', async ({ page }) => {
  await page.goto('/kontakt?avtale=utvidet-stotte');
  await page.getByLabel('Navn', { exact: true }).fill('Kari Nordmann');
  await page.getByLabel('E-post', { exact: true }).fill('kari@example.com');
  await page.getByLabel('Melding', { exact: true }).fill('Jeg ønsker en samtale.');
  const bodies: Record<string, unknown>[] = [];
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/contact', async route => {
    bodies.push(route.request().postDataJSON());
    if (bodies.length === 1) {
      await pending;
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false, message: 'internal provider secret SHOULD NOT BE SHOWN' }) });
    } else await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });
  await page.getByRole('button', { name: 'Send melding', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sender melding…' })).toBeDisabled();
  await page.locator('form').evaluate(form => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  await expect.poll(() => bodies.length).toBe(1);
  await expect(page.getByRole('status')).toBeEmpty();
  release();
  await expect(page.locator('form').getByRole('alert')).toContainText('Meldingen kunne ikke sendes nå');
  await expect(page.locator('form').getByRole('alert')).not.toContainText('secret');
  await expect(page.getByLabel('Navn', { exact: true })).toHaveValue('Kari Nordmann');
  await expect(page.getByLabel('Melding', { exact: true })).toHaveValue('Jeg ønsker en samtale.');
  await page.getByRole('button', { name: 'Send melding', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Meldingen er sendt');
  expect(bodies).toHaveLength(2);
  expect(bodies[0].submissionId).toBe(bodies[1].submissionId);
  expect(bodies[0].packageId).toBe('utvidet-stotte');
  expect(bodies[0].website).toBe('');
  await expect(page.getByRole('button', { name: 'Melding sendt', exact: true })).toBeDisabled();
});

test('rate limit returns friendly Norwegian feedback without losing input', async ({ page }) => {
  await page.route('**/api/contact', route => route.fulfill({ status: 429, contentType: 'application/json', body: '{"ok":false}' }));
  await page.goto('/');
  await page.getByLabel('Navn', { exact: true }).fill('Kari Nordmann');
  await page.getByLabel('E-post', { exact: true }).fill('kari@example.com');
  await page.getByLabel('Telefonnummer', { exact: true }).fill('12345678');
  await page.getByRole('button', { name: 'Send inn', exact: true }).click();
  await expect(page.locator('form').getByRole('alert')).toContainText('Vent litt før du prøver igjen');
  await expect(page.getByLabel('Navn', { exact: true })).toHaveValue('Kari Nordmann');
  await expect(page.getByRole('button', { name: 'Send inn', exact: true })).toBeEnabled();
});
