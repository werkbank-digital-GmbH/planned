/**
 * E2E Tests für Planungsansicht Navigation
 *
 * Testet grundlegende Navigation ohne authentifizierte Session.
 * Vollständige Funktionstests erfordern Test-Seeds.
 */

import { test, expect } from '@playwright/test';

test.describe('Planungsansicht Navigation', () => {
  test('should redirect to login when accessing planning without auth', async ({ page }) => {
    await page.goto('/planung');

    // Should redirect to login with redirectTo parameter
    await expect(page).toHaveURL(/\/login\?redirectTo=.*planung/);
  });

  test('should have planning link in login redirect', async ({ page }) => {
    await page.goto('/planung');

    // Check that the redirect URL contains the planning path
    const url = page.url();
    expect(url).toContain('redirectTo');
    expect(url).toContain('planung');
  });
});

test.describe('Dashboard Navigation', () => {
  test('should redirect to login when accessing dashboard without auth', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});
