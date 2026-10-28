import { test, expect } from '@playwright/test';

test.describe('storefront', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/تای سیز|Tasis/i);
  });

  test('product listing visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('img', { timeout: 10000 });
    const images = await page.locator('img').count();
    expect(images).toBeGreaterThan(0);
  });
});

test.describe('checkout flow', () => {
  test('add to cart and view cart', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    // Click first product add-to-cart if available
    const addBtn = page.locator('button').filter({ hasText: /سبد|افزودن|خرید/ }).first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(500);
    }
    // Navigate to cart
    await page.goto('/cart').catch(() => {});
  });
});
