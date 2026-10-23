import { expect, test } from '@playwright/test';

test('preview route shows every current screen without a live room', async ({ page }) => {
  await page.goto('/preview');
  await expect(page.getByTestId('preview-home')).toBeVisible();
  await expect(page.getByTestId('preview-home')).toContainText('ใครเป็น');

  const nav = page.getByTestId('preview-nav');

  await nav.getByRole('link', { name: 'เข้าร่วม' }).click();
  await expect(page.getByTestId('preview-join')).toBeVisible();
  await expect(page.getByTestId('preview-join').getByTestId('join-nickname-input')).toBeVisible();
  await expect(page.getByTestId('preview-join').getByTestId('room-code')).toHaveText('48213');

  await nav.getByRole('link', { name: 'ล็อบบี้' }).click();
  await expect(page.getByTestId('preview-lobby')).toBeVisible();
  await expect(page.getByTestId('preview-lobby').getByTestId('room-code')).toHaveText('48213');
  await expect(page.getByTestId('preview-lobby').getByTestId('start-game')).toBeVisible();

  await nav.getByRole('link', { name: 'โต๊ะเกม' }).click();
  await expect(page.getByTestId('preview-game')).toBeVisible();
  const handIds = await page
    .getByTestId('my-hand')
    .locator('[data-card-id]')
    .evaluateAll((cards) => cards.map((card) => card.getAttribute('data-card-id')));
  expect(handIds).toHaveLength(5);
  expect(new Set(handIds).size).toBe(5);
  await expect(page.getByTestId('game-room')).toContainText('ต้นเทิร์น');

  await page.getByTestId('preview-state-dealOpen').click();
  await expect(page.getByTestId('deal-panel')).toContainText('ล้มดีล');
  await expect(page.getByTestId('lock-deal')).toBeDisabled();

  await page.getByTestId('preview-state-afterMove').click();
  await expect(page.getByTestId('game-room')).toContainText('หลังทอยเต๋า');
  await expect(page.getByTestId('draw-cards')).toBeVisible();

  await nav.getByRole('link', { name: 'เริ่มเกม' }).click();
  await expect(page.getByTestId('preview-setup')).toBeVisible();
  await expect(page.getByTestId('game-room')).toContainText('ต้นเทิร์น');
  await expect(page.getByTestId('game-room')).toContainText('หมากอยู่ช่อง 1');
  await expect(page.getByTestId('open-deal')).toHaveCount(0);

  await nav.getByRole('link', { name: 'การ์ด' }).click();
  await expect(page.getByTestId('preview-cards')).toBeVisible();
  await expect(page.getByTestId('cards-clan').locator('[data-card-kind="clan"]')).toHaveCount(6);
  await expect(page.getByTestId('cards-travel').locator('[data-card-kind="travel"]')).toHaveCount(
    7,
  );
  await expect(page.getByTestId('cards-travel')).toContainText('สีใดก็ได้');
  await expect(
    page.getByTestId('cards-recruitment').locator('[data-card-kind="recruitment"]'),
  ).toHaveCount(3);
  await expect(page.getByTestId('cards-recruitment')).toContainText('1/3');
  await expect(page.getByTestId('cards-recruitment')).toContainText('2/3');
  await expect(page.getByTestId('cards-recruitment')).toContainText('3/3');
  await expect(page.getByTestId('cards-action')).toContainText('ยกเลิกผลการ์ดที่เพิ่งลง');
  await expect(page.getByTestId('cards-back')).toContainText('โต๊ะเจรจาดีล');
  await expect(page.getByTestId('cards-gallery').locator('[aria-label]')).toHaveCount(24);

  await nav.getByRole('link', { name: 'สถานะห้อง' }).click();
  await expect(page.getByTestId('preview-status')).toBeVisible();
  await expect(page.getByTestId('preview-status')).toContainText('ไม่พบห้องนี้');

  await nav.getByRole('link', { name: 'หน้าแรก' }).click();
  await expect(page.getByTestId('preview-home')).toBeVisible();
});

