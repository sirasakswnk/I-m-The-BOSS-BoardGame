import { expect, test, type Page } from '@playwright/test';

// Runs in the `mobile` project (375x667). Real multi-player flows are covered
// by table.spec.ts in the same project; this file checks the M8 layout itself.

const TOUCH_TARGET_PX = 44;

async function expectNoHorizontalScroll(page: Page, label: string) {
  const widths = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(widths.scroll, `${label} scrolls sideways`).toBeLessThanOrEqual(widths.client);
}

async function expectTouchTargets(page: Page, testIds: string[]) {
  for (const testId of testIds) {
    const box = await page.getByTestId(testId).boundingBox();
    expect(box, `${testId} is not rendered`).not.toBeNull();
    expect(box!.height, `${testId} is too short to tap`).toBeGreaterThanOrEqual(TOUCH_TARGET_PX);
  }
}

test('every screen fits a 375px phone without sideways scrolling', async ({ page }) => {
  for (const screen of ['home', 'join', 'lobby', 'status', 'cards', 'setup']) {
    await page.goto(`/preview/${screen}`);
    await expect(page.getByTestId(`preview-${screen}`)).toBeVisible();
    await expectNoHorizontalScroll(page, screen);
  }

  // Discard and game-over overlays cannot be dismissed, so load each state fresh.
  for (const state of [
    'turnStart',
    'dealOpen',
    'afterMove',
    'discard',
    'gameOverDie',
    'gameOverFifteen',
  ]) {
    await page.goto('/preview/game');
    await page.getByTestId(`preview-state-${state}`).click();
    await expect(page.getByTestId('compact-table')).toBeVisible();
    await expectNoHorizontalScroll(page, `game ${state}`);
  }
});

test('end-of-turn and game-over overlays fit the phone', async ({ page }) => {
  await page.goto('/preview/game');
  await page.getByTestId('preview-state-discard').click();
  const firstCard = page.locator('[data-testid^="discard-card-"]').first();
  await expect(firstCard).toBeVisible();
  await expect(page.getByTestId('discard-submit')).toBeInViewport();
  await expectTouchTargets(page, ['discard-submit']);

  await page.goto('/preview/game');
  await page.getByTestId('preview-state-gameOverDie').click();
  await expect(page.getByTestId('endcheck-continue')).toBeInViewport({ timeout: 5_000 });
  await page.getByTestId('endcheck-continue').click();
  await expect(page.getByTestId('gameover-overlay')).toBeVisible();
  const revealAll = page.getByTestId('gameover-reveal-all');
  if (await revealAll.isVisible()) await revealAll.click();
  await expect(page.getByTestId('gameover-winner')).toBeVisible();
  await page.getByTestId('rematch').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('rematch')).toBeInViewport();
  await expectNoHorizontalScroll(page, 'game over');
});

test('phone table: player strip, mini board sheet and hand dock', async ({ page }) => {
  await page.goto('/preview/game');
  await expect(page.getByTestId('compact-table')).toBeVisible();
  await expect(page.getByTestId('deal-panel')).toBeVisible();

  // Other players live in one swipeable row instead of around the board.
  const strip = page.getByTestId('player-strip');
  await expect(strip.locator('.table-seat.is-strip')).toHaveCount(3);
  await expect(strip).toHaveCSS('overflow-x', 'auto');

  // The mini map opens the full 16-space board in a bottom sheet.
  await page.getByTestId('mini-board').click();
  const sheet = page.getByTestId('board-sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('.mtable-board-row')).toHaveCount(16);
  await expect(sheet.locator('.mtable-board-row.is-current')).toHaveCount(1);
  await sheet.getByRole('button', { name: 'ปิด' }).click();
  await expect(sheet).toHaveCount(0);

  // The hand dock stays collapsed with the action buttons on screen...
  const dock = page.getByTestId('hand-dock');
  const toggle = page.getByTestId('hand-dock-toggle');
  await expect(dock).toBeInViewport();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByTestId('my-hand')).toBeHidden();
  await expect(toggle).toContainText('5/12');
  await expectTouchTargets(page, [
    'hand-dock-toggle',
    'offer-open',
    'play-card-open',
    'table-pass',
  ]);

  // ...and pulls up to show every card, then closes from the backdrop.
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('my-hand').locator('[data-card-id]')).toHaveCount(5);
  await expect(page.getByTestId('my-hand').locator('[data-card-id]').first()).toBeInViewport();
  await page.getByTestId('hand-dock-backdrop').click({ position: { x: 10, y: 10 } });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');

  // A swipe up on the handle opens the sheet too.
  const box = await toggle.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2, box!.y - 80, { steps: 4 });
  await page.mouse.up();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('phone table: the boss can roll, draw and open a deal with large buttons', async ({
  page,
}) => {
  await page.goto('/preview/game');
  await expectTouchTargets(page, ['roll-dice']);
  await expect(page.getByTestId('open-deal')).toHaveCount(0);

  await page.getByTestId('roll-dice').click();
  await expect(page.getByTestId('game-room')).toContainText('หลังทอยเต๋า');
  await expectTouchTargets(page, ['draw-cards', 'open-deal']);
  await page.getByTestId('draw-cards').click();
  // Drawing ends the turn; the preview then follows the next boss.
  await expect(page.getByTestId('game-room')).toContainText('ต้นเทิร์น');
  await expect(page.getByTestId('game-room')).toContainText('เทิร์น 2');

  await page.getByTestId('preview-state-dealOpen').click();
  await expectTouchTargets(page, ['place-clan-open', 'fail-deal', 'lock-deal']);
  await page.getByTestId('fail-deal').click();
  await expect(page.getByTestId('game-room')).toContainText('ต้นเทิร์น');
  await expectNoHorizontalScroll(page, 'after failing the deal');
});

test('first turn starts on space 1 and only offers the forced roll', async ({ page }) => {
  await page.goto('/preview/setup');
  await expect(page.getByTestId('game-room')).toContainText('ต้นเทิร์น');
  await expect(page.getByTestId('game-room')).toContainText('เทิร์น 1');
  await expect(page.getByTestId('game-room')).toContainText('หมากอยู่ช่อง 1');
  await expectTouchTargets(page, ['roll-dice']);
  await expect(page.getByTestId('open-deal')).toHaveCount(0);
  await expect(page.getByTestId('start-space-1')).toHaveCount(0);
});

test('tablet width keeps the compact table and no sideways scroll', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto('/preview/game');
  await expect(page.getByTestId('compact-table')).toBeVisible();
  await expect(page.getByTestId('player-strip')).toHaveCSS('display', 'grid');
  await expectNoHorizontalScroll(page, 'tablet');

  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByTestId('compact-table')).toHaveCount(0);
  await expect(page.locator('.table-felt')).toBeVisible();
});
