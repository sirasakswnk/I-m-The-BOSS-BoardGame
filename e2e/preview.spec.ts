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
  await expect(page.getByTestId('my-hand').locator('[data-card-id]')).toHaveCount(5);
  await expect(page.getByTestId('my-hand').locator('[data-card-id^="clan-"]')).toHaveCount(1);
  await expect(page.getByTestId('my-hand').locator('[data-card-id^="travel-"]')).toHaveCount(1);
  await expect(page.getByTestId('my-hand').locator('[data-card-id^="recruitment-"]')).toHaveCount(
    1,
  );
  await expect(page.getByTestId('my-hand').locator('[data-card-id^="stop-"]')).toHaveCount(1);
  await expect(page.getByTestId('my-hand').locator('[data-card-id^="imTheBoss-"]')).toHaveCount(1);
  await expect(page.getByTestId('game-room')).toContainText('ต้นเทิร์น');

  await page.getByTestId('preview-state-dealOpen').click();
  await expect(page.getByTestId('deal-panel')).toContainText('ล้มดีล');
  await expect(page.getByTestId('lock-deal')).toBeDisabled();

  await page.getByTestId('preview-state-afterMove').click();
  await expect(page.getByTestId('game-room')).toContainText('หลังทอยเต๋า');
  await expect(page.getByTestId('draw-cards')).toBeVisible();

  await nav.getByRole('link', { name: 'เลือกช่องเริ่ม' }).click();
  await expect(page.getByTestId('preview-setup')).toBeVisible();
  await expect(page.getByTestId('game-room')).toContainText('เลือกช่องเริ่มต้น');

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
  await expect(page.getByTestId('game-room')).toContainText('เลือกช่องเริ่มต้น');
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
