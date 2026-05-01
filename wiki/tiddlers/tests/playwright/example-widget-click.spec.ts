import { expect, test } from '@playwright/test';

test.describe('TiddlyWiki wiki', () => {
  test('loads and renders tiddlers correctly', async ({ page }) => {
    await page.goto('/#PlaywrightExampleWidget');

    // Verify the tiddler title is rendered
    await expect(page.locator('.tc-tiddler-title')).toContainText('PlaywrightExampleWidget');
  });
});

