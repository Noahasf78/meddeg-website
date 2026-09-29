import { expect, test, type Page } from '@playwright/test';

const browserErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' || (message.type() === 'warning' && /hydrat|server rendered|didn't match/i.test(message.text()))) errors.push(message.text());
  });
});
test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page), 'No hydration or other browser errors').toEqual([]);
});

for (const width of [320, 375, 390, 430]) {
  test(`mobile menu label, icon and every link work with touch at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    const toggle = page.locator('.menu-toggle');
    const menu = page.getByRole('navigation', { name: 'Mobilmeny' });
    await expect(toggle).toHaveAttribute('aria-controls', 'mobile-navigation');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toBeHidden();

    await toggle.getByText('Meny', { exact: true }).tap();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('link')).toHaveText(['Hjem', 'Om oss', 'Tjenester', 'Kontakt']);
    await expect(menu.locator('a > svg[aria-hidden="true"]')).toHaveCount(4);
    await toggle.getByText('Lukk', { exact: true }).tap();
    await expect(menu).toBeHidden();

    await toggle.locator('.menu-icon').tap();
    await expect(menu).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(toggle).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(menu).toBeVisible();
    await page.keyboard.press('Escape');

    for (const [label, path] of [['Om oss', '/om-oss'], ['Tjenester', '/tjenester'], ['Kontakt', '/kontakt'], ['Hjem', '/']]) {
      // Exercise the sticky header over scrolled page content, not only at the top.
      await page.evaluate(() => window.scrollTo(0, 450));
      await toggle.locator('.menu-icon').tap();
      await expect(menu).toBeVisible();
      const link = menu.getByRole('link', { name: label, exact: true });
      const bounds = await link.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.height).toBeGreaterThanOrEqual(48);
      // Check both ends of the full row for overlays intercepting touch.
      expect(await link.evaluate(element => {
        const rect = element.getBoundingClientRect();
        return [rect.left + 8, rect.right - 8].every(x => element.contains(document.elementFromPoint(x, rect.top + rect.height / 2)));
      })).toBe(true);
      await link.tap({ position: { x: bounds!.width - 8, y: bounds!.height / 2 } });
      await expect(page).toHaveURL(url => url.pathname === path);
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(menu).toBeHidden();
      await expect(page.locator('h1')).toBeVisible();
    }

    await toggle.tap();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`menu-${width}.png`) });
  });

  test(`all pages hydrate on direct loads and reloads at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ['/', '/om-oss', '/tjenester', '/kontakt']) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      // Check the server response, not just client-inserted metadata: iOS needs
      // the directive before its data detectors can rewrite the document.
      const html = await response!.text();
      expect(html).toMatch(/<meta name="format-detection" content="[^"]*telephone=no[^"]*"/);
      for (const name of ['telephone', 'date', 'email', 'address']) {
        await expect(page.locator('meta[name="format-detection"]')).toHaveAttribute('content', new RegExp(`${name}=no`));
      }
      const toggle = page.locator('.menu-toggle');
      await toggle.tap();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await toggle.tap();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await page.reload();
      await toggle.tap();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await expect(page.locator('footer a[href="tel:+4745422161"]')).toHaveCount(1);
      await expect(page.locator('footer a[href="mailto:info@meddeg.com"]')).toHaveCount(1);
    }
  });
}

test.describe('desktop navigation', () => {
  test.use({ isMobile: false, hasTouch: false, viewport: { width: 1440, height: 900 } });
  test('desktop links remain visible and navigate without the mobile menu', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.menu-toggle')).toBeHidden();
    const desktop = page.getByRole('navigation', { name: 'Hovedmeny' });
    await expect(desktop).toBeVisible();
    await desktop.getByRole('link', { name: 'Om oss' }).click();
    await expect(page).toHaveURL(/\/om-oss$/);
  });
});
