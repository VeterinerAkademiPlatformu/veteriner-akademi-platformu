const { test, expect, devices } = require('@playwright/test');

test.describe('Veteriner Akademi çalışma istasyonu', () => {
  test('mobil alt menü ve Daha fazla paneli çalışır', async ({ browser }) => {
    const context = await browser.newContext({ ...devices['Pixel 7'] });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#page-dashboard')).toHaveClass(/active/);
    await expect(page.locator('#mobileBottomNav')).toBeVisible();

    await page.locator('[data-more-open]').click();
    await expect(page.locator('#moreMenuPanel')).toBeVisible();
    await expect(page.locator('#moreMenuPanel .more-menu-link')).toHaveCount(7);

    await page.keyboard.press('Escape');
    await expect(page.locator('#moreMenuPanel')).toBeHidden();
    await expect(page.locator('[data-more-open]')).toBeFocused();

    await page.locator('[data-more-open]').click();
    await page.locator('#moreMenuPanel [data-page="notes"]').click();
    await expect(page.locator('#page-notes')).toHaveClass(/active/);
    await expect(page.locator('#moreMenuPanel')).toBeHidden();
    await context.close();
  });

  test('mobil Dersler kısayolu doğru ekranı açar', async ({ browser }) => {
    const context = await browser.newContext({ ...devices['Pixel 7'] });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
    await page.locator('#mobileBottomNav [data-page="courses"]').click();
    await expect(page.locator('#page-courses')).toHaveClass(/active/);
    await context.close();
  });

  test('masaüstünde alt menü gizli ve yan menü görünür', async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 900 });
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#mobileBottomNav')).toBeHidden();
    await expect(page.locator('#sidebar')).toBeVisible();
  });


  test('masaüstü menü grupları açılır ve seçim doğru sayfaya gider', async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 900 });
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#sidebar .nav-group')).toHaveCount(4);

    const learningGroup = page.locator('#sidebar [data-nav-group]').filter({ has: page.locator('.nav-group-toggle', { hasText: 'Aktif öğrenme' }) });
    await learningGroup.locator('.nav-group-toggle').click();
    await expect(learningGroup.locator('.nav-submenu')).toBeVisible();
    await learningGroup.locator('[data-page="flashcards"]').click();
    await expect(page.locator('#page-flashcards')).toHaveClass(/active/);
    await expect(learningGroup.locator('.nav-submenu')).toBeVisible();
  });

  test('yönetim bağlantısı oturum/yetki yokken görünmez', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#adminQuickEntry')).toBeHidden();
  });
});
