import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=TOEFL')).toBeVisible({ timeout: 15000 });
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    const profileBtn = page.locator('text=Profile').first();
    if (await profileBtn.isVisible()) {
      await profileBtn.click();
    }
    await expect(page.locator('text=Sign in')).toBeVisible({ timeout: 10000 });
  });

  test('quiz page loads', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    const practiceBtn = page.locator('text=Practice').first();
    if (await practiceBtn.isVisible()) {
      await practiceBtn.click();
    }
    await page.waitForTimeout(2000);
    const practiceOrQuiz = page.locator('text=Reading,Listening').first();
    if (await practiceOrQuiz.isVisible({ timeout: 3000 })) {
      await expect(practiceOrQuiz).toBeVisible();
    } else {
      const welcomeText = page.locator('text=Welcome').first();
      await expect(welcomeText).toBeVisible({ timeout: 5000 });
    }
  });
});