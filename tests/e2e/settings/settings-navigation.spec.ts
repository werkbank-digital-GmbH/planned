/**
 * E2E Tests für Einstellungen Navigation
 *
 * Testet grundlegende Navigation in den Einstellungen.
 */

import { test, expect } from '@playwright/test';

test.describe('Einstellungen Navigation', () => {
  test('should redirect to login when accessing settings without auth', async ({ page }) => {
    await page.goto('/einstellungen');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect to login when accessing profile without auth', async ({ page }) => {
    await page.goto('/einstellungen/profil');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect to login when accessing mitarbeiter without auth', async ({ page }) => {
    await page.goto('/einstellungen/mitarbeiter');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect to login when accessing integrationen without auth', async ({ page }) => {
    await page.goto('/einstellungen/integrationen');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect to login when accessing unternehmen without auth', async ({ page }) => {
    await page.goto('/einstellungen/unternehmen');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});
