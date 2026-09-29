import { test, expect } from '@playwright/test';

for (const width of [390, 1440]) {
  for (const route of ['/', '/om-oss', '/tjenester', '/kontakt']) {
    test(`keyboard skip link bypasses the header on ${route} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      const skipLink = page.getByRole('link', { name: 'Hopp til innhold', exact: true });
      await expect(skipLink).not.toBeInViewport();

      await page.keyboard.press('Tab');
      await expect(skipLink).toBeFocused();
      await expect(skipLink).toBeInViewport();
      await expect(skipLink).toHaveAttribute('href', '#main');
      await expect(page.locator('main#main')).toHaveCount(1);

      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(new RegExp(`${route === '/' ? '/' : route}#main$`));
      await page.keyboard.press('Tab');
      await expect(page.locator('main :focus')).toHaveCount(1);
      await expect(page.locator('header :focus')).toHaveCount(0);
    });
  }
}
