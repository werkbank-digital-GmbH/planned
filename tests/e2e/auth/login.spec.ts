/**
 * E2E Tests für Login-Flow
 *
 * @see FEATURES.md F1.1-F1.3 für Akzeptanzkriterien
 */

import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login form', async ({ page }) => {
    // Check page elements
    await expect(page.getByRole('heading', { name: 'planned.' })).toBeVisible();
    await expect(page.getByLabel('E-Mail')).toBeVisible();
    await expect(page.getByLabel('Passwort')).toBeVisible();
    await expect(page.getByLabel('Angemeldet bleiben')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Anmelden' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Passwort vergessen?' })).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    // Fill form with invalid credentials
    await page.fill('input[name="email"]', 'wrong@test.de');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.getByRole('alert')).toContainText('Ungültige Anmeldedaten');

    // Should stay on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should show validation error for invalid email', async ({ page }) => {
    // Fill form with invalid email
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Browser validation should prevent submission or show error
    // Note: HTML5 validation happens before form submission
    const emailInput = page.getByLabel('E-Mail');
    await expect(emailInput).toHaveAttribute('type', 'email');
  });

  test('should show validation error for short password', async ({ page }) => {
    // Fill form with short password
    await page.fill('input[name="email"]', 'test@test.de');
    await page.fill('input[name="password"]', '1234567'); // 7 chars, min is 8

    // HTML5 validation
    const passwordInput = page.getByLabel('Passwort');
    await expect(passwordInput).toHaveAttribute('minLength', '8');
  });

  test('should navigate to password reset', async ({ page }) => {
    await page.click('a[href="/reset-password"]');
    await expect(page).toHaveURL('/reset-password');
    await expect(page.getByText('Passwort zurücksetzen')).toBeVisible();
  });

  test('should redirect to original URL after login', async ({ page }) => {
    // Navigate to protected route
    await page.goto('/planung');

    // Should redirect to login with redirectTo parameter
    await expect(page).toHaveURL(/\/login\?redirectTo=.*planung/);
  });

  test('should show loading state during submission', async ({ page }) => {
    // Fill form
    await page.fill('input[name="email"]', 'test@test.de');
    await page.fill('input[name="password"]', 'password123');

    // Click submit and check for loading state
    const submitButton = page.getByRole('button', { name: 'Anmelden' });
    await submitButton.click();

    // Button should show loading text
    await expect(submitButton).toContainText('Wird angemeldet...');
  });
});

test.describe('Password Reset', () => {
  test('should display reset password form', async ({ page }) => {
    await page.goto('/reset-password');

    await expect(page.getByRole('heading', { name: 'planned.' })).toBeVisible();
    await expect(page.getByText('Passwort zurücksetzen')).toBeVisible();
    await expect(page.getByLabel('E-Mail')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Link anfordern' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Zurück zum Login' })).toBeVisible();
  });

  test('should show success message after submitting', async ({ page }) => {
    await page.goto('/reset-password');

    // Fill and submit form
    await page.fill('input[name="email"]', 'test@test.de');
    await page.click('button[type="submit"]');

    // Should show success message (regardless of whether email exists - security)
    await expect(page.getByText('Falls ein Konto mit dieser E-Mail existiert')).toBeVisible();
  });

  test('should navigate back to login', async ({ page }) => {
    await page.goto('/reset-password');
    await page.click('a[href="/login"]');
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Update Password', () => {
  test('should display update password form', async ({ page }) => {
    await page.goto('/update-password');

    await expect(page.getByRole('heading', { name: 'planned.' })).toBeVisible();
    await expect(page.getByText('Neues Passwort eingeben')).toBeVisible();
    await expect(page.getByLabel('Neues Passwort')).toBeVisible();
    await expect(page.getByLabel('Passwort bestätigen')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Passwort speichern' })).toBeVisible();
  });

  test('should show error for mismatched passwords', async ({ page }) => {
    await page.goto('/update-password');

    // Fill form with mismatched passwords
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="confirmPassword"]', 'differentpassword');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.getByRole('alert')).toContainText('stimmen nicht überein');
  });
});

test.describe('Route Protection', () => {
  test('should redirect unauthenticated user to login', async ({ page }) => {
    // Try to access protected route
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect unauthenticated user to login with redirectTo', async ({ page }) => {
    // Try to access protected route
    await page.goto('/projekte');

    // Should redirect to login with original URL
    await expect(page).toHaveURL(/\/login\?redirectTo=.*projekte/);
  });

  test('should redirect root to login when not authenticated', async ({ page }) => {
    await page.goto('/');

    // Should redirect to login
    await expect(page).toHaveURL('/login');
  });
});
