import { expect, test } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });

for (const locale of ['en', 'sk'] as const) {
  test(`mobile board stays clear of controls in ${locale}`, async ({
    page,
    isMobile,
  }, testInfo) => {
    test.skip(!isMobile, 'Touch layout regression');
    await page.goto('./');
    await page.getByRole('button', { name: 'Start game', exact: true }).click();
    if (locale === 'sk') {
      await page
        .getByRole('navigation')
        .getByRole('link', { name: 'Prepnúť do slovenčiny', exact: true })
        .click();
    }

    for (const viewport of [
      { width: 390, height: 664 }, // iPhone with browser toolbars visible
      { width: 320, height: 568 },
      { width: 380, height: 820 },
      { width: 844, height: 390 }, // landscape
    ]) {
      await page.setViewportSize(viewport);
      await expect
        .poll(() =>
          page.evaluate(() => {
            const selectors = [
              '.game-nav',
              '.hx-players',
              '.board-host',
              '.hx-turn-panel',
              '.hx-sidebar',
              '.hx-dock',
              '.hx-status',
            ];
            const boxes = selectors.map((selector) =>
              document.querySelector(selector)!.getBoundingClientRect(),
            );
            return (
              boxes.every(
                (box, index) =>
                  box.left >= 0 &&
                  box.right <= innerWidth &&
                  (index === 0 || box.top >= boxes[index - 1]!.bottom),
              ) && document.documentElement.scrollWidth <= innerWidth
            );
          }),
        )
        .toBe(true);
      const board = await page.getByTestId('board-view').boundingBox();
      expect(Math.round(board!.height)).toBeGreaterThanOrEqual(280);
      expect(
        await page
          .locator('.hx-turn-panel')
          .evaluate((element) => element.scrollHeight <= element.clientHeight),
      ).toBe(true);
    }

    await page.setViewportSize({ width: 390, height: 664 });
    const next = page.getByRole('button', {
      name: locale === 'en' ? 'Next spot' : 'Ďalšie miesto',
      exact: true,
    });
    const confirm = page.getByTestId('selected-confirm');
    await next.tap();
    await expect(confirm).toBeEnabled();
    await confirm.tap();
    await expect(page.locator('#hx-turn-heading')).toHaveText(
      locale === 'en' ? 'Place a road' : 'Umiestni cestu',
    );
    await next.tap();
    await expect(confirm).toBeEnabled();
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath(`mobile-${locale}.png`), fullPage: true });
    await confirm.tap();

    const trade = page.getByRole('button', {
      name: locale === 'en' ? 'Trade' : 'Obchod',
      exact: true,
    });
    await trade.tap();
    await expect(page.locator('#hx-side-content')).toBeVisible();
    const boardBottom = await page
      .getByTestId('board-view')
      .evaluate((element) => element.getBoundingClientRect().bottom);
    const tradeTop = await page
      .locator('#hx-side-content')
      .evaluate((element) => element.getBoundingClientRect().top);
    expect(tradeTop).toBeGreaterThanOrEqual(boardBottom);
    await page
      .locator('#hx-side-content')
      .getByRole('button', { name: locale === 'en' ? 'Close' : 'Zavrieť', exact: true })
      .tap();
    await expect(page.locator('#hx-side-content')).toHaveCount(0);
  });
}
