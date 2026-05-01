import { expect, test } from '@playwright/test';

test.describe('rybbit-analytics plugin', () => {
  test('plugin is installed in the wiki', async ({ page }) => {
    await page.goto('/#PlaywrightExampleWidget');

    const installed = page.locator('.plugin-installed').first();
    await expect(installed).toContainText('rybbit-analytics: installed');
  });
});

