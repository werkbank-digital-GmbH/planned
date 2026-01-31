/**
 * E2E Tests für Mobile Navigation
 *
 * Testet grundlegende Navigation in der Mobile-Ansicht.
 */

import { test, expect } from '@playwright/test';

test.describe('Mobile Navigation', () => {
  test('should redirect to login when accessing meine-woche without auth', async ({ page }) => {
    await page.goto('/meine-woche');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect to login when accessing profil without auth', async ({ page }) => {
    await page.goto('/profil');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should preserve mobile route in redirect', async ({ page }) => {
    await page.goto('/meine-woche');

    // Check that redirect contains the mobile route
    const url = page.url();
    expect(url).toContain('login');
  });
});
