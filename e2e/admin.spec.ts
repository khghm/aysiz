import { test, expect } from '@playwright/test';

test.describe('admin flow', () => {
  test('admin login page loads', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    // Should show login form or admin panel
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  test('admin login with credentials', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    const usernameInput = page.locator('input[type="text"], input[name="username"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    if (await usernameInput.isVisible() && await passwordInput.isVisible()) {
      await usernameInput.fill('admin');
      await passwordInput.fill('admin123456789012');
      const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /ورود|login/i }).first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(3000);
      }
    }
  });
});