test('preview exercises forced discard, end-check reveal, and rematch', async ({ page }) => {
  await page.goto('/preview/game');
  await page.getByTestId('preview-state-discard').click();

  const discard = page.getByTestId('discard-modal');
  await expect(discard).toBeVisible();
  await expect(page.getByTestId('discard-count')).toContainText('0/2');
  await expect(discard.locator('[data-testid^="discard-card-"]')).toHaveCount(14);

  // A forced discard cannot be dismissed with Escape or the backdrop.
  await page.keyboard.press('Escape');
  await expect(discard).toBeVisible();

  const cards = discard.locator('[data-testid^="discard-card-"]');
  await cards.nth(0).click();
  await cards.nth(1).click();
  await expect(page.getByTestId('discard-count')).toContainText('2/2');
  await page.getByTestId('discard-submit').click();
  await expect(discard).toHaveCount(0);
  await expect(page.getByTestId('my-hand').locator('[data-card-id]')).toHaveCount(12);
  await expect(page.getByTestId('game-room')).toContainText('ต้นเทิร์น');

  await page.getByTestId('preview-state-gameOverDie').click();
  const endCheck = page.getByTestId('endcheck-overlay');
  await expect(endCheck).toBeVisible();
  await expect(endCheck).toContainText('แผ่นดีล #12');
  await expect(page.getByTestId('endcheck-die')).toHaveAttribute('data-rolling', 'true');
  await expect(page.getByTestId('endcheck-continue')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId('endcheck-die')).toHaveAttribute('data-face', '2');
  await page.getByTestId('endcheck-continue').click();

  const gameOver = page.getByTestId('gameover-overlay');
  await expect(gameOver).toBeVisible();
  await expect(page.getByTestId('rematch')).toBeVisible();
  const revealAll = page.getByTestId('gameover-reveal-all');
  if (await revealAll.isVisible()) await revealAll.click();

  await expect(page.getByTestId('final-score-p1')).toContainText('42');
  await expect(page.getByTestId('final-score-p2')).toContainText('42');
  await expect(page.getByTestId('gameover-winner')).toContainText('ผู้ชนะร่วม');

  await page.getByTestId('rematch').click();
  await expect(gameOver).toHaveCount(0);
  await expect(page.getByTestId('game-room')).toContainText('ต้นเทิร์น');
  await expect(page.getByTestId('game-room')).toContainText('เทิร์น 1');
  await expect(page.getByTestId('open-deal')).toHaveCount(0);
  await expect(page.getByTestId('roll-dice')).toBeVisible();
});

test('preview resolves a color conflict from the boss review panel', async ({ page }) => {
  await page.goto('/preview/game');
  await page.getByTestId('preview-state-dealConflict').click();
  await expect(page.getByTestId('preview-state-dealConflict')).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.getByTestId('offer-review-open').click();
  const review = page.getByTestId('offer-review-modal');
  await expect(review).toBeVisible();
  await expect(review.getByTestId('offer-review-statusbar')).toBeVisible();

  // The status bar is a flex child with overflow:hidden; it must keep its
  // natural height instead of shrinking and clipping the summary values.
  const statusBarBox = await review.getByTestId('offer-review-statusbar').boundingBox();
  const capacityBox = await review.getByTestId('offer-review-capacity').boundingBox();
  expect(statusBarBox).not.toBeNull();
  expect(capacityBox).not.toBeNull();
  expect(capacityBox!.y + capacityBox!.height).toBeLessThanOrEqual(
    statusBarBox!.y + statusBarBox!.height + 1,
  );

  // Space 2 needs four of six colors. The boss holds black and red is already
  // accepted, so the remaining four colors are the only missing ones.
  for (const color of ['blue', 'green', 'yellow', 'purple']) {
    await expect(review.getByTestId(`offer-review-missing-color-${color}`)).toBeVisible();
  }
  await expect(review.getByTestId('offer-review-missing-color-red')).toHaveCount(0);
  await expect(review.getByTestId('offer-review-missing-color-black')).toHaveCount(0);

  const pendingRow = review.locator('[data-testid^="offer-review-row-"][data-accepted="false"]');
  await expect(pendingRow).toHaveCount(1);
  const pendingTestId = await pendingRow.getAttribute('data-testid');
  const pendingUid = pendingTestId!.replace('offer-review-row-', '');
  const accept = review.getByTestId(`accept-offer-${pendingUid}`);
  await expect(accept).toBeDisabled();

  const conflicts = review.locator('[data-testid^="offer-review-conflicts-"]');
  await expect(conflicts).toHaveCount(1);
  await expect(conflicts).toContainText('ซ้ำกับข้อเสนอของ');
  const resolve = review.locator('[data-testid^="resolve-conflict-"]');
  await expect(resolve).toHaveCount(1);
  await resolve.click();

  await expect(conflicts).toHaveCount(0);
  await expect(accept).toBeEnabled();
  await expect(review.getByTestId('offer-review-capacity')).toHaveText('0/5');
  await expect(review.getByTestId('offer-review-missing-color-red')).toBeVisible();

  // Hovering or focusing accept previews the missing colors it would fill.
  const redChip = review.getByTestId('offer-review-missing-color-red');
  const blueChip = review.getByTestId('offer-review-missing-color-blue');
  const group = review.getByTestId('offer-review-group-0');
  await expect(redChip).toHaveAttribute('data-preview', 'false');
  await expect(group).toHaveAttribute('data-preview', 'false');

  if ((page.viewportSize()?.width ?? 0) > 640) {
    await accept.hover();
    await expect(redChip).toHaveAttribute('data-preview', 'true');
    await expect(blueChip).toHaveAttribute('data-preview', 'false');
    await expect(group).toHaveAttribute('data-preview', 'true');
    await page.mouse.move(0, 0);
    await expect(redChip).toHaveAttribute('data-preview', 'false');
  }

  await accept.focus();
  await expect(redChip).toHaveAttribute('data-preview', 'true');
  await expect(group).toHaveAttribute('data-preview', 'true');
  await accept.blur();
  await expect(redChip).toHaveAttribute('data-preview', 'false');
  await expect(group).toHaveAttribute('data-preview', 'false');
});

