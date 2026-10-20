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
  await expect(page.getByTestId('game-room')).toContainText('ต้นเทิร์น');

  await nav.getByRole('link', { name: 'เลือกช่องเริ่ม' }).click();
  await expect(page.getByTestId('preview-setup')).toBeVisible();
  await expect(page.getByTestId('game-room')).toContainText('เลือกช่องเริ่มต้น');

  await nav.getByRole('link', { name: 'สถานะห้อง' }).click();
  await expect(page.getByTestId('preview-status')).toBeVisible();
  await expect(page.getByTestId('preview-status')).toContainText('ไม่พบห้องนี้');

  await nav.getByRole('link', { name: 'หน้าแรก' }).click();
  await expect(page.getByTestId('preview-home')).toBeVisible();
});