test('preview shows a deal-15 game over without an end-check overlay', async ({ page }) => {
  await page.goto('/preview/game');
  await page.getByTestId('preview-state-gameOverFifteen').click();

  await expect(page.getByTestId('endcheck-overlay')).toHaveCount(0);
  await expect(page.getByTestId('gameover-overlay')).toBeVisible();
  const revealAll = page.getByTestId('gameover-reveal-all');
  if (await revealAll.isVisible()) await revealAll.click();

  await expect(page.getByTestId('final-score-p1')).toContainText('55');
  await expect(page.getByTestId('final-score-p2')).toContainText('41');
  await expect(page.getByTestId('gameover-winner')).toContainText('นก');
});

test('preview dice roll tumbles, then walks the pawn one space per pip', async ({ page }) => {
  await page.goto('/preview/game');
  await expect(page.getByTestId('dice-roll')).toHaveCount(0);

  // Sample the drawn pawn space (desktop board or phone mini map) until the
  // shared dice overlay goes away.
  const sampling = page.evaluate(
    () =>
      new Promise<number[]>((resolve) => {
        const seen: number[] = [];
        let appeared = false;
        const timer = window.setInterval(() => {
          const cell =
            document.querySelector('[data-testid="table-pawn"]')?.closest('[data-space]') ??
            document.querySelector('.mtable-map-grid i.is-current');
          const space = Number(cell?.getAttribute('data-space'));
          if (space && seen.at(-1) !== space) seen.push(space);
          const overlay = document.querySelector('[data-testid="dice-roll"]');
          if (overlay) appeared = true;
          if (appeared && !overlay) {
            window.clearInterval(timer);
            resolve(seen);
          }
        }, 40);
      }),
  );

  await page.getByTestId('roll-dice').click();
  const roll = page.getByTestId('dice-roll');
  await expect(roll).toHaveAttribute('data-rolling', 'true');
  await expect(roll).toHaveAttribute('data-face', /^[1-6]$/);
  const face = Number(await roll.getAttribute('data-face'));
  await expect(roll).toContainText(`ทอยได้ ${face}`);

  // Step numbers appear on the board and the destination is announced.
  await expect(roll).toHaveAttribute('data-stage', 'landed', { timeout: 5_000 });
  await expect(roll).toContainText(`ถึงช่อง ${1 + face}`);
  await expect(
    page.locator('.table-cell-step, .mtable-map-grid i.is-stepped').filter({ visible: true }),
  ).toHaveCount(face);

  const path = await sampling;
  // Preview starts on space 1 with no closed spaces.
  expect(path).toEqual(Array.from({ length: face + 1 }, (_, step) => 1 + step));
  await expect(page.getByTestId('dice-face')).toHaveAttribute('data-face', String(face));
  await expect(page.locator('.table-cell-step, .mtable-map-grid i.is-stepped')).toHaveCount(0);
});

test('a tap or Escape skips the dice animation without blocking the table', async ({ page }) => {
  await page.goto('/preview/game');
  await page.getByTestId('roll-dice').click();
  await expect(page.getByTestId('dice-roll')).toHaveAttribute('data-rolling', 'true');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('dice-roll')).toHaveCount(0);
  await expect(page.getByTestId('dice-face')).toHaveAttribute('data-face', /^[1-6]$/);

  // The overlay never intercepts input: the next action works mid-animation.
  await page.reload();
  await page.getByTestId('roll-dice').click();
  await expect(page.getByTestId('dice-roll')).toBeVisible();
  await page.getByTestId('draw-cards').click();
  await expect(page.getByTestId('dice-roll')).toHaveCount(0);
  await expect(page.getByTestId('game-room')).toContainText('ต้นเทิร์น');
});

test('other players see card backs fly from the deck to the drawer', async ({ page }) => {
  await page.goto('/preview/game');
  await page.getByTestId('preview-state-afterMove').click();
  await expect(page.getByTestId('dice-roll')).toHaveCount(0, { timeout: 10_000 });
  const drawer = page.locator('[data-testid^="game-player-"]').filter({
    has: page.locator('.table-crown, .table-mine-crown'),
  });
  const drawerId = await drawer.first().getAttribute('data-testid');

  await page.getByTestId('draw-cards').click();
  // The preview now follows the next boss, so the draw is someone else's.
  const anim = page.getByTestId('draw-anim');
  await expect(anim).toBeVisible();
  await expect(anim).toHaveAttribute('aria-label', /จั่วการ์ด 3 ใบ/);
  await expect(anim).toHaveCount(0, { timeout: 5_000 });
  await expect(page.getByTestId(drawerId!).getByTestId('seat-hand-count')).toHaveText('+2 ×8');
  // Backs only: nothing in my own hand is marked new.
  await expect(page.locator('[data-testid="my-hand"] .is-new')).toHaveCount(0);
});
